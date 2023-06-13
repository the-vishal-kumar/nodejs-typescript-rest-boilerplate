import { Request, Response, NextFunction } from 'express';
import { ResponseHandler } from '../util';
import { TestDatabaseApp } from '../app';
const { handleAuthentication } = ResponseHandler;

const validateAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(` `)[1];
  if (!token) return handleAuthentication({ res, statusCode: 401, error: new Error('Missing access token') });

  const accessToken = await TestDatabaseApp.findAccessToken({ token });
  if (!accessToken) return handleAuthentication({ res, statusCode: 401, error: new Error('Invalid access token') });

  const user = await TestDatabaseApp.findUser({ id: accessToken.userId });
  if (!user) return handleAuthentication({ res, statusCode: 401 });

  req.accessToken = token;
  req.user = user;

  return next();
};

export default validateAccessToken;
