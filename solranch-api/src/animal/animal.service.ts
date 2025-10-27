import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolanaService } from '../solana/solana.service';
import { Ranch } from '../ranch/entities/ranch.entity';
import { Verifier } from '../verifier/entities/verifier.entity';
import { Animal } from './entities/animal.entity';
import { User } from '../auth/entities/user.entity';
import { PendingTransaction } from './entities/pending-tx.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { ConfirmAnimalDto } from './dto/confirm-animal.dto';
import { AddRancherSignatureDto } from './dto/add-rancher-signature.dto';
import { ConfirmTxDto } from './dto/confirm-tx.dto';
import { SetAnimalPriceDto } from './dto/set-animal-price.dto';
import { SetAllowedBuyerDto } from './dto/set-allowed-buyer.dto';
import { FindAnimalsQueryDto } from './dto/find-animals-query.dto';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export enum TxStatus {
    PENDING_RANCHER_SIGNATURE = 'PENDING_RANCHER_SIGNATURE',
    PENDING_VERIFIER_SIGNATURE = 'PENDING_VERIFIER_SIGNATURE',
    CONFIRMED = 'CONFIRMED',
}

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
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(PendingTransaction)
        private readonly pendingTxRepository: Repository<PendingTransaction>,
    ) {
        this.logger.log('AnimalService initialized');
    }

    async buildRegisterAnimalTx(
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

        if (!verifierProfile || !verifierProfile.user) {
            throw new NotFoundException(`Active verifier with PDA ${dto.verifier_pda} not found.`);
        }

        const verifierProfilePda = new PublicKey(verifierProfile.pda);
        const ranchPda = new PublicKey(ranch.pda);

        let onChainAnimalCount: BN;
        try {
            const onChainRanchProfile = await program.account.ranchProfile.fetch(ranchPda);
            onChainAnimalCount = onChainRanchProfile.animalCount; // Este es el valor real
        } catch (e) {
            this.logger.error(`Failed to fetch on-chain ranch profile ${ranchPda.toBase58()}`, e);
            throw new InternalServerErrorException('Failed to fetch on-chain ranch data.');
        }

        const animalCountBuffer = new BN(onChainAnimalCount).toArrayLike(Buffer, 'le', 8);

        const [animalPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('ranch_animal'), ranchPda.toBuffer(), animalCountBuffer],
            program.programId,
        );

        this.logger.log(`Building register_animal TX for animal ${animalPda.toBase58()}`);

        const instruction = await program.methods
            .registerAnimal(dto.id_chip, dto.specie, dto.breed, new BN(dto.birth_date))
            .accounts({
                animal: animalPda,
                verifierProfile: verifierProfilePda,
                ranchProfile: ranchPda,
                authority: rancherPubkey,
                systemProgram: SystemProgram.programId,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: rancherPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        return {
            transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
            animalPda: animalPda.toBase58(),
            blockhash: latestBlockhash,
        };
    }


    async confirmRegisterAnimal(
        dto: ConfirmTxDto,
        rancherPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Rancher ${rancherPubkeyStr} confirming registration for animal ${dto.animal_pda} with TX ${dto.txid}`);

        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            this.logger.error('Transaction confirmation failed', confirmation.value.err);
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        const animalPda = new PublicKey(dto.animal_pda);
        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
        } catch (e) {
            this.logger.error('Failed to fetch on-chain animal after confirm', e);
            throw new InternalServerErrorException('Failed to fetch on-chain animal data after confirmation.');
        }

        const owner = await this.userRepository.findOne({ where: { pubkey: onChainData.owner.toBase58() } });
        const originRanch = await this.ranchRepository.findOne({ where: { pda: onChainData.originRanch.toBase58() } });

        if (!owner || !originRanch) {
            this.logger.error('Owner or ranch not found in DB after on-chain confirm', { owner: !!owner, originRanch: !!originRanch });
            throw new InternalServerErrorException('Owner or ranch not found in database.');
        }

        const newAnimal = this.animalRepository.create({
            pda: dto.animal_pda,
            owner,
            originRanch,
            idChip: onChainData.idChip,
            specie: onChainData.specie,
            breed: onChainData.breed,
            birthDate: new Date(onChainData.birthDate.toNumber() * 1000),
            isVerified: onChainData.isVerified,
            assignedVerifierPubkey: onChainData.assignedVerifier.toBase58(),
            salePrice: onChainData.salePrice?.toString() ?? null,
            lastSalePrice: onChainData.lastSalePrice.toString(),
            allowedBuyerPubkey: onChainData.allowedBuyer?.toBase58() ?? null,
        });

        await this.animalRepository.save(newAnimal);

        originRanch.animalCount = Number(originRanch.animalCount || 0) + 1;
        await this.ranchRepository.save(originRanch);

        this.logger.log(`Animal ${dto.animal_pda} saved in DB and ranch count updated`);

        return newAnimal;
    }

    async buildApproveAnimalTx(
        animalPdaStr: string,
        verifierPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building approve_animal TX for ${animalPdaStr} by verifier ${verifierPubkeyStr}`);

        const program = this.solanaService.getProgram();
        const animalPda = new PublicKey(animalPdaStr);
        const verifierPubkey = new PublicKey(verifierPubkeyStr);

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['owner', 'originRanch'],
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal ${animalPdaStr} not found in database.`);
        }

        if (animalInDb.assignedVerifierPubkey !== verifierPubkeyStr) {
            throw new ForbiddenException('You are not the assigned verifier for this animal.');
        }

        if (animalInDb.isVerified) {
            throw new BadRequestException('Animal is already verified.');
        }

        const instruction = await program.methods
            .approveAnimal()
            .accounts({
                animal: animalPda,
                assignedVerifier: verifierPubkey,
                systemProgram: SystemProgram.programId,
            })
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: verifierPubkey,
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


    async confirmApproveAnimal(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        verifierPubkeyStr: string,
    ): Promise<Animal> {
        this.logger.log(`Verifier ${verifierPubkeyStr} confirming approval for animal ${animalPdaStr} with TX ${dto.txid}`);

        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            this.logger.error('Approve tx failed', confirmation.value.err);
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        const animalPda = new PublicKey(animalPdaStr);
        let onChainData;
        try {
            onChainData = await program.account.animal.fetch(animalPda);
        } catch (e) {
            this.logger.error('Failed to fetch animal after approval', e);
            throw new InternalServerErrorException('Failed to fetch updated animal data.');
        }

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['owner', 'originRanch'],
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal ${animalPdaStr} not found in database.`);
        }

        animalInDb.isVerified = onChainData.isVerified;
        await this.animalRepository.save(animalInDb);

        try {
            await this.pendingTxRepository.delete({ animalPda: animalPdaStr });
        } catch (e) {
            this.logger.warn('Failed to delete pending tx on approve', e);
        }

        this.logger.log(`Animal ${animalPdaStr} approved and updated in database`);

        return animalInDb;
    }

    async buildCancelAnimalTx(
        animalPdaStr: string,
        signerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building cancel_animal_registration TX for ${animalPdaStr} by ${signerPubkeyStr}`);

        const program = this.solanaService.getProgram();
        const animalPda = new PublicKey(animalPdaStr);
        const signerPubkey = new PublicKey(signerPubkeyStr);

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['owner', 'originRanch'],
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal ${animalPdaStr} not found in database.`);
        }

        if (animalInDb.isVerified) {
            throw new BadRequestException('Cannot cancel a verified animal.');
        }

        if (animalInDb.salePrice) {
            throw new BadRequestException('Cannot cancel a registration for an animal that is listed for sale.');
        }

        if (
            animalInDb.owner.pubkey !== signerPubkeyStr &&
            animalInDb.assignedVerifierPubkey !== signerPubkeyStr
        ) {
            throw new ForbiddenException('Only the owner or assigned verifier can cancel.');
        }

        const ranchPda = new PublicKey(animalInDb.originRanch.pda);

        const instruction = await program.methods
            .cancelAnimalRegistration()
            .accounts({
                animal: animalPda,
                ranchProfile: ranchPda,
                signer: signerPubkey,
                authority: new PublicKey(animalInDb.owner.pubkey),
                receiver: signerPubkey,
                systemProgram: SystemProgram.programId,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: signerPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        return {
            transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
            blockhash: {
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
        };
    }


    async confirmCancelAnimal(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        signerPubkeyStr: string,
    ): Promise<{ message: string }> {
        this.logger.log(`Confirming cancel/reject for animal ${animalPdaStr} by ${signerPubkeyStr}`);

        const program = this.solanaService.getProgram();

        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            this.logger.error('Cancel/Reject transaction failed', confirmation.value.err);
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        try {
            await program.account.animal.fetch(new PublicKey(animalPdaStr));
            this.logger.error(`Animal account ${animalPdaStr} still exists after cancel/reject tx.`);
            throw new InternalServerErrorException('Animal account was not closed on-chain.');
        } catch (e) {
            const msg = e?.message || '';
            if (
                msg.includes('Account does not exist') ||
                msg.includes('Could not find account') ||
                msg.includes('accounts not found')
            ) {
                this.logger.log(`Animal account ${animalPdaStr} successfully closed on-chain.`);
            } else {
                this.logger.error('Error verifying account closure', e);
                throw new InternalServerErrorException('Failed to verify account closure.');
            }
        }

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['originRanch'],
        });

        if (animalInDb) {
            const ranch = animalInDb.originRanch;

            await this.animalRepository.remove(animalInDb);
            this.logger.log(`Animal ${animalPdaStr} removed from DB.`);

            if (ranch) {
                ranch.animalCount = Math.max(0, Number(ranch.animalCount || 0) - 1);
                await this.ranchRepository.save(ranch);
                this.logger.log(`Ranch ${ranch.pda} animalCount decremented.`);
            }
        } else {
            this.logger.warn(`Animal ${animalPdaStr} not found in DB. Possibly already removed.`);
        }

        try {
            await this.pendingTxRepository.delete({ animalPda: animalPdaStr });
            this.logger.log(`Pending transactions for animal ${animalPdaStr} cleared.`);
        } catch (e) {
            this.logger.warn('Failed to delete pending tx for animal after cancel/reject', e);
        }

        return { message: 'Animal registration cancelled/rejected successfully.' };
    }

    async buildRejectAnimalTx(animalPdaStr: string, verifierPubkeyStr: string) {
        return this.buildCancelAnimalTx(animalPdaStr, verifierPubkeyStr);
    }

    async confirmRejectAnimal(
        animalPdaStr: string,
        dto: ConfirmTxDto,
        verifierPubkeyStr: string,
    ) {
        return this.confirmCancelAnimal(animalPdaStr, dto, verifierPubkeyStr);
    }

    async buildSetPriceTx(
        animalPdaStr: string,
        dto: SetAnimalPriceDto,
        ownerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        this.logger.log(`Building set_animal_price tx for ${animalPdaStr}`);

        const ownerPubkey = new PublicKey(ownerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        let animalAccount;
        try {
            animalAccount = await program.account.animal.fetch(animalPda);
        } catch (e) {
            throw new NotFoundException(`Animal ${animalPdaStr} not found on-chain.`);
        }

        if (animalAccount.owner.toBase58() !== ownerPubkeyStr) {
            throw new ForbiddenException('Only the owner can set the price.');
        }

        if (!animalAccount.isVerified) {
            throw new BadRequestException('Cannot set price for an unverified animal.');
        }

        const instruction = await program.methods
            .setAnimalPrice(new BN(dto.price))
            .accounts({
                animal: animalPda,
                owner: ownerPubkey,
                originRanch: animalAccount.originRanch,
                systemProgram: SystemProgram.programId,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: ownerPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        return {
            transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
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
        const program = this.solanaService.getProgram();
        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        const animalPda = new PublicKey(animalPdaStr);
        const onChainData = await program.account.animal.fetch(animalPda);

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['owner'],
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal not found in database.`);
        }

        animalInDb.salePrice = onChainData.salePrice?.toString() ?? null;
        await this.animalRepository.save(animalInDb);

        return animalInDb;
    }

    async buildSetAllowedBuyerTx(
        animalPdaStr: string,
        dto: SetAllowedBuyerDto,
        ownerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        const ownerPubkey = new PublicKey(ownerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const allowedBuyer = new PublicKey(dto.allowedBuyerPubkey);
        const program = this.solanaService.getProgram();

        const animalAccount = await program.account.animal.fetch(animalPda);

        if (animalAccount.owner.toBase58() !== ownerPubkeyStr) {
            throw new ForbiddenException('Only the owner can set the allowed buyer.');
        }

        const instruction = await program.methods
            .setAllowedAnimalBuyer(allowedBuyer)
            .accounts({
                animal: animalPda,
                owner: ownerPubkey,
                originRanch: animalAccount.originRanch,
                systemProgram: SystemProgram.programId,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: ownerPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        return {
            transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
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
        const program = this.solanaService.getProgram();
        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        const animalPda = new PublicKey(animalPdaStr);
        const onChainData = await program.account.animal.fetch(animalPda);

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal not found.`);
        }

        animalInDb.allowedBuyerPubkey = onChainData.allowedBuyer?.toBase58() ?? null;
        await this.animalRepository.save(animalInDb);

        return animalInDb;
    }


    async buildPurchaseTx(
        animalPdaStr: string,
        buyerPubkeyStr: string,
    ): Promise<{ transaction: string; blockhash: any }> {
        const buyerPubkey = new PublicKey(buyerPubkeyStr);
        const animalPda = new PublicKey(animalPdaStr);
        const program = this.solanaService.getProgram();

        const animalAccount = await program.account.animal.fetch(animalPda);

        if (!animalAccount.salePrice) {
            throw new BadRequestException('Animal is not for sale.');
        }

        if (!animalAccount.allowedBuyer || animalAccount.allowedBuyer.toBase58() !== buyerPubkeyStr) {
            throw new ForbiddenException('You are not allowed to purchase this animal.');
        }

        if (animalAccount.owner.toBase58() === buyerPubkeyStr) {
            throw new BadRequestException('Owner cannot purchase their own animal.');
        }

        const instruction = await program.methods
            .purchaseAnimal()
            .accounts({
                animal: animalPda,
                owner: animalAccount.owner,
                buyer: buyerPubkey,
                systemProgram: SystemProgram.programId,
            } as any)
            .instruction();

        const latestBlockhash = await this.solanaService.connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: buyerPubkey,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        });
        tx.add(instruction);

        return {
            transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
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
        const program = this.solanaService.getProgram();
        const confirmation = await this.solanaService.connection.confirmTransaction(
            { signature: dto.txid, ...dto.latestBlockhash },
            'finalized',
        );

        if (confirmation.value.err) {
            throw new BadRequestException(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        const animalPda = new PublicKey(animalPdaStr);
        const onChainData = await program.account.animal.fetch(animalPda);

        if (onChainData.owner.toBase58() !== buyerPubkeyStr) {
            throw new InternalServerErrorException('Ownership mismatch after purchase.');
        }

        const newOwner = await this.userRepository.findOneBy({ pubkey: buyerPubkeyStr });
        if (!newOwner) {
            throw new InternalServerErrorException('New owner not found in database.');
        }

        const animalInDb = await this.animalRepository.findOne({
            where: { pda: animalPdaStr },
            relations: ['owner'],
        });

        if (!animalInDb) {
            throw new NotFoundException(`Animal not found.`);
        }

        animalInDb.owner = newOwner;
        animalInDb.lastSalePrice = onChainData.lastSalePrice.toString();
        animalInDb.salePrice = onChainData.salePrice?.toString() ?? null;
        animalInDb.allowedBuyerPubkey = onChainData.allowedBuyer?.toBase58() ?? null;

        await this.animalRepository.save(animalInDb);

        return animalInDb;
    }

    async findAnimalByPda(pda: string): Promise<Animal> {
        const animal = await this.animalRepository.findOne({
            where: { pda },
            relations: ['owner', 'originRanch'],
        });

        if (!animal) {
            throw new NotFoundException(`Animal with PDA ${pda} not found.`);
        }

        return animal;
    }

    async findAllWithFilters(queryDto: FindAnimalsQueryDto): Promise<{
        data: Animal[];
        total: number;
        page: number;
        limit: number;
    }> {
        const { page = 1, limit = 10, specie, breed, ranchPda, country, isOnSale, minPrice, maxPrice } = queryDto;
        const skip = (page - 1) * limit;

        const queryBuilder = this.animalRepository
            .createQueryBuilder('animal')
            .leftJoinAndSelect('animal.owner', 'owner')
            .leftJoinAndSelect('animal.originRanch', 'originRanch');

        if (specie) queryBuilder.andWhere('animal.specie ILIKE :specie', { specie: `%${specie}%` });
        if (breed) queryBuilder.andWhere('animal.breed ILIKE :breed', { breed: `%${breed}%` });
        if (ranchPda) queryBuilder.andWhere('originRanch.pda = :ranchPda', { ranchPda });
        if (country) queryBuilder.andWhere('originRanch.country = :country', { country });
        if (isOnSale !== undefined) {
            queryBuilder.andWhere(
                isOnSale ? 'animal.salePrice IS NOT NULL' : 'animal.salePrice IS NULL',
            );
        }
        if (minPrice !== undefined && maxPrice !== undefined) {
            queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) BETWEEN :minPrice AND :maxPrice', {
                minPrice,
                maxPrice,
            });
        } else if (minPrice !== undefined) {
            queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) >= :minPrice', { minPrice });
        } else if (maxPrice !== undefined) {
            queryBuilder.andWhere('CAST(animal.salePrice AS BIGINT) <= :maxPrice', { maxPrice });
        }

        queryBuilder.orderBy('animal.createdAt', 'DESC');
        queryBuilder.skip(skip).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return { data, total, page, limit };
    }

    async getPendingAnimalsForVerifier(verifierPubkeyStr: string): Promise<Animal[]> {
        this.logger.log(`Fetching pending animals for verifier ${verifierPubkeyStr}`);

        return this.animalRepository.find({
            where: {
                assignedVerifierPubkey: verifierPubkeyStr,
                isVerified: false,
            },
            relations: ['owner', 'originRanch'],
            order: { createdAt: 'DESC' },
        });
    }

    async findPendingForRancher(rancherPubkey: string): Promise<Animal[]> {
        this.logger.log(`Fetching pending animals for rancher ${rancherPubkey}`);

        return this.animalRepository.find({
            where: {
                owner: { pubkey: rancherPubkey },
                isVerified: false,
            },
            relations: ['owner', 'originRanch'],
            order: { createdAt: 'DESC' },
        });
    }
}