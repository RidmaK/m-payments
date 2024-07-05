import { JwtService } from '@nestjs/jwt/dist';
import { MailService } from './../mail/mail.service';
import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

import { UserRepository } from 'src/repository/user.repository';
import { StripeRepository } from './stripe.repository';
import { PaymentRepository } from 'src/repository/payment.repository';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  PriceList,
  PriceListSchema,
} from 'src/price-list/schemas/priceList.schema';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { InvoiceRepository } from 'src/repository/invoice.repository';
import { Invoice, InvoiceSchema } from 'src/schemas/Invoice.schema';
import { CampaignRepository } from '../repository/campaign.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/guards/jwt.strategy';
import { SessionSerializer } from 'src/guards/serializer';
import { CustomRedisModule } from 'src/redis/redis.module';

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
        name: PriceList.name,
        schema: PriceListSchema,
      },
      {
        name: Campaign.name,
        schema: CampaignSchema,
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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION'),
        },
      }),
    }),
    HttpModule,
    CustomRedisModule,
  ],
  controllers: [StripeController],
  providers: [
    StripeService,
    UserRepository,
    StripeRepository,
    PaymentRepository,
    InvoiceRepository,
    MailService,
    JwtService,
    CampaignRepository,
    JwtStrategy,
    SessionSerializer,
  ],
})
export class StripeModule {}
