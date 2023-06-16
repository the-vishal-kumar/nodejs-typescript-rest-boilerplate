import { ILoan } from './Loan';
import { IRepayment } from './Repayment';

export interface ILoanRepayment extends ILoan {
  repayments: IRepayment[];
}
