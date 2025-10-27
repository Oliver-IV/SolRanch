import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
} from 'class-validator';

class LatestBlockhashDto {
  @IsString() 
  @IsNotEmpty() 
  blockhash: string;

  @IsNumber() 
  @IsNotEmpty() 
  lastValidBlockHeight: number;
}

export class ConfirmTxDto {
  @IsString() 
  @IsNotEmpty() 
  txid: string;

  @ValidateNested() 
  @Type(() => LatestBlockhashDto) 
  latestBlockhash: LatestBlockhashDto;
  
  @IsString()
  @IsNotEmpty()
  animal_pda: string;
}