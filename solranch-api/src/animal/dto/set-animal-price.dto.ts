import { IsString, IsNotEmpty, Length, IsNumberString } from 'class-validator';

export class SetAnimalPriceDto {
  @IsString()
  @IsNotEmpty()
  @Length(43, 44)
  animalPda: string;

  @IsNumberString()
  @IsNotEmpty()
  price: string;
}