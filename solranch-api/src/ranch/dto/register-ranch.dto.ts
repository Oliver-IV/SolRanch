import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { Country } from '../enums/country.enum';

export class RegisterRanchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Country)
  country: Country;
}