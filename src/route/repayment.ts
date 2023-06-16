import express, { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateSchema } from '../middleware';
import { RepaymentSchema } from '../schema';
import { RepaymentController } from '../controller';
import { ResponseHandler } from '../util';
import { IUserDocument } from '../type';
const { handleSuccess } = ResponseHandler;
const { makePaymentSchema } = RepaymentSchema;

export class RepaymentRoute {
  public router: express.Router;
  private repaymentController: RepaymentController;

  constructor() {
    this.router = express.Router();
    this.repaymentController = new RepaymentController();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.put('/:id/repayment', validateSchema(makePaymentSchema), validateAccessToken, this.makePayment);
  }

  makePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      await this.repaymentController.makePayment({ user: req.user as IUserDocument, id, amount });
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };
}
