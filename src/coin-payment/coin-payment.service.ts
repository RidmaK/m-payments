import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Coinpayments from 'coinpayments';
import {
  CoinpaymentsCredentials,
  CreateCoinPaymentTransactionDTO,
} from './dto/CoinPayment.dto';
import { CoinpaymentsCreateTransactionResponse } from 'coinpayments/dist/types/response';
import { CoinPaymentRepository } from './coin-payment.repository';
import { UserRepository } from 'src/repository/user.repository';
import { PaymentMethod, PaymentType, Status } from 'src/schemas/payment.schema';
import { PaymentRepository } from 'src/repository/payment.repository';
import { InvoiceRepository } from 'src/repository/invoice.repository';
import { createHmac } from 'crypto';
import { HandleCoinPaymentDto } from './dto/handleCoinPayment.dto';
import { StatusNumber } from './coinpayment.types';
import { Role } from 'src/schemas/user.schema';
import { CampaignRepository } from 'src/repository/campaign.repository';
import { MailService } from 'src/mail/mail.service';
import * as address from 'address';

const ip = address.ip();
@Injectable()
export class CoinPaymentService {
  private readonly logger = new Logger(
    `${ip} src/coinpayment/coinpayment.service.ts`,
  );

  constructor(
    private configService: ConfigService,
    private coinPaymentRepository: CoinPaymentRepository,
    private paymentRepository: PaymentRepository,
    private invoiceRepository: InvoiceRepository,
    private userRepository: UserRepository,
    private campaignRepository: CampaignRepository,
    private mailService: MailService,
  ) {
    this.client = new Coinpayments({
      key: this.configService.get<string>('COIN_PAYMENT_KEY'),
      secret: this.configService.get<string>('COIN_PAYMENT_SK'),
    } as CoinpaymentsCredentials);
  }

  // States
  private client: Coinpayments;

