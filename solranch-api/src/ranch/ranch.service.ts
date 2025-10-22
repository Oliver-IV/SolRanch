import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { SolanaService } from '../solana/solana.service';
import { RegisterRanchDto } from './dto/register-ranch.dto';
import { ConfirmRanchDto } from './dto/confirm-ranch.dto';
import { Ranch } from './entities/ranch.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { AuthService } from '../auth/services/auth.service';

@Injectable()
export class RanchService {
  private readonly logger = new Logger(RanchService.name);
  private readonly adminKeypair: Keypair;

  constructor(
    private readonly solanaService: SolanaService,
    private readonly configService: ConfigService,
    @InjectRepository(Ranch)
    private readonly ranchRepository: Repository<Ranch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecret) {
      this.logger.error('ADMIN_SECRET_KEY not set'); 
      throw new InternalServerErrorException('ADMIN_SECRET_KEY not set');
    }
    this.adminKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
    this.logger.log('RanchService initialized');
  }

  async buildRegisterTransaction(
    dto: RegisterRanchDto,
    rancherPubkeyStr: string,
  ): Promise<{ transaction: string; latestBlockhash: any }> {
    this.logger.log(`Building 'register_ranch' tx for ${rancherPubkeyStr}`);
    const rancherPubkey = new PublicKey(rancherPubkeyStr);
    const program = this.solanaService.getProgram();

    const [ranchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('ranch'), rancherPubkey.toBuffer()],
      program.programId,
    );

    const instruction = await program.methods
      .registerRanch(dto.name, { [dto.country]: {} })
      .accounts({
        authority: rancherPubkey,
        ranchProfile: ranchPda, 
      } as any)
      .instruction();

    const latestBlockhash =
      await this.solanaService.connection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: rancherPubkey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    tx.add(instruction);

    const serializedTx = tx.serialize({
      requireAllSignatures: false,
    });

    return {
      transaction: serializedTx.toString('base64'),
      latestBlockhash: {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
    };
  }

  async confirmRegistration(
    dto: ConfirmRanchDto,
    rancherPubkeyStr: string,
  ): Promise<Ranch> {
    const rancherPubkey = new PublicKey(rancherPubkeyStr);
    const { txid, latestBlockhash } = dto;
    const program = this.solanaService.getProgram();

    const confirmation =
      await this.solanaService.connection.confirmTransaction(
        {
          signature: txid,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed',
      );

    if (confirmation.value.err) {
      this.logger.warn(
        `'register_ranch' TX ${txid} failed to confirm: ${confirmation.value.err}`,
      );
      throw new BadRequestException('Transaction failed to confirm on-chain.');
    }
    this.logger.log(`Confirmed 'register_ranch' TX: ${txid}`);

    const [ranchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('ranch'), rancherPubkey.toBuffer()],
      program.programId,
    );

    let onChainData;
    try {
      onChainData = await program.account.ranchProfile.fetch(ranchPda);
    } catch (e) {
      this.logger.error(
        `Failed to fetch ranch PDA ${ranchPda.toBase58()} after confirmation. TX: ${txid}`,
        e.stack,
      );
      throw new NotFoundException('Ranch account not found after confirmation.');
    }
    
    const user = await this.userRepository.findOne({
      where: { pubkey: rancherPubkeyStr },
    });
    if (!user) {
      this.logger.error(
        `User ${rancherPubkeyStr} not found in DB after TX ${txid} confirmation.`,
      );
      throw new NotFoundException('User not found in database.');
    }

    const newRanch = this.ranchRepository.create({
      pda: ranchPda.toBase58(),
      user: user,
      name: onChainData.name,
      country: Object.keys(onChainData.country)[0],
      isVerified: onChainData.isVerified,
      animalCount: Number(onChainData.animalCount),
    });
    await this.ranchRepository.save(newRanch);
    this.logger.log(
      `Ranch ${onChainData.name} (PDA: ${ranchPda.toBase58()}) saved to DB.`,
    );

    if (!user.roles.includes(UserRole.RANCHER)) {
      user.roles.push(UserRole.RANCHER);
      await this.userRepository.save(user);
      this.logger.log(`Role RANCHER added to user ${user.pubkey}`);
    }

    return newRanch;
  }

  async verifyRanch(pdaToVerify: string): Promise<Ranch> {
    const program = this.solanaService.getProgram();
    const ranchPda = new PublicKey(pdaToVerify);

    this.logger.log(
      `Admin (SuperAuthority) verifying ranch: ${pdaToVerify}`,
    );

    try {
      const txid = await program.methods
        .verifyRanch()
        .accounts({
          superAuthority: this.adminKeypair.publicKey,
          ranchProfile: ranchPda,
        } as any)
        .rpc({ commitment: 'confirmed' });

      this.logger.log(`Confirmed 'verify_ranch' TX: ${txid}`);
    } catch (error) {
      this.logger.error(
        `Failed to verify ranch ${pdaToVerify}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `On-chain verification failed: ${error.message}`,
      );
    }

    const ranchInDb = await this.ranchRepository.findOne({
      where: { pda: pdaToVerify },
    });

    if (!ranchInDb) {
      throw new NotFoundException('Ranch not found in DB after verification.');
    }

    ranchInDb.isVerified = true;
    this.logger.log(`Ranch ${ranchInDb.name} updated to 'isVerified: true' in DB`);
    return this.ranchRepository.save(ranchInDb);
  }

  async findAll(): Promise<Ranch[]> {
    this.logger.log('Fetching all ranches');
    return this.ranchRepository.find();
  }

  async findMyRanch(rancherPubkey: string): Promise<Ranch> {
    const ranch = await this.ranchRepository.findOne({
      where: { user: { pubkey: rancherPubkey } },
      relations: ['user'],
    });

    if (!ranch) {
      this.logger.warn(`No ranch profile found for user ${rancherPubkey}`);
      throw new NotFoundException('No ranch profile found for this user.');
    }
    return ranch;
  }
}