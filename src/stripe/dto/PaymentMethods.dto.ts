import { IsNotEmpty, IsString } from 'class-validator';

export class SavePaymentMethodsDTO {
  @IsString()
  customer_id: string;
}

export class GetSavedPaymentMethods {
  @IsString()
  customer_id: string;
}

export class DeleteSavedPaymentMethods {
  @IsString()
  @IsNotEmpty()
  payment_method_id: string;

  @IsString()
  @IsNotEmpty()
  customer_id: string;
}

export class UpdateDefaultPaymentMethod {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  newPaymentMethodId: string;
}
