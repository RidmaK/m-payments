import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { Get } from '@nestjs/common/decorators/http/request-mapping.decorator';
import { PaypalService } from './paypal.service';
import { CreateSubscriptionPaymentDTO } from './dto/CreateSubscriptionPaymentDTO';
import { PaymentCreateDto } from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { CreatePaypalOneTimePaymentDTO } from './dto/CreatePaypalOneTimePaymentDTO';
import { UseGuards } from '@nestjs/common/decorators';
import { Roles } from 'src/guards/roles.decorator';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { JwtCookieGuard } from 'src/guards/jwt.cookie.guard';

@Controller('paypal')
export class PaypalController {
  constructor(private paypalService: PaypalService) {}

  // @Get('sample')
  // @UseGuards(JwtCookieGuard, JwtGuard)
  // async GetSample() {
  //   console.log('sample');
  // }

  //restart subscription plan
  @Post('restart-subscription-plan')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async RestartSubscriptionPlan(
    @Body() createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    return await this.paypalService.RestartSubscriptionPlan(
      createSubscriptionPaymentDTO,
    );
  }

  //change subscription plan
  @Post('change-subscription-plan')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async ChangeSubscriptionPlan(
    @Body() createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    return await this.paypalService.ChangeSubscriptionPlan(
      createSubscriptionPaymentDTO,
    );
  }

  //create subscription
  @Post('create-subscription')
  // @UseGuards(JwtCookieGuard, JwtGuard)
  async createSubscriptionPayment(
    @Body() createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    return await this.paypalService.createSubscriptionPayment(
      createSubscriptionPaymentDTO,
    );
  }

  //update payment
  @Post('update-payment')
  async updatePayment(@Body() body: any) {
    return await this.paypalService.updatePayment(body);
  }

  //get subscription
  @Post('subscription-status')
  async getSubscriptionStatus(@Body() body: any) {
    return await this.paypalService.getSubscriptionStatus(body);
  }

  //cancel subscription
  @Post('cancel-subscription')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async cancelSubscription(@Body() paymentCreateDto: PaymentCreateDto) {
    return await this.paypalService.cancelSubscription(paymentCreateDto);
  }

  //check status in subscription
  @Post('check-subscription')
  // @UseGuards(JwtCookieGuard, JwtGuard)
  async checkSubscriptionPayment(
    @Body() createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    return await this.paypalService.checkSubscriptionPayment(
      createSubscriptionPaymentDTO,
    );
  }

  //create order
  @Post('create-order')
  async createOrder(@Body() paymentCreateDto: PaymentCreateDto) {
    return await this.paypalService.createOrder(paymentCreateDto);
  }

  //approve the order
  @Post('create-payment-for-the-order/:id')
  async approveOrder(
    @Param('id') id: string,
    @Body() createPaypalOneTimePaymentDTO: CreatePaypalOneTimePaymentDTO,
  ) {
    return await this.paypalService.approveOrder(
      id,
      createPaypalOneTimePaymentDTO,
    );
  }

  //webhook
  @Post('payment/webhook')
  async webHookCallBack(
    @Body() webHookBody: any,
    @Headers('paypal-transmission-id') transmission_id: string,
    @Headers('paypal-transmission-time') transmission_time: string,
    @Headers('paypal-transmission-sig') transmission_sig: string,
    @Headers('paypal-cert-url') cert_url: string,
    @Headers('paypal-auth-algo') auth_algo: string,
    @Headers('correlation-id') correlation_id: string,
  ) {
    return await this.paypalService.SubscriptionWebHookCallBack({
      transmission_id: transmission_id,
      transmission_time: transmission_time,
      transmission_sig: transmission_sig,
      cert_url: cert_url,
      auth_algo: auth_algo,
      correlation_id: correlation_id,
      body: webHookBody,
    });
  }
}
