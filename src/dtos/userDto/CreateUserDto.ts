import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { Role } from 'src/schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Please add a firstName' })
  @MinLength(2, { message: 'Input minimun 2 charactors to first name' })
  first_name: string;

  @IsString()
  @IsNotEmpty({ message: 'Please add a lastName' })
  @MinLength(2, { message: 'Input minimun 2 charactors to last name' })
  last_name: string;

  @IsString()
  @Matches(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, {
    message: 'Please add a valid email',
  })
  @IsNotEmpty({ message: 'Please add a email' })
  primary_email: string;

  @IsString()
  @IsNotEmpty({ message: 'Please add a name' })
  @MinLength(8, { message: 'Input minimun 8 charactors' })
  password: string;

  @IsBoolean()
  @IsNotEmpty({ message: 'Please enter your marketing acceptance' })
  is_marketing_accepted: boolean;

  @IsOptional()
  @Length(6)
  verification_code?: number;

  @IsOptional()
  role?: Role;
}
