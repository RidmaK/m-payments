import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsBoolean,
  IsOptional,
  IsNumber,
  Length,
} from 'class-validator';
import { Status } from '../../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a prefix' })
  prefix?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a your first name' })
  first_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a your last name' })
  last_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, {
    message: 'Please add a valid email',
  })
  primary_email?: string;

  @IsOptional()
  @IsString()
  secondary_email?: string;

  @IsOptional()
  @IsBoolean()
  @IsNotEmpty({ message: 'Please enter your marketing acceptance' })
  is_marketing_accepted?: boolean;

  @IsOptional()
  @Length(6)
  verification_code?: number;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Input minimun 2 charactors to street' })
  @IsNotEmpty({ message: 'Please add a street name' })
  street_address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Input minimun 2 charactors to apartment' })
  @IsNotEmpty({ message: 'Please add a apartment' })
  apartment?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Input minimun 2 charactors to city' })
  @IsNotEmpty({ message: 'Please add a city' })
  city?: string;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty({ message: 'Please add a postal code' })
  postal_code?: number;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Input minimun 2 charactors to country' })
  @IsNotEmpty({ message: 'Please add a country' })
  country?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.(jpe?g|png|gif|bmp)$/i, {
    message: 'Please add a valid image URL',
  })
  @IsNotEmpty({ message: 'Please add a image URL' })
  image_URL?: string;

  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;

  @IsOptional()
  status?: Status;

  @IsOptional()
  @IsString()
  @Matches(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, {
    message: 'Please add a valid email',
  })
  pending_email?: string;

  @IsOptional()
  @IsBoolean()
  is_verified_pending_email?: boolean;

  @IsOptional()
  @IsString()
  paypal_user_email?: string;
}
