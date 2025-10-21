import { IsString, IsNotEmpty, MaxLength, Length } from 'class-validator';

export class RegisterVerifierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(43, 44, {
    message: 'Pubkey must hace 43 or 44 chars',
  })
  verifierAuthority: string;
}