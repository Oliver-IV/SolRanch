import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Length,
  IsNumberString,
} from 'class-validator';

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
  @Length(43, 44, {
    message: 'Pubkey must hace 43 or 44 chars',
  })
  verifierPubkey: string;
}