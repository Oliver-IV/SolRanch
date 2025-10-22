import { IsString, IsNotEmpty } from 'class-validator';

export class ToggleVerifierDto {
  @IsString()
  @IsNotEmpty()
  pubkey: string;
}