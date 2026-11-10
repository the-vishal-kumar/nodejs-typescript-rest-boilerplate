import { ILoan } from './Loan';
import { IRepayment, IRepaymentDocument } from './Repayment';

// Repayments in API responses come from `document.toObject()`, so `dueDate`
// carries the stored (document) type rather than the `Date` accepted on input.
export type IRepaymentResponse = Omit<IRepayment, 'dueDate'> & { dueDate: IRepaymentDocument['dueDate'] };

export interface ILoanRepayment extends ILoan {
  repayments: IRepaymentResponse[];
}
