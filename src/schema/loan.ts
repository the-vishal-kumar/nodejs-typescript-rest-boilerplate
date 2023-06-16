import Joi from 'joi';

const loanRequestSchema = Joi.object({
  amount: Joi.number().positive().required(),
  term: Joi.number().positive().required(),
});

const getLoanSchema = Joi.object({
  id: Joi.string().trim().uuid().required(),
});

const approveLoanSchema = Joi.object({
  id: Joi.string().trim().uuid().required(),
});

export { loanRequestSchema, getLoanSchema, approveLoanSchema };
