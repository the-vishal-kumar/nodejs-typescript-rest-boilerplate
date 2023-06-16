import express, { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateIsAdmin, validateSchema } from '../middleware';
import { LoanSchema } from '../schema';
import { LoanController } from '../controller';
import { ResponseHandler } from '../util';
import { IUserDocument } from '../type';
const { handleSuccess } = ResponseHandler;
const { loanRequestSchema, getLoanSchema, approveLoanSchema } = LoanSchema;

export class UserLoanRoute {
  public router: express.Router;
  private loanController: LoanController;

  constructor() {
    this.router = express.Router();
    this.loanController = new LoanController();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.post('/', validateSchema(loanRequestSchema), validateAccessToken, this.requestLoan);
    this.router.get('/', validateAccessToken, this.getLoans);
    this.router.get('/:id', validateSchema(getLoanSchema), validateAccessToken, this.getLoan);
  }

  requestLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { amount, term } = req.body;
      const loanId = await this.loanController.requestLoan({ user: req.user as IUserDocument, amount, term });
      handleSuccess({ res, data: { id: loanId }, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  };

  getLoans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loans = await this.loanController.getLoans({ user: req.user as IUserDocument });
      handleSuccess({ res, data: { loans } });
    } catch (error) {
      next(error);
    }
  };

  getLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const loan = await this.loanController.getLoan({ user: req.user as IUserDocument, id });
      handleSuccess({ res, data: loan });
    } catch (error) {
      next(error);
    }
  };
}

export class AdminLoanRoute {
  public router: express.Router;
  private loanController: LoanController;

  constructor() {
    this.router = express.Router();
    this.loanController = new LoanController();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.put(
      '/:id/approve',
      validateSchema(approveLoanSchema),
      validateAccessToken,
      validateIsAdmin,
      this.approveLoan,
    );
  }

  approveLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.loanController.approveLoan({ adminId: req.user?.id.toString() as string, id });
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };
}
