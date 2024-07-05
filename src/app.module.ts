import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { configValidationSchema } from './config/config.schema';
import { StripeModule } from './stripe/stripe.module';
import { PaypalModule } from './paypal/paypal.module';
import { CoinPaymentsModule } from './coin-payment/coin-payments.module';
import { MailModule } from './mail/mail.module';
import { PriceListModule } from './price-list/priceList.module';
import { CustomRedisModule } from './redis/redis.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['src/config/config.env'],
      validationSchema: configValidationSchema,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    StripeModule,
    PaypalModule,
    CoinPaymentsModule,
    MailModule,
    PriceListModule,
    CustomRedisModule,
    PassportModule.register({ session: true }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
