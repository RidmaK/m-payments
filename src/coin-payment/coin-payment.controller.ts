import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { CoinPaymentService } from './coin-payment.service';
import { CreateCoinPaymentTransactionDTO } from './dto/CoinPayment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { HandleCoinPaymentDto } from './dto/handleCoinPayment.dto';

@Controller('coin-payment')
export class CoinPaymentController {
  constructor(private readonly coinPaymentService: CoinPaymentService) {}

  //create coin-payment txn
  @Post('create-payment')
  async createCoinPayment(
    @Body() createCoinPaymentDTO: CreateCoinPaymentTransactionDTO,
  ): Promise<any> {
    return await this.coinPaymentService.createCoinPayment(
      createCoinPaymentDTO,
    );
  }

  //listen to the IPN url
  @Post('coin-payment-webhook')
  @UseInterceptors(FileInterceptor('file'))
  async listenToWebhook(
    @Body() callBackData: any,
    @Query() queryData: HandleCoinPaymentDto,
    @Headers('hmac') hmac: any,
  ) {
    return await this.coinPaymentService.handleCallBackdetails(
      callBackData,
      hmac,
      queryData,
    );
  }
}
