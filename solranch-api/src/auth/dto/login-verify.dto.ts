import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginVerifyDto {
  @IsString()
  @IsNotEmpty()
  @Length(43, 44, {
    message: 'Pubkey must have 43 or 44 chars',
  })
  pubkey: string;

  // La firma viene como un string en Base58
  @IsString()
  @IsNotEmpty()
  signature: string;
}