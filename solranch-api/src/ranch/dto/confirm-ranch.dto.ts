import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LatestBlockhashDto {
  @IsString()
  @IsNotEmpty()
  blockhash: string;

  @IsNumber()
  @IsNotEmpty()
  lastValidBlockHeight: number;
}

export class ConfirmRanchDto {
  @IsString()
  @IsNotEmpty()
  txid: string;

  @IsObject()
  @ValidateNested()
  @Type(() => LatestBlockhashDto)
  latestBlockhash: LatestBlockhashDto;
}