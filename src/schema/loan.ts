import Joi from 'joi';
import { money } from './money';

export const MAX_LOAN_TERM_WEEKS = 520;

const loanId = Joi.object({
  id: Joi.string().trim().uuid().required(),
});

const loanRequestSchema = {
  body: Joi.object({
    amount: money().required(),
    term: Joi.number().integer().min(1).max(MAX_LOAN_TERM_WEEKS).required(),
  }).custom((value, helpers) => {
    // Every weekly instalment must be at least one cent.
    if (Math.round(value.amount * 100) < value.term) {
      return helpers.message({ custom: '"amount" must be at least 0.01 per week of "term"' });
    }
    return value;
  }),
};

const getLoanSchema = { params: loanId };

const approveLoanSchema = { params: loanId };

export { loanRequestSchema, getLoanSchema, approveLoanSchema };
