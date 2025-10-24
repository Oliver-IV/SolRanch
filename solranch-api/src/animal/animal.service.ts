import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    ConflictException,
    ForbiddenException, 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolanaService } from '../solana/solana.service';
import { Ranch } from '../ranch/entities/ranch.entity';
import { Verifier } from '../verifier/entities/verifier.entity';
import { Animal } from './entities/animal.entity';
import {
    PendingTransaction,
    TxStatus,
} from './entities/pending-tx.entity';
import { User } from '../auth/entities/user.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { AddRancherSignatureDto } from './dto/add-rancher-signature.dto';
import { ConfirmAnimalDto } from './dto/confirm-animal.dto';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { SolranchAnchor } from '../solana/idl/solranch_anchor';
import { SetAnimalPriceDto } from './dto/set-animal-price.dto';
import { ConfirmTxDto } from './dto/confirm-tx.dto';
import { SetAllowedBuyerDto } from './dto/set-allowed-buyer.dto';
import { FindAnimalsQueryDto } from './dto/find-animals-query.dto';

@Injectable()
export class AnimalService {
    private readonly logger = new Logger(AnimalService.name);

    constructor(
        private readonly solanaService: SolanaService,
        @InjectRepository(Ranch)
        private readonly ranchRepository: Repository<Ranch>,
        @InjectRepository(Verifier)
        private readonly verifierRepository: Repository<Verifier>,
        @InjectRepository(Animal)
        private readonly animalRepository: Repository<Animal>,
        @InjectRepository(PendingTransaction)
        private readonly pendingTxRepository: Repository<PendingTransaction>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        this.logger.log('AnimalService initialized');
    }

    async buildTx(
        dto: CreateAnimalDto,
        rancherPubkeyStr: string,
    ): Promise<{ transaction: string; animalPda: string; blockhash: any }> {
        const rancherPubkey = new PublicKey(rancherPubkeyStr);
        const program = this.solanaService.getProgram();

        const ranch = await this.ranchRepository.findOne({
            where: { user: { pubkey: rancherPubkeyStr } },
        });
        if (!ranch) {
            throw new NotFoundException(`Ranch not found for user ${rancherPubkeyStr}`);
        }
        if (!ranch.isVerified) {
            throw new BadRequestException(`Ranch ${ranch.name} is not verified.`);
        }

        const verifierProfile = await this.verifierRepository
            .createQueryBuilder('verifier')
            .leftJoinAndSelect('verifier.user', 'user')
            .where('verifier.pda = :pda', { pda: dto.verifier_pda })
            .andWhere('verifier.isActive = :isActive', { isActive: true })
            .getOne();

        if (!verifierProfile) {
            throw new NotFoundException(`Active verifier with PDA ${dto.verifier_pda} not found.`);
        }

        if (!verifierProfile.user) {
            throw new InternalServerErrorException(`Verifier profile ${dto.verifier_pda} has no associated user.`);
        }

        const verifierAuthorityPubkey = new PublicKey(verifierProfile.user.pubkey);
        const verifierProfilePda = new PublicKey(verifierProfile.pda);

        const ranchPda = new PublicKey(ranch.pda);
        const animalCountBuffer = new BN(ranch.animalCount).toArrayLike(Buffer, 'le', 8);

        const [animalPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from('ranch_animal'),
                ranchPda.toBuffer(),
                animalCountBuffer,
            ],
            program.programId,
        );

        const existingPending = await this.pendingTxRepository.findOne({
            where: { animalPda: animalPda.toBase58() }
        });
        if (existingPending) {
            this.logger.warn(`Build request for existing pending animal ${animalPda.toBase58()}. Returning existing TX.`);
            throw new ConflictException(`A registration process for animal PDA ${animalPda.toBase58()} is already pending.`);
        }

        const instruction = await program.methods
            .registerAnimal(
                dto.id_chip,
                dto.specie,
                dto.breed,
                new BN(dto.birth_date),
            )
            .accounts({
                animal: animalPda,
                verifierProfile: verifierProfilePda,
                ranchProfile: ranchPda,
                authority: rancherPubkey,
                verifier: verifierAuthorityPubkey,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: rancherPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        const serializedTx = tx.serialize({
            requireAllSignatures: false,
        });
        const base64Tx = serializedTx.toString('base64');

        const pending = this.pendingTxRepository.create({
            serializedTx: base64Tx,
            rancherPubkey: rancherPubkeyStr,
            verifierPubkey: verifierProfile.user.pubkey,
            animalPda: animalPda.toBase58(),
            status: TxStatus.PENDING_RANCHER_SIGNATURE,
        });
        await this.pendingTxRepository.save(pending);

        this.logger.log(`Built TX for animal ${animalPda.toBase58()}, awaiting rancher signature.`);
        return {
            transaction: base64Tx,
            animalPda: animalPda.toBase58(),
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }
        };
    }

