import { model, Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { IRepayment, IRepaymentDocument, IRepaymentModel } from '../type';
import { RepaymentStatus } from './loan';

const repaymentSchema = new Schema(
  {
    id: {
      type: Schema.Types.UUID,
      default: uuid(),
      unique: true,
      index: true,
    },
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // loanUuid: {
    //   type: Schema.Types.UUID,
    //   required: true,
    //   index: true,
    // },
    dueAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      index: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (value: any): number => parseFloat(value.toString()),
    },
    paidAmount: {
      type: Schema.Types.Decimal128,
      default: 0,
      index: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (value: any): number => parseFloat(value.toString()),
    },
    isLast: {
      type: Schema.Types.Boolean,
      default: false,
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(RepaymentStatus),
      default: RepaymentStatus.Pending,
      index: true,
    },
    dueDate: {
      type: Schema.Types.Number,
      set: (dateTime: Date): number => Math.floor(new Date(dateTime).valueOf() / 1000),
      get: (timeStamp: number): string => new Date(timeStamp * 1000).toISOString(),
    },
    createdAt: Schema.Types.Number,
    updatedAt: Schema.Types.Number,
  },
  {
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: (): number => Math.floor(Date.now() / 1000) },
  },
);

repaymentSchema.set('toObject', { getters: true });
repaymentSchema.statics.build = (attr: IRepayment): unknown => new Repayment(attr);

const Repayment = model<IRepaymentDocument, IRepaymentModel>('Repayment', repaymentSchema);

export default Repayment;
