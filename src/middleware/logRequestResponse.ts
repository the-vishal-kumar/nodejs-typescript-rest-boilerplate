import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { Logger } from '../util';

/**
 * Interface for the log entry containing request and response information.
 */
interface LogEntry {
  id: string;
  path: string;
  method: string;
  payload: object;
  statusCode?: number;
  statusMessage?: string;
  contentLength?: number;
}

/**
 * Middleware function to log the details of incoming requests.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = uuid();

  const logEntry: LogEntry = {
    id: req.requestId,
    path: req.path,
    method: req.method,
    payload:
      req.method === 'GET' || req.method === 'DELETE'
        ? { ...req.query, ...req.params }
        : { ...req.body, ...req.params },
  };

  Logger.info(`Request:- ${JSON.stringify(logEntry)}`);

  next();
};

/**
 * Middleware function to log the details of outgoing responses.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
const logResponse = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.requestId;
  /**
   * Cleanup function to remove event listeners.
   */
  const cleanup = (): void => {
    res.removeListener('finish', logFn);
    res.removeListener('close', abortFn);
    res.removeListener('error', errorFn);
  };

  /**
   * Event listener for successful response.
   */
  const logFn = (): void => {
    cleanup();
    const logEntry: LogEntry = {
      id: requestId,
      path: req.path,
      method: req.method,
      payload:
        req.method === 'GET' || req.method === 'DELETE'
          ? { ...req.query, ...req.params }
          : { ...req.body, ...req.params },
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      contentLength: parseInt(res.get('Content-Length') || '0', 10),
    };
    Logger.info(`Response:- ${JSON.stringify(logEntry)}`);
  };

  /**
   * Event listener for aborted response.
   */
  const abortFn = (): void => {
    cleanup();
    Logger.warn(
      `Response aborted:- ${JSON.stringify({
        id: requestId,
        path: req.path,
        method: req.method,
        payload:
          req.method === 'GET' || req.method === 'DELETE'
            ? { ...req.query, ...req.params }
            : { ...req.body, ...req.params },
      })}`,
    );
  };

  /**
   * Event listener for response error.
   * @param {Error} err - The error object.
   */
  const errorFn = (err: Error): void => {
    cleanup();
    Logger.error(
      `Response error:- ${JSON.stringify({
        id: requestId,
        path: req.path,
        method: req.method,
        payload:
          req.method === 'GET' || req.method === 'DELETE'
            ? { ...req.query, ...req.params }
            : { ...req.body, ...req.params },
        err,
      })}`,
      err,
    );
  };

  res.on('finish', logFn);
  res.on('close', abortFn);
  res.on('error', errorFn);

  next();
};

export { logRequest, logResponse };