    async addRancherSignature(
        dto: AddRancherSignatureDto,
        rancherPubkeyStr: string,
    ): Promise<{ status: string }> {
        const pendingTx = await this.pendingTxRepository.findOne({
            where: { animalPda: dto.animal_pda, rancherPubkey: rancherPubkeyStr },
        });

        if (!pendingTx) {
            throw new NotFoundException(`Pending transaction for animal ${dto.animal_pda} not found.`);
        }
        if (pendingTx.status !== TxStatus.PENDING_RANCHER_SIGNATURE) {
            throw new BadRequestException(`Transaction status is ${pendingTx.status}, not awaiting rancher signature.`);
        }

        try {
            const tx = Transaction.from(Buffer.from(dto.signed_tx, 'base64'));
            if (!tx.signatures.some(sig => sig.signature !== null)) {
                throw new Error('Transaction has no signatures.');
            }
        } catch (e) {
            this.logger.warn(`Invalid signed transaction received for ${dto.animal_pda}: ${e.message}`);
            throw new BadRequestException(`Invalid transaction format or signature.`);
        }

        pendingTx.serializedTx = dto.signed_tx;
        pendingTx.status = TxStatus.PENDING_VERIFIER_SIGNATURE;
        await this.pendingTxRepository.save(pendingTx);

        this.logger.log(`Rancher signature added for ${dto.animal_pda}. Awaiting verifier.`);
        return { status: TxStatus.PENDING_VERIFIER_SIGNATURE };
    }

    async getPendingForVerifier(
        verifierPubkeyStr: string,
    ): Promise<PendingTransaction[]> {
        this.logger.log(`Fetching pending transactions for verifier ${verifierPubkeyStr}`);
        return this.pendingTxRepository.find({
            where: {
                verifierPubkey: verifierPubkeyStr,
                status: TxStatus.PENDING_VERIFIER_SIGNATURE,
            },
            order: { createdAt: 'DESC' }
        });
    }

