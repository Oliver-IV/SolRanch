import { IsString, IsNotEmpty } from 'class-validator';

export class AddRancherSignatureDto {
  @IsString()
  @IsNotEmpty()
  animal_pda: string;

  @IsString()
  @IsNotEmpty()
  signed_tx: string;
}