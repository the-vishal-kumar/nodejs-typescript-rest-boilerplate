import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { AppConfig } from '../../config';
import { ResponseHandler } from '../../util';
import { createRateLimiters, errorHandler, logRequest } from '../../middleware';
import {
  AuthRoute,
  DocsRoute,
  HealthRoute,
  Lifecycle,
  UserLoanRoute,
  AdminLoanRoute,
  RepaymentRoute,
} from '../../route';
const { handleNotFound } = ResponseHandler;

/**
 * Builds the Express application without binding a port, so tests can drive
 * it in-process with supertest and the entrypoint owns the server lifecycle.
 */
export const createApp = (config: AppConfig, lifecycle: Lifecycle = { isShuttingDown: () => false }): Express => {
  const app = express();
  const limiters = createRateLimiters(config);

  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  // Probes come first: no logging noise, no rate limit, no body parsing.
  app.use('/health', new HealthRoute(lifecycle).router);

  app.use(logRequest);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins === '*' ? '*' : config.corsOrigins }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req: Request, res: Response) => res.redirect('/docs'));
  app.use('/docs', new DocsRoute().router);

  app.use('/auth/signup', limiters.auth);
  app.use('/auth/signin', limiters.auth);
  app.use('/auth/password', limiters.auth);
  app.use(limiters.api);

  app.use('/auth', new AuthRoute(config).router);
  app.use('/loan', new UserLoanRoute().router);
  app.use('/loan', new AdminLoanRoute().router);
  app.use('/loan', new RepaymentRoute().router);

  app.use((_req: Request, res: Response) => handleNotFound({ res }));
  app.use(errorHandler);

  return app;
};

export default createApp;
