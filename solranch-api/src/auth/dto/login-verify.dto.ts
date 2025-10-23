import { IsString, IsNotEmpty } from 'class-validator';
import { IsSolanaAddress } from '../../utils/solana-address.validator';

export class LoginVerifyDto {
  @IsString()
  @IsNotEmpty()
  @IsSolanaAddress()
  pubkey: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}