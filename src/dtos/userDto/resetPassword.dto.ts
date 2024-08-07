import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  new_password: string;

  @IsNotEmpty({ message: 'Please enter the verification code' })
  verification_code: number;
}
