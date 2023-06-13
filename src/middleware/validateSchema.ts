import { Request, Response, NextFunction } from 'express';
import { ValidationResult, Schema, ValidationOptions } from 'joi';
import { ResponseHandler } from '../util';
const { handleValidation } = ResponseHandler;

const validateSchema =
  (schema: Schema): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const options: ValidationOptions = {
      abortEarly: false,
      allowUnknown: false,
    };
    const { error }: ValidationResult = schema.validate(
      req.method === 'GET' || req.method === 'DELETE' ? req.query : req.body,
      options,
    );
    if (error) {
      const validationErrors = error.details.map((detail: { message: string }) => detail.message);
      return handleValidation({ res, errors: validationErrors });
    }

    return next();
  };

export default validateSchema;
