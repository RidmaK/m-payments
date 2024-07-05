import { IsBoolean, IsNumber, IsString } from 'class-validator';

export enum CampaignMethods {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  CRYPTO = 'CRYPTO',
}

export enum PaymentTypes {
  ONETIME = 'one-time',
  SUBSCRIPTION = 'monthly',
}

export enum Status {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export class CampaignDetailsDTO {
  @IsString()
  user_id: string;
  @IsString()
  payment_id: string;
  @IsNumber()
  amount: number;
  @IsString()
  campaign_id: string;
  @IsString()
  method: CampaignMethods;
  @IsString()
  payment_type: PaymentTypes;
  @IsBoolean()
  is_gift_aid: boolean;
  @IsString()
  status: Status;
  @IsString()
  name?: string;
}
