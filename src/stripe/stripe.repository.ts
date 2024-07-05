import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentCreateDto } from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import Stripe from 'stripe';
import { CreateStripeCustomerDto } from './dto/CreateStripeCustomer.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeRepository {
  private readonly logger = new Logger(`stripe repository`);
  private stripe: Stripe;
  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SK'), {
      /** @Note Define the secret key at config.env */ apiVersion: '2023-10-16',
    });
  }

  async createStripeCustomer(createStripeCustomerDto: CreateStripeCustomerDto) {
    const {
      name,
      email,
      city,
      country,
      apartment,
      street,
      postal_code,
      phone_number,
      testClock,
    } = createStripeCustomerDto;

    return await this.stripe.customers.create({
      name: name,
      email: email,
      address: {
        city: 'Colombo',
        country: 'SriLanka',
        line1: '',
        line2: '',
        postal_code: '',
      },
      phone: '0123654879',
      test_clock: testClock || '',
    });
  }

  async retrieveStripeCustomer(customerId: string): Promise<any> {
    const customer = await this.stripe.customers.retrieve(customerId);
    if (!customer?.id) {
      this.logger.warn(
        `cannot get the customer ${customerId} at this time, function=retrieveCustomer time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(
        `cannot get the customer ${customerId} at this time`,
      );
    }
    return customer;
  }

  async stripePaymentAttach(
    payment_method_id: string,
    stripe_customer_id: string,
  ) {
    return await this.stripe.paymentMethods.attach(payment_method_id, {
      customer: stripe_customer_id,
    });
  }

  async updateStripeDefaultPaymentMethod(
    stripe_customer_id: string,
    payment_method_id: string,
  ) {
    return await this.stripe.customers.update(stripe_customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    });
  }

  async createSubscriptionIntent(
    stripe_customer_id: string,
    payment_method_id: string,
  ) {
    // console.log('payment_method_id - xxx', payment_method_id);
    // console.log('stripe_customer_id - xxx', stripe_customer_id);
    return await this.stripe.subscriptions.create({
      customer: stripe_customer_id,
      items: [{ price: payment_method_id }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async constructStripeWebhookEvent(data: Buffer, sig: string) {
    return this.stripe.webhooks.constructEvent(
      data,
      sig,
      this.configService.get<string>('STRIPE_WEBHOOK_ENDPOINT_SK'),
    );
  }

  async stripeSetupIntentsCreate(stripe_customer_id: string) {
    return await this.stripe.setupIntents.create({
      customer: stripe_customer_id,
    });
  }

  async createStripeOneTimePayment(
    amount: number,
    payment_method: string,
    stripe_customer_id: string,
  ) {
    return await this.stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'gbp',
      payment_method_types: ['card'],
      confirm: true,
      payment_method: payment_method, //get this from frontend
      customer: stripe_customer_id,
    });
  }

  async getStripeCustomerListPaymentMethods(stripe_customer_id: string) {
    const { data } = await this.stripe.customers.listPaymentMethods(
      stripe_customer_id,
      { type: 'card' },
    );
    if (data.length < 1) {
      return [];
    }
    return data;
  }

  async stripePaymentDetach(old_payment_method_id: string) {
    return await this.stripe.paymentMethods.detach(
      old_payment_method_id && old_payment_method_id,
    );
  }

  async retrieveStripeSubscription(subscription_id: string) {
    return await this.stripe.subscriptions.retrieve(subscription_id);
  }

  async cancelSubscriptionRenewal(subscription_id: string) {
    const subscription = await this.stripe.subscriptions.update(
      subscription_id,
      { cancel_at_period_end: true },
    );

    return subscription;
  }

  async updateStripeSubscription(
    subscription_id: string,
    subs_id: string,
    price_id: string,
  ) {
    return await this.stripe.subscriptions.update(subscription_id, {
      items: [
        {
          id: subs_id,
          price: price_id,
        },
      ],
    });
  }

  async updateStripeCustomer(
    stripe_customer_id: string,
    default_payment_method: string,
  ) {
    return await this.stripe.customers.update(stripe_customer_id, {
      invoice_settings: { default_payment_method: default_payment_method },
    });
  }

  async deleteStripeSubscription(subscription_id: string) {
    return await this.stripe.subscriptions.cancel(subscription_id);
  }

  async restart_stripe_subscription(subscription_id: string) {
    return await this.stripe.subscriptions.update(subscription_id, {
      pause_collection: '',
    });
  }

  async pause_stripe_subscription(subscription_id: string) {
    return await this.stripe.subscriptions.update(subscription_id, {
      pause_collection: {
        behavior: 'void',
      },
    });
  }
}
