import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ObjectId } from 'mongoose';

export enum CampaignMethods {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  CRYPTO = 'CRYPTO',
}

export enum paymentTypes {
  ONETIME = 'ONETIME',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum Status {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export class CreatePaypalOneTimeCampaign {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currencyCode: string;
}

export class CaptureCampaignDTO {
  @IsString()
  @IsNotEmpty()
  orderId: string | ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currencyCode: string;

  @IsString()
  payment_type: paymentTypes;

  @IsBoolean()
  is_gift_aid: boolean;

  @IsString()
  status: Status;

  @IsString()
  user_id: ObjectId;
  @IsString()
  name: string;

  @IsBoolean()
  is_user_guest: boolean;

  guestName?: string;

  guestEmail?: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsNumber()
  gift_aid_address_1: number;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  gift_aid_address_2: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  country: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  city: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  post_code?: string;
}

export class CreateCampaignWithSavedPaymentMethodDTO {
  @IsString()
  @IsNotEmpty()
  campaignAmount: string;

  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  // @IsString()
  @IsNotEmpty()
  user_id: ObjectId;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsNotEmpty()
  is_gift_aid: boolean;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  gift_aid_address_2: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  country: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  city: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  post_code?: string;
}

export class CreateSubscriptionCampaignDTO {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class GetUserSubscriptionDTO {
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class GetSubscriptionCallBackDTO {
  @IsString()
  @IsNotEmpty()
  facilitatorAccessToken: string;
  @IsString()
  // @IsNotEmpty()
  orderID: string;
  @IsString()
  @IsNotEmpty()
  paymentSource: string;
  @IsString()
  @IsNotEmpty()
  subscriptionID: string;
  // @IsString()
  @IsNotEmpty()
  user_id: ObjectId;

  @IsBoolean()
  @IsNotEmpty()
  is_gift_aid: boolean;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  gift_aid_address_2: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  country: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  city: string;

  @ValidateIf((v) => v.is_gift_aid === true)
  @IsString()
  post_code?: string;
}

export class CancelSubscriptionDTO {
  @IsNotEmpty()
  user_id: ObjectId;

  @IsString()
  @IsNotEmpty()
  subscription_id: string;
}
export class IsUserHasCreatedPaypalSubscription {
  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export class DeleteSavedPaymentMethod {
  @IsNotEmpty()
  user_id: ObjectId;

  @IsString()
  @IsNotEmpty()
  paymentTokenId: string;
}
