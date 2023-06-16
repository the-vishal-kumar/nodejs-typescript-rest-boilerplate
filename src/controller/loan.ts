// import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import { Loan, Repayment } from '../model';
import { Logger, Money } from '../util/';
import { ILoanRepayment, IUserDocument } from '../type';
import { AuthorizationError, NotFoundError } from '../error';
import { RepaymentStatus } from '../model/loan';

export default class LoanController {
  async requestLoan({ user, amount, term }: { user: IUserDocument; amount: number; term: number }): Promise<string> {
    // const session = await mongoose.startSession();
    try {
      // session.startTransaction();
      const loan = Loan.build({
        id: uuid(),
        userId: user._id,
        amount,
        term,
      });
      const repayments = Money.split(amount, term).map((dueAmount, weeklyInstallmentIndex) =>
        Repayment.build({
          id: uuid(),
          loanId: loan._id,
          dueAmount,
          isLast: weeklyInstallmentIndex === term - 1,
          dueDate: DateTime.utc()
            .plus({ weeks: weeklyInstallmentIndex + 1 })
            .startOf('day')
            .toJSDate(),
        }),
      );
      const promises: Promise<unknown>[] = [
        loan.save({
          // session
        }),
      ];
      repayments.forEach(repayment => {
        promises.push(
          repayment.save({
            // session
          }),
        );
      });
      await Promise.all(promises);
      // await session.commitTransaction();
      // await session.endSession();

      return loan.id;
    } catch (error) {
      // await session.abortTransaction();
      // await session.endSession();
      Logger.error('Unable to raise a loan request:- ', error);
      throw new Error('Unable to raise a loan request');
    }
  }

  async getLoans({ user }: { user: IUserDocument }): Promise<ILoanRepayment[]> {
    const loans = await Loan.find({ userId: user._id });
    const repaymentPromises = loans.map(loan => Repayment.find({ loanId: loan._id }));
    const repayments = await Promise.all(repaymentPromises);
    return loans.map((loan, index) => ({
      ...loan.toObject(),
      userId: user.id,
      repayments: repayments[index].map(repayment => ({
        ...repayment.toObject(),
        loanId: loan.id,
      })),
    }));
  }

  async getLoan({ user, id }: { user: IUserDocument; id: string }): Promise<ILoanRepayment> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() !== user._id.toString()) throw new AuthorizationError();
    const repayments = await Repayment.find({ loanId: loan._id });
    return {
      ...loan.toObject(),
      userId: user.id,
      repayments: repayments.map(repayment => ({
        ...repayment.toObject(),
        loanId: loan.id,
      })),
    };
  }

  async approveLoan({ adminId, id }: { adminId: string; id: string }): Promise<void> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() === adminId) throw new AuthorizationError('Cannot approve your own loan request');
    if (loan.status !== RepaymentStatus.Pending)
      throw new AuthorizationError('Cannot approve an already approved or paid loan');
    loan.status = RepaymentStatus.Approved;
    await loan.save();
  }
}
