import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Payment } from './payment.schema';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  image_url: string;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  })
  payment_id: Payment[];
  @Prop({ required: true })
  required_cost: number;
  @Prop({ required: true, default: 0 })
  collected_cost: number;
  @Prop({ required: true, default: 'draft' })
  status: CampaignStatus;
  @Prop({ required: true, default: false })
  is_general: boolean;
  @Prop({ required: true })
  patient_name: string;
  @Prop({ required: true })
  patient_age: number;
  @Prop({ required: true })
  patient_cause: string;
  @Prop({ required: true })
  patient_occupation: string;
  @Prop({ required: true })
  patient_limb_requirement: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

export enum CampaignStatus {
  DRAFT = 'draft',
  AWAITING = 'awaiting',
  FILLED = 'filled',
  COMPLETED = 'completed',
}
