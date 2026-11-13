import { AuthorizationError, CustomError, NotFoundError } from '../error';
import { Loan, Repayment, RepaymentStatus } from '../model';
import { IUserDocument } from '../type';
import { Money } from '../util';

/** Longer than any request should take; frees the loan if a process dies mid-payment. */
const PAYMENT_LEASE_MS = 30_000;

export default class RepaymentController {
  /**
   * Applies `amount` to the oldest pending instalments first. Paying more than
   * the next instalment pays ahead; the loan becomes PAID with the last one.
   *
   * Concurrency: MongoDB without a replica set has no multi-document
   * transactions, so the payment first claims a short lease on the loan with a
   * conditional update. Only one request can hold it; a concurrent payment
   * gets 409. The schedule is read after the claim, so it always reflects the
   * previous payment, and the lease is released when the writes are done.
   */
  async makePayment({ user, id, amount }: { user: IUserDocument; id: string; amount: number }): Promise<void> {
    const loan = await Loan.findOne({ id });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.userId.toString() !== user._id.toString()) throw new AuthorizationError();
    if (loan.status !== RepaymentStatus.Approved) {
      throw new AuthorizationError('Cannot make payment on Pending or Paid loan');
    }
    if (amount > loan.amount) throw new AuthorizationError('Cannot make a payment more than loan amount');

    const now = new Date();
    const claimed = await Loan.updateOne(
      {
        _id: loan._id,
        status: RepaymentStatus.Approved,
        $or: [{ paymentLockedUntil: null }, { paymentLockedUntil: { $lt: now } }],
      },
      { $set: { paymentLockedUntil: new Date(now.getTime() + PAYMENT_LEASE_MS) } },
    );
    if (claimed.modifiedCount !== 1) throw new CustomError('Loan was changed by another request, retry', 409);

    let paidOff = false;
    try {
      const repayments = (await Repayment.find({ loanId: loan._id }))
        .filter(repayment => repayment.status === RepaymentStatus.Pending)
        .sort((a, b) => new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf());
      if (!repayments.length) throw new AuthorizationError('Loan has no pending repayments');
      if (amount < repayments[0].dueAmount) {
        throw new AuthorizationError('Cannot make a payment less than due amount');
      }

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

      await Repayment.bulkSave(repayments);
      paidOff = repayments.every(repayment => repayment.status === RepaymentStatus.Paid);
    } finally {
      await Loan.updateOne(
        { _id: loan._id },
        { $set: { paymentLockedUntil: null, ...(paidOff ? { status: RepaymentStatus.Paid } : {}) } },
      );
    }
  }
}
