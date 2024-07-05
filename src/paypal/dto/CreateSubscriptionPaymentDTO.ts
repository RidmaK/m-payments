import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSubscriptionPaymentDTO {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsOptional()
  primary_email?: string;

  @IsString()
  @IsOptional()
  user_id?: string | null;

  @IsString()
  @IsOptional()
  subscription_id?: string;

  @IsString()
  @IsOptional()
  plan_id?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  campaign_id?: string;

  @IsBoolean()
  @IsOptional()
  is_gift_aid?: boolean;

  @IsBoolean()
  @IsOptional()
  is_donation_private?: boolean;

  @IsOptional()
  gift_aid_address: GiftAidAddress;
}

export interface GiftAidAddress {
  country: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: string;
}
