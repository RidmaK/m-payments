import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
  IsNumber,
  Length,
} from 'class-validator';
import { Prefix } from '../../schemas/user.schema';

export class UpdateUserInfoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a prefix' })
  @MinLength(2, { message: 'Input minimun 2 charactors to prefix' })
  prefix: Prefix;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a your first name' })
  @MinLength(2, { message: 'Input minimun 2 charactors to first name' })
  first_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please add a your last name' })
  @MinLength(2, { message: 'Input minimun 2 charactors to last name' })
  last_name?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

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
  @IsString()
  street_address?: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.(jpe?g|png|gif|bmp)$/i, {
    message: 'Please add a valid image URL',
  })
  image_URL?: string;

  @IsOptional()
  @Length(6)
  verification_code?: number;
}
