import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

export class RegisterRanchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['mex', 'usa', 'arg', 'col'])
  country: string;
}