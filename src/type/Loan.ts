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
}

export interface ILoanDocument extends Document {
  id: string;
  loanId: string;
  userId: string;
  // userUuid: string;
  amount: number;
  term: number;
  status: string;
  approvedBy: string;
}

export interface ILoanModel extends Model<ILoanDocument> {
  build(attr: Partial<ILoan>): ILoanDocument;
}
