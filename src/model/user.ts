import { model, Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { IUser, IUserDocument, IUserModel } from '../type';

const userSchema = new Schema(
  {
    id: {
      type: Schema.Types.UUID,
      default: uuid(),
      unique: true,
      index: true,
    },
    firstName: {
      type: Schema.Types.String,
      required: true,
      index: true,
    },
    lastName: {
      type: Schema.Types.String,
      default: '',
      index: true,
      sparse: true,
    },
    email: {
      type: Schema.Types.String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: Schema.Types.String,
      required: true,
    },
    isAdmin: {
      type: Schema.Types.Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Schema.Types.Boolean,
      default: false,
      index: true,
    },
    createdAt: Schema.Types.Number,
    updatedAt: Schema.Types.Number,
  },
  {
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: (): number => Math.floor(Date.now() / 1000) },
  },
);

userSchema.statics.build = (attr: IUser): unknown => new User(attr);

const User = model<IUserDocument, IUserModel>('User', userSchema);

export default User;
