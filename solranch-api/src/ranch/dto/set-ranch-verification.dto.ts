import { IsBoolean } from 'class-validator';

export class SetRanchVerificationDto {
  @IsBoolean()
  isVerified: boolean;
}