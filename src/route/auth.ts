import express, { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateSchema } from '../middleware';
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
    this.router.post('/signoff', validateAccessToken, this.signoff);
    this.router.post('/password/reset', validateAccessToken, validateSchema(resetPasswordSchema), this.resetPassword);
  }

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      await this.authController.signup(email, password);
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };

  signin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const accessToken = await this.authController.signin(email, password);
      handleSuccess({ res, data: { accessToken } });
    } catch (error) {
      next(error);
    }
  };

  signoff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authController.signoff(req.accessToken as string);
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body;
      await this.authController.resetPassword(req.user.id, password);
      handleSuccess({ res, statusCode: 204 });
    } catch (error) {
      next(error);
    }
  };
}