    async getTxForVerifier(
        animalPdaStr: string,
        verifierPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        const pendingTx = await this.pendingTxRepository.findOne({
            where: {
                animalPda: animalPdaStr,
                verifierPubkey: verifierPubkeyStr,
                status: TxStatus.PENDING_VERIFIER_SIGNATURE,
            },
        });
        if (!pendingTx) {
            throw new NotFoundException(`Pending transaction for animal ${animalPdaStr} not found or not awaiting your signature.`);
        }

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();

        this.logger.log(`Providing TX for animal ${animalPdaStr} to verifier ${verifierPubkeyStr}`);
        return {
            transaction: pendingTx.serializedTx,
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            }
        };
    }

    async confirmRegistration(
        dto: ConfirmAnimalDto,
        verifierPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Verifier ${verifierPubkeyStr} confirming registration for animal ${dto.animal_pda} with TX ${dto.txid}`);

        const program = this.solanaService.getProgram();

        const pendingTx = await this.pendingTxRepository.findOne({
            where: {
                animalPda: dto.animal_pda,
                verifierPubkey: verifierPubkeyStr,
                status: TxStatus.PENDING_VERIFIER_SIGNATURE,
            },
        });
        if (!pendingTx) {
            this.logger.warn(`Confirm request received for unknown or already processed pending TX for animal ${dto.animal_pda}`);
            const existingAnimal = await this.animalRepository.findOne({ where: { pda: dto.animal_pda } });
            if (existingAnimal) {
                throw new ConflictException(`Animal ${dto.animal_pda} has already been registered.`);
            }
            throw new NotFoundException(`Pending transaction for animal ${dto.animal_pda} not found or not awaiting your confirmation.`);
        }

        let confirmation;
        try {
            confirmation = await this.solanaService.connection.confirmTransaction(
                {
                    signature: dto.txid,
                    blockhash: dto.latestBlockhash.blockhash,
                    lastValidBlockHeight: dto.latestBlockhash.lastValidBlockHeight,
                },
                'confirmed',
            );
        } catch (error) {
            this.logger.error(`Error confirming TX ${dto.txid} on-chain: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Network or RPC error during transaction confirmation: ${error.message}`);
        }


        if (confirmation.value.err) {
            pendingTx.status = TxStatus.FAILED;
            pendingTx.errorMessage = confirmation.value.err.toString();
            pendingTx.finalTxSignature = dto.txid;
            await this.pendingTxRepository.save(pendingTx);
            this.logger.error(`Transaction ${dto.txid} for animal ${dto.animal_pda} failed on-chain: ${confirmation.value.err}`);
            throw new BadRequestException(`Transaction failed to confirm on-chain: ${confirmation.value.err}`);
        }

        const animalPda = new PublicKey(dto.animal_pda);
        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
            this.logger.log(`Fetched on-chain data for animal ${dto.animal_pda}`);
        } catch (e) {
            this.logger.error(`CRITICAL: Failed to fetch animal account ${dto.animal_pda} after TX ${dto.txid} confirmation: ${e.message}`, e.stack);
            pendingTx.status = TxStatus.FAILED;
            pendingTx.errorMessage = `Fetch failed after confirmation: ${e.message}`;
            pendingTx.finalTxSignature = dto.txid;
            await this.pendingTxRepository.save(pendingTx);
            throw new InternalServerErrorException(`Failed to fetch animal account data after successful confirmation.`);
        }

        const owner = await this.userRepository.findOne({
            where: { pubkey: onChainData.owner.toBase58() },
        });
        const originRanch = await this.ranchRepository.findOne({
            where: { pda: onChainData.originRanch.toBase58() },
        });
        if (!owner) {
            this.logger.error(`Owner user ${onChainData.owner.toBase58()} not found in DB for animal ${dto.animal_pda}`);
            throw new InternalServerErrorException('Owner user record not found in database.');
        }
        if (!originRanch) {
            this.logger.error(`Origin ranch ${onChainData.originRanch.toBase58()} not found in DB for animal ${dto.animal_pda}`);
            throw new InternalServerErrorException('Origin ranch record not found in database.');
        }

        const newAnimal = this.animalRepository.create({
            pda: animalPda.toBase58(),
            owner: owner,
            originRanch: originRanch,
            idChip: onChainData.idChip,
            specie: onChainData.specie,
            breed: onChainData.breed,
            birthDate: new Date(onChainData.birthDate.toNumber() * 1000),
            salePrice: onChainData.salePrice?.toString() ?? null,
            lastSalePrice: onChainData.lastSalePrice.toString(),
            allowedBuyerPubkey: onChainData.allowedBuyer?.toBase58() ?? null,
        });
        try {
            await this.animalRepository.save(newAnimal);
            this.logger.log(`Animal ${animalPda.toBase58()} saved to database.`);
        } catch (dbError) {
            this.logger.error(`Failed to save animal ${animalPda.toBase58()} to DB: ${dbError.message}`, dbError.stack);
            throw new InternalServerErrorException('Failed to save animal data to database after confirmation.');
        }

        const newAnimalCount = onChainData.id.toNumber() + 1;
        if (originRanch.animalCount !== newAnimalCount) {
            this.logger.log(`Updating ranch ${originRanch.pda} animal count from ${originRanch.animalCount} to ${newAnimalCount}`);
            originRanch.animalCount = newAnimalCount;
            await this.ranchRepository.save(originRanch);
        }

        await this.pendingTxRepository.remove(pendingTx);
        this.logger.log(`Pending transaction for animal ${dto.animal_pda} removed.`);

        return newAnimal;
    }

    async buildSetPriceTx(
        animalPdaStr: string,
        dto: SetAnimalPriceDto,
        ownerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building 'set_animal_price' tx for ${animalPdaStr} by owner ${ownerPubkeyStr}`);
        const ownerPubkey = new PublicKey(ownerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        let animalAccount;
        try {
            animalAccount = await program.account.animal.fetch(animalPda);
        } catch (e) {
            this.logger.error(`Animal ${animalPdaStr} not found on-chain.`);
            throw new NotFoundException(`Animal ${animalPdaStr} not found on-chain.`);
        }

        if (animalAccount.owner.toBase58() !== ownerPubkeyStr) {
            throw new ForbiddenException('Only the owner can set the animal price.');
        }

        const instruction = await program.methods
            .setAnimalPrice(new BN(dto.price))
            .accounts({
                animal: animalPda,
                owner: ownerPubkey,
                originRanch: animalAccount.originRanch,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: ownerPubkey, 
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        const serializedTx = tx.serialize({ requireAllSignatures: false });

        return {
            transaction: serializedTx.toString('base64'),
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
        };
    }

    async confirmSetPrice(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        ownerPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Confirming 'set_animal_price' for ${animalPdaStr} with TX ${dto.txid}`);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash }, 'confirmed'
        );
        if (confirmation.value.err) {
            this.logger.warn(`'set_animal_price' TX ${dto.txid} failed: ${confirmation.value.err}`);
            throw new BadRequestException(`Transaction failed: ${confirmation.value.err}`);
        }

        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
        } catch (e) {
            this.logger.error(`Failed to fetch animal ${animalPdaStr} after confirmSetPrice: ${e.message}`, e.stack);
            throw new InternalServerErrorException('Failed to fetch updated animal data.');
        }

        const animalInDb = await this.animalRepository.findOne({ where: { pda: animalPdaStr }, relations: ['owner'] });
        if (!animalInDb) {
            this.logger.error(`Animal ${animalPdaStr} not found in DB after confirmSetPrice.`);
            throw new NotFoundException(`Animal ${animalPdaStr} not found in DB.`);
        }

        if (animalInDb.owner.pubkey !== ownerPubkeyStr) {
            this.logger.warn(`confirmSetPrice called by ${ownerPubkeyStr} but DB owner is ${animalInDb.owner.pubkey}`);
        }

        animalInDb.salePrice = onChainData.salePrice?.toString() ?? null;
        await this.animalRepository.save(animalInDb);
        this.logger.log(`Animal ${animalPdaStr} price updated in DB to ${animalInDb.salePrice}`);

        return animalInDb;
    }

    async buildSetAllowedBuyerTx(
        animalPdaStr: string,
        dto: SetAllowedBuyerDto,
        ownerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building 'set_allowed_animal_buyer' tx for ${animalPdaStr} by owner ${ownerPubkeyStr}`);
        const ownerPubkey = new PublicKey(ownerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const allowedBuyer = new PublicKey(dto.allowedBuyerPubkey);
        const program = this.solanaService.getProgram();

        let animalAccount;
        try {
            animalAccount = await program.account.animal.fetch(animalPda);
        } catch (e) { throw new NotFoundException(`Animal ${animalPdaStr} not found on-chain.`); }

        if (animalAccount.owner.toBase58() !== ownerPubkeyStr) {
            throw new ForbiddenException('Only the owner can set the allowed buyer.');
        }

        const instruction = await program.methods
            .setAllowedAnimalBuyer(allowedBuyer)
            .accounts({
                animal: animalPda,
                owner: ownerPubkey,
                originRanch: animalAccount.originRanch,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction();
        tx.feePayer = ownerPubkey;
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        tx.add(instruction);
        const serializedTx = tx.serialize({ requireAllSignatures: false });

        return {
            transaction: serializedTx.toString('base64'),
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
        };
    }

    async confirmSetAllowedBuyer(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        ownerPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Confirming 'set_allowed_buyer' for ${animalPdaStr} with TX ${dto.txid}`);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash }, 'confirmed'
        );
        if (confirmation.value.err) { throw new BadRequestException(`TX failed: ${confirmation.value.err}`); }

        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
        } catch (e) { throw new InternalServerErrorException('Failed to fetch updated data.'); }

        const animalInDb = await this.animalRepository.findOne({ where: { pda: animalPdaStr } });
        if (!animalInDb) { throw new NotFoundException(`Animal ${animalPdaStr} not found in DB.`); }

        animalInDb.allowedBuyerPubkey = onChainData.allowedBuyer?.toBase58() ?? null;
        await this.animalRepository.save(animalInDb);
        this.logger.log(`Animal ${animalPdaStr} allowed buyer updated in DB to ${animalInDb.allowedBuyerPubkey}`);

        return animalInDb;
    }

    async buildPurchaseTx(
        animalPdaStr: string,
        buyerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building 'purchase_animal' tx for ${animalPdaStr} by buyer ${buyerPubkeyStr}`);
        const buyerPubkey = new PublicKey(buyerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        let animalAccount;
        try {
            animalAccount = await program.account.animal.fetch(animalPda);
        } catch (e) { throw new NotFoundException(`Animal ${animalPdaStr} not found on-chain.`); }

        if (!animalAccount.salePrice) {
            throw new BadRequestException(`Animal ${animalPdaStr} is not for sale.`);
        }
        if (!animalAccount.allowedBuyer || animalAccount.allowedBuyer.toBase58() !== buyerPubkeyStr) {
            throw new ForbiddenException(`Buyer ${buyerPubkeyStr} is not allowed to purchase this animal.`);
        }
        const instruction = await program.methods
            .purchaseAnimal()
            .accounts({
                animal: animalPda,
                owner: animalAccount.owner,
                buyer: buyerPubkey,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction();
        tx.feePayer = buyerPubkey;
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        tx.add(instruction);
        const serializedTx = tx.serialize({ requireAllSignatures: false });

        return {
            transaction: serializedTx.toString('base64'),
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
        };
    }

    async confirmPurchase(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        buyerPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Confirming 'purchase_animal' for ${animalPdaStr} by buyer ${buyerPubkeyStr} with TX ${dto.txid}`);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash }, 'confirmed'
        );
        if (confirmation.value.err) { throw new BadRequestException(`TX failed: ${confirmation.value.err}`); }

        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
        } catch (e) { throw new InternalServerErrorException('Failed to fetch updated data after purchase.'); }

        const animalInDb = await this.animalRepository.findOne({ where: { pda: animalPdaStr }, relations: ['owner'] });
        if (!animalInDb) { throw new NotFoundException(`Animal ${animalPdaStr} not found in DB.`); }

        if (onChainData.owner.toBase58() !== buyerPubkeyStr) {
            this.logger.error(`CRITICAL: Purchase confirmed (TX ${dto.txid}), but on-chain owner ${onChainData.owner.toBase58()} is not the buyer ${buyerPubkeyStr}!`);
            throw new InternalServerErrorException('Ownership mismatch after purchase confirmation.');
        }

        const newOwnerUser = await this.userRepository.findOneBy({ pubkey: buyerPubkeyStr });
        if (!newOwnerUser) {
            this.logger.error(`New owner user ${buyerPubkeyStr} not found in DB after purchase.`);
            throw new InternalServerErrorException('New owner user record not found.');
        }

        animalInDb.owner = newOwnerUser;
        animalInDb.lastSalePrice = onChainData.lastSalePrice.toString();
        animalInDb.salePrice = onChainData.salePrice?.toString() ?? null;
        animalInDb.allowedBuyerPubkey = onChainData.allowedBuyer?.toBase58() ?? null; 

        await this.animalRepository.save(animalInDb);
        this.logger.log(`Animal ${animalPdaStr} ownership transferred to ${buyerPubkeyStr} in DB.`);

        return animalInDb;
    }

    async findAnimalByPda(pda: string): Promise<Animal> {
        const animal = await this.animalRepository.findOne({
            where: { pda },
            relations: ['owner', 'originRanch']
        });
        if (!animal) {
            throw new NotFoundException(`Animal with PDA ${pda} not found.`);
        }
        return animal;
    }

    async findAllWithFilters(
    queryDto: FindAnimalsQueryDto,
  ): Promise<{ data: Animal[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 10,
      specie,
      breed,
      ranchPda,
      isOnSale,
      minPrice,
      maxPrice,
    } = queryDto;

    const skip = (page - 1) * limit;

    const queryBuilder = this.animalRepository.createQueryBuilder('animal')
      .leftJoinAndSelect('animal.owner', 'owner')
      .leftJoinAndSelect('animal.originRanch', 'originRanch');

    if (specie) {
      queryBuilder.andWhere('animal.specie ILIKE :specie', { specie: `%${specie}%` });
    }

    if (breed) {
      queryBuilder.andWhere('animal.breed ILIKE :breed', { breed: `%${breed}%` });
    }

    if (ranchPda) {
      queryBuilder.andWhere('originRanch.pda = :ranchPda', { ranchPda });
    }

    if (isOnSale !== undefined) {
      if (isOnSale) {
        queryBuilder.andWhere('animal.salePrice IS NOT NULL');
      } else {
        queryBuilder.andWhere('animal.salePrice IS NULL');
      }
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice });
    } else if (minPrice !== undefined) {
      queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) >= :minPrice', { minPrice });
    } else if (maxPrice !== undefined) {
      queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) <= :maxPrice', { maxPrice });
    }

    queryBuilder.orderBy('animal.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`Found ${total} animals matching filters, returning page ${page}/${Math.ceil(total / limit)}`);

    return { data, total, page, limit };
  }

}