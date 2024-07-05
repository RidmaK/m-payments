import * as Joi from '@hapi/joi';

export const configValidationSchema = Joi.object({
  STAGE: Joi.string().required(),
  MONGODB_URI: Joi.string().required(),
  STRIPE_SK: Joi.string().required(),
  STRIPE_WEBHOOK_ENDPOINT_SK: Joi.string().required(),
  PAYPAL_CLIENT_ID: Joi.string().required(),
  PAYPAL_CLIENT_SECRET: Joi.string().required(),
  PAYPAL_WEBHOOK_ID: Joi.string().required(),
  PAYPAL_MODE: Joi.string(),
  LOG_TAIL_KEY: Joi.string(),
  COIN_PAYMENT_KEY: Joi.string().required(),
  COIN_PAYMENT_SK: Joi.string().required(),
  COIN_PAYMENT_IPN_SECRET: Joi.string().required(),
});
