import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import {  PaymentType } from 'src/schemas/payment.schema';
import { Campaign } from 'src/schemas/campaign.schema';
import { User } from 'src/schemas/user.schema';
import { PaymentSearchDto } from 'src/dtos/paymentDto/PaymentSearchDto.dto';

@Injectable()
export class MailService {
  private readonly logger = new Logger(` src/stripe/stripe-repository.ts`);
  constructor(private mailerService: MailerService) {}

  async GetCurrentYear(): Promise<number> {
    let date = new Date();
    let year = date.getFullYear();
    console.log('currentYear', year);

    return year;
  }

  async DateConverterNumber(TXN_date: any): Promise<string> {
    let date = new Date(Number(TXN_date) * 1000);

    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month value starts from 0, so we need to add 1
    let year = date.getFullYear();

    let formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
  }

  async DateConverterString(TXN_date: any): Promise<string> {
    let date = new Date(TXN_date);

    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month value starts from 0, so we need to add 1
    let year = date.getFullYear();

    let formattedDate = `${day}/${month}/${year}`;

    return formattedDate;
  }

  async MailRenewalCompleted(
    res: any,
    payment_res: PaymentSearchDto,
    // campaign: Campaign,
    latest_invoice: any,
  ) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('MailRenewalCompleted currentYear', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `MailRenewalCompleted function current year ${error}`,
        );
        reject(error);
      }
    });

    const new_date = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.DateConverterNumber(payment_res.createdAt);
        resolve(date);
      } catch (error) {
        this.logger.error(`MailRenewalCompleted function error date ${error}`);
        reject(error);
      }
    });

    let payment_ammount: number = 0;

    // if (payment_res.payment_type === PaymentType.MONTHLY) {
    //   payment_ammount = campaign.amount;
    // } else if (payment_res.payment_type === PaymentType.ONETIME) {
    //   payment_ammount = campaign.amount;
    // }

    await this.mailerService.sendMail({
      to: res.primary_email,
      template: './renewal_completed',
      subject: 'Meththa Foundation - Thank you for your campaign',
      context: {
        first_name: res.first_name,
        last_name: res.last_name,
        txn_id: latest_invoice,
        create_date: new_date,
        payment_method: 'Credit/Debit Card',
        // amount: payment_ammount ? payment_ammount : 0,
        currentYear: currentYear,
      },
    });
  }

  async SendCancellationConfirmation(res: User) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `Send Cancellation Confirmation function current year ${error}`,
        );
        reject(error);
      }
    });

    await this.mailerService.sendMail({
      to: res.primary_email,
      template: './send_cancellation_confirmation',
      subject: 'Meththa Foundation - Subscription has been cancelled',
      context: {
        first_name: res.first_name,
        last_name: res.last_name,
        currentYear: currentYear,
      },
    });
  }

  async Send_expired_email(user_data: User) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(`Send_expired_email function current year ${error}`);
        reject(error);
      }
    });

    await this.mailerService.sendMail({
      to: user_data.primary_email,
      template: './send_expired_email',
      subject: 'Meththa Foundation - Your Subscription Has Expired',
      context: {
        first_name: user_data.first_name,
        last_name: user_data.last_name,
        currentYear: currentYear,
      },
    });
  }

  async payment_renewal_failed(user: User) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `payment_renewal_failed function current year ${error}`,
        );
        reject(error);
      }
    });

    await this.mailerService.sendMail({
      to: user.primary_email,
      template: './payment_renewal_failed',
      subject: 'Meththa Foundation - Payment Renewal Failed',
      context: {
        first_name: user.first_name,
        last_name: user.last_name,
        currentYear: currentYear,
      },
    });
  }

  async Upcoming_subscription_expiration(user: User) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `Upcoming_subscription_expiration function current year ${error}`,
        );
        reject(error);
      }
    });

    await this.mailerService.sendMail({
      to: user.primary_email,
      template: './upcoming_subscription_expiration',
      subject: 'Meththa Foundation - Reminder - Upcoming Subscription Renewal',
      context: {
        first_name: user.first_name,
        last_name: user.last_name,
        currentYear: currentYear,
      },
    });
  }

  async MailPaymentComplete(
    updatedUser: User,
    payment_succeeded: PaymentSearchDto,
    campaign: Campaign,
  ) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(`MailPaymentComplete function current year ${error}`);
        reject(error);
      }
    });

    const new_date = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.DateConverterNumber(
          payment_succeeded.createdAt,
        );
        resolve(date);
      } catch (error) {
        this.logger.error(`MailPaymentComplete function error date ${error}`);
        reject(error);
      }
    });

    let payment_ammount: number = 0;

    if (payment_succeeded.payment_type === PaymentType.MONTHLY) {
      payment_ammount = payment_succeeded.amount;
    } else if (payment_succeeded.payment_type === PaymentType.ONETIME) {
      payment_ammount = payment_succeeded.amount;
    }

    await this.mailerService.sendMail({
      to: updatedUser.primary_email,
      template: './payment_receipt',
      subject: 'Meththa Foundation - Your Receipt',
      context: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        txn_id: payment_succeeded.payment_id,
        create_date: new_date,
        payment_method: 'Credit/Debit Card',
        amount: payment_ammount ? payment_ammount.toFixed(2) : 0,
        currentYear: currentYear,
      },
    });
  }

  async MailPaymentIncomplete(updatedUser: User) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `MailPaymentIncomplete function current year ${error}`,
        );
        reject(error);
      }
    });

    await this.mailerService.sendMail({
      to: updatedUser.primary_email,
      template: './paymentincomplete',
      subject: 'Meththa Foundation - Payment Failed',
      context: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        currentYear: currentYear,
      },
    });
  }

  async MailPaymentCompleteDateDetails(
    updatedUser: User,
    payment_succeeded: PaymentSearchDto,
    renewDate: any,
    campaign: Campaign,
  ) {
    const currentYear = await new Promise(async (resolve, reject) => {
      try {
        const date = await this.GetCurrentYear();
        console.log('date 2', date);
        resolve(date);
      } catch (error) {
        this.logger.error(
          `MailPaymentCompleteDateDetails function current year ${error}`,
        );
        reject(error);
      }
    });

    const startDate = await new Promise(async (resolve, reject) => {
      try {
        const start = await this.DateConverterNumber(
          payment_succeeded.createdAt,
        );
        resolve(start);
      } catch (error) {
        this.logger.error(
          `MailPaymentIncomplete function error startDate ${error}`,
        );
        reject(error);
      }
    });

    const endDate = await new Promise(async (resolve, reject) => {
      try {
        const end = await this.DateConverterString(renewDate);
        resolve(end);
      } catch (error) {
        this.logger.error(
          `MailPaymentIncomplete function error endDate ${error}`,
        );
        reject(error);
      }
    });

    let payment_ammount: number = 0;

    if (payment_succeeded.payment_type === PaymentType.MONTHLY) {
      payment_ammount = payment_succeeded.amount;
    } else if (payment_succeeded.payment_type === PaymentType.ONETIME) {
      payment_ammount = payment_succeeded.amount;
    }

    await this.mailerService.sendMail({
      to: updatedUser.primary_email,
      template: './payment_receipt_date_details',
      subject: 'Meththa Foundation - Payment Received',
      context: {
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        plan_details:
          `Meththa Foundation - ` +
          (payment_succeeded.payment_type === PaymentType.MONTHLY
            ? 'Monthly Subscription'
            : 'One Time Subscription'),
        start_date: startDate,
        end_date: endDate,
        currentYear: currentYear,
        amount: payment_ammount ? payment_ammount.toFixed(2) : 0,
      },
    });
  }

  async PaymentCompleteEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
    payment_id: string,
    donation_date: string,
    campaign_title: string,
    payment_method: string,
    amount: string,
    donation_type: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './thank_your_donation',
        subject: 'Meththa Foundation - Payment Received',
        context: {
          first_name: first_name,
          last_name: last_name,
          payment_id: payment_id,
          donation_date: donation_date,
          campaign_title: campaign_title,
          payment_method: payment_method,
          amount: amount,
          donation_type: donation_type,
        },
      });
      console.log(`PaymentCompleteEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('PaymentCompleteEmail error', error);
    }
  }

  async SubscriptionCancelled(
    primary_email: string,
    first_name: string,
    last_name: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './cancellation_subscription',
        subject: 'Meththa Foundation - Subscription Cancellation',
        context: {
          first_name: first_name,
          last_name: last_name,
        },
      });
      console.log(`SubscriptionCancelled sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('SubscriptionCancelled error', error);
    }
  }

  async SubscriptionUpdateEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
    amount: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './subscription_change',
        subject: 'Meththa Foundation - Subscription Change',
        context: {
          first_name: first_name,
          last_name: last_name,
          new_amount: amount,
        },
      });
      console.log(`SubscriptionUpdateEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('SubscriptionUpdateEmail error', error);
    }
  }

  async GoalMetEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
    campaign_title: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './goal_met',
        subject: 'Meththa Foundation - Goal Met',
        context: {
          first_name: first_name,
          last_name: last_name,
          campaign_title: campaign_title,
        },
      });
      console.log(`GoalMetEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('GoalMetEmail error', error);
    }
  }

  async DeliverEmail(
    primary_email: string,
    image_url: string,
    campaign_title: string,
    patient_name: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './deliver',
        subject: 'Meththa Foundation - Thank you for making a difference',
        context: {
          image_url: image_url,
          campaign_title: campaign_title,
          patient_name: patient_name,
        },
      });
      console.log(`ThankContributeDonationEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('ThankContributeDonationEmail error', error);
    }
  }

  async PaymentFailedEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
    card: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './payment_failed',
        subject: 'Meththa Foundation - Payment Failed',
        context: {
          first_name: first_name,
          last_name: last_name,
          card: card,
        },
      });
      console.log(`PaymentFailedEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('PaymentFailedEmail error', error);
    }
  }

  async CryptoPaymentFailedEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
    crypto_method: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './payment_failed_crypto',
        subject: 'Meththa Foundation - Payment Failed',
        context: {
          first_name: first_name,
          last_name: last_name,
          crypto_method: crypto_method,
        },
      });
      console.log(`CryptoPaymentFailedEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('CryptoPaymentFailedEmail error', error);
    }
  }

  async PaymentRenewalFailedEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './payment_renewal_failed',
        subject: 'Meththa Foundation - Payment Renewal Failed',
        context: {
          first_name: first_name,
          last_name: last_name,
        },
      });
      console.log(`PaymentRenewalFailedEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('PaymentRenewalFailedEmail error', error);
    }
  }

  async SubscriptionHasExpiredEmail(
    primary_email: string,
    first_name: string,
    last_name: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: primary_email,
        template: './subscription_has_expired',
        subject: 'Meththa Foundation - Subscription Has Expired',
        context: {
          first_name: first_name,
          last_name: last_name,
        },
      });
      console.log(`SubscriptionHasExpiredEmail sent to 📧 ${primary_email}`);
    } catch (error) {
      console.log('SubscriptionHasExpiredEmail error', error);
    }
  }
}
