import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SetAllowedBuyerDto {
  @IsString()
  @IsNotEmpty()
  @Length(43, 44)
  animalPda: string;

  @IsString()
  @IsNotEmpty()
  @Length(43, 44)
  allowedBuyerPubkey: string;
}