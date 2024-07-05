import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';

export class UpdateStripeSubscription {
  @IsString()
  @IsNotEmpty()
  price_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  // cancel_at_period_end?: boolean;
}

export class UpdateDefaultPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Please add userId' })
  user_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Please add newPaymentMethodId' })
  payment_method_id: string;
}

export class UpdateStripeSubscriptionPaymentMethod {
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  newPaymentMethod: string;

  @IsString()
  @IsNotEmpty()
  user_id: ObjectId;
}

export class CancelStripeSubscriptionDTO {
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;
}
export class RestartStripeSubscriptionDTO {
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;
}
