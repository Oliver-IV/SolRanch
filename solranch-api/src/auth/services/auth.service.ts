import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LoginVerifyDto } from '../dto/login-verify.dto';
import { v4 as uuidv4 } from 'uuid'; 
import nacl from 'tweetnacl'; 
import bs58 from 'bs58';
import { TextEncoder } from 'util';
import { PublicKey } from '@solana/web3.js'; 

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async getNonceToSign(pubkey: string): Promise<{ message: string }> {
    let user = await this.userRepository.findOne({ where: { pubkey } });

    const nonce = uuidv4(); 

    if (!user) {
      user = this.userRepository.create({
        pubkey,
        nonce,
        roles: [UserRole.USER],
      });
    } else {
      user.nonce = nonce;
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
    } catch (error) {}

    if (!isVerified) {
      throw new UnauthorizedException('Invalid signature.');
    }

    user.nonce = uuidv4();
    await this.userRepository.save(user);

    const payload = {
      sub: user.pubkey, 
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  private createSignMessage(nonce: string): string {
    return `Sign in to SolRanch by signing this challenge: ${nonce}`;
  }
}