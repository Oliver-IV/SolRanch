import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminPubkey: string;

  constructor(private readonly configService: ConfigService) {
    const adminSecret = this.configService.get<string>('ADMIN_SECRET_KEY');
    if (!adminSecret) {
      throw new Error('ADMIN_SECRET_KEY is not set for AdminGuard');
    }
    
    try {
      const adminKeypair = Keypair.fromSecretKey(bs58.decode(adminSecret));
      this.adminPubkey = adminKeypair.publicKey.toBase58();
    } catch (e) {
      throw new Error('ADMIN_SECRET_KEY is invalid.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user && user.pubkey === this.adminPubkey) {
      return true;
    }
    throw new ForbiddenException('Admin privileges required.');
  }
}