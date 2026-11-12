import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../error';

/**
 * Must run after validateAccessToken. Admin sign-in checks the role inside the
 * controller, after the password, so this middleware never looks a user up by
 * email (that leaked whether an account is an admin without a password).
 */
const validateIsAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) return next(new AuthenticationError('Missing access token'));
  if (!req.user.isAdmin) return next(new AuthorizationError('Admin access required'));
  return next();
};

export default validateIsAdmin;
