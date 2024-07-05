import { Prop } from '@nestjs/mongoose';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ObjectId } from 'mongoose';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';

//interface for coin payment input
export interface CoinpaymentsCreateTransactionOpts {
  currency1: string;
  currency2: string;
  amount: number;
  buyer_email: string;
  address?: string;
  buyer_name?: string;
  item_name?: string;
  item_number?: string;
  invoice?: string;
  custom?: string;
  ipn_url?: string;
  success_url?: string;
  cancel_url?: string;
}

//setup coin payment client interface
export interface CoinpaymentsCredentials {
  key: string;
  secret: string;
}
export interface GiftAidAddress {
  country: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: string;
}
//create coin payment transaction DTO
export class CreateCoinPaymentTransactionDTO {
  @IsString()
  @IsNotEmpty()
  currency2: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  buyer_email?: string | null;

  @IsBoolean()
  @IsNotEmpty()
  is_guest: boolean;

  @IsString()
  @IsOptional()
  first_name?: string | null;

  @IsString()
  @IsOptional()
  last_name?: string | null;

  @IsOptional()
  gift_aid_address: GiftAidAddress | null;

  @IsOptional()
  primary_email?: string | null;

  // @IsString()
  // @IsOptional()
  // payment_id?: string | null;

  @IsString()
  @IsOptional()
  campaign_id?: string;

  @IsString()
  @IsOptional()
  user_id?: string | null;

  @IsString()
  @IsOptional()
  method?: PaymentMethod;

  @IsString()
  @IsOptional()
  payment_type?: PaymentType;

  @Prop({ enum: Status, default: Status.PENDING })
  @IsOptional()
  status?: Status;

  @IsBoolean()
  @IsOptional()
  is_gift_aid?: boolean;

  @IsOptional()
  @IsBoolean()
  is_donation_private?: boolean;
}
