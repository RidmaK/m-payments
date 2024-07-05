import {
  IsString,
  isString,
  isNumber,
  ValidateIf,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { PaymentTypes } from 'src/dtos/campaignDto/CampaignDetails.dto';

export interface ErrorMessage {
  message: string;
  status: any;
}

export interface GiftAidAddress {
  country: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: string;
}

export class CreatePaymentWithStripeDTO {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  primary_email?: string;

  @IsString()
  @IsOptional()
  user_id?: string;

  @IsNumber()
  amount?: number;

  @IsString()
  payment_method_id?: string;

  @IsString()
  campaign_id?: string;

  @IsString()
  price_id?: string;

  @IsString()
  payment_type?: PaymentTypes;

  @IsBoolean()
  @IsNotEmpty()
  is_saved: boolean;

  @IsBoolean()
  @IsNotEmpty()
  is_user_guest: boolean;

  @IsBoolean()
  @IsNotEmpty()
  is_gift_aid: boolean;

  @IsOptional()
  gift_aid_address: GiftAidAddress;
}
