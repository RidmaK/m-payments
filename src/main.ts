import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config/dist';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as express from 'express';
import * as passport from 'passport';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';

const logtail = new Logtail('rMAjhuVE8jjFGjewmnduDNE3');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new LogtailTransport(logtail),
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);
  app.use(
    '/stripe/subscription-webhook',
    express.raw({ type: 'application/json' }),
  );
  app.use(cookieParser());
    const redisClient = new Redis({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
      password: configService.get('REDIS_PASSWORD'),
    });
  app.use(
    session({
      secret: configService.get('JWT_SECRET'),
      name: 'Meththa-auth',
      store: new RedisStore({
        client: redisClient,
        prefix: 'Meththa-auth:',
      }),
      saveUninitialized: false,
      resave: false,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.enableCors({
    origin: [
      configService.get('METHTHA_BACKEND'),
      configService.get('METHTHA_FRONTEND'),
      configService.get('BASE_URL'),
      'http://localhost:3000',
      // 'http://localhost:3001',
      // 'http://localhost:3003',
      // 'https://meththa-backend-test.up.railway.app',
      // 'https://meththa-backend-release.up.railway.app',
      // 'https://meththa-backend-production.up.railway.app',
      // 'https://meththa-frontend-test.up.railway.app',
      // 'https://meththa-frontend-release.up.railway.app',
      // 'https://meththa-frontend-production.up.railway.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Origin',
      'X-Requested-With',
      'Accept',
      'x-client-key',
      'x-client-token',
      'x-client-secret',
      'Authorization',
    ],
  });

  app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe());

  const port = configService.get('PORT');
  await app.listen(port);
}
bootstrap();
