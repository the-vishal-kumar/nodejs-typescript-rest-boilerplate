// import mongoose from 'mongoose';
import { AuthorizationError, NotFoundError } from '../error';
import { Loan, Repayment, RepaymentStatus } from '../model';
import { IUserDocument } from '../type';
import { Logger, Money } from '../util';

export default class RepaymentController {
  async makePayment({ user, id, amount }: { user: IUserDocument; id: string; amount: number }): Promise<void> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() !== user._id.toString()) throw new AuthorizationError();
    if (loan.status !== RepaymentStatus.Approved)
      throw new AuthorizationError('Cannot make payment on Pending or Paid loan');
    if (amount > loan.amount) throw new AuthorizationError('Cannot make a payment more than loan amount');
    const repayments = (await Repayment.find({ loanId: loan._id }))
      .filter(repayment => repayment.status === RepaymentStatus.Pending)
      .sort((a, b) => new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf());
    if (amount < repayments[0].dueAmount) throw new AuthorizationError('Cannot make a payment less than due amount');

    // const session = await mongoose.startSession();
    try {
      // session.startTransaction();
      let lastRepayment;
      let amountReceived = amount;
      for (let index = 0; index < repayments.length; index++) {
        if (amountReceived > 0) {
          const payment = amountReceived > repayments[index].dueAmount ? repayments[index].dueAmount : amountReceived;
          amountReceived = Money.subtract(amountReceived, payment);
          repayments[index].paidAmount = Money.add(repayments[index].paidAmount, payment);
          repayments[index].dueAmount = Money.subtract(repayments[index].dueAmount, payment);
          repayments[index].status =
            repayments[index].dueAmount === 0 ? RepaymentStatus.Paid : repayments[index].status;
          if (repayments[index].isLast) lastRepayment = repayments[index];
        }
      }
      if (amountReceived) throw new AuthorizationError('Cannot make a payment more than total due amount');
      await Repayment.bulkSave(repayments);
      if (lastRepayment && lastRepayment.isLast && lastRepayment.status === RepaymentStatus.Paid) {
        loan.status = RepaymentStatus.Paid;
        await loan.save({
          // session
        });
      }
      // await session.commitTransaction();
      // await session.endSession();
    } catch (error) {
      // await session.abortTransaction();
      // await session.endSession();
      Logger.error('Payment failed:- ', error);
      const err = error as Error;
      throw new AuthorizationError(err.message);
    }
  }
}
