import { JwtService } from '@nestjs/jwt/dist';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { CoinPaymentController } from './coin-payment.controller';
import { CoinPaymentService } from './coin-payment.service';

import { CoinPaymentRepository } from './coin-payment.repository';
import { UserRepository } from '../repository/user.repository';
import { PaymentRepository } from '../repository/payment.repository';
import { User, UserSchema } from '../schemas/user.schema';
import { Payment, PaymentSchema } from '../schemas/payment.schema';
import { InvoiceRepository } from '../repository/invoice.repository';
import { Invoice, InvoiceSchema } from '../schemas/Invoice.schema';
import { CampaignRepository } from '../repository/campaign.repository';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Invoice.name,
        schema: InvoiceSchema,
      },
      {
        name: Campaign.name,
        schema: CampaignSchema,
      },
    ]),
    HttpModule,
  ],
  controllers: [CoinPaymentController],
  providers: [
    CoinPaymentService,
    UserRepository,
    InvoiceRepository,
    CoinPaymentRepository,
    PaymentRepository,
    JwtService,
    CampaignRepository,
    MailService,
  ],
})
export class CoinPaymentsModule {}
