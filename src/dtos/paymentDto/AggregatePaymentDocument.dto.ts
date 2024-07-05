import { IsNotEmpty, IsString } from 'class-validator';

export class AggregatePaymentDTO {
  @IsString()
  @IsNotEmpty()
  txn_id: string;
  user_id?: string;
}
