import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentMethod,
  Payment,
  PaymentDocument,
  Status,
  PaymentType,
} from '../schemas/payment.schema';
import {
  PaymentCreateDto,
  PaymentUpdateDto,
} from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import * as address from 'address';
const ip = address.ip();

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(
    `${ip} src/user/repository/user.repository.ts`,
  );

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>, // private readonly advancedResultMiddleware: AdvancedResultMiddleware,
  ) {}

  //Check Payment Status And PaymentType
  async GetCustomerFromPaymentId(user_id: string): Promise<any> {
    try {
      return await this.paymentModel.findOne({
        user_id: new mongoose.Types.ObjectId(user_id),
        method: PaymentMethod.PAYPAL,
        payment_type: PaymentType.MONTHLY,
      });
    } catch (err) {
      console.log(err);
    }
  }

  //Check Payment Status And PaymentType
  async CheckPaymentStatusAndPaymentType(user_id: string): Promise<any> {
    try {
      return await this.paymentModel.aggregate([
        {
          $match: {
            $and: [
              { user_id: new mongoose.Types.ObjectId(user_id) },
              { payment_type: PaymentType.MONTHLY },
              {
                $or: [
                  { status: Status.COMPLETED },
                  { status: Status.ACTIVE },
                  { status: Status.PENDING },
                  { status: Status.CANCELLED },
                ],
              },
            ],
          },
        },
      ]);
    } catch (err) {
      console.log(err);
    }
  }

  async subscriptionPaymentsWithUserID(user_id: string): Promise<any[]> {
    const payment = await this.paymentModel.aggregate([
      {
        $match: {
          $and: [
            {
              user_id: new mongoose.Types.ObjectId(user_id),
              payment_type: 'monthly',
            },
            {
              $or: [
                { status: Status.COMPLETED },
                { status: Status.ACTIVE },
                { status: Status.PENDING },
              ],
            },
          ],
        },
      },
    ]);
    return payment;
  }

  async getAllPaymentsStatsById(req: any): Promise<any> {
    try {
      const statsData = await this.paymentModel.aggregate([
        {
          $match: {
            $and: [
              { userId: new mongoose.Types.ObjectId(req.query.userId) },
              { status: 'completed' },
            ],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            myCount: { $sum: 1 },
            average: { $avg: '$amount' },
          },
        },
        {
          $project: {
            total: { $round: ['$total', 2] },
            myCount: '$myCount',
            averageRound: { $round: ['$average', 2] },
          },
        },
      ]);

      return {
        statsData,
      };
    } catch (err) {
      console.log(err);
    }
  }

  // Create payment
  async createPayment(paymentCreateDto: PaymentCreateDto): Promise<any> {

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
        is_donation_private,
      } = paymentCreateDto;

      const newPayment = new this.paymentModel({
        payment_id,
        amount,
        campaign_id,
        user_id,
        method,
        payment_type,
        status,
        is_gift_aid,
        is_donation_private,
      });

      return await newPayment.save();
    } catch (err) {
      this.logger.error(`Create payment Error: ${err}`);
      throw new Error(`Create payment Error: ${err}`);
    }
  }

  async updatePayment(
    id: string,
    paymentCreateDto: PaymentUpdateDto,
  ): Promise<any> {
    try {
      return await this.paymentModel.findOneAndUpdate(
        { payment_id: id },
        paymentCreateDto,
        { new: true },
      );
    } catch (err) {
      this.logger.error(`Update User By Id Error: ${err}`);
      throw new Error(`Update User By Id Error: ${err}`);
    }
  }

  //find one by id
  async findByPaymentId(id: string): Promise<any> {
    return await this.paymentModel.findOne({ payment_id: id });
  }

  async getAllPayments(): Promise<Payment[]> {
    return await this.paymentModel
      .find()
      .populate('campaign_id')
      .populate('user_id');
  }

  async getAllUserCampaignPaymentByPaymentId(payment_id: string): Promise<any> {
    return await this.paymentModel
      .find({ payment_id: payment_id })
      .populate('campaign_id')
      .populate('user_id');
  }

  async saveCoinPayment(saveCoinPaymentTransactionDTO: PaymentCreateDto) {
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
      await savePayment.save();
    } catch (error) {
      console.log(error);
    }
  }

  async getPaymentById(id: string): Promise<any> {
    return await this.paymentModel
      .findById(id)
      .populate('campaign_id')
      .populate('user_id');
  }

  async getPaymentObjectId(payment_id: string): Promise<any> {
    return await this.paymentModel.findOne({
      payment_id: payment_id,
    });
  }

  async deletePayment(id: string): Promise<Payment> {
    return await this.paymentModel.findByIdAndDelete(id);
  }

  async getPaymentDateBytxnId(txn_id: string): Promise<Payment[]> {
    return await this.paymentModel.aggregate([
      {
        $match: {
          $and: [{ payment_id: txn_id }],
        },
      },
    ]);
  }

  async getUserSubscriptions(user_id: string) {
    const payment = await this.paymentModel.aggregate<PaymentDocument>([
      {
        $match: {
          $and: [
            { user_id: new mongoose.Types.ObjectId(user_id) },
            { payment_type: PaymentType.MONTHLY },
            {
              $or: [
                { status: Status.COMPLETED },
                { status: Status.ACTIVE },
                { status: Status.PENDING },
                { status: Status.CANCELLED },
              ],
            },
          ],
        },
      },
    ]);

    return payment;
  }

  //Random Number
  async getRandomNumberBasedOnTime(): Promise<any> {
    // Get the current timestamp
    const timestamp = new Date().getTime();

    // Use the timestamp as a seed for a pseudo-random number
    const randomNumber = Math.floor(Math.random() * timestamp);

    return randomNumber;
  }

  async getDonorsForACampaign(id: string): Promise<any[]> {
    return await this.paymentModel.aggregate([
      { $match: { campaign_id: id } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          pipeline: [
            {
              $match: {
                primary_email: {
                  $not: {
                    $regex: /^Anonymous/,
                    $options: 'i',
                  },
                },
              },
            },
          ],
          as: 'user_data',
        },
      },
      { $unwind: '$user_data' },
      {
        $group: {
          _id: '$primary_email',
          documents: { $addToSet: '$user_data' },
        },
      },
      { $unwind: '$documents' },
      { $replaceWith: '$documents' },
    ]);
  }

  async getAllSubscriptionPayment(method: PaymentMethod, status: Status) {
    return await this.paymentModel.aggregate<PaymentDocument>([
      {
        $match: {
          $and: [
            { method: method },
            { status: status },
            { payment_type: PaymentType.MONTHLY },
          ],
        },
      },
    ]);
  }
}
