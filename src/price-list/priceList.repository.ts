import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as address from 'address';
import {
  PriceList,
  PriceListDocument,
} from 'src/price-list/schemas/priceList.schema';
const ip = address.ip();

@Injectable()
export class PriceListRepository {
  private readonly logger = new Logger(
    `${ip} src/user/repository/user.repository.ts`,
  );

  constructor(
    @InjectModel(PriceList.name)
    private priceListModel: Model<PriceListDocument>,
  ) {}

  // Find user by user id
  async findByPriceId(id: any): Promise<any[]> {
    try {
      return await this.priceListModel.find({ paypal_price_id: id });
    } catch (err) {
      this.logger.error(`Find By Id User Error: ${err}`);
      throw new Error(`Find By Id User Error: ${err}`);
    }
  }

  async GetAllPriceList(): Promise<any[]> {
    try {
      return await this.priceListModel.find().sort({ amount: 1 });
    } catch (err) {
      this.logger.error(`Find By Id User Error: ${err}`);
      throw new Error(`Find By Id User Error: ${err}`);
    }
  }

  // Create pricelist
  async CreatePriceList(body: any): Promise<any> {
    try {
      const { paypal_price_id, stripe_price_id, amount } = body;

      const newCampaign = new this.priceListModel({
        paypal_price_id,
        stripe_price_id,
        amount,
      });

      return await newCampaign.save();
    } catch (err) {
      // this.logger.error(`Create payment Error: ${err}`);
      throw new Error(`Create campaign Error: ${err}`);
    }
  }
}
