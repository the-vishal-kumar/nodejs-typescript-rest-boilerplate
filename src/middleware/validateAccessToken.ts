import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../error';
import { Token, User } from '../model';

const validateAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { authorization } = req.headers;
  const accessToken = authorization && authorization.split(` `)[1];
  if (!accessToken) return next(new AuthenticationError('Missing access token'));

  const token = await Token.findOne({ accessToken });
  if (!token) return next(new AuthenticationError('Invalid access token'));

  const user = await User.findById(token.userId);
  if (!user) return next(new AuthenticationError());

  req.tokenId = token._id;
  req.user = user;

  return next();
};

export default validateAccessToken;
