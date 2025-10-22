// 📍 Archivo: src/verifier/dto/register-verifier.dto.ts

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RegisterVerifierDto {
  @IsString()
  @IsNotEmpty()
  verifier_authority: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}