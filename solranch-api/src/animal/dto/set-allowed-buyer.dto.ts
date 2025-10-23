import { IsString, IsNotEmpty, Length } from 'class-validator';
import { IsSolanaAddress } from '../../utils/solana-address.validator';

export class SetAllowedBuyerDto {
  @IsString()
  @IsNotEmpty()
  @IsSolanaAddress()
  allowedBuyerPubkey: string;
}