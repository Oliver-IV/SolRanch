import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  MaxLength,
} from 'class-validator';

export class CreateAnimalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  id_chip: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  specie: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  breed: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  birth_date: number;

  @IsString()
  @IsNotEmpty()
  verifier_pda: string;
}