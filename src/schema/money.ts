import Joi from 'joi';

export const MAX_AMOUNT = 1_000_000_000;

/**
 * A positive amount with at most two decimal places. Extra precision is
 * rejected rather than silently rounded, because rounding money is a decision
 * the client should make.
 */
export const money = (): Joi.NumberSchema =>
  Joi.number()
    .min(0.01)
    .max(MAX_AMOUNT)
    .custom((value: number, helpers) => {
      const cents = value * 100;
      if (Math.abs(cents - Math.round(cents)) > 1e-6) return helpers.error('number.precision', { limit: 2 });
      return value;
    });
