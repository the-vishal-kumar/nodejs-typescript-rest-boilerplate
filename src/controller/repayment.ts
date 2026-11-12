import { AuthorizationError, CustomError, NotFoundError } from '../error';
import { Loan, Repayment, RepaymentStatus } from '../model';
import { IUserDocument } from '../type';
import { Money } from '../util';

export default class RepaymentController {
  /**
   * Applies `amount` to the oldest pending instalments first. Paying more than
   * the next instalment pays ahead; the loan becomes PAID with the last one.
   */
  async makePayment({ user, id, amount }: { user: IUserDocument; id: string; amount: number }): Promise<void> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() !== user._id.toString()) throw new AuthorizationError();
    if (loan.status !== RepaymentStatus.Approved) {
      throw new AuthorizationError('Cannot make payment on Pending or Paid loan');
    }
    if (amount > loan.amount) throw new AuthorizationError('Cannot make a payment more than loan amount');

    const repayments = (await Repayment.find({ loanId: loan._id }))
      .filter(repayment => repayment.status === RepaymentStatus.Pending)
      .sort((a, b) => new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf());
    if (!repayments.length) throw new AuthorizationError('Loan has no pending repayments');
    if (amount < repayments[0].dueAmount) throw new AuthorizationError('Cannot make a payment less than due amount');

    let amountReceived = amount;
    for (const repayment of repayments) {
      if (amountReceived <= 0) break;
      const payment = Math.min(amountReceived, repayment.dueAmount);
      amountReceived = Money.subtract(amountReceived, payment);
      repayment.paidAmount = Money.add(repayment.paidAmount, payment);
      repayment.dueAmount = Money.subtract(repayment.dueAmount, payment);
      if (repayment.dueAmount === 0) repayment.status = RepaymentStatus.Paid;
    }
    if (amountReceived > 0) throw new AuthorizationError('Cannot make a payment more than total due amount');

    // Claim the loan revision we read. A concurrent payment that read the same
    // revision loses here and gets 409 instead of applying the money twice.
    // Loans created before `revision` existed have no such field (Mongoose
    // reports the default 0), hence the `null` match for revision 0.
    const revision = loan.revision ? loan.revision : { $in: [null, 0] };
    const claimed = await Loan.updateOne(
      { _id: loan._id, status: RepaymentStatus.Approved, revision },
      { $inc: { revision: 1 } },
    );
    if (claimed.modifiedCount !== 1) throw new CustomError('Loan was changed by another request, retry', 409);

    await Repayment.bulkSave(repayments);

    const allPaid = repayments.every(repayment => repayment.status === RepaymentStatus.Paid);
    if (allPaid) await Loan.updateOne({ _id: loan._id }, { $set: { status: RepaymentStatus.Paid } });
  }
}
