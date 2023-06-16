import { IUserDocument } from '../User';

export {};

declare global {
  namespace Express {
    export interface Request {
      requestId: string;
      tokenId?: string;
      user?: IUserDocument;
    }
  }
}
