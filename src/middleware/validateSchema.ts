import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, ValidationOptions } from 'joi';
import { ResponseHandler } from '../util';
const { handleValidation } = ResponseHandler;

export interface RequestSchema {
  params?: ObjectSchema;
  body?: ObjectSchema;
}

const options: ValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  convert: true,
};

/**
 * Validates `req.params` and `req.body` separately and replaces them with the
 * converted values (trimmed strings, lower-cased email, numbers), so handlers
 * only ever see input that passed the schema.
 */
const validateSchema =
  (schema: RequestSchema): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    if (schema.params) {
      const { value, error } = schema.params.validate(req.params, options);
      if (error) errors.push(...error.details.map(detail => detail.message));
      else req.params = value;
    }

    if (schema.body) {
      const body = req.body ?? {};
      if (typeof body !== 'object' || Array.isArray(body)) errors.push('request body must be a JSON object');
      else {
        const { value, error } = schema.body.validate(body, options);
        if (error) errors.push(...error.details.map(detail => detail.message));
        else req.body = value;
      }
    }

    if (errors.length) return handleValidation({ res, errors });
    return next();
  };

export default validateSchema;
