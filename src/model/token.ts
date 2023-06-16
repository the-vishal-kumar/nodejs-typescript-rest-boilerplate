import { model, Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { IToken, ITokenDocument, ITokenModel } from '../type';

const tokenSchema = new Schema(
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
    accessToken: {
      type: Schema.Types.String,
      required: true,
      unique: true,
      index: true,
    },
    validTill: {
      type: Schema.Types.Date,
      required: true,
    },
    createdAt: Schema.Types.Number,
    updatedAt: Schema.Types.Number,
  },
  {
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: (): number => Math.floor(Date.now() / 1000) },
  },
);

tokenSchema.statics.build = (attr: IToken): unknown => new Token(attr);

const Token = model<ITokenDocument, ITokenModel>('Token', tokenSchema);

export default Token;
