import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateStripePaymentMethodDTO {
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @IsString()
  subscription_id?: string;

  @IsString()
  @IsNotEmpty()
  new_payment_method_id?: string;

  @IsString()
  @IsNotEmpty()
  old_payment_method_id: string;
}
