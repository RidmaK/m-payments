import {
  Controller,
  Body,
  Post,
  Get,
  Param,
  Delete,
  Put,
  Headers,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreatePaymentWithStripeDTO } from './dto/CreateStripePayment.dto';
import {
  DeleteSavedPaymentMethods,
  SavePaymentMethodsDTO,
} from './dto/PaymentMethods.dto';
import {
  CancelStripeSubscriptionDTO,
  RestartStripeSubscriptionDTO,
  UpdateDefaultPaymentDto,
  UpdateStripeSubscription,
  UpdateStripeSubscriptionPaymentMethod,
} from './dto/UpdateStripeSubscription.dto';
import { UpdateStripePaymentMethodDTO } from './dto/UpdateStripePaymentMethod.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UseGuards } from '@nestjs/common/decorators';
import { Roles } from 'src/guards/roles.decorator';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RoleGuard } from 'src/guards/roles.guard';
import { JwtCookieGuard } from 'src/guards/jwt.cookie.guard';


@Controller('stripe')
export class StripeController {
  constructor(private stripeService: StripeService) {}

  //create  campaign
  @Post('create-payment')
  async createCampaign(
    @Body() createStripeCampaignDTO: CreatePaymentWithStripeDTO,
  ) {
    console.log('createStripeCampaignDTO', createStripeCampaignDTO);
    return await this.stripeService.createStripePayment(
      createStripeCampaignDTO,
    );
  }

  //check is user can create subscription
  @Get('is-can-create-subscriptions/:customer_id')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async isUserCanCreateSubscriptions(
    @Param('customer_id') customer_id: string,
  ) {
    return await this.stripeService.isUserCanCreateSubscriptions(customer_id);
  }

  //get active subscription
  @Get('active-subscriptions/:user_id')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async getActiveSubscriptionListForTheCustomer(
    @Param('user_id') user_id: string,
  ) {
    return await this.stripeService.getActiveSubscription(user_id);
  }

  @Post('cancel-membership-subscription')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async cancelMembershipSubscription(
    @Body() cancelStripeSubscriptionDTO: CancelStripeSubscriptionDTO,
  ) {
    return await this.stripeService.cancelSubscription(
      cancelStripeSubscriptionDTO,
    );
  }

  //get canceled subscriptions
  @Get('canceled-subscriptions/:customer_id')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async getCanceledSubscriptionListForTheCustomer(
    @Param('customer_id') customer_id: string,
  ) {
    return await this.stripeService.getCanceledSubscriptionListForTheCustomer(
      customer_id,
    );
  }

  //update subscription
  @Put('subscriptions')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async updateSubscription(
    @Body() updateSubscriptionDTO: UpdateStripeSubscription,
  ) {
    return await this.stripeService.updateSubscription(updateSubscriptionDTO);
  }

  //update default payment method
  @Put('payment-methods/default')
  async updateDefaultPaymentmethod(
    @Body()
    updateDefaultPaymentDto: UpdateDefaultPaymentDto,
  ) {
    return await this.stripeService.updateDefaultPaymentmethod(
      updateDefaultPaymentDto,
    );
  }

  //cancel subscription
  @Post('subscriptions/cancel')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async cancelSubscription(
    @Body() cancelStripeSubscriptionDTO: CancelStripeSubscriptionDTO,
  ) {
    return await this.stripeService.pauseSubscription(
      cancelStripeSubscriptionDTO,
    );
  }

  //cancel subscription renewal
  @Post('subscriptions-renewal/cancel')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async cancelSubscriptionRenewal(
    @Body() cancelStripeSubscriptionDTO: CancelStripeSubscriptionDTO,
  ) {
    return await this.stripeService.cancelSubscriptionRenewal(
      cancelStripeSubscriptionDTO.subscription_id,
    );
  }

  //check is user can save payment methods
  @Get('methods/:customer_id')
  async isUserCanSavePaymentMethod(@Param('customer_id') customer_id: string) {
    return await this.stripeService.isUserCanSavePaymentMethod(customer_id);
  }

  //save payment methods
  @Post('payment-methods')
  async savePaymentMethod(
    @Body() savePaymentMethodsDTO: SavePaymentMethodsDTO,
  ) {
    return await this.stripeService.savePaymentMethod(savePaymentMethodsDTO);
  }

  //get saved payment methods
  @Get('payment-methods/:user_id')
  async getSavedPaymentMethods(@Param('user_id') user_id: string) {
    return await this.stripeService.getSavedStripePaymentMethods(user_id);
  }

  //update saved payment methods
  @Put('payment-methods/update')
  async updateSavedPaymentMethod(
    @Body() updateSavedPaymentMethodDTO: UpdateStripePaymentMethodDTO,
  ) {
    return await this.stripeService.updateSavedPaymentMethod(
      updateSavedPaymentMethodDTO,
    );
  }

  //delete saved payment methods
  @Post('payment-methods/delete')
  async deleteSavedPaymentMethod(
    @Body() deleteSavedPaymentMethodsDTO: DeleteSavedPaymentMethods,
  ) {
    return await this.stripeService.deletePaymentMethod(
      deleteSavedPaymentMethodsDTO,
    );
  }

  //restart saved payment subscription
  @Put('subscription/restart')
  @UseGuards(JwtCookieGuard, JwtGuard)
  async restartSubscriptionStripe(
    @Body() restartStripeSubscriptionDTO: RestartStripeSubscriptionDTO,
  ) {
    return await this.stripeService.restart_stripe_subscription(
      restartStripeSubscriptionDTO,
    );
  }

  @Post('test-sub')
  async testsub(@Body() data: any) {
    return await this.stripeService.testsub(data);
  }

  //listen to webhook
  @Post('subscription-webhook')
  async handleSubscriptionWebhook(
    @Body() data: any,
    @Headers('stripe-signature') sig: string,
  ) {
    return await this.stripeService.handleSubscriptionWebhook(data, sig);
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async cancel_Membership_After_PeriodEnd() {
    return await this.stripeService.cancel_Membership_After_PeriodEnd();
  }
}
