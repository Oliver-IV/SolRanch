import { IsNotEmpty, IsString } from 'class-validator';

export class RejectAnimalDto {
  @IsString()
  @IsNotEmpty()
  animalPda: string;
}