import { Document, Model } from 'mongoose';

export interface ILoan {
  id: string;
  loanId: string;
  userId: string;
  // userUuid: string;
  amount: number;
  term: number;
  status: string;
  approvedBy: string;
  revision: number;
}

// Mongoose 8 types `_id` as ObjectId by default; keep the Mongoose 7 (`any`) typing
// because ids are passed around as strings in controllers and JWT payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ILoanDocument extends Document<any> {
  id: string;
  loanId: string;
  userId: string;
  // userUuid: string;
  amount: number;
  term: number;
  status: string;
  approvedBy: string;
  revision: number;
}

export interface ILoanModel extends Model<ILoanDocument> {
  build(attr: Partial<ILoan>): ILoanDocument;
}
