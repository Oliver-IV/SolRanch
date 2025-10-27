import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginVerifyDto } from '../dto/login-verify.dto';
import { v4 as uuidv4 } from 'uuid';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { TextEncoder } from 'util';
import { Keypair, PublicKey } from '@solana/web3.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminPubkey: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (adminSecret) {
      const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
      this.adminPubkey = adminKeypair.publicKey.toBase58();
      this.logger.log('AuthService initialized. Admin pubkey loaded.');
    } else {
      this.logger.warn(
        'AuthService initialized. ADMIN_SECRET_KEY not set. Admin features disabled.',
      );
    }
  }

  async getNonceToSign(pubkey: string): Promise<{ message: string }> {
    let user = await this.userRepository.findOne({ where: { pubkey } });
    const nonce = uuidv4();

    if (!user) {
      user = this.userRepository.create({
        pubkey,
        nonce,
        roles: [UserRole.USER],
      });
      this.logger.log(`New user created for pubkey: ${pubkey}`);
    } else {
      user.nonce = nonce;
      this.logger.log(`Nonce updated for user: ${pubkey}`);
    }

    await this.userRepository.save(user);
    return { message: this.createSignMessage(nonce) };
  }

  async login(
    loginVerifyDto: LoginVerifyDto,
  ): Promise<{ accessToken: string }> {
    const { pubkey, signature } = loginVerifyDto;

    const user = await this.userRepository.findOne({ where: { pubkey } });
    if (!user || !user.nonce) {
      this.logger.warn(
        `Login attempt failed: User ${pubkey} not found or nonce missing.`,
      );
      throw new UnauthorizedException('User not found or invalid nonce.');
    }

    const message = this.createSignMessage(user.nonce);
    let isVerified = false;

    try {
      const signatureBytes = bs58.decode(signature);
      const messageBytes = new TextEncoder().encode(message);
      const pubkeyBytes = new PublicKey(pubkey).toBytes();

      isVerified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        pubkeyBytes,
      );
    } catch (error) {
      this.logger.warn(
        `Login attempt failed: Signature verification (nacl) threw an error for ${pubkey}`,
        error.message,
      );
    }

    if (!isVerified) {
      this.logger.warn(
        `Login attempt failed: Invalid signature for user ${pubkey}.`,
      );
      throw new UnauthorizedException('Invalid signature.');
    }

    user.nonce = uuidv4();
    await this.userRepository.save(user);

    const payload = {
      sub: user.pubkey,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);
    this.logger.log(`Login successful: User ${pubkey} authenticated.`);

    return { accessToken };
  }

  async getProfile(userPayload: { pubkey: string; roles: UserRole[] }) {
    const pubkey = userPayload.pubkey;
    const user = await this.userRepository.findOne({ where: { pubkey } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isAdmin = pubkey === this.adminPubkey;
    return {
      pubkey: user.pubkey,
      roles: user.roles,
      isAdmin: isAdmin,
    };
  }

  async refreshToken(pubkey: string): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({ where: { pubkey } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    const payload = {
      sub: user.pubkey,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);
    this.logger.log(`Token refreshed for user ${pubkey} with roles: ${user.roles.join(', ')}`);

    return { accessToken };
  }

  private createSignMessage(nonce: string): string {
    return `Sign in to SolRanch by signing this challenge: ${nonce}`;
  }
}