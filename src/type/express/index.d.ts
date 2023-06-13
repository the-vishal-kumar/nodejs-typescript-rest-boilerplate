import { User } from '../IUser';

export {};

declare global {
  namespace Express {
    export interface Request {
      requestId: string;
      accessToken?: string;
      user?: Partial<User>;
    }
  }
}
