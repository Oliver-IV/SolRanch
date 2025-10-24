import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class FindVerifiersQueryDto {
  @IsOptional()
  @IsString()
  name?: string; 

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true) 
  isActive?: boolean;

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