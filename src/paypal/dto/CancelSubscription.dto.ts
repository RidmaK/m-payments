import { IsNotEmpty, IsString } from 'class-validator';
import { ObjectId } from 'mongoose';

export class CancelPaypalSubscription {
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: ObjectId;
}
