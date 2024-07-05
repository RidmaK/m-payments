import { IsString } from 'class-validator';
import { ObjectId } from 'mongoose';

export class SetupTokeDTO {
  @IsString()
  user_id: ObjectId;

  name?: string;
}
