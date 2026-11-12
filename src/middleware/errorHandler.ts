import { Request, Response, NextFunction } from 'express';
import { Logger, ResponseHandler, redact } from '../util';
import { AuthenticationError, AuthorizationError, CustomError, NotFoundError, ValidationError } from '../error';

const { handleError } = ResponseHandler;

type HttpLikeError = Error & { type?: string; status?: number; code?: number };

const isKnownError = (error: unknown): boolean =>
  error instanceof CustomError ||
  error instanceof AuthenticationError ||
  error instanceof AuthorizationError ||
  error instanceof NotFoundError ||
  error instanceof ValidationError;

/**
 * Single place that turns an error into an HTTP response.
 * Express 5 forwards rejected promises from async handlers here, so routes
 * and middleware can simply `throw`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (error: HttpLikeError, req: Request, res: Response, _next: NextFunction): void => {
  if (res.headersSent) {
    Logger.error('Error after response was sent', { requestId: req.requestId, err: error });
    return;
  }

  // Errors raised by express.json() before any route runs.
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ status: 400, error: 'Request body is not valid JSON' });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ status: 413, error: 'Request body is too large' });
    return;
  }
  // Unique index violation, e.g. two concurrent sign-ups with the same email.
  if (error.code === 11000) {
    res.status(409).json({ status: 409, error: 'Resource already exists' });
    return;
  }

  if (isKnownError(error)) {
    Logger.warn('Request rejected', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: error.name,
      message: error.message,
    });
    handleError({ res, error });
    return;
  }

  Logger.error('Unhandled error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    params: req.params,
    body: redact(req.body),
    err: error,
    stack: error.stack,
  });
  res.status(500).json({ status: 500, error: 'An error occurred', requestId: req.requestId });
};

export default errorHandler;
