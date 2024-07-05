import { JwtService } from '@nestjs/jwt/dist';
import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { PaypalRepository } from './paypal.repository';
import { PaymentRepository } from 'src/repository/payment.repository';
import { UserRepository } from 'src/repository/user.repository';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  PriceList,
  PriceListSchema,
} from 'src/price-list/schemas/priceList.schema';
import { Payment, PaymentSchema } from 'src/schemas/payment.schema';
import { PriceListRepository } from 'src/price-list/priceList.repository';
import { InvoiceRepository } from 'src/repository/invoice.repository';
import { Invoice, InvoiceSchema } from 'src/schemas/Invoice.schema';
import { CampaignRepository } from '../repository/campaign.repository';
import { Campaign, CampaignSchema } from 'src/schemas/campaign.schema';
import { MailService } from 'src/mail/mail.service';
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
  controllers: [PaypalController],
  providers: [
    PaypalService,
    PaypalRepository,
    UserRepository,
    PaymentRepository,
    PriceListRepository,
    InvoiceRepository,
    CampaignRepository,
    MailService,
    JwtService,
    JwtStrategy,
    SessionSerializer,
  ],
})
export class PaypalModule {}
