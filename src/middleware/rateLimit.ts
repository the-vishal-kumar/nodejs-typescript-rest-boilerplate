import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { AppConfig } from '../config/env';

const limitReached = (message: string): RequestHandler => {
  return (_req, res) => {
    res.status(429).json({ status: 429, error: message });
  };
};

/**
 * Two fixed-window limits keyed by client IP (set TRUST_PROXY behind a load
 * balancer so the real IP is used). The store is in memory, so limits are per
 * process; several replicas need a shared store such as Redis.
 */
export const createRateLimiters = (config: AppConfig): { api: RequestHandler; auth: RequestHandler } => ({
  api: rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitReached('Too many requests, try again later'),
  }),
  // Sign-up, sign-in and password reset are the brute-force targets.
  auth: rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: limitReached('Too many authentication attempts, try again later'),
  }),
});
