import { Prop } from '@nestjs/mongoose';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';

export class PaymentCreateDto {
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
  payment_id?: string | null;

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
}

export class PaymentUpdateDto {
  @IsString()
  @IsOptional()
  payment_id?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  campaign_id?: string;

  @IsString()
  @IsOptional()
  user_id?: string;

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
