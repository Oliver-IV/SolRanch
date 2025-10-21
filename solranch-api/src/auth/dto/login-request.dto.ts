import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(43, 44, {
    message: 'Pubkey must hace 43 or 44 chars',
  })
  pubkey: string;
}