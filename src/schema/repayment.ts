import Joi from 'joi';

const makePaymentSchema = Joi.object({
  id: Joi.string().trim().uuid().required(),
  amount: Joi.number().positive().required(),
});

export { makePaymentSchema };
