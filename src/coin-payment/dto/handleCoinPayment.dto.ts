import {  IsNotEmpty } from "class-validator";

export class HandleCoinPaymentDto {
    @IsNotEmpty({ message: 'Please add user' })
    userId: string;
}