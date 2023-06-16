import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../error';
import { User } from '../model';
import { IUserDocument } from '../type';

const validateIsAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.tokenId) {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(new AuthenticationError());

    req.user = user;
  }

  if (!(req.user as IUserDocument).isAdmin) return next(new AuthorizationError());

  return next();
};

export default validateIsAdmin;
