import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { ResponseHandler, Logger } from '../../util';
import { logRequestResponse } from '../../middleware';
import { HomeRoute, AuthRoute, UserLoanRoute, AdminLoanRoute } from '../../route';
import { RepaymentRoute } from '../../route/repayment';
const { handleNotFound, handleError } = ResponseHandler;
const { logRequest, logResponse } = logRequestResponse;

/**
 * Represents an Express application.
 * @class NodeApp
 */
class NodeApp {
  expressApp: Express;

  constructor() {
    this.expressApp = express();
  }

  /**
   * Configures the middleware(s) for the Express application.
   * @returns {void}
   */
  attachMiddlewares(): void {
    this.expressApp.use(cors());
    this.expressApp.use(compression());
    // parse application/x-www-form-urlencoded
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));
    // parse application/json
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(cookieParser());
    this.expressApp.use(helmet());

    this.expressApp.use(logRequest);
    this.expressApp.use(logResponse);
  }

  /**
   * Configures the routes for the Express application.
   * @returns {void}
   */
  configureRoutes(): void {
    const homeRoute = new HomeRoute();
    this.expressApp.use('/', homeRoute.router);

    const authRoute = new AuthRoute();
    this.expressApp.use('/auth', authRoute.router);

    const userLoanRoute = new UserLoanRoute();
    this.expressApp.use('/loan', userLoanRoute.router);

    const adminLoanRoute = new AdminLoanRoute();
    this.expressApp.use('/loan', adminLoanRoute.router);

    const repaymentRoute = new RepaymentRoute();
    this.expressApp.use('/loan', repaymentRoute.router);
  }

  notFoundHandler(): void {
    this.expressApp.use((_req: Request, res: Response) => {
      handleNotFound({ res });
    });
  }

  /**
   * Configures the error logging middleware for the Express application.
   * @returns {void}
   */
  errorHandler(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.expressApp.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      Logger.error(
        `Error occurred:- ${JSON.stringify({
          id: req.requestId,
          path: req.path,
          method: req.method,
          payload: req.method === 'GET' || req.method === 'DELETE' ? req.query : req.body,
          error,
        })}`,
        error,
      );
      handleError({ res, error });
    });
  }

  /**
   * Starts the server and listens on the specified port.
   * @param {number} port - The port number to listen on.
   * @returns {Promise<Server>}
   */
  async init(port: number): Promise<Server> {
    this.attachMiddlewares();
    this.configureRoutes();
    this.notFoundHandler();
    this.errorHandler();

    const server = await this.expressApp.listen(port);
    Logger.info(`🚀NodeJs server is listening at http://localhost:${port}`);

    return server;
  }
}

export default NodeApp;
