import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('SENDING_BLUE_CLIENT_HOST'),
          port: 587,
          secure: false,
          auth: {
            user: configService.get<string>('SENDING_BLUE_CLIENT_USER'),
            pass: configService.get<string>('SENDING_BLUE_CLIENT_PASSWORD'),
          },
        },
        defaults: {
          from: `${configService.get<string>(
            'SENDING_BLUE_CLIENT_TEMPLATE_DEFAULT_NAME',
          )} <${configService.get<string>(
            'SENDING_BLUE_CLIENT_TEMPLATE_DEFAULT_EMAIL',
          )}>`,
        },
        template: {
          dir:
            process.cwd() +
            configService.get<string>('SENDING_BLUE_CLIENT_TEMPLATE_DIR'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
