import { User } from 'src/schemas/user.schema';
import { Campaign } from '../../schemas/campaign.schema';
import {
  PaymentMethod,
  PaymentType,
  Status,
} from '../../schemas/payment.schema';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';

export class PaymentSearchDto {
  payment_id: string;
  amount: number;
  campaign_id: Campaign;
  user_id: User;
  method: PaymentMethod;
  payment_type: PaymentType;
  status: Status;
  is_gift_aid: boolean;

  @IsOptional()
  @IsBoolean()
  is_donation_private?: boolean;

  @IsOptional()
  @IsDate()
  createdAt?: Date;
}
