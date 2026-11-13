import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { Loan, Repayment } from '../model';
import { Logger, Money } from '../util/';
import { ILoanDocument, ILoanRepayment, IUserDocument } from '../type';
import { IPublicLoan } from '../type/LoanRepayment';
import { AuthorizationError, CustomError, NotFoundError } from '../error';
import { RepaymentStatus } from '../model/loan';

/**
 * The public view of a loan. `approvedBy` holds an internal database id and
 * `paymentLockedUntil` is a concurrency lease; neither is part of the API
 * contract. `revision` is a field older versions wrote.
 */
const toPublicLoan = (loan: ILoanDocument): IPublicLoan => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { approvedBy, paymentLockedUntil, revision, ...rest } = loan.toObject() as IPublicLoan & {
    approvedBy?: unknown;
    paymentLockedUntil?: unknown;
    revision?: unknown;
  };
  return rest;
};

export default class LoanController {
  async requestLoan({ user, amount, term }: { user: IUserDocument; amount: number; term: number }): Promise<string> {
    const loan = Loan.build({
      id: randomUUID(),
      userId: user._id,
      amount,
      term,
    });
    const repayments = Money.split(amount, term).map((dueAmount, weeklyInstallmentIndex) => ({
      id: randomUUID(),
      loanId: loan._id,
      dueAmount,
      isLast: weeklyInstallmentIndex === term - 1,
      dueDate: DateTime.utc()
        .plus({ weeks: weeklyInstallmentIndex + 1 })
        .startOf('day')
        .toJSDate(),
    }));

    // Without a replica set there are no multi-document transactions, so write
    // the loan first and remove it again if the schedule cannot be written.
    await loan.save();
    try {
      await Repayment.insertMany(repayments);
    } catch (error) {
      Logger.error('Unable to write repayment schedule, rolling back loan', { loanId: loan.id, err: error });
      await Repayment.deleteMany({ loanId: loan._id });
      await Loan.deleteOne({ _id: loan._id });
      throw error;
    }

    return loan.id;
  }

  async getLoans({ user }: { user: IUserDocument }): Promise<ILoanRepayment[]> {
    const loans = await Loan.find({ userId: user._id }).sort({ createdAt: 1 });
    // One query for all schedules instead of one per loan.
    const repayments = await Repayment.find({ loanId: { $in: loans.map(loan => loan._id) } }).sort({ dueDate: 1 });
    return loans.map(loan => ({
      ...toPublicLoan(loan),
      userId: user.id,
      repayments: repayments
        .filter(repayment => String(repayment.loanId) === String(loan._id))
        .map(repayment => ({ ...repayment.toObject(), loanId: loan.id })),
    }));
  }

  async getLoan({ user, id }: { user: IUserDocument; id: string }): Promise<ILoanRepayment> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() !== user._id.toString()) throw new AuthorizationError();
    const repayments = await Repayment.find({ loanId: loan._id }).sort({ dueDate: 1 });
    return {
      ...toPublicLoan(loan),
      userId: user.id,
      repayments: repayments.map(repayment => ({
        ...repayment.toObject(),
        loanId: loan.id,
      })),
    };
  }

  async approveLoan({ admin, id }: { admin: IUserDocument; id: string }): Promise<void> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    // Compare Mongo ids: `admin.id` is the public UUID and never matched
    // `loan.userId`, which let an admin approve their own loan.
    if (loan.userId.toString() === admin._id.toString()) {
      throw new AuthorizationError('Cannot approve your own loan request');
    }
    if (loan.status !== RepaymentStatus.Pending) {
      throw new AuthorizationError('Cannot approve an already approved or paid loan');
    }

    // Conditional update: two admins approving at once cannot both succeed.
    const result = await Loan.updateOne(
      { _id: loan._id, status: RepaymentStatus.Pending },
      { $set: { status: RepaymentStatus.Approved, approvedBy: admin._id } },
    );
    if (result.modifiedCount !== 1) throw new CustomError('Loan was changed by another request, retry', 409);
  }
}
