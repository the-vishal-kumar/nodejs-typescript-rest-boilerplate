import { Document, Model } from 'mongoose';

export interface IToken {
  id: string;
  userId: string;
  accessToken: string;
  validTill: Date;
}

export interface ITokenDocument extends Document {
  id: string;
  userId: string;
  accessToken: string;
  validTill: Date;
}

export interface ITokenModel extends Model<ITokenDocument> {
  build(attr: Partial<IToken>): ITokenDocument;
}
