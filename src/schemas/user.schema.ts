import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Payment } from './payment.schema';
import { Invoice } from './Invoice.schema';

export type UserDocument = User & Document;

export interface UserAuthResponse {
  accessToken: any;
  success: boolean;
  message: string;
}

export interface UserId {
  id: string;
}

export enum RegisterType {
  MANUAL = 'MANUAL',
  GOOGLE = 'GOOGLE',
}

export interface PublicUserDetails {
  _id: string;
  first_name: string;
  last_name: string;
  primary_email: string;
  secondary_email: string;
  emails: string[];
  image_URL: string;
  prefix: Prefix;
  company_name: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: number;
  country: string;
  role: Role;
  status: Status;
  is_verified: boolean;
  verification_code: number;
  is_marketing_accepted: boolean;
  stripe_customer_id: string;
  stripe_default_payment_method: string;
  is_user_has_subscription: boolean;
  last_active_date: Date;
  register_type: RegisterType;
  paypal_user_email: string;
}

export interface ConvertedUserDto {
  _id: string;
  first_name: string;
  last_name: string;
  primary_email: string;
  secondary_email: string;
  emails: string[];
  password: string;
  image_URL: string;
  prefix: Prefix;
  company_name: string;
  street_address: string;
  apartment: string;
  city: string;
  postal_code: number;
  country: string;
  role: Role;
  status: Status;
  verification_code: number;
  is_marketing_accepted: boolean;
  stripe_customer_id: string;
  stripe_default_payment_method: string;
  is_user_has_subscription: boolean;
  last_active_date: Date;
  is_verified: boolean;
  google_access_token: string;
  register_type: RegisterType;
  pending_email: string;
  is_verified_pending_email: boolean;
  paypal_user_email: string;
}

export interface UserVerificationDetails {
  first_name: string;
  last_name: string;
  primary_email: string;
  verification_code: number;
}

export interface UserDeactivationDetails {
  first_name: string;
  last_name: string;
  primary_email: string;
}

export enum Prefix {
  MR = 'Mr',
  MRS = 'Mrs',
  MS = 'Ms',
  DR = 'Dr',
}

export enum Role {
  ADMIN = 'admin',
  DONOR = 'donor',
  GUEST = 'guest',
}

export enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  BANNED = 'banned',
  DEACTIVATED = 'deactivated',
}

@Schema({ timestamps: true })
export class User {
  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ unique: true })
  primary_email: string;

  @Prop({ nullable: true, default: null })
  secondary_email: string;

  @Prop({ nullable: true, default: [] })
  emails: string[];

  @Prop({ nullable: true, default: null })
  password: string;

  @Prop({
    nullable: true,
    default:
      'https://meththa-sample.s3.us-west-1.amazonaws.com/profile/profile-image.jpg',
  })
  image_URL: string;

  @Prop({ enum: Prefix, default: Prefix.MR })
  prefix: Prefix;

  @Prop({ nullable: true, default: null })
  company_name: string;

  @Prop({ nullable: true, default: null })
  street_address: string;

  @Prop({ nullable: true, default: null })
  apartment: string;

  @Prop({ nullable: true, default: null })
  city: string;

  @Prop({ nullable: true, default: 0 })
  postal_code: number;

  @Prop({ nullable: true, default: null })
  country: string;

  @Prop({ enum: Role, default: Role.DONOR })
  role: Role;

  @Prop({ enum: Status, default: Status.PENDING })
  status: Status;

  @Prop({ nullable: true, default: null })
  verification_code: number;

  @Prop({ default: false })
  is_marketing_accepted: boolean;

  @Prop({ nullable: true, default: null })
  stripe_customer_id: string;

  @Prop({ nullable: true, default: null })
  stripe_default_payment_method: string;

  @Prop({ nullable: true, default: null })
  paypal_user_email: string;

  @Prop({ default: false })
  is_user_has_subscription: boolean;

  @Prop({ nullable: true, default: null })
  last_active_date: Date;

  @Prop({ default: false })
  is_verified: boolean;

  @Prop({ nullable: true, default: null })
  google_access_token: string;

  @Prop({ enum: RegisterType, default: RegisterType.MANUAL })
  register_type: RegisterType;

  @Prop({ nullable: true, default: null })
  pending_email: string;

  @Prop({ default: false })
  is_verified_pending_email: boolean;

  @Prop({
    nullable: true,
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  })
  payment_id: Payment[];
}

export const UserSchema = SchemaFactory.createForClass(User);
