import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  IsInt,
  Max, 
} from 'class-validator';
import { Transform } from 'class-transformer'; 

export class FindAnimalsQueryDto {
  @IsOptional()
  @IsString()
  specie?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString() 
  ranchPda?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOnSale?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number) 
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number) 
  maxPrice?: number; 

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}