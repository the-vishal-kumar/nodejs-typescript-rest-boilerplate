import { ILoan } from './Loan';
import { IRepayment, IRepaymentDocument } from './Repayment';

// Repayments in API responses come from `document.toObject()`, so `dueDate`
// carries the stored (document) type rather than the `Date` accepted on input.
export type IRepaymentResponse = Omit<IRepayment, 'dueDate'> & { dueDate: IRepaymentDocument['dueDate'] };

// `approvedBy` (an internal id) and `paymentLockedUntil` (a concurrency lease)
// are never sent to clients.
export type IPublicLoan = Omit<ILoan, 'approvedBy' | 'paymentLockedUntil'>;

export interface ILoanRepayment extends IPublicLoan {
  repayments: IRepaymentResponse[];
}
