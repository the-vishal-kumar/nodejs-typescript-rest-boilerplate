import express, { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateIsAdmin, validateSchema } from '../middleware';
import { AuthSchema } from '../schema';
import { AuthController } from '../controller';
import { ResponseHandler } from '../util';
const { handleSuccess } = ResponseHandler;
const { signupSchema, signinSchema, resetPasswordSchema } = AuthSchema;

export default class AuthRoute {
  public router: express.Router;
  private authController: AuthController;

  constructor() {
    this.router = express.Router();
    this.authController = new AuthController();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.post('/signup', validateSchema(signupSchema), this.signup);
    this.router.post('/signin', validateSchema(signinSchema), this.signin);
    this.router.post('/signup/admin', validateSchema(signupSchema), this.signupAdmin);
    this.router.post('/signin/admin', validateSchema(signinSchema), validateIsAdmin, this.signinAdmin);
    this.router.post('/signoff', validateAccessToken, this.signoff);
    this.router.put('/password/reset', validateSchema(resetPasswordSchema), validateAccessToken, this.resetPassword);
  }

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;
      await this.authController.signup({ email, password, firstName, lastName });
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };

  signupAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, firstName, lastName } = req.body;
      await this.authController.signup({ email, password, firstName, lastName, isAdmin: true });
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };

  signin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const accessToken = await this.authController.signin({ email, password });
      handleSuccess({ res, data: { accessToken } });
    } catch (error) {
      next(error);
    }
  };

  signinAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const accessToken = await this.authController.signin({ email, password, isAdmin: true });
      handleSuccess({ res, data: { accessToken } });
    } catch (error) {
      next(error);
    }
  };

  signoff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authController.signoff(req.tokenId as string);
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body;
      await this.authController.resetPassword({
        userId: req.user?._id,
        storedPassword: req.user?.password as string,
        suppliedPassword: password,
      });
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };
}
