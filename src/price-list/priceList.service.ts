import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PriceListRepository } from './priceList.repository';

@Injectable()
export class PriceListService {
  constructor(private priceListRepository: PriceListRepository) {}
  private readonly logger = new Logger(`paypal-service`);

  async GetAllPriceList(): Promise<any[]> {
    try {
      return await this.priceListRepository.GetAllPriceList();
    } catch (error) {
      throw error; // Rethrow the error to handle it elsewhere if needed
    }
  }

  async CreatePriceList(body:any): Promise<any[]> {
    try {
      return await this.priceListRepository.CreatePriceList(body);
    } catch (error) {
      throw error;
    }
  }
}
