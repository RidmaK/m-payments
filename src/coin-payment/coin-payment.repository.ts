import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentCreateDto } from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { PaymentRepository } from 'src/repository/payment.repository';
import { Payment, PaymentDocument, Status } from 'src/schemas/payment.schema';

@Injectable()
export class CoinPaymentRepository {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,

    private paymentRepository: PaymentRepository,
  ) {}
  private readonly logger = new Logger(`coin-payment repository`);

  /* Save the coin payment */
  async saveCoinPayment(saveCoinPaymentTransactionDTO: PaymentCreateDto) {
    /**Destructure  @type {saveCoinPaymentTransactionDTO} */
    const {
      payment_id,
      amount,
      campaign_id,
      user_id,
      method,
      payment_type,
      status,
      is_gift_aid,
    } = saveCoinPaymentTransactionDTO;
    try {
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
      //Save payment
      await savePayment.save();
    } catch (error) {
      console.log(error);
    }
  }

  //Update the campaign status of the guest
  // async updateGuestCampaignStatus(txn_Id: string, status: Status) {
  //   console.log(txn_Id, 'txn__id');
  //   try {
  //     //Get the document id which stored the txn_id
  //     const documentId = await this.guestRepository.aggregateGuest({
  //       txn_id: txn_Id,
  //     });
  //     console.log(documentId, 'document id');
  //     // return if the document id is not available
  //     if (!documentId[0]) {
  //       throw new ForbiddenException('No documents found');
  //     }
  //     //Update the campaign status
  //     const updatedGuest = await this.guestRepository.updateGuest({
  //       id: documentId[0],
  //       status: status,
  //     });
  //     //Logging the updated document
  //     this.logger.log(`updated guest document ${updatedGuest}`);
  //   } catch (error) {
  //     this.logger.log(`error update guest campaign status ${error}`);
  //     return error as Error;
  //   }
  // }

  
}
