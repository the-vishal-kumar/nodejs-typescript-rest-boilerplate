import express, { Request, Response, NextFunction } from 'express';
import { AppConfig } from '../config';
import { CustomError } from '../error';
import { validateAccessToken, validateSchema } from '../middleware';
import { AuthSchema } from '../schema';
import { AuthController } from '../controller';
import { IUserDocument } from '../type';
import { ResponseHandler } from '../util';
const { handleSuccess } = ResponseHandler;
const { signupSchema, signinSchema, resetPasswordSchema } = AuthSchema;

export default class AuthRoute {
  public router: express.Router;
  private authController: AuthController;

  constructor(private readonly config: Pick<AppConfig, 'adminSignupEnabled'>) {
    this.router = express.Router();
    this.authController = new AuthController();
    this.initRoutes();
  }

  /**
   * Open admin sign-up exists so the take-home flow can be tried end to end.
   * It is off unless ADMIN_SIGNUP_ENABLED=true.
   */
  private requireAdminSignupEnabled = (_req: Request, _res: Response, next: NextFunction): void => {
    if (!this.config.adminSignupEnabled) return next(new CustomError('Admin sign-up is disabled', 403));
    return next();
  };

  private initRoutes(): void {
    this.router.post('/signup', validateSchema(signupSchema), this.signup);
    this.router.post('/signin', validateSchema(signinSchema), this.signin);
    this.router.post('/signup/admin', this.requireAdminSignupEnabled, validateSchema(signupSchema), this.signupAdmin);
    this.router.post('/signin/admin', validateSchema(signinSchema), this.signinAdmin);
    this.router.post('/signoff', validateAccessToken, this.signoff);
    this.router.put('/password/reset', validateAccessToken, validateSchema(resetPasswordSchema), this.resetPassword);
  }

  signup = async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName } = req.body;
    await this.authController.signup({ email, password, firstName, lastName });
    handleSuccess({ res, statusCode: 204 });
  };

  signupAdmin = async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName } = req.body;
    await this.authController.signup({ email, password, firstName, lastName, isAdmin: true });
    handleSuccess({ res, statusCode: 204 });
  };

  signin = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const accessToken = await this.authController.signin({ email, password });
    handleSuccess({ res, data: { accessToken } });
  };

  signinAdmin = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const accessToken = await this.authController.signin({ email, password, requireAdmin: true });
    handleSuccess({ res, data: { accessToken } });
  };

  signoff = async (req: Request, res: Response): Promise<void> => {
    await this.authController.signoff(req.tokenId as string);
    handleSuccess({ res, statusCode: 204 });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUserDocument;
    const { currentPassword, password } = req.body;
    await this.authController.resetPassword({
      userId: user._id,
      tokenId: req.tokenId as string,
      storedPassword: user.password,
      currentPassword,
      newPassword: password,
    });
    handleSuccess({ res, statusCode: 204 });
  };
}
