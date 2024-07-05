import { Invoice } from './Invoice.schema';
import { Campaign } from './campaign.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/schemas/user.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: false })
  payment_id: string;
  @Prop({ required: true })
  amount: number;
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
  })
  campaign_id: Campaign;
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  user_id: User;
  @Prop({ required: true, default: 'manual' })
  method: PaymentMethod;
  @Prop({ required: true, default: 'onetime' })
  payment_type: PaymentType;
  @Prop({ required: true, default: 'pending' })
  status: Status;
  @Prop({
    required: false,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  })
  invoices: Invoice[];
  @Prop({ required: true, default: false })
  is_gift_aid: boolean;
  @Prop({ required: true, default: false })
  is_renewal: boolean;
  @Prop({ required: true, default: false })
  is_donation_private: boolean;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
  MANUAL = 'manual',
}

export enum PaymentType {
  ONETIME = 'onetime',
  MONTHLY = 'monthly',
}

export enum Status {
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FUNDS_SENT = 'funds_sent',
  ACTIVE = 'active',
}
