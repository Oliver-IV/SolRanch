import { Type } from "class-transformer";
import { IsNumber, Min } from "class-validator";

export class SetAnimalPriceDto {
  @IsNumber()
  @Min(0) 
  @Type(() => Number) 
  price: number; 
}