import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toJSON } from 'flatted';
import { firstValueFrom } from 'rxjs';
import { UserRepository } from 'src/repository/user.repository';
import { PaymentRepository } from 'src/repository/payment.repository';
import { CreateSubscriptionPaymentDTO } from './dto/CreateSubscriptionPaymentDTO';
import { PriceListRepository } from 'src/price-list/priceList.repository';
import { PaymentCreateDto } from 'src/dtos/paymentDto/PaymentCreateDto.dto';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';
import { InvoiceRepository } from 'src/repository/invoice.repository';
import { Role } from 'src/schemas/user.schema';
import { CreatePaypalOneTimePaymentDTO } from './dto/CreatePaypalOneTimePaymentDTO';
import { CampaignRepository } from 'src/repository/campaign.repository';
import { MailService } from 'src/mail/mail.service';
import { CampaignStatus } from 'src/schemas/campaign.schema';
import * as address from 'address';

const ip = address.ip();

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(`${ip} src/paypal/paypal.service.ts`);
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private userRepository: UserRepository,
    private paymentRepository: PaymentRepository,
    private priceListRepository: PriceListRepository,
    private invoiceRepository: InvoiceRepository,
    private campaignRepository: CampaignRepository,
    private mailService: MailService,
  ) {}

  //restart subscription plan
  async RestartSubscriptionPlan(
    createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    try {
      //find existing user
      const existUser = await this.userRepository.findById(
        createSubscriptionPaymentDTO.user_id,
      );

      if (!existUser) {
        this.logger.warn(
          `User id not found userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `User id not found userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
      }

      const existingPayment =
        await this.paymentRepository.GetCustomerFromPaymentId(
          createSubscriptionPaymentDTO.user_id,
        );

      if (!existingPayment) {
        this.logger.warn(
          `Payment not found related to this user userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Payment not found related to this user userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
      }

      //creating access token related to paypal
      const accessToken = await this.generateAccessToken();
      if (!accessToken) {
        this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
        throw new NotFoundException(
          `Access Token missing time=${new Date().getTime()}`,
        );
      }

      //restart subscription
      const restartSubscription = this.httpService.post(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${createSubscriptionPaymentDTO.subscription_id}/activate`,
        {
          body: 'Reactivating the subscription',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const restartSubscriptionResponse = await firstValueFrom(
        restartSubscription,
      );

      if (restartSubscriptionResponse.status !== 204) {
        this.logger.warn(
          `something went wrong with restart subscription time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `something went wrong with restart subscription time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Subscription restarted subscription_id=${
          createSubscriptionPaymentDTO.subscription_id
        } time=${new Date().getTime()}`,
      );

      const paymentUpdate = await this.paymentRepository.updatePayment(
        existingPayment.payment_id,
        { status: Status.PENDING },
      );

      if (!paymentUpdate) {
        this.logger.warn(
          `Payment not restart paymentId=${
            existingPayment.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Payment not restart paymentId=${
            existingPayment.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Payment Updated payment_id=${
          existingPayment.payment_id
        } time=${new Date().getTime()}`,
      );

      return {
        statusCode: 200,
        message: 'Subscription restarted successfully',
      };
    } catch (error) {
      this.logger.error(
        `RestartSubscriptionPlan function error time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `RestartSubscriptionPlan function error time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //update payment
  async updatePayment(body: any) {
    try {
      //find existing user
      const existUser = await this.userRepository.findById(body.user_id);
      if (!existUser) {
        this.logger.warn(
          `User id not found userId=${
            body.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(`User id not found ${body.user_id}`);
      }

      //find existing user
      const existPayment = await this.paymentRepository.findByPaymentId(
        body.payment_id,
      );

      if (!existPayment) {
        this.logger.warn(
          `Paypal Payment id not found paymentID=${
            body.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Paypal Payment id not found ${body.payment_id}`,
        );
      }

      const updatePayment = await this.paymentRepository.updatePayment(
        body.payment_id,
        { amount: body.amount },
      );

      if (!updatePayment) {
        this.logger.warn(
          `payment update subscription_id=${
            body.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `payment update subscription_id=${
            body.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Payment Updated payment_id=${
          body.payment_id
        } time=${new Date().getTime()}`,
      );

      return updatePayment;
    } catch (error) {
      this.logger.error(
        `updatePayment function error time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `updatePayment function error time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //change subscription plan
  async ChangeSubscriptionPlan(
    createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    try {
      //find existing user
      const existUser = await this.userRepository.findById(
        createSubscriptionPaymentDTO.user_id,
      );
      if (!existUser) {
        this.logger.warn(
          `User id not found userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `User id not found ${createSubscriptionPaymentDTO.user_id}`,
        );
      }

      const existingPayment =
        await this.paymentRepository.GetCustomerFromPaymentId(
          createSubscriptionPaymentDTO.user_id,
        );

      if (!existingPayment) {
        this.logger.warn(
          `Payment not found related to this user userId=${
            createSubscriptionPaymentDTO.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Payment not found related to this user ${createSubscriptionPaymentDTO.user_id}`,
        );
      }

      //find existing plan id
      const existPlanId = await this.priceListRepository.findByPriceId(
        createSubscriptionPaymentDTO.plan_id,
      );

      if (existPlanId.length === 0) {
        this.logger.warn(
          `Paypal Plan id not found planId=${
            createSubscriptionPaymentDTO.plan_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Paypal Plan id not found ${createSubscriptionPaymentDTO.plan_id}`,
        );
      }

      //creating access token related to paypal
      const accessToken = await this.generateAccessToken();
      if (!accessToken) {
        this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
        throw new NotFoundException(
          `Access Token missing time=${new Date().getTime()}`,
        );
      }

      //update subscription
      const updateSubscription = this.httpService.post(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${createSubscriptionPaymentDTO.subscription_id}/revise`,
        {
          plan_id: createSubscriptionPaymentDTO.plan_id.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const updateSubscriptionResponse = await firstValueFrom(
        updateSubscription,
      );

      if (!updateSubscriptionResponse.data) {
        `something went wrong with update subscription time=${new Date().getTime()}`;
        return;
      }

      const paymentUpdate = await this.paymentRepository.updatePayment(
        existingPayment.payment_id,
        { status: Status.PENDING },
      );

      if (!paymentUpdate) {
        this.logger.warn(
          `Payment not updated paymentId=${
            existingPayment.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Payment not updated paymentId=${
            existingPayment.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Subscription plan changed subscription_id=${
          createSubscriptionPaymentDTO.subscription_id
        } time=${new Date().getTime()}`,
      );

      return updateSubscriptionResponse.data;
    } catch (error) {
      this.logger.error(
        `ChangeSubscriptionPlan function not working time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `ChangeSubscriptionPlan function not working time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //create subscription
  async getSubscriptionStatus(body: any) {
    try {
      //find existing payment
      const paymentDetail = await this.paymentRepository.findByPaymentId(
        body.payment_id,
      );

      if (paymentDetail === null) {
        this.logger.warn(
          `payment id not found paymentID=${
            body.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `payment id not found paymentID=${
            body.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      return paymentDetail;
    } catch (error) {
      this.logger.error(
        `getSubscriptionStatus function not working time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `getSubscriptionStatus function not working time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //create subscription
  async createSubscriptionPayment(
    createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    try {
      if (createSubscriptionPaymentDTO.user_id !== null) {
        //find existing user
        const existUser = await this.userRepository.findById(
          createSubscriptionPaymentDTO.user_id,
        );
        if (!existUser) {
          this.logger.warn(
            `User id not found userId=${
              createSubscriptionPaymentDTO.user_id
            } time=${new Date().getTime()}`,
          );
          throw new NotFoundException(
            `User id not found userId=${
              createSubscriptionPaymentDTO.user_id
            } time=${new Date().getTime()}`,
          );
        }

        //find existing Payment
        const existPayment =
          await this.paymentRepository.CheckPaymentStatusAndPaymentType(
            createSubscriptionPaymentDTO.user_id,
          );

        if (existPayment.length > 0) {
          if (existPayment[0].status === Status.PENDING) {
            this.logger.warn(
              `Your payment is pending. Please wait. time=${new Date().getTime()}`,
            );
            throw new ConflictException(
              `Your payment is pending. Please wait. time=${new Date().getTime()}`,
            );
          } else {
            this.logger.warn(
              `You already done a subscription. time=${new Date().getTime()}`,
            );
            return { message: `You already done a subscription` };
          }
        }
      }

      //find existing plan id
      const existPlanId = await this.priceListRepository.findByPriceId(
        createSubscriptionPaymentDTO.plan_id,
      );
      if (existPlanId.length === 0) {
        this.logger.warn(
          `Paypal Plan id not found planId=${
            createSubscriptionPaymentDTO.plan_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Paypal Plan id not found planId=${
            createSubscriptionPaymentDTO.plan_id
          } time=${new Date().getTime()}`,
        );
      }

      //creating access token related to paypal
      const accessToken = await this.generateAccessToken();
      if (!accessToken) {
        this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
        throw new NotFoundException(
          `Access Token missing time=${new Date().getTime()}`,
        );
      }

      //creating subscription
      const createSubscription = this.httpService.post(
        'https://api-m.sandbox.paypal.com/v1/billing/subscriptions',
        {
          plan_id: createSubscriptionPaymentDTO.plan_id.toString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const createSubscriptionResponse = await firstValueFrom(
        createSubscription,
      );

      if (!createSubscriptionResponse.data) {
        this.logger.error(
          `Subscription not created time=${new Date().getTime()}`,
        );
        throw new ConflictException(
          `Subscription not created time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Subscription plan changed subscription_id=${
          createSubscriptionPaymentDTO.subscription_id
        } time=${new Date().getTime()}`,
      );

      return createSubscriptionResponse.data;
    } catch (error) {
      await this.mailService.PaymentFailedEmail(
        createSubscriptionPaymentDTO.primary_email,
        createSubscriptionPaymentDTO.first_name,
        createSubscriptionPaymentDTO.last_name,
        'Paypal',
      );
      this.logger.error(
        `createSubscriptionPayment function not working time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `createSubscriptionPayment function not working time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //check subscription
  async checkSubscriptionPayment(
    createSubscriptionPaymentDTO: CreateSubscriptionPaymentDTO,
  ) {
    //find existing user
    const existUser = await this.userRepository.findById(
      createSubscriptionPaymentDTO.user_id,
    );

    if (!existUser) {
      this.logger.warn(
        `User id not found userId=${
          createSubscriptionPaymentDTO.user_id
        } time=${new Date().getTime()}`,
      );
      throw new NotFoundException(
        `User id not found ${createSubscriptionPaymentDTO.user_id}`,
      );
    }

    //creating access token related to paypal
    const accessToken = await this.generateAccessToken();
    if (!accessToken) {
      this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
      throw new NotFoundException(
        `Access Token missing time=${new Date().getTime()}`,
      );
    }

    try {
      const createSubscription = this.httpService.get(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${createSubscriptionPaymentDTO.subscription_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const createSubscriptionResponse = await firstValueFrom(
        createSubscription,
      );

      if (createSubscriptionResponse.status !== 200) {
        this.logger.warn(
          `something went wrong with create subscription time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `something went wrong with create subscription time=${new Date().getTime()}`,
        );
      }

      // if user claim gift aid update user address data
      if (createSubscriptionPaymentDTO.gift_aid_address) {
        existUser.country =
          createSubscriptionPaymentDTO.gift_aid_address.country;
        existUser.street_address =
          createSubscriptionPaymentDTO.gift_aid_address.street_address;
        existUser.city = createSubscriptionPaymentDTO.gift_aid_address.city;
        existUser.apartment =
          createSubscriptionPaymentDTO.gift_aid_address.apartment;
        existUser.postal_code = Number(
          createSubscriptionPaymentDTO.gift_aid_address.postal_code,
        );

        const updateUser = await this.userRepository.updateUser(
          existUser._id,
          existUser,
        );

        if (!updateUser) {
          this.logger.warn(
            `User cannot update userId=${
              updateUser._id
            } time=${new Date().getTime()}`,
          );
          throw new NotFoundException(
            `User cannot update userId=${
              updateUser._id
            } time=${new Date().getTime()}`,
          );
        }
      }

      // update user with paypal user email
      const userUpdate = await this.userRepository.updateById(
        existUser._id.toString(),
        {
          paypal_user_email:
            createSubscriptionResponse.data.subscriber.email_address,
        },
      );

      if (!userUpdate) {
        this.logger.warn(
          `Update user with paypal email userId=${existUser._id.toString()} time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Update user with paypal email userId=${existUser._id.toString()} time=${new Date().getTime()}`,
        );
      }

      //create payment
      const createPayment = await this.paymentRepository.createPayment({
        payment_id: createSubscriptionResponse.data.id,
        amount:
          createSubscriptionResponse.data.billing_info.last_payment.amount
            .value,
        campaign_id: createSubscriptionPaymentDTO.campaign_id,
        user_id: createSubscriptionPaymentDTO.user_id,
        method: PaymentMethod.PAYPAL,
        payment_type: PaymentType.MONTHLY,
        status: Status.PENDING,
        is_gift_aid: createSubscriptionPaymentDTO.is_gift_aid,
      });

      if (!createPayment) {
        this.logger.error(
          `Cannot Create subscription: subscriptionID=${
            createSubscriptionPaymentDTO.subscription_id
          } time=${new Date().getTime()}`,
        );

        throw new NotFoundException(
          `Cannot Create subscription: subscriptionID=${
            createSubscriptionPaymentDTO.subscription_id
          } time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Create subscription payment_id=${
          createSubscriptionResponse.data.id
        } time=${new Date().getTime()}`,
      );

      //create invoice
      // await this.invoiceRepository.createInvoice({
      //   user_id:
      //     createSubscriptionPaymentDTO.user_id === null
      //       ? newUser._id.toString()
      //       : createSubscriptionPaymentDTO.user_id,
      //   payment_id: response.data.id.toString(),
      //   invoice_id: null,
      //   amount: response.data.billing_info.last_payment.amount.value,
      //   customer_email: null,
      //   hosted_invoice_url: null,
      //   status: Status.PENDING,
      // });

      // const existingCampaign = await this.campaignRepository.getCampaignById(
      //   createSubscriptionPaymentDTO.campaign_id,
      // );

      // if (!existingCampaign) {
      //   throw new ForbiddenException(
      //     `Existing Campaign not found Campaign id = ${createSubscriptionPaymentDTO.campaign_id}`,
      //   );
      // }

      // existingCampaign.collected_cost =
      //   existingCampaign.collected_cost +
      //   response.data.billing_info.last_payment.amount.value;

      // await this.campaignRepository.updateCampaign(
      //   createSubscriptionPaymentDTO.campaign_id,
      //   existingCampaign,
      // );

      return {
        statusCode: createSubscriptionResponse.status,
        createSubscriptionResponse: createSubscriptionResponse.data,
      };
    } catch (error) {
      this.logger.error(
        `Cannot check subscription: subscriptionID=${
          createSubscriptionPaymentDTO.subscription_id
        } time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `Cannot check subscription: subscriptionID=${
          createSubscriptionPaymentDTO.subscription_id
        } time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //create order
  async createOrder(paymentCreateDto: PaymentCreateDto): Promise<any> {
    if (paymentCreateDto.user_id !== null) {
      //find existing user
      const existUser = await this.userRepository.findById(
        paymentCreateDto.user_id,
      );
      if (!existUser) {
        this.logger.warn(
          `User id not found userId=${
            paymentCreateDto.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `User id not found userId=${
            paymentCreateDto.user_id
          } time=${new Date().getTime()}`,
        );
      }
    }

    //creating access token related to paypal
    const accessToken = await this.generateAccessToken();
    if (!accessToken) {
      this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
      throw new NotFoundException(
        `Access Token missing time=${new Date().getTime()}`,
      );
    }

    try {
      //creating order
      const createOrder = this.httpService.post(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: parseFloat(paymentCreateDto.amount.toString()).toFixed(
                  2,
                ),
              },
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'PayPal-Request-Id': Date.now().toString(),
          },
        },
      );

      const createOrderResponse = await firstValueFrom(createOrder);

      if (!createOrderResponse.data) {
        this.logger.error(`Cannot create order time=${new Date().getTime()}`);
        throw new BadRequestException(
          `Cannot create order time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Create order user_id=${
          paymentCreateDto.user_id
        } time=${new Date().getTime()}`,
      );

      return createOrderResponse.data;
    } catch (error) {
      this.logger.error(
        `Cannot create order time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `Cannot create order time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //create onetime payment
  async approveOrder(
    id: any,
    createPaypalOneTimePaymentDTO: CreatePaypalOneTimePaymentDTO,
  ): Promise<any> {
    let existUser: any = null;
    let newUser: any = null;

    if (
      createPaypalOneTimePaymentDTO.primary_email &&
      createPaypalOneTimePaymentDTO.primary_email.length !== 0
    ) {
      existUser = await this.userRepository.findByEmail(
        createPaypalOneTimePaymentDTO.primary_email,
      );
    }

    if (createPaypalOneTimePaymentDTO.user_id === null && !existUser) {
      const randumNumber =
        await this.paymentRepository.getRandomNumberBasedOnTime();

      newUser = await this.userRepository.createUser({
        first_name:
          createPaypalOneTimePaymentDTO.primary_email === null
            ? 'Anonymous'
            : createPaypalOneTimePaymentDTO.first_name,
        last_name:
          createPaypalOneTimePaymentDTO.primary_email === null
            ? 'Anonymous'
            : createPaypalOneTimePaymentDTO.last_name,
        primary_email:
          createPaypalOneTimePaymentDTO.primary_email === null
            ? `Anonymous` + randumNumber + `@gmail.com`
            : createPaypalOneTimePaymentDTO.primary_email,
        password: null,
        is_marketing_accepted: false,
        verification_code: 12345,
        role: Role.GUEST,
      });

      if (
        createPaypalOneTimePaymentDTO?.primary_email !== null &&
        createPaypalOneTimePaymentDTO?.first_name !== null &&
        createPaypalOneTimePaymentDTO?.last_name !== null
      ) {
        newUser.country =
          createPaypalOneTimePaymentDTO.gift_aid_address.country;
        newUser.street_address =
          createPaypalOneTimePaymentDTO.gift_aid_address.street_address;
        newUser.city = createPaypalOneTimePaymentDTO.gift_aid_address.city;
        newUser.apartment =
          createPaypalOneTimePaymentDTO.gift_aid_address.apartment;
        newUser.postal_code = Number(
          createPaypalOneTimePaymentDTO.gift_aid_address.postal_code,
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
    } else {
      if (
        createPaypalOneTimePaymentDTO.primary_email !== null &&
        createPaypalOneTimePaymentDTO.first_name !== null &&
        createPaypalOneTimePaymentDTO.last_name !== null
      ) {
        existUser.country =
          createPaypalOneTimePaymentDTO.gift_aid_address.country;
        existUser.street_address =
          createPaypalOneTimePaymentDTO.gift_aid_address.street_address;
        existUser.city = createPaypalOneTimePaymentDTO.gift_aid_address.city;
        existUser.apartment =
          createPaypalOneTimePaymentDTO.gift_aid_address.apartment;
        existUser.postal_code = Number(
          createPaypalOneTimePaymentDTO.gift_aid_address.postal_code,
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
    }

    //creating access token related to paypal
    const accessToken = await this.generateAccessToken();
    if (!accessToken) {
      this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
      throw new NotFoundException(
        `Access Token missing time=${new Date().getTime()}`,
      );
    }

    try {
      //Approving order
      const approveOrder = this.httpService.post(
        `https://api-m.sandbox.paypal.com/v2/checkout/orders/${id}/capture`,
        {
          amount: {
            currency_code: 'USD',
            value: parseFloat(
              createPaypalOneTimePaymentDTO.amount.toString(),
            ).toFixed(2),
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'PayPal-Request-Id': Date.now().toString(),
          },
        },
      );

      const approveOrderResponse = await firstValueFrom(approveOrder);

      if (approveOrderResponse.status !== 201) {
        this.logger.warn(
          `something went wrong with approve order time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `something went wrong with approve order time=${new Date().getTime()}`,
        );
      }

      const newPayment = await this.paymentRepository.createPayment({
        payment_id: id,
        amount: createPaypalOneTimePaymentDTO.amount,
        campaign_id: createPaypalOneTimePaymentDTO.campaign_id,
        user_id:
          createPaypalOneTimePaymentDTO.user_id === null && newUser
            ? newUser._id.toString()
            : createPaypalOneTimePaymentDTO.user_id === null && existUser
            ? existUser._id.toString()
            : createPaypalOneTimePaymentDTO.user_id !== null
            ? createPaypalOneTimePaymentDTO.user_id
            : null,
        method: PaymentMethod.PAYPAL,
        payment_type: PaymentType.ONETIME,
        status: Status.PENDING,
        is_donation_private: createPaypalOneTimePaymentDTO.is_donation_private,
        is_gift_aid: createPaypalOneTimePaymentDTO.is_gift_aid,
      });

      if (!newPayment) {
        this.logger.warn(
          `something went wrong with create payment payment_id=${id} time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `something went wrong with create payment payment_id=${id} time=${new Date().getTime()}`,
        );
      }

      // update user with paypal user email
      const userUpdate = await this.userRepository.updateById(
        createPaypalOneTimePaymentDTO.user_id === null && newUser
          ? newUser._id.toString()
          : createPaypalOneTimePaymentDTO.user_id === null && existUser
          ? existUser._id.toString()
          : createPaypalOneTimePaymentDTO.user_id !== null
          ? createPaypalOneTimePaymentDTO.user_id
          : null,
        {
          paypal_user_email:
            approveOrderResponse.data.payment_source.paypal.email_address,
        },
      );

      if (!userUpdate) {
        this.logger.warn(
          `Update user with paypal email userId=${existUser._id.toString()} time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Update user with paypal email userId=${existUser._id.toString()} time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Approve order payment_id=${id} time=${new Date().getTime()}`,
      );

      return {
        statusCode: approveOrderResponse.status,
        approveOrderResponse: approveOrderResponse.data,
      };
    } catch (error) {
      await this.mailService.PaymentFailedEmail(
        createPaypalOneTimePaymentDTO.primary_email,
        createPaypalOneTimePaymentDTO.first_name,
        createPaypalOneTimePaymentDTO.last_name,
        'Paypal',
      );
      this.logger.error(
        `Cannot approve order time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `Cannot approve order time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //generate the token
  async generateAccessToken() {
    try {
      const token = `${this.configService.get<string>(
        'PAYPAL_CLIENT_ID',
      )}:${this.configService.get<string>('PAYPAL_CLIENT_SECRET')}`;
      const encodedToken = Buffer.from(token).toString('base64');
      const res = this.httpService.post(
        `${this.configService.get<string>('PAYPAL_BASE_URL')}/v1/oauth2/token`,
        { grant_type: 'client_credentials' },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${encodedToken}`,
          },
        },
      );
      const response = await firstValueFrom(res).catch((error) => error);
      return toJSON(response.data.access_token);
    } catch (error) {
      this.logger.error(
        `generateAccessToken function error time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `generateAccessToken function error time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //cancel subscription
  async cancelSubscription(paymentCreateDto: PaymentCreateDto): Promise<any> {
    //find existing user
    const existUser = await this.userRepository.findById(
      paymentCreateDto.user_id,
    );
    if (!existUser) {
      this.logger.warn(
        `User id not found userId=${
          paymentCreateDto.user_id
        } time=${new Date().getTime()}`,
      );
      throw new NotFoundException(
        `User id not found userId=${
          paymentCreateDto.user_id
        } time=${new Date().getTime()}`,
      );
    }

    //find existing user
    const existPayment = await this.paymentRepository.findByPaymentId(
      paymentCreateDto.payment_id,
    );
    if (!existPayment) {
      this.logger.warn(
        `Payment id not found paymentID=${
          paymentCreateDto.payment_id
        } time=${new Date().getTime()}`,
      );
      throw new NotFoundException(
        `Payment id not found paymentID=${
          paymentCreateDto.payment_id
        } time=${new Date().getTime()}`,
      );
    }

    //creating access token related to paypal
    const accessToken = await this.generateAccessToken();
    if (!accessToken) {
      this.logger.warn(`Access Token missing time=${new Date().getTime()}`);
      throw new NotFoundException(
        `Access Token missing time=${new Date().getTime()}`,
      );
    }

    try {
      //Approving order
      const cancelSubscription = this.httpService.post(
        `https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${existPayment.payment_id}/suspend`,
        {
          reason: 'Subscription canceled',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const cancelSubscriptionResponse = await firstValueFrom(
        cancelSubscription,
      );

      if (cancelSubscriptionResponse.status !== 204) {
        this.logger.warn(
          `something went wrong with cancel subscription payment_id=${
            existPayment.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `something went wrong with cancel subscription payment_id=${
            existPayment.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      const paymentUpdate = await this.paymentRepository.updatePayment(
        existPayment.payment_id,
        { status: Status.PENDING },
      );

      if (!paymentUpdate) {
        this.logger.warn(
          `Payment can not cancel paymentId=${
            existPayment.payment_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `Payment can not cancel paymentId=${
            existPayment.payment_id
          } time=${new Date().getTime()}`,
        );
      }

      this.logger.log(
        `Subscription cancelled payment_id=${
          existPayment.payment_id
        } time=${new Date().getTime()}`,
      );

      return {
        statusCode: 200,
        message: 'Subscription cancelled successfully',
      };
    } catch (error) {
      this.logger.error(
        `cancelSubscription function error time=${new Date().getTime()} error=${error}`,
      );
      throw new BadRequestException(
        `cancelSubscription function error time=${new Date().getTime()} error=${error}`,
      );
    }
  }

  //webHook
  async SubscriptionWebHookCallBack(headers: any) {
    const accessToken = await this.generateAccessToken();
    const callBack_data = {
      transmission_id: headers.transmission_id,
      transmission_time: headers.transmission_time,
      cert_url: headers.cert_url,
      auth_algo: headers.auth_algo,
      transmission_sig: headers.transmission_sig,
      webhook_id: `${this.configService.get<string>('PAYPAL_WEBHOOK_ID')}`,
      webhook_event: headers.body,
    };
    const actualData = JSON.stringify(callBack_data);
    firstValueFrom(
      this.httpService.post(
        `${this.configService.get<string>(
          'PAYPAL_BASE_URL',
        )}/v1/notifications/verify-webhook-signature`,
        actualData,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    )
      .then(async (res) => {
        if (res.data.verification_status == 'SUCCESS') {
          this.logger.log(
            `event: ${headers.body.event_type}, id: ${headers.body.resource.id}, Time: ${headers.body.create_time}`,
          );
          console.log(
            `event: ${headers.body.event_type}, id: ${headers.body.resource.id}, Time: ${headers.body.create_time}`,
          );

          //onetime approved event
          if (headers.body.event_type === 'CHECKOUT.ORDER.APPROVED') {
            this.logger.log(`CHECKOUT.ORDER.APPROVED`);
            console.log('CHECKOUT.ORDER.APPROVED');

            //find existing user
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            if (!existPayment) {
              this.logger.warn(
                `Paypal Payment id not found paymentID=${
                  headers.body.resource.id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Payment id not found ${headers.body.resource.id}`,
              );
            }

            //update payment amount related to payment_id
            await this.paymentRepository.updatePayment(
              headers.body.resource.id,
              {
                status: Status.COMPLETED,
              },
            );

            //create invoice
            await this.invoiceRepository.createInvoice({
              payment_id: existPayment._id.toString(),
              invoice_id:
                headers.body.resource.purchase_units[0].payments.captures[0].id,
              amount:
                headers.body.resource.purchase_units[0].payments.captures[0]
                  .amount.value,
              customer_email: null,
              hosted_invoice_url: null,
              status: Status.COMPLETED,
            });

            // todo send mail to user payment is completed
            if (existPayment.campaign_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  existPayment.payment_id,
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

              this.logger.log(
                `Email sent payment_id=${paymentAllDetails[0].payment_id}`,
              );
            }

            // update campaign collected cost
            const existingCampaign =
              await this.campaignRepository.getCampaignById(
                existPayment.campaign_id.toString(),
              );

            if (existingCampaign) {
              existingCampaign.collected_cost =
                Number(existingCampaign.collected_cost) +
                Number(existPayment.amount);

              if (
                Number(existingCampaign.required_cost) <=
                Number(existingCampaign.collected_cost)
              ) {
                existingCampaign.status = CampaignStatus.FILLED;

                await this.campaignRepository.updateCampaign(
                  existPayment.campaign_id.toString(),
                  existingCampaign,
                );

                const donorsForACampaign =
                  await this.paymentRepository.getDonorsForACampaign(
                    existPayment.campaign_id,
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
                  existPayment.campaign_id.toString(),
                  existingCampaign,
                );

                this.logger.log(
                  `Update campaign campaign_id=${existPayment.campaign_id.toString()}`,
                );
              }
            }
          }
          if (headers.body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            this.logger.log(`BILLING.SUBSCRIPTION.ACTIVATED`);
            console.log('BILLING.SUBSCRIPTION.ACTIVATED');

            //find existing user
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            if (!existPayment) {
              this.logger.warn(
                `Paypal Payment id not found paymentID=${
                  headers.body.resource.id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Payment id not found ${headers.body.resource.id}`,
              );
            }

            //update payment amount related to payment_id
            await this.paymentRepository
              .updatePayment(headers.body.resource.id, {
                status: Status.ACTIVE,
              })
              .then(async (res) => {
                if (!res) {
                  this.logger.warn(
                    `Paypal update Payment not found paymentID=${
                      headers.body.resource.id
                    } time=${new Date().getTime()}`,
                  );
                  throw new NotFoundException(
                    `Paypal update Payment not found ${
                      headers.body.resource.id
                    } time=${new Date().getTime()}`,
                  );
                }

                //create invoice
                const createInvoice =
                  await this.invoiceRepository.createInvoice({
                    payment_id: existPayment._id.toString(),
                    invoice_id:
                      headers.body.resource.purchase_units[0].payments
                        .captures[0].id,
                    amount:
                      headers.body.resource.purchase_units[0].payments
                        .captures[0].amount.value,
                    customer_email: null,
                    hosted_invoice_url: null,
                    status: Status.COMPLETED,
                  });

                if (!createInvoice) {
                  this.logger.error(
                    `Error in create Invoice payment_id=${existPayment._id.toString()}`,
                  );
                  throw new ForbiddenException(
                    `Error in create Invoice payment_id=${existPayment._id.toString()}`,
                  );
                }

                this.logger.log(
                  `Invoice created payment_id=${existPayment._id.toString()}`,
                );
              });

            // create invoice
            const createInvoice = await this.invoiceRepository.createInvoice({
              payment_id: existPayment._id.toString(),
              invoice_id:
                headers.body.resource.purchase_units[0].payments.captures[0].id,
              amount:
                headers.body.resource.purchase_units[0].payments.captures[0]
                  .amount.value,
              customer_email: null,
              hosted_invoice_url: null,
              status: Status.COMPLETED,
            });

            if (!createInvoice) {
              this.logger.warn(
                `Paypal create Invoice not found paymentID=${existPayment._id.toString()} time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal create Invoice not found ${existPayment._id.toString()} time=${new Date().getTime()}`,
              );
            }

            this.logger.log(
              `Invoice created payment_id=${existPayment._id.toString()}`,
            );

            //update user with paypal account name
            // await this.userRepository.updateById(
            //   existPayment.user_id.toString(),
            //   {
            //     paypal_user_email:
            //       headers.body.resource.subscriber.email_address,
            //   },
            // );

            // update campaign collected cost
            const existingCampaign =
              await this.campaignRepository.getCampaignById(
                existPayment.campaign_id.toString(),
              );

            if (!existingCampaign) {
              throw new ForbiddenException(
                `Existing Campaign not found Campaign id = ${existPayment.campaign_id}`,
              );
            }
            existingCampaign.collected_cost =
              Number(existingCampaign.collected_cost) +
              Number(existPayment.amount);

            if (
              existingCampaign.required_cost <= existingCampaign.collected_cost
            ) {
              existingCampaign.status = CampaignStatus.FILLED;

              await this.campaignRepository.updateCampaign(
                existPayment.campaign_id.toString(),
                existingCampaign,
              );

              this.logger.log(
                `Update campaign campaign_id=${existPayment.campaign_id.toString()}`,
              );
            }

            await this.campaignRepository.updateCampaign(
              existPayment.campaign_id.toString(),
              existingCampaign,
            );

            if (existPayment.payment_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  existPayment.payment_id,
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

              this.logger.log(
                `Email sent payment_id=${paymentAllDetails[0].payment_id}`,
              );
            }
          }

          //subscription approved event
          if (headers.body.event_type === 'PAYMENT.SALE.COMPLETED') {
            this.logger.log(`PAYMENT.SALE.COMPLETED`);
            console.log('PAYMENT.SALE.COMPLETED');

            //find existing user
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.billing_agreement_id,
            );
            if (!existPayment) {
              this.logger.warn(
                `Paypal Payment id not found paymentID=${
                  headers.body.resource.billing_agreement_id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Payment id not found ${headers.body.resource.billing_agreement_id}`,
              );
            }
            //update payment amount related to payment_id
            await this.paymentRepository.updatePayment(
              headers.body.resource.billing_agreement_id,
              {
                status: Status.COMPLETED,
              },
            );
            // update campaign collected cost
            const existingCampaign =
              await this.campaignRepository.getCampaignById(
                existPayment.campaign_id.toString(),
              );
            if (existingCampaign) {
              existingCampaign.collected_cost =
                Number(existingCampaign.collected_cost) +
                Number(existPayment.amount);
              if (
                Number(existingCampaign.required_cost) <=
                Number(existingCampaign.collected_cost)
              ) {
                existingCampaign.status = CampaignStatus.FILLED;
                await this.campaignRepository.updateCampaign(
                  existPayment.campaign_id.toString(),
                  existingCampaign,
                );
              } else {
                await this.campaignRepository.updateCampaign(
                  existPayment.campaign_id.toString(),
                  existingCampaign,
                );
              }
            }

            //create invoice
            await this.invoiceRepository.createInvoice({
              payment_id: existPayment._id.toString(),
              invoice_id: headers.body.resource.id,
              amount: headers.body.resource.amount.total,
              customer_email: null,
              hosted_invoice_url: null,
              status: Status.COMPLETED,
            });

            this.logger.log(
              `Invoice created payment_id=${existPayment._id.toString()}`,
            );
          }
          if (headers.body.event_type === 'BILLING.SUBSCRIPTION.UPDATED') {
            this.logger.log(`BILLING.SUBSCRIPTION.UPDATED`);
            console.log('BILLING.SUBSCRIPTION.UPDATED');

            //find existing user
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            if (!existPayment) {
              this.logger.warn(
                `Paypal Payment id not found paymentID=${
                  headers.body.resource.id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Payment id not found ${headers.body.resource.id}`,
              );
            }

            //find existing plan id
            const existPlanId = await this.priceListRepository.findByPriceId(
              headers.body.resource.plan_id,
            );

            if (existPlanId.length === 0) {
              this.logger.warn(
                `Paypal Plan id not found planId=${
                  headers.body.resource.plan_id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Plan id not found ${headers.body.resource.plan_id}`,
              );
            }

            //update payment amount related to payment_id
            const patment = await this.paymentRepository.updatePayment(
              headers.body.resource.id,
              {
                amount: existPlanId[0].amount,
                status: Status.ACTIVE,
              },
            );

            if (existPayment.payment_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  headers.body.resource.id,
                );

              await this.mailService.SubscriptionUpdateEmail(
                paymentAllDetails[0].user_id.primary_email,
                paymentAllDetails[0].user_id.first_name,
                paymentAllDetails[0].user_id.last_name,
                existPayment.amount.toString(),
              );
            }
          }
          if (headers.body.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
            this.logger.log(`BILLING.SUBSCRIPTION.EXPIRED`);

            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            const user = await this.userRepository.findById(
              existPayment?.user_id,
            );

            this.mailService.SubscriptionHasExpiredEmail(
              user.primary_email,
              user.first_name,
              user.last_name,
            );
          }
          if (headers.body.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
            this.logger.log(`BILLING.SUBSCRIPTION.SUSPENDED`);

            //find existing user
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            if (!existPayment) {
              this.logger.warn(
                `Paypal Payment id not found paymentID=${
                  headers.body.resource.id
                } time=${new Date().getTime()}`,
              );
              throw new NotFoundException(
                `Paypal Payment id not found ${headers.body.resource.id}`,
              );
            }

            //update payment amount related to payment_id
            await this.paymentRepository.updatePayment(
              headers.body.resource.id,
              {
                status: Status.CANCELLED,
              },
            );

            if (existPayment.payment_id) {
              const paymentAllDetails =
                await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
                  existPayment.payment_id,
                );

              await this.mailService.SubscriptionCancelled(
                paymentAllDetails[0].user_id.primary_email,
                paymentAllDetails[0].user_id.first_name,
                paymentAllDetails[0].user_id.last_name,
              );
            }
          }
          // if (headers.body.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
          // }
          if (
            headers.body.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
          ) {
            this.logger.log(`BILLING.SUBSCRIPTION.PAYMENT.FAILED`);
            const existPayment = await this.paymentRepository.findByPaymentId(
              headers.body.resource.id,
            );

            const user = await this.userRepository.findById(
              existPayment?.user_id,
            );

            await this.mailService.PaymentRenewalFailedEmail(
              user.primary_email,
              user.first_name,
              user.last_name,
            );
          }
        } else {
          this.logger.warn(
            `getSubscriptionWebHookCallBack: Invalid signature ${
              headers.signature
            } time=${new Date().getTime()}`,
          );
          throw new ForbiddenException('Verification failed');
        }
      })
      .catch((error) => {
        this.logger.error(
          `getSubscriptionWebHookCallBack:  ${error} time=${new Date().getTime()}`,
        );
        return error;
      });
  }
}
