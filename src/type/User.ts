import { Document, Model } from 'mongoose';

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

// Mongoose 8 types `_id` as ObjectId by default; keep the Mongoose 7 (`any`) typing
// because ids are passed around as strings in controllers and JWT payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IUserDocument extends Document<any> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isAdmin: boolean;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IUserModel extends Model<IUserDocument> {
  build(attr: Partial<IUser>): IUserDocument;
}
