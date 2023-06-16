import { model, Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { ILoan, ILoanDocument, ILoanModel } from '../type';
import { Enum } from '../util';

export const RepaymentStatus = Enum({
  Approved: 'APPROVED',
  Paid: 'PAID',
  Pending: 'PENDING',
});

const loanSchema = new Schema(
  {
    id: {
      type: Schema.Types.UUID,
      default: uuid(),
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // userUuid: {
    //   type: Schema.Types.UUID,
    //   required: true,
    //   index: true,
    // },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      index: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (value: any): number => parseFloat(value.toString()),
    },
    term: {
      type: Schema.Types.Number,
      required: true,
      index: true,
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(RepaymentStatus),
      default: RepaymentStatus.Pending,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    createdAt: Schema.Types.Number,
    updatedAt: Schema.Types.Number,
  },
  {
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: (): number => Math.floor(Date.now() / 1000) },
  },
);

loanSchema.set('toObject', { getters: true });
loanSchema.statics.build = (attr: ILoan): unknown => new Loan(attr);

const Loan = model<ILoanDocument, ILoanModel>('Loan', loanSchema);

export default Loan;
