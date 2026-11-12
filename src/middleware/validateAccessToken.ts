import { Request, Response, NextFunction } from 'express';
import jsonwebtoken from 'jsonwebtoken';
import { getConfig } from '../config';
import { AuthenticationError } from '../error';
import { Token, User } from '../model';
import { hashToken } from '../util';

/**
 * Accepts `Authorization: Bearer <jwt>` only when the JWT signature and expiry
 * are valid AND the session still exists (sign-off deletes it).
 */
const validateAccessToken = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const [scheme, accessToken] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !accessToken) return next(new AuthenticationError('Missing access token'));

  try {
    jsonwebtoken.verify(accessToken, getConfig().jwtSecretKey, { algorithms: ['HS256'] });
  } catch {
    return next(new AuthenticationError('Invalid access token'));
  }

  const token = await Token.findOne({ accessToken: hashToken(accessToken), validTill: { $gt: new Date() } });
  if (!token) return next(new AuthenticationError('Invalid access token'));

  const user = await User.findById(token.userId);
  if (!user || user.isDeleted) return next(new AuthenticationError('Invalid access token'));

  req.tokenId = String(token._id);
  req.user = user;

  return next();
};

export default validateAccessToken;
