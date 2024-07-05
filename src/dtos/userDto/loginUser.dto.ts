import { IsString, Matches, MinLength } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @Matches(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, {
    message: 'Please add a valid email',
  })
  primary_email: string;

  @IsString({ message: 'Please add a valid password' })
  @MinLength(8, { message: 'Please add a valid password' })
  password: string;
}
