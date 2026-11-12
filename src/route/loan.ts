import express, { Request, Response } from 'express';
import { validateAccessToken, validateIsAdmin, validateSchema } from '../middleware';
import { LoanSchema } from '../schema';
import { LoanController } from '../controller';
import { ResponseHandler } from '../util';
import { IUserDocument } from '../type';
const { handleSuccess } = ResponseHandler;
const { loanRequestSchema, getLoanSchema, approveLoanSchema } = LoanSchema;

// Authentication runs before validation, so an anonymous caller gets 401
// rather than learning the shape of the payload from a 422.
export class UserLoanRoute {
  public router: express.Router;
  private loanController: LoanController;

  constructor() {
    this.router = express.Router();
    this.loanController = new LoanController();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.post('/', validateAccessToken, validateSchema(loanRequestSchema), this.requestLoan);
    this.router.get('/', validateAccessToken, this.getLoans);
    this.router.get('/:id', validateAccessToken, validateSchema(getLoanSchema), this.getLoan);
  }

  requestLoan = async (req: Request, res: Response): Promise<void> => {
    const { amount, term } = req.body;
    const loanId = await this.loanController.requestLoan({ user: req.user as IUserDocument, amount, term });
    handleSuccess({ res, data: { id: loanId }, statusCode: 201 });
  };

  getLoans = async (req: Request, res: Response): Promise<void> => {
    const data = await this.loanController.getLoans({ user: req.user as IUserDocument });
    handleSuccess({ res, data });
  };

  getLoan = async (req: Request, res: Response): Promise<void> => {
    const loan = await this.loanController.getLoan({ user: req.user as IUserDocument, id: String(req.params.id) });
    handleSuccess({ res, data: loan });
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
      validateAccessToken,
      validateIsAdmin,
      validateSchema(approveLoanSchema),
      this.approveLoan,
    );
  }

  approveLoan = async (req: Request, res: Response): Promise<void> => {
    await this.loanController.approveLoan({ admin: req.user as IUserDocument, id: String(req.params.id) });
    handleSuccess({ res, statusCode: 204 });
  };
}
