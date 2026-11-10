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

// Mongoose 8 types `_id` as ObjectId by default; keep the Mongoose 7 (`any`) typing
// because ids are passed around as strings in controllers and JWT payloads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRepaymentDocument extends Document<any> {
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
