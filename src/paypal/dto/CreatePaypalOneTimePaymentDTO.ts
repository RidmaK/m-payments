import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Prop } from '@nestjs/mongoose';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';

export class CreatePaypalOneTimePaymentDTO {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsOptional()
  primary_email?: string | null;

  @IsString()
  @IsOptional()
  payment_id?: string;

  @IsNumber()
  @IsOptional()
  amount: number;

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

  @IsOptional()
  gift_aid_address: GiftAidAddress;

  @IsOptional()
  @IsDate()
  createdAt?: boolean;
}

export interface GiftAidAddress {
  country: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: string;
}
