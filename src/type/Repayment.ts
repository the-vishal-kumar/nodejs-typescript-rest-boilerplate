import { Document, Model } from 'mongoose';

export interface IRepayment {
  id: string;
  loanId: string;
  // loanUuid: string;
  dueAmount: number;
  paidAmount: number;
  isLast: boolean;
  status: string;
  dueDate: Date;
}

export interface IRepaymentDocument extends Document {
  id: string;
  loanId: string;
  // loanUuid: string;
  dueAmount: number;
  paidAmount: number;
  isLast: boolean;
  status: string;
  dueDate: number;
}

export interface IRepaymentModel extends Model<IRepaymentDocument> {
  build(attr: Partial<IRepayment>): IRepaymentDocument;
}
