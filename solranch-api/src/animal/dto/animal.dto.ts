import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Length,
  IsNumberString,
} from 'class-validator';
import { IsSolanaAddress } from 'src/utils/solana-address.validator';

export class RegisterAnimalDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idChip: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  specie: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  breed: string;

  @IsNumberString()
  @IsNotEmpty()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  @IsSolanaAddress()
  verifierPubkey: string;
}