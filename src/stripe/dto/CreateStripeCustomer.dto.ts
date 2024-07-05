import {
  IsString,
  isString,
  isNumber,
  ValidateIf,
  IsNotEmpty,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateStripeCustomerDto {
  @IsString()
  name?: string;

  @IsString()
  email?: string;

  @IsString()
  city?: string;
  @IsString()
  country?: string;
  @IsString()
  apartment?: string;
  @IsString()
  street?: string;
  @IsString()
  postal_code?: string;
  @IsString()
  phone_number?: string;
}
