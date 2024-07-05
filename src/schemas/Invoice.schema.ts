import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Payment } from './payment.schema';
import { User } from './user.schema';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop()
  invoice_id: string;
  @Prop({ required: true })
  amount: number;
  @Prop({ required: false })
  customer_email: string | null;
  @Prop({ required: false })
  hosted_invoice_url: string | null;
  @Prop({ required: true })
  status: Status;
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  })
  payment_id: Payment;
}

export enum Status {
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FUNDS_SENT = 'funds_sent',
  ACTIVE = 'active',
  DRAFT = 'draft',
  PAID = 'paid',
  FAILED = 'failed',
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
