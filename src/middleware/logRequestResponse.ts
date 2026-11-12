import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../util';

const REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Assigns a request id (reusing a well-formed incoming `X-Request-Id`, so ids
 * can be traced across services), echoes it on the response and writes one
 * structured access-log line when the response finishes or is aborted.
 *
 * Bodies are not logged here: they can hold passwords. The error handler logs
 * a redacted body when something fails.
 */
const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.get('x-request-id');
  req.requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const startedAt = process.hrtime.bigint();
  let logged = false;

  const log = (outcome: 'finished' | 'aborted'): void => {
    if (logged) return;
    logged = true;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const entry = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      contentLength: Number(res.get('Content-Length') || 0),
      userAgent: req.get('user-agent'),
    };
    if (outcome === 'aborted') Logger.warn('request aborted', entry);
    else if (res.statusCode >= 500) Logger.error('request completed', entry);
    else Logger.info('request completed', entry);
  };

  res.on('finish', () => log('finished'));
  res.on('close', () => log(res.writableFinished ? 'finished' : 'aborted'));

  next();
};

export { logRequest };
