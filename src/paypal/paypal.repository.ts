import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentCreateDto } from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { Payment, PaymentDocument } from 'src/schemas/payment.schema';
@Injectable()
export class PaypalRepository {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}
  async savePaypalPayment(savePaypalTransactionDTO: PaymentCreateDto) {
    try {
      const {
        payment_id,
        amount,
        campaign_id,
        user_id,
        method,
        payment_type,
        status,
        is_gift_aid,
      } = savePaypalTransactionDTO;
      const savePayment = new this.paymentModel({
        payment_id,
        amount,
        campaign_id,
        user_id,
        method,
        payment_type,
        status,
        is_gift_aid,
      });
      await savePayment.save();
    } catch (error) {
      console.log(error);
    }
  }
}
