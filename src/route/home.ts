import express, { Request, Response } from 'express';

export default class HomeRoute {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.get('/', this.home);
  }

  private home = (_req: Request, res: Response): void => {
    res.send(`🚀NodeJs server started...`);
  };
}
