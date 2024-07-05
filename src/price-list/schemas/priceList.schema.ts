import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type PriceListDocument = PriceList & Document;

@Schema({ timestamps: true })
export class PriceList {
  @Prop({ required: true })
  paypal_price_id: string;
  @Prop({ required: true })
  stripe_price_id: string;
  @Prop({ required: true })
  amount: number;
}

export const PriceListSchema = SchemaFactory.createForClass(PriceList);
