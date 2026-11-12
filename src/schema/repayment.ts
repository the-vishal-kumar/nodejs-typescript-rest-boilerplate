import Joi from 'joi';
import { money } from './money';

const makePaymentSchema = {
  params: Joi.object({
    id: Joi.string().trim().uuid().required(),
  }),
  body: Joi.object({
    amount: money().required(),
  }),
};

export { makePaymentSchema };
