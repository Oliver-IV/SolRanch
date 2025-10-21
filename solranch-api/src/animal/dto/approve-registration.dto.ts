import { IsUUID } from 'class-validator';

export class ApproveRegistrationDto {
  @IsUUID()
  pendingTransactionId: string;
}