  async createCoinPayment(
    createCoinPaymentDto: CreateCoinPaymentTransactionDTO,
  ): Promise<any> {
    var newUser: any;

    const randumNumber =
      await this.paymentRepository.getRandomNumberBasedOnTime();

    // if (createTransactionRes && createTransactionRes.txn_id) {
    if (createCoinPaymentDto.user_id === null) {
      newUser = await this.userRepository.createUser({
        first_name:
          createCoinPaymentDto.buyer_email === null
            ? 'Anonymous'
            : createCoinPaymentDto.first_name,
        last_name:
          createCoinPaymentDto.buyer_email === null
            ? 'Anonymous'
            : createCoinPaymentDto.last_name,
        primary_email:
          createCoinPaymentDto.buyer_email === null
            ? `Anonymous` + randumNumber + `@gmail.com`
            : createCoinPaymentDto.buyer_email,
        password: null,
        is_marketing_accepted: false,
        verification_code: 12345,
        role: Role.GUEST,
      });

      if (createCoinPaymentDto.gift_aid_address !== null) {
        newUser.country = createCoinPaymentDto.gift_aid_address.country;
        newUser.street_address =
          createCoinPaymentDto.gift_aid_address.street_address;
        newUser.city = createCoinPaymentDto.gift_aid_address.city;
        newUser.apartment = createCoinPaymentDto.gift_aid_address.apartment;
        newUser.postal_code = Number(
          createCoinPaymentDto.gift_aid_address.postal_code,
        );

        const updateUser = await this.userRepository.updateUser(
          newUser._id,
          newUser,
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
    } else {
      //find existing user
      const existUser = await this.userRepository.findById(
        createCoinPaymentDto.user_id,
      );

      if (!existUser) {
        this.logger.warn(
          `User id not found userId=${
            createCoinPaymentDto.user_id
          } time=${new Date().getTime()}`,
        );
        throw new NotFoundException(
          `User id not found userId=${
            createCoinPaymentDto.user_id
          } time=${new Date().getTime()}`,
        );
      }

      if (createCoinPaymentDto.gift_aid_address) {
        existUser.country = createCoinPaymentDto.gift_aid_address.country;
        existUser.street_address =
          createCoinPaymentDto.gift_aid_address.street_address;
        existUser.city = createCoinPaymentDto.gift_aid_address.city;
        existUser.apartment = createCoinPaymentDto.gift_aid_address.apartment;
        existUser.postal_code = Number(
          createCoinPaymentDto.gift_aid_address.postal_code,
        );

        await this.userRepository.updateUser(existUser._id, existUser);
      }
    }

    const userId =
      createCoinPaymentDto?.user_id === null
        ? newUser?._id.toString()
        : createCoinPaymentDto.user_id;

    const createTransactionRes = await this.client.createTransaction({
      currency1: 'USD',
      currency2: createCoinPaymentDto.currency2, // crypto
      amount: +createCoinPaymentDto.amount.toFixed(2),
      buyer_email:
        createCoinPaymentDto.buyer_email === null
          ? `Anonymous` + randumNumber + `@gmail.com`
          : createCoinPaymentDto.buyer_email,
      buyer_name:
        createCoinPaymentDto.buyer_email === null
          ? 'Anonymous'
          : createCoinPaymentDto.first_name,
      custom: 'meththa-hub',
      ipn_url: `${this.configService.get<string>(
        'BASE_URL',
      )}/coin-payment/coin-payment-webhook?userId=${userId}`,
    });

    this.logger.log(
      `IPN URL sent userId=${userId} time=${new Date().getTime()}`,
    );

    if (createTransactionRes && createTransactionRes.txn_id) {
      await this.paymentRepository.createPayment({
        payment_id: createTransactionRes.txn_id,
        amount: +createCoinPaymentDto.amount.toFixed(2),
        campaign_id: createCoinPaymentDto.campaign_id,
        user_id: userId,
        method: PaymentMethod.CRYPTO,
        payment_type: PaymentType.ONETIME,
        status: Status.PENDING,
        is_gift_aid: createCoinPaymentDto.is_gift_aid,
      });

      this.logger.log(
        `PAyment created txn_id=${
          createTransactionRes.txn_id
        } time=${new Date().getTime()}`,
      );
    }

    return createTransactionRes;
  }

  async handleCallBackdetails(
    callBackData: any,
    hash: any,
    queryData: HandleCoinPaymentDto,
  ) {
    const hmac = createHmac(
      'sha512',
      this.configService.get<string>('COIN_PAYMENT_IPN_SECRET'),
    );
    const _data = new URLSearchParams(callBackData).toString();
    let data = hmac.update(_data);
    let signature = data.digest('hex');
    if (signature !== hash) {
      this.logger.warn(
        `cannot continue your request, signature not valid userId=${
          queryData.userId
        } time=${new Date().getTime()}`,
      );

      // Send CryptoPaymentFailedEmail
      const { userId } = queryData;

      const user = await this.userRepository.findById(userId);
      await this.mailService.CryptoPaymentFailedEmail(
        user.primary_email,
        user.first_name,
        user.last_name,
        'crypto',
      );
      throw new ForbiddenException('cannot continue your request');
    }
    this.logger.log(
      `signature passed userId=${
        queryData.userId
      } time=${new Date().getTime()}`,
    );
    const { userId } = queryData;

    const user = await this.userRepository.findById(userId);

    if (!user) {
      this.logger.error(
        `user not found ${userId} time=${new Date().getTime()}`,
      );
      throw new Error(`User not found`);
    }
    const payment = await this.paymentRepository.findByPaymentId(
      callBackData.txn_id,
    );

    if (!payment.payment_id) {
      this.logger.warn(
        `payment not found ${callBackData.txn_id} time=${new Date().getTime()}`,
      );
      throw new NotFoundException(
        `payment not found ${callBackData.txn_id} time=${new Date().getTime()}`,
      );
    }

    // PENDING
    if (callBackData.status === StatusNumber.PENDING) {
      this.logger.log(`callBackData.status status=${StatusNumber.PENDING}`);
      this.logger.log(
        `Payment status is pending userId=${queryData.userId} paymentId=${
          payment.payment_id
        } time=${new Date().getTime()}`,
      );
      if (
        payment.status === Status.ACTIVE ||
        payment.status === Status.CANCELLED
      ) {
        this.logger.warn(
          `Payment status already has been ${
            payment.status
          } so it returned userId=${queryData.userId} paymentId=${
            payment.payment_id
          } callbackstatus=pending time=${new Date().getTime()}`,
        );
        return;
      }

      await this.paymentRepository
        .updatePayment(payment.payment_id, { status: Status.PENDING })
        .then(async (res) => {
          this.logger.log(
            `Payment status updated to pending userId=${
              queryData.userId
            } paymentId=${payment.payment_id} time=${new Date().getTime()}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error when updating the payment status to pending userId=${
              queryData.userId
            } paymentId=${
              payment.payment_id
            } error=${error} time=${new Date().getTime()}`,
          );
          throw new Error(
            `Error when updating the payment status to pending userId=${
              queryData.userId
            } paymentId=${
              payment.payment_id
            } error=${error} time=${new Date().getTime()}`,
          );
        });
    }

    // FUNDSSENT
    if (callBackData.status === StatusNumber.FUNDSSENT) {
      this.logger.log(`callBackData.status status=${StatusNumber.FUNDSSENT}`);

      if (
        payment.status === Status.ACTIVE ||
        payment.status === Status.CANCELLED
      ) {
        this.logger.warn(
          `Payment status already has been ${
            payment.status
          } so it returned userId=${queryData.userId} paymentId=${
            payment.payment_id
          } callbackstatus=funsent time=${new Date().getTime()}`,
        );
        return;
      }

      this.paymentRepository
        .updatePayment(payment.payment_id, { status: Status.FUNDS_SENT })
        .then(async (res) => {
          this.logger.log(
            `Payment status updated to funds_sent userId=${
              queryData.userId
            } paymentId=${payment.payment_id} time=${new Date().getTime()}`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error when updating the payment status to funds sent userId=${
              queryData.userId
            } paymentId=${
              payment.payment_id
            } error=${error} time=${new Date().getTime()}`,
          );
          throw new Error(
            `Error when updating the payment status to funds sent`,
          );
        });
    }

    // COMPLETED Or COMPLETED_2
    if (
      callBackData.status === StatusNumber.COMPLETED ||
      callBackData.status === StatusNumber.COMPLETED_2
    ) {
      this.logger.log(`callBackData.status status=COMPLETED`);

      if (
        payment.status === Status.ACTIVE ||
        payment.status === Status.CANCELLED
      ) {
        this.logger.warn(
          `Payment status already has been ${
            payment.status
          } so it returned userId=${queryData.userId} paymentId=${
            payment.payment_id
          } callbackstatus=completed time=${new Date().getTime()}`,
        );
        return;
      }

      this.paymentRepository
        .updatePayment(payment.payment_id, { status: Status.ACTIVE })
        .then(async (res) => {
          const existingPayment = await this.paymentRepository.getPaymentById(
            payment._id,
          );

          console.log(
            'existingPayment.campaign_id.toString()',
            existingPayment.campaign_id.toString(),
          );

          // console.log(
          //   'existingPayment.campaign_id._id.toString()',
          //   existingPayment.campaign_id._id.toString(),
          // );

          // update campaign collected cost when payment success
          const existingCampaign =
            await this.campaignRepository.getCampaignById(
              existingPayment.campaign_id._id.toString(),
            );

          console.log('existingCampaign', existingCampaign);

          if (!existingCampaign) {
            this.logger.warn(
              `Existing Campaign not found Campaign id = ${
                existingPayment.campaign_id
              } time=${new Date().getTime()}`,
            );
            throw new ForbiddenException(
              `Existing Campaign not found Campaign id = ${
                existingPayment.campaign_id
              } time=${new Date().getTime()}`,
            );
          }
          // existingCampaign.collected_cost =
          //   Number(existingCampaign.collected_cost) + Number(payment.amount);

          // if (
          //   existingCampaign.collected_cost < existingCampaign.required_cost
          // ) {
          //   await this.campaignRepository.updateCampaign(
          //     existingPayment.campaign_id.toString(),
          //     existingCampaign,
          //   );
          // }

          console.log('payment_id', existingPayment._id);
          console.log('invoice_id', callBackData.ipn_id);
          console.log('amount', existingPayment.amount);
          console.log('customer_email', callBackData.email);
          console.log('status', Status.COMPLETED);

          console.log('createInvoice 1');

          //create invoice
          const createInvoice = await this.invoiceRepository.createInvoice({
            payment_id: existingPayment._id.toString(),
            invoice_id: callBackData.ipn_id,
            amount: existingPayment.amount,
            customer_email: callBackData.email,
            hosted_invoice_url: null,
            status: Status.COMPLETED,
          });

          console.log('createInvoice 2', createInvoice);

          if (!createInvoice) {
            this.logger.warn(
              `Error in create Invoice payment_id=${existingPayment.payment_id.toString()} time=${new Date().getTime()}`,
            );
            throw new ForbiddenException(
              `Error in create Invoice payment_id=${existingPayment.payment_id.toString()} time=${new Date().getTime()}`,
            );
          }

          // todo send mail to user payment is completed
          const paymentAllDetails =
            await this.paymentRepository.getAllUserCampaignPaymentByPaymentId(
              payment.payment_id,
            );

          // console.log(
          //   'paymentAllDetails Date',
          //   new Date(paymentAllDetails[0].createdAt).toDateString(),
          // );
          // console.log('paymentAllDetails', paymentAllDetails);

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

          //sdf
          existingCampaign.collected_cost =
            Number(existingCampaign.collected_cost) + Number(payment.amount);

          if (
            existingCampaign.collected_cost < existingCampaign.required_cost
          ) {
            await this.campaignRepository.updateCampaign(
              existingPayment.campaign_id.toString(),
              existingCampaign,
            );
          }
          //sdf

          if (
            existingCampaign.collected_cost >= existingCampaign.required_cost
          ) {
            const extra_collected_cost =
              Number(existingCampaign.collected_cost) -
              Number(existingCampaign.required_cost);

            existingCampaign.collected_cost = Number(
              existingCampaign.required_cost,
            );

            // console.log('existingCampaign', existingCampaign);

            // update succeeded campaign collected amount
            await this.campaignRepository.updateCampaign(
              existingPayment.campaign_id.toString(),
              existingCampaign,
            );

            const general_campaign =
              await this.campaignRepository.getGeneralCampaign();

            // update general campaign collected amount
            general_campaign.collected_cost =
              Number(general_campaign.collected_cost) +
              Number(extra_collected_cost);

            await this.campaignRepository.updateCampaign(
              general_campaign._id.toString(),
              general_campaign,
            );

            const donorsForACampaign =
              await this.paymentRepository.getDonorsForACampaign(
                existingPayment.campaign_id.toString(),
              );

            // console.log('donorsForACampaign', donorsForACampaign);
            // send all donors to Goal Met Email
            donorsForACampaign.map(async (donorsData) => {
              await this.mailService.GoalMetEmail(
                donorsData.primary_email,
                donorsData.first_name,
                donorsData.last_name,
                existingCampaign.title,
              );
            });

            // console.log('Goal Met! 🏆');
          }

          this.logger.log(
            `Payment status updated to active userId=${
              queryData.userId
            } paymentId=${payment.payment_id} time=${new Date().getTime()}`,
          );
        })
        .catch(async (error) => {
          this.logger.error(
            `Error when updating the payment status to active userId=${
              queryData.userId
            } paymentId=${
              payment.payment_id
            } error=${error} time=${new Date().getTime()}`,
          );
        });
    }

    // CANCELED
    if (
      Math.sign(+callBackData.status) === +StatusNumber.CANCELED ||
      Number.isNaN(Math.sign(+callBackData.status))
    ) {
      this.logger.log(
        `callBackData.status status=CANCELED time=${new Date().getTime()}`,
      );
      if (
        payment.status === Status.ACTIVE ||
        payment.status === Status.CANCELLED
      ) {
        this.logger.warn(
          `Payment status already has been ${
            payment.status
          } so it returned userId=${queryData.userId} paymentId=${
            payment.payment_id
          } callbackstatus=cancelled time=${new Date().getTime()}`,
        );
        return;
      }

      this.paymentRepository
        .updatePayment(payment.payment_id, { status: Status.CANCELLED })
        .then(async (res) => {
          this.logger.log(
            `Payment status updated to cancelled userId=${
              queryData.userId
            } paymentId=${payment.payment_id} time=${new Date().getTime()}`,
          );
        })
        .catch(async (error) => {
          this.logger.error(
            `Error when updating the payment status to cancelled userId=${
              queryData.userId
            } paymentId=${
              payment.payment_id
            } error=${error} time=${new Date().getTime()}`,
          );
        });
    } else {
      throw new ForbiddenException({
        message: 'Nothing happened',
        status: 403,
      });
    }
  }
}
