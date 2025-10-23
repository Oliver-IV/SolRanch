import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

import { SolanaService } from '../solana/solana.service';
import { Verifier } from './entities/verifier.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { RegisterVerifierDto } from './dto/register-verifier.dto';
@Injectable()
export class VerifierService {
  private readonly logger = new Logger(VerifierService.name);
  private readonly superAuthorityKeypair: Keypair;

  constructor(
    private readonly solanaService: SolanaService,
    private readonly configService: ConfigService,
    @InjectRepository(Verifier)
    private readonly verifierRepository: Repository<Verifier>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecret) {
      this.logger.error('ADMIN_SECRET_KEY not set');
      throw new InternalServerErrorException('ADMIN_SECRET_KEY not set');
    }
    this.superAuthorityKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
  }

  async getVerifierStatus(userPubkey: string): Promise<{ isVerifier: boolean, pda: string | null, name: string | null }> {
    const verifier = await this.verifierRepository.findOne({
      where: {
        user: { pubkey: userPubkey },
        isActive: true,
      },
    });

    if (verifier) {
      return {
        isVerifier: true,
        pda: verifier.pda,
        name: verifier.name,
      };
    }

    return { isVerifier: false, pda: null, name: null };
  }

  async register(dto: RegisterVerifierDto): Promise<Verifier> {
    const program = this.solanaService.getProgram();
    const verifierPubkey = new PublicKey(dto.verifier_authority);

    const user = await this.userRepository.findOne({
      where: { pubkey: dto.verifier_authority },
    });
    if (!user) {
      throw new NotFoundException(
        `Usuario con pubkey ${dto.verifier_authority} no encontrado. El usuario debe existir primero.`,
      );
    }

    const existingVerifier = await this.verifierRepository.findOne({
      where: { user: { id: user.id } },
    });
    if (existingVerifier) {
      throw new ConflictException('Este usuario ya está registrado como verificador.');
    }

    const [verifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('verifier'), verifierPubkey.toBuffer()],
      program.programId,
    );

    this.logger.log(
      `Intentando registrar Verificador (PDA: ${verifierPda.toBase58()}) para ${verifierPubkey.toBase58()}...`,
    );

    try {
      const txid = await program.methods
        .registerVerifier(verifierPubkey, dto.name)
        .accounts({
          verifierProfile: verifierPda,
          superAuthority: this.superAuthorityKeypair.publicKey,
        } as any)
        .signers([this.superAuthorityKeypair])
        .rpc({ commitment: 'confirmed' });

      this.logger.log(`Verificador registrado on-chain. TX: ${txid}`);
    } catch (error) {
      this.logger.error(
        `Error on-chain al registrar verificador: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Error on-chain: ${error.message}`,
      );
    }

    const onChainData = await program.account.verifierProfile.fetch(verifierPda);

    const newVerifier = this.verifierRepository.create({
      pda: verifierPda.toBase58(),
      user: user,
      name: onChainData.name,
      isActive: onChainData.isActive,
    });

    await this.verifierRepository.save(newVerifier);

    if (!user.roles.includes(UserRole.VERIFIER)) {
      user.roles.push(UserRole.VERIFIER);
      await this.userRepository.save(user);
      this.logger.log(`Role VERIFIER added to user ${user.pubkey}`);
    }

    return newVerifier;
  }

  async findAll(): Promise<Verifier[]> {
    return this.verifierRepository.find({
      relations: {
        user: true,
      },
    });
  }
}