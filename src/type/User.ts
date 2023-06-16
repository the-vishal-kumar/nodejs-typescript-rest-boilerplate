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

export interface IUserDocument extends Document {
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
