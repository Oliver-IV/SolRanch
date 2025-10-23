import { IsString, IsNotEmpty } from 'class-validator';
import { IsSolanaAddress } from '../../utils/solana-address.validator';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsSolanaAddress()
  pubkey: string;
}