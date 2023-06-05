import express, { Express, Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { ResponseHandler, Logger } from '../util';
import { logRequestResponse } from '../middleware';
const { logRequest, logResponse } = logRequestResponse;

/**
 * Represents an Express application.
 * @class App
 */
class App {
  expressApp: Express;
  router: Router;

  constructor() {
    this.expressApp = express();
    this.router = express.Router();
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
    this.router.get('/', (_req: Request, res: Response) => {
      res.send(`🚀NodeJs server started...`);
    });

    this.expressApp.use('/', this.router);
  }

  notFoundHandler(): void {
    this.expressApp.use((_req: Request, res: Response) => {
      ResponseHandler.handleNotFound(res);
    });
  }

  /**
   * Configures the error logging middleware for the Express application.
   * @returns {void}
   */
  errorHandler(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.expressApp.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      Logger.error(
        `Error occurred:- ${JSON.stringify({
          id: req.requestId,
          path: req.path,
          method: req.method,
          payload: req.method === 'GET' || req.method === 'DELETE' ? req.query : req.body,
          error: err,
        })}`,
        err,
      );
      ResponseHandler.handleError(res, err);
    });
  }

  /**
   * Starts the server and listens on the specified port.
   * @param {number} port - The port number to listen on.
   * @returns {Promise<Server>}
   */
  async start(port: number): Promise<Server> {
    this.attachMiddlewares();
    this.configureRoutes();
    this.notFoundHandler();
    this.errorHandler();

    const server = await this.expressApp.listen(port);
    Logger.info(`🚀Server is running at http://localhost:${port}`);

    return server;
  }
}

export default App;
