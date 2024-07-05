import { CampaignRepository } from './../repository/campaign.repository';
import { InvoiceRepository } from './../repository/invoice.repository';
import { MailService } from './../mail/mail.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentWithStripeDTO } from './dto/CreateStripePayment.dto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common/exceptions';
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
import { UserRepository } from 'src/repository/user.repository';
import { StripeRepository } from './stripe.repository';
import { PaymentRepository } from 'src/repository/payment.repository';
import { PaymentTypes } from '../dtos/campaignDto/CampaignDetails.dto';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';
import {
  PaymentCreateDto,
  PaymentUpdateDto,
} from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { Role } from 'src/schemas/user.schema';
import { CampaignStatus } from 'src/schemas/campaign.schema';
import * as address from 'address';

const ip = address.ip();
@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(`${ip} src/stripe/stripe.service.ts`);

  constructor(
    private configService: ConfigService,
    private userRepository: UserRepository,
    private stripeRepository: StripeRepository,
    private paymentRepository: PaymentRepository,
    private mailService: MailService,
    private campaignRepository: CampaignRepository,
    private invoiceRepository: InvoiceRepository,
  ) {
    /** @Note Setup the Stripe instance */
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SK'), {
      /** @Note Define the secret key at config.env */ apiVersion: '2023-10-16',
    });
  }

  async createStripePayment(
    createPaymentWithStripeDTO: CreatePaymentWithStripeDTO,
  ) {
    let existUser: any = null;
    let newUser: any = null;
    const user_id_is_null: boolean | string =
      createPaymentWithStripeDTO.user_id === null
        ? null
        : createPaymentWithStripeDTO.user_id;
    const {
      user_id,
      amount,
      payment_method_id,
      campaign_id,
      price_id,
      payment_type,
      is_saved,
      is_user_guest,
      is_gift_aid,
      first_name,
      last_name,
      primary_email,
      gift_aid_address,
    } = createPaymentWithStripeDTO;

    if (primary_email && primary_email.length !== 0) {
      existUser = await this.userRepository.findByEmail(primary_email);
    }

    if (createPaymentWithStripeDTO.user_id === null && !existUser) {
      const randumNumber =
        await this.paymentRepository.getRandomNumberBasedOnTime();

      newUser = await this.userRepository.createUser({
        first_name:
          createPaymentWithStripeDTO.primary_email === null
            ? 'Anonymous'
            : createPaymentWithStripeDTO.first_name,
        last_name:
          createPaymentWithStripeDTO.primary_email === null
            ? 'Anonymous'
            : createPaymentWithStripeDTO.last_name,
        primary_email:
          createPaymentWithStripeDTO.primary_email === null
            ? `Anonymous` + randumNumber + `@gmail.com`
            : createPaymentWithStripeDTO.primary_email,
        password: null,
        is_marketing_accepted: false,
        verification_code: 12345,
        role: Role.GUEST,
      });

      if (
        createPaymentWithStripeDTO?.primary_email !== null &&
        createPaymentWithStripeDTO?.first_name !== null &&
        createPaymentWithStripeDTO?.last_name !== null
      ) {
        newUser.country = createPaymentWithStripeDTO.gift_aid_address.country;
        newUser.street_address =
          createPaymentWithStripeDTO.gift_aid_address.street_address;
        newUser.city = createPaymentWithStripeDTO.gift_aid_address.city;
        newUser.apartment =
          createPaymentWithStripeDTO.gift_aid_address.apartment;
        newUser.postal_code = Number(
          createPaymentWithStripeDTO.gift_aid_address.postal_code,
        );

        const updateNewUser = await this.userRepository.updateUser(
          newUser._id,
          newUser,
        );

        if (!updateNewUser) {
          this.logger.warn(
            `User cannot update userId=${
              updateNewUser._id
            } time=${new Date().getTime()}`,
          );
          throw new NotFoundException(
            `User cannot update userId=${
              updateNewUser._id
            } time=${new Date().getTime()}`,
          );
        }
      }

      if (!newUser.stripe_customer_id || newUser.stripe_customer_id == '') {
        //add test clocks
        let testClock: Stripe.TestHelpers.TestClock | null = null;
        testClock = await this.stripe.testHelpers.testClocks.create({
          frozen_time: Math.round(Date.now() / 1000),
        });
        const {
          primary_email,
          city,
          country,
          apartment,
          street,
          // phone_number,
          postal_code,
          first_name,
          last_name,
        } = newUser;

        const createStripeCustomerDetails = {
          name: first_name,
          email: primary_email,
          city: city,
          country: country,
          apartment: apartment,
          street: '',
          postal_code: postal_code ? postal_code : '',
          phone_number: '',
          test_clock: testClock?.id || '',
        };

        try {
          const response = await this.stripeRepository.createStripeCustomer(
            createStripeCustomerDetails,
          );

          // save newUser stripe_customer_id
          if (response) {
            newUser.stripe_customer_id = response.id;

            // update stripe customer id
            await this.userRepository.updateUser(newUser._id, newUser);
            this.logger.log(
              `Create stripe customer stripe_customer_id=${
                newUser.stripe_customer_id
              } time=${new Date().getTime()}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error when register on the stripe time=${new Date().getTime()}`,
          );
          await this.mailService.PaymentFailedEmail(
            first_name,
            last_name,
            primary_email,
            'bank',
          );
          throw new ForbiddenException(
            `Error when register on the stripe ${error}`,
          );
        }
      }

      //check newUser sets a default payment method
      const customer = await this.stripeRepository.retrieveStripeCustomer(
        newUser.stripe_customer_id,
      );

      //check
      if (!customer) {
        this.logger.warn(
          `Cannot find stripe customer stripe_customer_id=${
            newUser.stripe_customer_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Cannot find stripe customer stripe_customer_id=${
            newUser.stripe_customer_id
          } time=${new Date().getTime()}`,
        );
      }

      // ! ................... check okay

      if (payment_method_id && newUser.stripe_customer_id) {
        try {
          const response = await this.stripeRepository.stripePaymentAttach(
            payment_method_id,
            newUser.stripe_customer_id,
          );

          //check
          if (!response.id) {
            this.logger.warn(
              `Error in stripe Payment Attach stripe_customer_id=${
                newUser.stripe_customer_id
              } time=${new Date().getTime()}`,
            );
            throw new NotFoundException(
              `Error in stripe Payment Attach stripe_customer_id=${
                newUser.stripe_customer_id
              } time=${new Date().getTime()}`,
            );
          }
        } catch (error) {
          await this.mailService.PaymentFailedEmail(
            first_name,
            last_name,
            newUser.primary_email,
            'bank',
          );

          this.logger.error(
            `Error with attaching payment method ${error} userId=${user_id} time=${new Date().getTime()}`,
          );
        }
      }

      //change the assigning values
      const default_payment_method =
        customer.invoice_settings.default_payment_method;

      if (payment_method_id !== default_payment_method) {
        const payment_method =
          await this.stripeRepository.updateStripeDefaultPaymentMethod(
            newUser.stripe_customer_id,
            payment_method_id,
          );

        if (!payment_method.id) {
          this.logger.warn(
            `Error with updating default payment method time=${new Date().getTime()}`,
          );
          //payment error send mail

          throw new ConflictException(
            `Error with updating default payment method time=${new Date().getTime()}`,
          );
        }

        // stripe_default_payment_method update

        newUser.stripe_default_payment_method = payment_method_id;

        const { stripe_default_payment_method } =
          await this.userRepository.updateUser(
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
            newUser,
          );

        if (!stripe_default_payment_method) {
          this.logger.warn(
            `Error with updating default payment method userId=${user_id} time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with updating default payment method`,
          );
        }
      }

      // monthly payment
      if (payment_type === PaymentTypes.SUBSCRIPTION) {
        if (user_id_is_null === null) {
          this.logger.warn(
            `Anonymous user can not create subscription time=${new Date().getTime()}`,
          );
          return 'Anonymous user can not create subscription';
        }
        const payments = await this.paymentRepository.getUserSubscriptions(
          user_id,
        );

        if (payments.length > 0) {
          this.logger.warn(
            `user already have subscription userId=${user_id} time=${new Date().getTime()}`,
          );

          return { message: 'user already subscribed' };
        }

        /**@Note customer already has created a subscription he cannot create another subscription */

        //init subscription
        const subscriptionIntent =
          await this.stripeRepository.createSubscriptionIntent(
            newUser.stripe_customer_id,
            price_id,
          );

        //check
        if (!subscriptionIntent.id) {
          this.logger.warn(
            `Error with create Subscription Intent stripe_customer_id=${
              newUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with create Subscription Intent newUser.stripe_customer_id=${
              newUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
        }

        const dateTimeString = new Date(
          subscriptionIntent.current_period_start * 1000,
        );

        const createPaymentDetails: PaymentCreateDto = {
          payment_id: subscriptionIntent.id,
          amount: +subscriptionIntent.items.data[0].plan.amount / 100,
          campaign_id: campaign_id,
          user_id:
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && existUser
              ? existUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
          method: PaymentMethod.STRIPE,
          payment_type: PaymentType.MONTHLY,
          status: Status.PENDING,
          is_gift_aid: is_gift_aid,
          is_donation_private: is_user_guest,
        };

        //create payment status = pending
        const payment = await this.paymentRepository.createPayment(
          createPaymentDetails,
        );

        if (!payment) {
          //payment error
          this.logger.warn(
            `Error with saving payment userId=${user_id} time=${new Date().getTime()}`,
          );

          throw new Error(`payment not saved`);
        }

        return subscriptionIntent;
      }

      // one-time payment
      if (payment_type === PaymentTypes.ONETIME) {
        const paymentIntents =
          await this.stripeRepository.createStripeOneTimePayment(
            amount,
            payment_method_id,
            newUser.stripe_customer_id,
          );

        //check
        if (!paymentIntents.id) {
          this.logger.warn(
            `Error with create Subscription Intent one time payment stripe_customer_id=${
              newUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with create Subscription Intent one time payment newUser.stripe_customer_id=${
              newUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
        }

        const dateTimeString = new Date(paymentIntents.created * 1000);

        const createPaymentDetails: PaymentCreateDto = {
          payment_id: paymentIntents.id,
          amount: +paymentIntents.amount / 100,
          campaign_id: campaign_id,
          user_id:
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && existUser
              ? existUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
          method: PaymentMethod.STRIPE,
          payment_type: PaymentType.ONETIME,
          status: Status.PENDING,
          is_gift_aid: is_gift_aid,
          is_donation_private: is_user_guest,
        };

        //create payment status = pending
        const payment = await this.paymentRepository.createPayment(
          createPaymentDetails,
        );

        if (!payment) {
          //payment error
          this.logger.warn(
            `Error with saving payment userId=${user_id} time=${new Date().getTime()}`,
          );

          throw new Error(`payment not saved`);
        }

        return paymentIntents;
      }
    } else {
      if (
        createPaymentWithStripeDTO.primary_email !== null &&
        createPaymentWithStripeDTO.first_name !== null &&
        createPaymentWithStripeDTO.last_name !== null
      ) {
        existUser.country = createPaymentWithStripeDTO.gift_aid_address.country;
        existUser.street_address =
          createPaymentWithStripeDTO.gift_aid_address.street_address;
        existUser.city = createPaymentWithStripeDTO.gift_aid_address.city;
        existUser.apartment =
          createPaymentWithStripeDTO.gift_aid_address.apartment;
        existUser.postal_code = Number(
          createPaymentWithStripeDTO.gift_aid_address.postal_code,
        );

        const updateOldUser = await this.userRepository.updateUser(
          existUser._id,
          existUser,
        );

        if (!updateOldUser) {
          this.logger.warn(
            `User cannot update userId=${
              updateOldUser._id
            } time=${new Date().getTime()}`,
          );
          throw new NotFoundException(
            `User cannot update userId=${
              updateOldUser._id
            } time=${new Date().getTime()}`,
          );
        }
      }

      //if user haven't stripe_customer_id register on stripe
      if (!existUser.stripe_customer_id || existUser.stripe_customer_id == '') {
        //add test clocks
        // let testClock: Stripe.TestHelpers.TestClock | null = null;
        // testClock = await this.stripe.testHelpers.testClocks.create({
        //   frozen_time: Math.round(Date.now() / 1000),
        // });
        const {
          primary_email,
          city,
          country,
          apartment,
          street,
          // phone_number,
          postal_code,
          first_name,
          last_name,
        } = existUser;

        const createStripeCustomerDetails = {
          name: first_name,
          email: primary_email,
          city: city,
          country: country,
          apartment: apartment,
          street: '',
          postal_code: postal_code ? postal_code : '',
          phone_number: '',
        };

        try {
          const response = await this.stripeRepository.createStripeCustomer(
            createStripeCustomerDetails,
          );

          // save existUser stripe_customer_id
          if (response) {
            existUser.stripe_customer_id = response.id;

            // update stripe customer id
            await this.userRepository.updateUser(existUser._id, existUser);
          }
        } catch (error) {
          this.logger.error(
            `Error when register on the stripe time=${new Date().getTime()} ${error}`,
          );
          await this.mailService.PaymentFailedEmail(
            first_name,
            last_name,
            primary_email,
            'bank',
          );
          throw new ForbiddenException(
            `Error when register on the stripe ${error}`,
          );
        }
      }

      //check existUser sets a default payment method
      const customer = await this.stripeRepository.retrieveStripeCustomer(
        existUser.stripe_customer_id,
      );

      //check
      if (!customer) {
        this.logger.warn(
          `Cannot find stripe customer stripe_customer_id=${
            existUser.stripe_customer_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Cannot find stripe customer stripe_customer_id=${
            existUser.stripe_customer_id
          } time=${new Date().getTime()}`,
        );
      }

      // ! ................... check okay

      if (payment_method_id && existUser.stripe_customer_id) {
        try {
          const response = await this.stripeRepository.stripePaymentAttach(
            payment_method_id,
            existUser.stripe_customer_id,
          );

          //check
          if (!response.id) {
            this.logger.warn(
              `Error in stripe Payment Attach stripe_customer_id=${
                existUser.stripe_customer_id
              } time=${new Date().getTime()}`,
            );
            throw new NotFoundException(
              `Error in stripe Payment Attach stripe_customer_id=${
                existUser.stripe_customer_id
              } time=${new Date().getTime()}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error with attaching payment method ${error} userId=${user_id} time=${new Date().getTime()} ${error}`,
          );
          await this.mailService.PaymentFailedEmail(
            first_name,
            last_name,
            existUser.primary_email,
            'bank',
          );

          this.logger.error(
            `Error with attaching payment method ${error} userId=${user_id} time=${new Date().getTime()}`,
          );
        }
      }

      //change the assigning values
      const default_payment_method =
        customer.invoice_settings.default_payment_method;

      if (payment_method_id !== default_payment_method) {
        const payment_method =
          await this.stripeRepository.updateStripeDefaultPaymentMethod(
            existUser.stripe_customer_id,
            payment_method_id,
          );

        if (!payment_method.id) {
          this.logger.warn(
            `Error with updating default payment method userId=${user_id} time=${new Date().getTime()}`,
          );
          //payment error send mail

          throw new ForbiddenException(
            `Error with updating default payment method`,
          );
        }

        // stripe_default_payment_method update

        existUser.stripe_default_payment_method = payment_method_id;

        const { stripe_default_payment_method } =
          await this.userRepository.updateUser(
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && existUser
              ? existUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
            existUser,
          );

        if (!stripe_default_payment_method) {
          this.logger.error(
            `Error with updating default payment method userId=${user_id} time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with updating default payment method`,
          );
        }
      }

      // monthly payment
      if (payment_type === PaymentTypes.SUBSCRIPTION) {
        if (user_id_is_null === null) {
          this.logger.error(
            `Anonymous user can not create subscription time=${new Date().getTime()}`,
          );
          return 'Anonymous user can not create subscription';
        }
        const payments = await this.paymentRepository.getUserSubscriptions(
          user_id,
        );

        if (payments.length > 0) {
          this.logger.error(
            `user already have subscription userId=${user_id} time=${new Date().getTime()}`,
          );

          return { message: 'user already subscribed' };
        }

        /**@Note customer already has created a subscription he cannot create another subscription */

        //init subscription
        const subscriptionIntent =
          await this.stripeRepository.createSubscriptionIntent(
            existUser.stripe_customer_id,
            price_id,
          );

        //check
        if (!subscriptionIntent.id) {
          this.logger.error(
            `Error with create Subscription Intent stripe_customer_id=${
              existUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with create Subscription Intent existUser.stripe_customer_id=${
              existUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
        }

        const dateTimeString = new Date(
          subscriptionIntent.current_period_start * 1000,
        );

        const createPaymentDetails: PaymentCreateDto = {
          payment_id: subscriptionIntent.id,
          amount: +subscriptionIntent.items.data[0].plan.amount / 100,
          campaign_id: campaign_id,
          user_id:
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && existUser
              ? existUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
          method: PaymentMethod.STRIPE,
          payment_type: PaymentType.MONTHLY,
          status: Status.PENDING,
          is_gift_aid: is_gift_aid,
          is_donation_private: is_user_guest,
        };

        //create payment status = pending
        const payment = await this.paymentRepository.createPayment(
          createPaymentDetails,
        );

        if (!payment) {
          //payment error
          this.logger.error(
            `Error with saving payment userId=${user_id} time=${new Date().getTime()}`,
          );

          throw new Error(`payment not saved`);
        }

        return subscriptionIntent;
      }

      // one-time payment
      if (payment_type === PaymentTypes.ONETIME) {
        const paymentIntents =
          await this.stripeRepository.createStripeOneTimePayment(
            amount,
            payment_method_id,
            existUser.stripe_customer_id,
          );

        //check
        if (!paymentIntents.id) {
          this.logger.error(
            `Error with create Subscription Intent one time payment stripe_customer_id=${
              existUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
          throw new ForbiddenException(
            `Error with create Subscription Intent one time payment existUser.stripe_customer_id=${
              existUser.stripe_customer_id
            } time=${new Date().getTime()}`,
          );
        }

        const dateTimeString = new Date(paymentIntents.created * 1000);

        const createPaymentDetails: PaymentCreateDto = {
          payment_id: paymentIntents.id,
          amount: +paymentIntents.amount / 100,
          campaign_id: campaign_id,
          user_id:
            createPaymentWithStripeDTO.user_id === null && newUser
              ? newUser._id.toString()
              : createPaymentWithStripeDTO.user_id === null && existUser
              ? existUser._id.toString()
              : createPaymentWithStripeDTO.user_id !== null
              ? createPaymentWithStripeDTO.user_id
              : null,
          method: PaymentMethod.STRIPE,
          payment_type: PaymentType.ONETIME,
          status: Status.PENDING,
          is_gift_aid: is_gift_aid,
          is_donation_private: is_user_guest,
        };

        //create payment status = pending
        const payment = await this.paymentRepository.createPayment(
          createPaymentDetails,
        );

        if (!payment) {
          //payment error
          this.logger.error(
            `Error with saving payment userId=${user_id} time=${new Date().getTime()}`,
          );

          throw new Error(`payment not saved`);
        }

        return paymentIntents;
      }
    }
  }

  /**
   * @Note Save Payment Methods
   * @Note
   */
  async savePaymentMethod(
    savePaymentMethodsDTO: SavePaymentMethodsDTO,
  ): Promise<{
    clientSecret: string;
    intent: Stripe.Response<Stripe.SetupIntent>;
  }> {
    const user_id = savePaymentMethodsDTO.customer_id.toString();
    const user = await this.userRepository.findById(user_id);

    if (!user) {
      this.logger.warn(
        `user not found userId=${user_id} time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(`User not found`);
    }
    if (!user.stripe_customer_id || user.stripe_customer_id == '') {
      // let testClock: Stripe.TestHelpers.TestClock | null = null;
      const {
        primary_email,
        city,
        country,
        apartment,
        postal_code,
        first_name,
      } = user;
      await this.stripe.customers
        .create({
          name: first_name,
          email: primary_email,
          address: {
            city: city || '',
            country: country || '',
            line1: apartment || '',
            line2: '',
            postal_code: postal_code?.toString() || '',
          },
          phone: '',
          // test_clock: testClock?.id || '',
        })
        .then(async (res) => {
          user.stripe_customer_id = res.id;
          await this.userRepository.updateById(user._id, user);
        })
        .catch((error) => {
          this.logger.error(
            `${new Date()} Error when register on the stripe ${
              user.first_name
            } ${error}`,
          );
          throw new ForbiddenException(
            `Error when register on the stripe ${error}`,
          );
        });
    }
    /**
     * @Note  create a setup payment and
     * @Note A SetupIntent is an object that represents your intent to set up a customer’s card for future payments.
     * @Note Customer id generated when register
     */

    try {
      const intent = await this.stripe.setupIntents.create({
        customer: user.stripe_customer_id,
      });

      if (!intent) {
        this.logger.warn(
          `${new Date()} Error with saving payment method. stripe customer id:${
            user.stripe_customer_id
          }`,
        );
        await this.mailService.PaymentFailedEmail(
          user.first_name,
          user.last_name,
          user.primary_email,
          'bank',
        );
        throw new ForbiddenException(`Error with saving payment method`);
      }

      /**@Return  client secret */
      /**@Additional */
      return {
        clientSecret: intent.client_secret,
        intent: intent,
      };
    } catch (error) {
      console.error(error);
      await this.mailService.PaymentFailedEmail(
        user.first_name,
        user.last_name,
        user.primary_email,
        'bank',
      );
      throw new BadRequestException('Something going wrong', {
        cause: new Error(),
        description: 'Something going wrong',
      });
    }
  }

  /**@Note Get the payment methods that is_saved by the customer before*/

  async getSavedStripePaymentMethods(user_id: string) {
    try {
      /**@Note List the payment methods */

      const user = await this.userRepository.findById(user_id);

      if (!user) {
        this.logger.error(`user not found ${user_id}`);
        throw new ForbiddenException(`User not found`);
      }

      const { stripe_customer_id } = user;

      if (!stripe_customer_id || stripe_customer_id == '') {
        throw new ForbiddenException(`Customer not found`);
      }

      const data =
        await this.stripeRepository.getStripeCustomerListPaymentMethods(
          stripe_customer_id,
        );
      if (data.length < 1) {
        return [];
      }
      return data;
    } catch (error) {
      return error;
    }
  }

  async deletePaymentMethod(
    deleteSavedPaymentMethods: DeleteSavedPaymentMethods,
  ) {
    const { payment_method_id } = deleteSavedPaymentMethods;

    const { id } = await this.stripeRepository.stripePaymentDetach(
      payment_method_id,
    );

    if (!id) {
      this.logger.warn(
        `Cannot delete payment method at this time, id not found when deleting payment method, function=detachpaymentMethod ${payment_method_id} time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(`Cannot delete payment method at this time`);
    }
    return id;
  }

  /**
   * @param deleteSavedPaymentMethod
   * @NoteDetaches a PaymentMethod object from a Customer. After a PaymentMethod is detached, it can no longer be used for a payment or re-attached to a Customer.
   * @returns paymentMethod<Stripe.Response<Stripe.PaymentMethod>>
   */
  async deleteSavedPaymentMethod(
    deleteSavedPaymentMethod: DeleteSavedPaymentMethods,
  ): Promise<Stripe.Response<Stripe.PaymentMethod>> {
    try {
      /**@Note Payment methods */

      /** 1. check method is already using in subscription
       *
       * get subscriptions by the user
       * query for the payment methods
       * if those include this payment method cannot delete
       */

      /** Get subscriptions by the user */
      const activeSubscriptions =
        await this.getActiveSubscriptionListForTheCustomer(
          deleteSavedPaymentMethod.customer_id,
        );

      //check
      if (!activeSubscriptions) {
        this.logger.error(
          `Error in get Active Subscription List For The Customer customer_id=${
            deleteSavedPaymentMethod.customer_id
          } time=${new Date().getTime()}`,
        );
        throw new ForbiddenException(
          `Error in get Active Subscription List For The Customer customer_id=${
            deleteSavedPaymentMethod.customer_id
          } time=${new Date().getTime()}`,
        );
      }

      //need to apply if condition to check activeSubscriptions

      /**@Check if the payment method is use with the active subscription */
      const isUserHasActiveSubscriptions_WithThisMethod =
        (await activeSubscriptions) &&
        activeSubscriptions.length > 0 &&
        activeSubscriptions.payment_method ==
          deleteSavedPaymentMethod.payment_method_id;

      if (isUserHasActiveSubscriptions_WithThisMethod) {
        /**@Check isUserHasActiveSubscriptions_WithThisMethod */
        throw new BadRequestException(
          'You cannot delete this payment method, because you have a subscription with this method',
          {
            cause: new Error(),
            description:
              'You cannot delete this payment method, because you have a subscription with this method',
          },
        );
      }

      const paymentMethod = (await this.stripe.paymentMethods.detach(
        /**@Note  */
        deleteSavedPaymentMethod.payment_method_id &&
          deleteSavedPaymentMethod.payment_method_id,
      )) as Stripe.Response<Stripe.PaymentMethod>;
      return paymentMethod;
    } catch (error) {
      throw new BadRequestException(
        'You cannot delete this payment method, because you have a subscription with this method',
        {
          cause: new Error(),
          description:
            'You cannot delete this payment method, because you have a subscription with this method',
        },
      );
    }
  }

  /**
   * @Step get user created subscription
   * @Step delete the previous payment method
   * @Step attach the new payment method to the customer
   * @Step update the user created subscription with new payment method
   * @param  UpdateStripePaymentMethodDTO
   */

  async updateSavedPaymentMethod(
    updateSavedPaymentMethodDTO: UpdateStripePaymentMethodDTO,
  ) {
    try {
      const payment_method = await this.stripeRepository.stripePaymentDetach(
        updateSavedPaymentMethodDTO.old_payment_method_id &&
          updateSavedPaymentMethodDTO.old_payment_method_id,
      );

      if (!payment_method?.id) {
        throw new BadRequestException('Something going wrong', {
          cause: new Error(),
          description: 'Something going wrong',
        });
      }

      if (updateSavedPaymentMethodDTO.subscription_id) {
        await this.stripeRepository.retrieveStripeSubscription(
          updateSavedPaymentMethodDTO.subscription_id,
        );
      }

      return payment_method as Stripe.Response<Stripe.PaymentMethod>;
    } catch (error) {
      throw new BadRequestException('Something going wrong', {
        cause: new Error(),
        description: 'Something going wrong',
      });
    }
  }
  // db.books.aggregate( [ { $project : { "author.first" : 0, "lastModified" : 0 } } ] )

  async getActiveSubscription(user_id: string) {
    return await this.paymentRepository.getUserSubscriptions(user_id);
  }

  async getActiveSubscriptionListForTheCustomer(user_id: string): Promise<
    | {
        id: Stripe.Subscription | string;
        status: Stripe.Subscription.Status | string;
        start_date: Stripe.Subscription | string;
        interval?: Stripe.Subscription | string;
        price: Stripe.Subscription | any;
      }
    | any
  > {
    try {
      /**@Todo check the user_id is availabale */
      const subscriptions = (await this.stripe.subscriptions.list({
        customer: user_id,
      })) as Stripe.Response<Stripe.ApiList<Stripe.Subscription>>;

      return subscriptions.data.length > 0
        ? subscriptions.data.map((data) => {
            return {
              id: data.id,
              status: data.status,
              start_date: data.start_date,
              interval: data.next_pending_invoice_item_invoice,
              price: data.items.data.map((data) => data.price.unit_amount),
              payment_method: data.default_payment_method,
              method: PaymentMethod.STRIPE,
            };
          })
        : [];
    } catch (error) {
      return [];
      // throw new BadRequestException('no subscription found', {
      //   cause: new Error(),
      //   description: 'no subscription found',
      // });
    }
  }
  /**@Note only response with canceled subscriptions */

  async getCanceledSubscriptionListForTheCustomer(user_id: string): Promise<
    | {
        id: string;
        status: string;
        start_date: string;
        interval?: any;
        price: any;
        payment_method: string;
      }
    | any
  > {
    try {
      /**@Todo check the user_id is available */
      const subscriptions = (await this.stripe.subscriptions.list({
        customer: user_id,
        status: 'canceled',
      })) as Stripe.Response<Stripe.ApiList<Stripe.Subscription>>;
      return subscriptions.data.map((data) => {
        return {
          id: data.id,
          status: data.status,
          start_date: data.start_date,
          interval: data.next_pending_invoice_item_invoice,
          price: data.items.data.map((data) => data.price.unit_amount),
          payment_method: data.default_payment_method,
        };
      });
    } catch (error) {
      throw new BadRequestException('Something going wrong', {
        cause: new Error(),
        description: 'Something going wrong',
      });
    }
  }

  /**@Note Cancel the subscription */
  async cancelSubscription(
    cancelStripeSubscriptionDTO: CancelStripeSubscriptionDTO, // : Promise<Stripe.Response<Stripe.Subscription> | Error>
  ) {
    try {
      const deleteSub = await this.stripeRepository
        .deleteStripeSubscription(cancelStripeSubscriptionDTO.subscription_id)
        .then((res) => {
          //check
          if (res) {
            this.logger.error(
              `Error in delete Stripe Subscription subscription_id=${
                cancelStripeSubscriptionDTO.subscription_id
              } time=${new Date().getTime()}`,
            );
            throw new ForbiddenException(
              `Error in delete Stripe Subscription subscription_id=${
                cancelStripeSubscriptionDTO.subscription_id
              } time=${new Date().getTime()}`,
            );
          }
        })
        .catch((err) => console.log(err));

      //update the payment document

      const getSubscription =
        (await this.paymentRepository.getUserSubscriptions(
          cancelStripeSubscriptionDTO.user_id,
        )) as any;

      getSubscription.status = Status.CANCELLED;
      await this.paymentRepository.updatePayment(
        getSubscription.payment_id,
        getSubscription,
      );

      return deleteSub;
    } catch (error) {
      throw new BadRequestException('Something going wrong', {
        cause: new Error(),
        description: 'Something going wrong',
      });
      // return error as Error
    }
  }

  async pauseSubscription(
    cancelStripeSubscriptionDTO: CancelStripeSubscriptionDTO, // : Promise<Stripe.Response<Stripe.Subscription> | Error>
  ) {
    try {
      const deleteSub = await this.stripeRepository
        .pause_stripe_subscription(cancelStripeSubscriptionDTO.subscription_id)
        .then((res) => {
          if (!res.id) {
            this.logger.error(
              `Error in pause stripe subscription subscription_id=${
                cancelStripeSubscriptionDTO.subscription_id
              } time=${new Date().getTime()}`,
            );
            throw new ForbiddenException(
              `Error in pause stripe subscription subscription_id=${
                cancelStripeSubscriptionDTO.subscription_id
              } time=${new Date().getTime()}`,
            );
          }
        })
        .catch((err) => console.log('pauseSubscription err', err));

      let getSubscription = (await this.paymentRepository.getUserSubscriptions(
        cancelStripeSubscriptionDTO.user_id,
      )) as any;

      const updatePaymentDetails: PaymentUpdateDto = {
        status: Status.CANCELLED,
      };

      return await this.paymentRepository.updatePayment(
        getSubscription[0].payment_id,
        updatePaymentDetails,
      );
    } catch (error) {
      throw new BadRequestException('Something going wrong', {
        cause: new Error(),
        description: 'Something going wrong',
      });
      // return error as Error
    }
  }

  async cancelSubscriptionRenewal(subscription_id: string) {
    const subscription = await this.stripe.subscriptions.update(
      subscription_id,
      { cancel_at_period_end: true },
    );
    if (subscription?.id) {
      const payment = await this.paymentRepository.findByPaymentId(
        subscription_id,
      )[0];
      if (payment.length > 0) {
        //update  renewal status
        payment.is_renewal = false;
        payment.status = Status.ACTIVE;
        await this.paymentRepository.updatePayment(payment.payment_id, payment);
      }

      const user = await this.userRepository.findById(payment.user_id);
      if (!user) {
        this.logger.log(
          `User not found ${user} user_id=${
            payment[0].user.id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(`Not found user id ${payment.user.id}`);
      }

      //Cancel Renewal
      // await this.mailService.SendCancellationConfirmation(user);
    }
    return subscription;
  }

  /**@Note Update the subscription */
  async updateSubscription(updateSubscriptionDTO: UpdateStripeSubscription) {
    const payments = await this.paymentRepository.getUserSubscriptions(
      updateSubscriptionDTO.user_id,
    );

    if (payments.length <= 0) {
      throw new BadRequestException('no payments found', {
        cause: new Error(),
        description: 'no payments found',
      });
    }

    try {
      const subs = await this.stripeRepository.retrieveStripeSubscription(
        payments[0].payment_id,
      );
      if (!subs) {
        throw new BadRequestException('no subscription found', {
          cause: new Error(),
          description: 'no subscription found',
        });
      }

      const subscription: Stripe.Response<Stripe.Subscription> =
        await this.stripeRepository.updateStripeSubscription(
          payments[0]?.payment_id,
          subs?.items.data[0].id,
          updateSubscriptionDTO.price_id,
        );

      if (subscription) {
        const paymentUpdateDetails: PaymentUpdateDto = {
          amount: subscription.items.data[0].plan.amount / 100,
        };
        //todo : update payment subscription id amount

        return await this.paymentRepository.updatePayment(
          payments[0]?.payment_id,
          paymentUpdateDetails,
        );
      }
    } catch (error) {
      this.logger.error(
        `subscriptions Error ${error} time=${new Date().getTime()} ${error}`,
      );
      console.log('subscriptions Error 🏮', error);
    }
  }

  async updateDefaultPaymentmethod(
    updateDefaultPaymentDto: UpdateDefaultPaymentDto,
  ) {
    const { user_id, payment_method_id } = updateDefaultPaymentDto;
    const user = await this.userRepository.findById(user_id);

    if (!user) {
      this.logger.warn(
        `user not found  function=updateDefaultPaymentmethod ${user_id} time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(`User not found`);
    }

    const {
      invoice_settings: { default_payment_method },
      id,
    } = await this.stripeRepository.updateStripeCustomer(
      user.stripe_customer_id,
      payment_method_id,
    );

    if (!id) {
      this.logger.warn(
        `Cannot update payment method at this time, id not found when updating customer, function=updateDefaultPaymentmethod ${user_id} time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(`Cannot update payment method at this time`);
    }

    user.stripe_default_payment_method = default_payment_method.toString();

    const { stripe_default_payment_method } =
      await this.userRepository.updateUser(user._id, user);

    if (!stripe_default_payment_method) {
      this.logger.error(
        `Error with updating default payment method stripe_default_payment_method not found,function=updateDefaultPaymentmethod  ${user_id} time=${new Date().getTime()}`,
      );
      throw new ForbiddenException(
        `Error with updating default payment method`,
      );
    }
    return {
      id: stripe_default_payment_method,
    };
  }

  /**@Note this can change anyone so this should check the customer who request this */

  async updateSubscriptionPaymentMethod(
    updateSubscrptionPaymentMethodDTO: UpdateStripeSubscriptionPaymentMethod,
  ) {
    try {
      /**@Note check the subscription is available , not canceled or not expired */
      const subs = await this.stripe.subscriptions.retrieve(
        updateSubscrptionPaymentMethodDTO.subscription_id,
      );
      if (!subs) {
        this.logger.error(`No subscription found time=${new Date().getTime()}`);
        throw new BadRequestException('no subscription found', {
          cause: new Error(),
          description: 'no subscription found',
        });
      }
      /**@Note update the subscription default payment method */
      const subscription = await this.stripe.subscriptions.update(
        updateSubscrptionPaymentMethodDTO.subscription_id,
        {
          default_payment_method:
            updateSubscrptionPaymentMethodDTO.newPaymentMethod &&
            updateSubscrptionPaymentMethodDTO.newPaymentMethod,
        },
      );
      /**@Note update the user with default payment method(calling the update api) */

      const response = await this.userRepository
        .updateUser(updateSubscrptionPaymentMethodDTO.user_id, {
          stripe_default_payment_method:
            updateSubscrptionPaymentMethodDTO.newPaymentMethod,
        })
        .catch((error) => error);

      return {
        subscription,
        response: response,
      };
    } catch (error) {
      throw new BadRequestException('no subscription found', {
        cause: new Error(),
        description: 'no subscription found',
      });
    }
  }

  async isUserCanCreateSubscriptions(user_id: string): Promise<boolean> {
    try {
      /**@Todo check the user_id is available */

      const payments = await this.paymentRepository.getUserSubscriptions(
        user_id,
      );

      /**@Note customer already has created a subscription he cannot create another subscription */
      return payments.length >= 1 ? false : true;
    } catch (error) {
      this.logger.error(`No subscription found time=${new Date().getTime()}`);
      throw new BadRequestException('no subscription found', {
        cause: new Error(),
        description: 'no subscription found',
      });
    }
  }

  /**@UPDATE this function not used after the update */
  async isUserCanSavePaymentMethod(user_id: string): Promise<boolean | Error> {
    try {
      /**@Note List the payment methods */
      const paymentMethods = (await this.stripe.customers.listPaymentMethods(
        user_id && user_id,
        { type: 'card' },
      )) as Stripe.Response<Stripe.ApiList<Stripe.PaymentMethod>>;
      return paymentMethods.data.length >= 1
        ? false
        : true; /**@Note customer already has created a payment method, he cannot save another payment method */
    } catch (error) {
      return error as Error;
    }
  }
  async testsub(data: any) {
    const { customer, price } = data;
    try {
      const sub = await this.stripe.subscriptions.create({
        customer: customer,
        items: [{ price: price }],
      });
      return sub;
    } catch (error) {
      this.logger.error(
        `Error in testsub found time=${new Date().getTime()} error=${error}`,
      );
      return error;
    }
  }

  async handleSubscriptionWebhook(data: Buffer, sig: string) {
    // this is the only stripe repository function in this webhook handle function
    const event = await this.stripeRepository.constructStripeWebhookEvent(
      data,
      sig,
    );

    const webHookData = JSON.parse(data.toString());

    if (!event?.id) {
      this.logger.warn(
        `event id not found eventId=${event?.id} time=${new Date().getTime()}`,
      );
      return;
    }

    switch (event.type) {
      case 'customer.subscription.deleted':
        //check subscription id
        if (!webHookData.data.object?.id) {
          this.logger.warn(
            `subscription id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.created`}  time=${new Date().getTime()}`,
          );
          return;
        }

        //update payment table
        const payment = await this.paymentRepository.findByPaymentId(
          webHookData.data.object?.id,
        );

        if (!payment.payment_id) {
          this.logger.warn(
            `payment id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } user_id=${
              payment.user_id
            } event=${`customer.subscription.deleted`} time=${new Date().getTime()}`,
          );
          return;
        }

        const updatePaymentDetails: PaymentUpdateDto = {
          status: Status.CANCELLED,
        };

        this.paymentRepository
          .updatePayment(payment.payment_id, updatePaymentDetails)
          .then(async (res) => {
            const user = await this.userRepository.findById(payment.user_id);

            if (!user?._id) {
              this.logger.warn(
                `user id not found eventId=${event?.id} subscription_id=${
                  webHookData.data.object?.id
                } user_id=${
                  payment.user_id
                } event=${`customer.subscription.deleted`} time=${new Date().getTime()}`,
              );
              return;
            }

            user.stripe_customer_id = '';
            user.stripe_default_payment_method = '';

            await this.userRepository
              .updateUser(user._id, user)
              .then((res) => {
                this.logger.log(
                  `user updated ${res._id} eventId=${
                    event?.id
                  } subscription_id=${webHookData.data.object?.id} user_id=${
                    payment.user_id
                  }  event=${`customer.subscription.deleted`} time=${new Date().getTime()}`,
                );
              })
              .catch((error) => {
                this.logger.error(
                  `user update error_${res.user_id} eventId=${
                    event?.id
                  } subscription_id=${webHookData.data.object?.id} user_id=${
                    payment.user_id
                  }  event=${`customer.subscription.deleted`} time=${new Date().getTime()} error=${error}`,
                );
              });

            //mail
            this.logger.log(
              `payment status updated ${payment.payment_id} ${
                Status.CANCELLED
              } eventId=${event?.id} subscription_id=${
                webHookData.data.object?.id
              } user_id=${
                payment.user_id
              }  event=${`customer.subscription.deleted`} time=${new Date().getTime()}`,
            );

            if (payment.payment_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  payment.payment_id,
                );

              await this.mailService.SubscriptionCancelled(
                paymentAllDetails[0].user_id.primary_email,
                paymentAllDetails[0].user_id.first_name,
                paymentAllDetails[0].user_id.last_name,
              );
            }
          })
          .catch((error) => {
            this.logger.error(
              `Payment status update error ${payment.payment_id} ${
                Status.CANCELLED
              } user_id=${
                payment.user_id
              } time=${new Date().getTime()} error=${error}`,
            );
          });
        break;
      // end of event type customer.subscription.deleted

      case 'customer.subscription.created':
        // check subscription id
        if (!webHookData.data.object?.id) {
          this.logger.warn(
            `subscription id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.created`}  time=${new Date().getTime()}`,
          );
          return;
        }

        if (webHookData.data.object.status !== 'active') {
          this.logger.warn(
            `subscription status not active it is equal to = ${
              webHookData.data.object.status
            }  eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.created`}  time=${new Date().getTime()}`,
          );
          return;
        }

        if (webHookData.data.object.latest_invoice) {
          this.logger.log(
            `Invoice id at creation ${webHookData.data.object.latest_invoice}`,
          );
        }
        if (!webHookData.data?.object?.id) {
          return;
        }

        const payment_created = await this.paymentRepository.findByPaymentId(
          webHookData.data.object?.id,
        );

        if (!payment_created.payment_id) {
          this.logger.warn(
            `payment id not found eventId=${event?.id} user_id=${
              payment_created.user_id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.created`}  time=${new Date().getTime()}`,
          );
          return;
        } else {
          if (
            payment_created.status == Status.ACTIVE ||
            payment_created.status == Status.CANCELLED
          ) {
            this.logger.warn(
              `payment status not pending status=${
                payment_created.status
              } eventId=${event?.id} user_id=${
                payment_created.user_id
              } subscription_id=${
                webHookData.data.object?.id
              } event=${`customer.subscription.created`}  time=${new Date().getTime()}`,
            );
            return;
          }
        }

        payment_created.status = Status.PENDING;

        const paymentUpdateDetails: PaymentUpdateDto = {
          status: Status.PENDING,
        };

        this.paymentRepository.updatePayment(
          payment_created.payment_id,
          paymentUpdateDetails,
        );
        break;

      case 'customer.subscription.updated':
        if (!webHookData.data.object?.id) {
          this.logger.warn(
            `subscription id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.updated`}  time=${new Date().getTime()}`,
          );
          return;
        }

        if (webHookData.data.object.status !== 'active') {
          this.logger.warn(
            `subscription status not active eventId=${
              event?.id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.updated`}  time=${new Date().getTime()}`,
          );
          return;
        }

        const payment_updated = await this.paymentRepository.findByPaymentId(
          webHookData.data.object?.id,
        );

        //check
        if (!payment_updated.payment_id) {
          this.logger.warn(
            `payment id not found eventId=${event?.id} user_id=${
              payment_updated.user_id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`customer.subscription.updated`}  time=${new Date().getTime()}`,
          );
          return;
        }

        this.paymentRepository
          .updatePayment(payment_updated.payment_id, payment_updated)
          .then(async (payment_res) => {
            this.logger.log(
              `Payment status updated eventId=${event?.id} user_id=${
                payment_updated.user?._id
              } subscription_id=${
                webHookData.data.object?.id
              } event=${`customer.subscription.updated`} status=${
                Status.ACTIVE
              } time=${new Date().getTime()} `,
            );

            const user = await this.userRepository.findById(
              payment_updated.user_id.toString(),
            );

            await this.userRepository
              .updateUser(user._id.toString(), user)
              .then((res) => {
                const subscription = webHookData.data.object;
                const prevoiusSubscription =
                  webHookData.data.previous_attributes;

                this.logger.log(
                  `user updated eventId=${event?.id} user_id=${
                    payment_updated.user?._id
                  } subscription_id=${
                    webHookData.data.object?.id
                  } event=${`customer.subscription.updated`} time=${new Date().getTime()} `,
                );

                if (
                  subscription.current_period_end >
                  prevoiusSubscription.current_period_end
                ) {
                  this.mailService.MailRenewalCompleted(
                    res,
                    payment_res,
                    webHookData.data.object?.latest_invoice,
                  );
                  this.logger.log(
                    `MailRenewalCompleted eventId=${event?.id} user_id=${
                      payment_updated.user?._id
                    } subscription_id=${
                      webHookData.data.object?.id
                    } event=${`customer.subscription.updated`} time=${new Date().getTime()} `,
                  );
                }
              });

            if (payment_updated.payment_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  payment_updated.payment_id,
                );

              await this.mailService.SubscriptionUpdateEmail(
                paymentAllDetails[0].user_id.primary_email,
                paymentAllDetails[0].user_id.first_name,
                paymentAllDetails[0].user_id.last_name,
                payment_updated.amount.toString(),
              );
            }
          })
          .catch((error) => {
            this.logger.error(
              `user update error eventId=${event?.id} user_id=${
                payment_updated.user?._id
              } subscription_id=${
                webHookData.data.object?.id
              } event=${`customer.subscription.updated`}  time=${new Date().getTime()} error=${error} `,
            );
          });
        break;

      case 'invoice.created':
        this.logger.log(
          `invoice_created_return_0 ${
            typeof webHookData.data.object == 'object'
              ? (webHookData.data.object as Stripe.Invoice)?.id
              : webHookData.data.object
          }`,
        );

        // invoice_not_created
        if (!(webHookData.data.object as Stripe.Invoice)?.id) {
          this.logger.log(
            `webHookData.data.object not found ${
              typeof webHookData.data.object == 'object'
                ? (webHookData.data.object as Stripe.Invoice)?.id
                : webHookData.data.object
            }`,
          );
          return;
        }

        // invoice_created

        this.logger.log(
          `invoice_created_return_1 ${
            typeof webHookData.data.object == 'object'
              ? (webHookData.data.object as Stripe.Invoice)?.id
              : webHookData.data.object
          }`,
        );

        const {
          amount_paid,
          id,
          customer_email,
          hosted_invoice_url,
          status,
          created,
          subscription,
        } = webHookData.data.object as Stripe.Invoice;

        if (!subscription) {
          this.logger.warn(`subscription not found for InvoiceId=${id}`);
        }

        const invoice_id =
          typeof webHookData.data.object == 'object'
            ? (webHookData.data.object as Stripe.Invoice)?.id
            : webHookData.data.object;

        //Todo: find invoice id have invoice in database

        const existingInvoice = await this.invoiceRepository.findOneByInvoiceId(
          invoice_id,
        );

        if (existingInvoice) {
          this.logger.log(`Invoice is already created invoiceId=${invoice_id}`);
          return;
        }

        const payment_invoice = await this.paymentRepository.getPaymentObjectId(
          typeof subscription == 'string'
            ? subscription
            : (subscription as Stripe.Subscription)?.id,
        );

        if (!payment_invoice.payment_id) {
          this.logger.log(
            `Payment not found event=invoice.created subscription_id=${
              typeof subscription == 'string'
                ? subscription
                : (subscription as Stripe.Subscription)?.id
            }`,
          );
        }

        break;

      case 'invoice.finalized':
        this.logger.log(`event_name=invoice_finalized`);

        if (
          typeof webHookData.data.object == 'object'
            ? (webHookData.data.object as Stripe.Invoice)?.id
            : webHookData.data.object
        ) {
          return;
        }

        // Todo: find by invoice id function should implement
        const invoiceFinalized =
          await this.invoiceRepository.findOneByInvoiceId(
            typeof webHookData.data.object == 'object'
              ? (webHookData.data.object as Stripe.Invoice)?.id
              : webHookData.data.object,
          );

        if (invoiceFinalized) {
          this.logger.log(
            `Invoice is not found ${
              typeof webHookData.data.object == 'object'
                ? (webHookData.data.object as Stripe.Invoice)?.id
                : webHookData.data.object
            }`,
          );
          return;
        }

        if (
          invoiceFinalized.status == 'paid' ||
          invoiceFinalized.status ==
            (webHookData.data.object as Stripe.Invoice).status
        ) {
          this.logger.log(
            `Invoice status is already ${
              invoiceFinalized[0].status
            } so  invoiceId=${
              typeof webHookData.data.object == 'object'
                ? (webHookData.data.object as Stripe.Invoice)?.id
                : webHookData.data.object
            } time=${new Date().getTime()}`,
          );
          return;
        }

        // todo: and should implement webHooke return invoice status save the database in invoice table
        const updatedInvoice = await this.invoiceRepository.updateInvoice(
          invoiceFinalized.invoice_id,
          (webHookData.data.object as Stripe.Invoice).status,
        );

        if (updatedInvoice) {
          this.logger.log(
            `Invoice status updated invoiceId=${
              (webHookData.data.object as Stripe.Invoice)?.id
            } newStatus=${
              (webHookData.data.object as Stripe.Invoice).status
            } time=${new Date().getTime()}`,
          );
        }

        break;

      case 'invoice.payment_succeeded':
        if (!webHookData.data?.object?.subscription) {
          this.logger.log(
            `subscription id not found eventId=${event?.id} subscription_id=${
              webHookData?.data?.object?.id
            } event=${`invoice.payment_succeeded`}  time=${new Date().getTime()}`,
          );
          return;
        }

        if (webHookData?.data?.object?.status !== 'paid') {
          this.logger.log(
            `subscription status not paid eventId=${
              event?.id
            } subscription_id=${
              webHookData?.data?.object?.id
            } event=${`invoice.payment_succeeded`}  time=${new Date().getTime()}`,
          );
          return;
        }

        //update payment table
        const payment_succeeded = await this.paymentRepository.findByPaymentId(
          webHookData.data?.object?.subscription,
        );

        if (!payment_succeeded.payment_id) {
          this.logger.log(
            `payment id not found eventId=${event?.id} user_id=${
              payment_succeeded.user_id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.payment_succeeded`}  time=${new Date().getTime()}`,
          );
          return;
        }

        payment_succeeded.status = Status.ACTIVE;

        const paymentSuccessStatus: PaymentUpdateDto = {
          status: Status.ACTIVE,
        };

        const updatePayments = await this.paymentRepository.updatePayment(
          payment_succeeded.payment_id,
          paymentSuccessStatus,
        );

        //check
        if (!updatePayments) {
          this.logger.warn(
            `something went wrong with create subscription time=${new Date().getTime()}`,
          );
        }

        //create invoice
        const createInvoice = await this.invoiceRepository.createInvoice({
          payment_id: updatePayments._id.toString(),
          invoice_id: webHookData.data.object.id,
          amount: updatePayments.amount,
          customer_email: null,
          hosted_invoice_url: null,
          status: Status.COMPLETED,
        });

        //check
        if (!createInvoice) {
          this.logger.warn(
            `something went wrong with create Invoice time=${new Date().getTime()}`,
          );
        }

        const existingPayment = await this.paymentRepository.getPaymentById(
          payment_succeeded.payment_id.toString(),
        );

        //check
        if (!existingPayment) {
          this.logger.warn(
            `something went wrong in existing Payment time=${new Date().getTime()}`,
          );
        }

        // update campaign collected cost
        const existingCampaign = await this.campaignRepository.getCampaignById(
          existingPayment.campaign_id.toString(),
        );

        if (!existingCampaign) {
          throw new ForbiddenException(
            `Existing Campaign not found Campaign id = ${existingPayment.campaign_id}`,
          );
        }

        existingCampaign.collected_cost =
          Number(existingCampaign.collected_cost) +
          Number(existingPayment.amount);

        if (
          Number(existingCampaign.required_cost) <=
          Number(existingCampaign.collected_cost)
        ) {
          existingCampaign.status = CampaignStatus.FILLED;

          await this.campaignRepository.updateCampaign(
            existingPayment.campaign_id.toString(),
            existingCampaign,
          );

          const donorsForACampaign =
            await this.paymentRepository.getDonorsForACampaign(
              existingPayment.campaign_id.toString(),
            );

          // send all donors to Goal Met Email
          donorsForACampaign.map(async (donorsData) => {
            await this.mailService.GoalMetEmail(
              donorsData.primary_email,
              donorsData.first_name,
              donorsData.last_name,
              existingCampaign.title,
            );
          });
        } else {
          await this.campaignRepository.updateCampaign(
            existingPayment.campaign_id.toString(),
            existingCampaign,
          );
        }

        // todo send mail to user payment is completed
        if (payment_succeeded.payment_id) {
          const paymentAllDetails =
            await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
              payment_succeeded.payment_id,
            );

          await this.mailService.PaymentCompleteEmail(
            paymentAllDetails[0].user_id.primary_email,
            paymentAllDetails[0].user_id.first_name,
            paymentAllDetails[0].user_id.last_name,
            paymentAllDetails[0].payment_id,
            new Date(paymentAllDetails[0].createdAt).toDateString(),
            paymentAllDetails[0].campaign_id.title,
            paymentAllDetails[0].method,
            paymentAllDetails[0].amount,
            paymentAllDetails[0].payment_type,
          );
        }

        break;

      case 'charge.succeeded':
        if (webHookData?.data?.object?.status !== 'succeeded') {
          this.logger.log(
            `charge status not succeeded eventId=${event?.id} charge_id=${
              webHookData?.data?.object?.id
            }   time=${new Date().getTime()}`,
          );
          return;
        }

        //update payment table
        const charge_succeeded = await this.paymentRepository.findByPaymentId(
          webHookData.data.object.payment_intent,
        );

        if (!charge_succeeded.payment_id) {
          this.logger.log(
            `payment id not found eventId=${event?.id} user_id=${
              payment_succeeded.user_id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.payment_succeeded`}  time=${new Date().getTime()}`,
          );
          return;
        }

        charge_succeeded.status = Status.ACTIVE;

        const chargeSucceededStatus: PaymentUpdateDto = {
          status: Status.ACTIVE,
        };

        const updatePayment = await this.paymentRepository.updatePayment(
          charge_succeeded.payment_id,
          chargeSucceededStatus,
        );

        if (!updatePayment) {
          this.logger.warn(
            `something went wrong with create subscription time=${new Date().getTime()}`,
          );
          throw new NotFoundException(
            `something went wrong with create subscription time=${new Date().getTime()}`,
          );
        }

        //create invoice
        const newInvoice = await this.invoiceRepository.createInvoice({
          payment_id: updatePayment._id.toString(),
          invoice_id: webHookData.data.object.id,
          amount: updatePayment.amount,
          customer_email: null,
          hosted_invoice_url: null,
          status: Status.COMPLETED,
        });

        //check
        if (!newInvoice) {
          this.logger.warn(
            `something went wrong with create Invoice time=${new Date().getTime()}`,
          );
        }

        // todo send mail to user payment is completed
        if (charge_succeeded.payment_id) {
          const paymentAllDetails =
            await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
              charge_succeeded.payment_id,
            );

          await this.mailService.PaymentCompleteEmail(
            paymentAllDetails[0].user_id.primary_email,
            paymentAllDetails[0].user_id.first_name,
            paymentAllDetails[0].user_id.last_name,
            paymentAllDetails[0].payment_id,
            new Date(paymentAllDetails[0].createdAt).toDateString(),
            paymentAllDetails[0].campaign_id.title,
            paymentAllDetails[0].method,
            paymentAllDetails[0].amount,
            paymentAllDetails[0].payment_type,
          );
        }

        // const general_campaign =
        //   await this.campaignRepository.getGeneralCampaign();

        // update campaign collected cost
        const existCampaign = await this.campaignRepository.getCampaignById(
          updatePayment.campaign_id.toString(),
        );

        if (!existCampaign) {
          throw new ForbiddenException(
            `Existing Campaign not found Campaign id = ${updatePayment.campaign_id}`,
          );
        }

        existCampaign.collected_cost =
          Number(existCampaign.collected_cost) + Number(updatePayment.amount);

        if (
          Number(existCampaign.required_cost) <=
          Number(existCampaign.collected_cost)
        ) {
          existCampaign.status = CampaignStatus.FILLED;

          await this.campaignRepository.updateCampaign(
            updatePayment.campaign_id.toString(),
            existCampaign,
          );

          const donorsForACampaign =
            await this.paymentRepository.getDonorsForACampaign(
              updatePayment.campaign_id.toString(),
            );

          // send all donors to Goal Met Email
          donorsForACampaign.map(async (donorsData) => {
            await this.mailService.GoalMetEmail(
              donorsData.primary_email,
              donorsData.first_name,
              donorsData.last_name,
              existCampaign.title,
            );
          });
        } else {
          await this.campaignRepository.updateCampaign(
            updatePayment.campaign_id.toString(),
            existCampaign,
          );
        }

        break;

      case 'invoice.payment_failed':
        // this.logger.log(
        //   `invoice created payment failed ${
        //     (new Date(), (webHookData.data.object as Stripe.Invoice)?.id)
        //   } status=${(webHookData.data.object as Stripe.Invoice)?.status}`,
        // );

        // todo: find find invoice using invoice id and update invoice status as failed
        if ((webHookData.data.object as Stripe.Invoice)?.id) {
          const invoice = await this.invoiceRepository.findOneByInvoiceId(
            (webHookData.data.object as Stripe.Invoice)?.id,
          );
          if (invoice) {
            this.logger.warn(
              `Invoice not found for invoiceId=${
                (webHookData.data.object as Stripe.Invoice)?.id
              } time=${new Date().getTime()}`,
            );
          }

          await this.invoiceRepository.updateInvoice(
            invoice.invoice_id,
            'failed',
          );

          // this.logger.log(`Invoice.payment_failed ${invoice.invoice_id}`);
        }

        if (!webHookData.data.object.subscription) {
          this.logger.log(
            `subscription id not found eventId=${event?.id} subscriptionId=${
              webHookData.data.object?.id
            } event=${`invoice.payment_failed`}  time=${new Date().getTime()}`,
          );
          return;
        }

        //update payment table payment rejected
        const payment_failed = await this.paymentRepository.findByPaymentId(
          webHookData.data.object.subscription,
        );

        const user = await this.userRepository.findById(payment_failed.user_id);

        if (!payment_failed.payment_id) {
          this.logger.log(
            `payment id not found eventId=${event?.id} user_id=${
              payment_failed.user_id
            } subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.payment_failed`}  time=${new Date().getTime()}`,
          );

          return;
        }

        const paymentUpdate: PaymentUpdateDto = {
          status: Status.REJECTED,
        };

        if (payment_failed) {
          await this.paymentRepository.updatePayment(
            payment_failed.payment_id,
            paymentUpdate,
          );
        }

        // todo send user to mail payment_renewal_failed
        await this.mailService.PaymentRenewalFailedEmail(
          user.primary_email,
          user.first_name,
          user.last_name,
        );
        break;

      case 'invoice.upcoming':
        this.logger.log(`event_name=invoice.upcoming`);
        if (
          typeof webHookData.data.object == 'object'
            ? (webHookData.data.object as Stripe.Invoice)?.id
            : webHookData.data.object
        ) {
          return;
        }

        //check subscription id
        if (
          !(typeof (webHookData.data.object as Stripe.Invoice).subscription ==
          'string'
            ? ((webHookData.data.object as Stripe.Invoice)
                .subscription as string)
            : (
                (webHookData.data.object as Stripe.Invoice)
                  .subscription as Stripe.Subscription
              ).id)
        ) {
          this.logger.log(
            `subscription id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.upcoming`}  time=${new Date().getTime()}`,
          );
          return;
        }

        // this.logger.log(
        //   `subscription id at invoice_upcoming ${
        //     typeof (webHookData.data.object as Stripe.Invoice).subscription ==
        //     'string'
        //       ? ((webHookData.data.object as Stripe.Invoice)
        //           .subscription as string)
        //       : (
        //           (webHookData.data.object as Stripe.Invoice)
        //             .subscription as Stripe.Subscription
        //         ).id
        //   }`,
        // );

        const payment_upcoming = await this.paymentRepository.findByPaymentId(
          typeof (webHookData.data.object as Stripe.Invoice).subscription ==
            'string'
            ? ((webHookData.data.object as Stripe.Invoice)
                .subscription as string)
            : (
                (webHookData.data.object as Stripe.Invoice)
                  .subscription as Stripe.Subscription
              ).id,
        );

        if (payment_upcoming) {
          this.logger.log(
            `payment id not found eventId=${event?.id}} subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.upcoming`}  time=${new Date().getTime()}`,
          );
          return;
        }

        const user_data_invoice_upcoming = await this.userRepository.findById(
          payment_upcoming.user_id,
        );

        // if not found user
        if (!user_data_invoice_upcoming) {
          this.logger.log(
            `user id not found eventId=${event?.id} subscription_id=${
              webHookData.data.object?.id
            } event=${`invoice.upcoming`}  time=${new Date().getTime()}`,
          );
          this.logger.log(
            `Upcoming_subscription_expiration eventId=${
              event?.id
            }subscription_id=${
              webHookData.data.object.subscription
            } event=${`invoice.upcoming`} time=${new Date().getTime()} `,
          );
          return;
        }

        // todo: send user data invoice upcoming mail
        break;

      default:
        this.logger.log(
          `event not found eventId=${event?.id} subscription_id=${
            webHookData.data?.object?.subscription
          } ❌ event=${webHookData.type} time=${new Date().getTime()}`,
        );
        break;
    }
  }

  async cancel_Membership_After_PeriodEnd() {
    const payments = await this.paymentRepository.getAllSubscriptionPayment(
      PaymentMethod.STRIPE,
      Status.CANCELLED,
    );

    for (let index = 0; index < payments.length; index++) {
      const payment = payments[index];
      const _payment = await this.paymentRepository.findByPaymentId(
        payment.payment_id,
      );
      const { expire_date, status } = _payment[0];
      const currentDate = new Date().getTime();
      const expierDate = new Date(expire_date).getTime();
      if (status == Status.CANCELLED && expierDate <= currentDate) {
        const user = await this.userRepository.findById(_payment[0].user_id);

        const paymentUpdateDetails: PaymentUpdateDto = {
          status: Status.CANCELLED,
        };
        _payment[0].status = Status.CANCELLED;
        const newPayment = await this.paymentRepository.updatePayment(
          _payment[0],
          paymentUpdateDetails,
        );
        // check if user has any other subscriptions
        //if there we found any other subscriptions we won't need to remove his subscription
        if (await this.paymentRepository.getUserSubscriptions(user._id)) {
          this.logger.warn(
            `user ${user._id} has another active subscriptions, So we don't need to remove his membership`,
          );
          return;
        }

        // user.stripe_customer_id = '';
        // user.stripe_default_payment_method = '';
        // const updatedUser = await this.userRepository.updateUser(
        //   user._id,
        //   user,
        // );
        // if (updatedUser?._id && newPayment?.payment_id) {
        //   this.logger.log(
        //     `Subscription cancelled for user ${
        //       user?._id
        //     } time=${new Date().getTime()}`,
        //   );
        // }

        //expired email
        this.mailService.SubscriptionHasExpiredEmail(
          user.primary_email,
          user.first_name,
          user.last_name,
        );
      }
    }
  }

  async restart_stripe_subscription(
    restartStripeSubscriptionDTO: RestartStripeSubscriptionDTO,
  ) {
    try {
      const response = await this.stripeRepository.restart_stripe_subscription(
        restartStripeSubscriptionDTO.subscription_id,
      );

      //check
      if (response.status !== 'active') {
        this.logger.error(
          `Error in restart stripe subscription subscription_id=${
            restartStripeSubscriptionDTO.subscription_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Error in restart stripe subscription subscription_id=${
            restartStripeSubscriptionDTO.subscription_id
          } time=${new Date().getTime()}`,
        );
      }

      // const userSubscriptionList =
      //   await this.paymentRepository.subscriptionPaymentsWithUserID(
      //     updateSubscriptionDTO.user_id,
      //   );

      const payments = await this.paymentRepository.getUserSubscriptions(
        restartStripeSubscriptionDTO.user_id,
      );

      if (payments.length === 0) {
        this.logger.warn(
          `No subscription found userId=${restartStripeSubscriptionDTO.user_id}.`,
        );
        throw new NotFoundException(
          `No subscription found userId=${restartStripeSubscriptionDTO.user_id}.`,
        );
      }

      const paymentUpdateDetails: PaymentUpdateDto = {
        status: Status.ACTIVE,
      };

      return await this.paymentRepository.updatePayment(
        payments[0].payment_id,
        paymentUpdateDetails,
      );
    } catch (error) {
      console.log(' restart_stripe_subscription error', error);
    }

    // console.log('response.id', response.id);
    // updateSubscriptionDTO.user_id  belong updateSubscriptionDTO.price_id subscription id should update in payment database
    // console.log('response', response);
  }
}
