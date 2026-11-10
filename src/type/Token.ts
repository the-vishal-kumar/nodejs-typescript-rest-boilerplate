import { Document, Model } from 'mongoose';

export interface IToken {
  id: string;
  userId: string;
  accessToken: string;
  validTill: Date;
}

// Mongoose 8 types `_id` as ObjectId by default; keep the Mongoose 7 (`any`) typing
// because ids are passed around as strings in controllers and JWT payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ITokenDocument extends Document<any> {
  id: string;
  userId: string;
  accessToken: string;
  validTill: Date;
}

export interface ITokenModel extends Model<ITokenDocument> {
  build(attr: Partial<IToken>): ITokenDocument;
}
