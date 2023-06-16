import { v4 as uuid } from 'uuid';
import { DateTime } from 'luxon';
import jsonwebtoken from 'jsonwebtoken';
import { AuthenticationError, CustomError } from '../error';
import { Password } from '../util';
import { Token, User } from '../model';
const { sign } = jsonwebtoken;
const { JWT_SECRET_KEY } = process.env;
import { IToken, IUser } from '../type';

export default class AuthController {
  async signup({
    email,
    password,
    firstName,
    lastName,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
  }): Promise<void> {
    const userEmail = email.trim().toLowerCase();

    const userExists = !!(await User.findOne({ email: userEmail }, { _id: 1 }));
    if (userExists) throw new CustomError('User already exists', 409);

    const userToBeSaved: Partial<IUser> = {
      id: uuid(),
      email: userEmail,
      firstName: firstName,
      password: await Password.hashPassword(password),
    };
    if (lastName) userToBeSaved.lastName = lastName;

    const user = User.build(userToBeSaved);
    await user.save();
  }

  async signin(email: string, password: string, isAdmin = false): Promise<string> {
    const userEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: userEmail });
    if (!user) throw new AuthenticationError('Invalid email or password');

    const passwordMatches = await Password.comparePassword(user.password, password);
    if (!passwordMatches) throw new AuthenticationError('Invalid email or password');

    const userId = user._id;
    let accessToken = sign({ userId }, JWT_SECRET_KEY as string, { expiresIn: '1d' });
    if (isAdmin) accessToken = sign({ userId }, JWT_SECRET_KEY as string, { expiresIn: '20m' });

    const tokenToBeSaved: Partial<IToken> = {
      id: uuid(),
      userId,
      accessToken,
      validTill: DateTime.utc().plus({ minutes: 20 }).toJSDate(),
    };
    const token = Token.build(tokenToBeSaved);
    await token.save();

    return token.accessToken;
  }

  async signoff(tokenId: string): Promise<void> {
    await Token.deleteOne({ _id: tokenId });
  }

  async resetPassword(userId: string, storedPassword: string, suppliedPassword: string): Promise<void> {
    const newPassword = await Password.hashPassword(suppliedPassword);
    const passwordMatches = await Password.comparePassword(storedPassword, suppliedPassword);
    if (passwordMatches) throw new CustomError('New password cannot be same as Old password', 403);
    await User.updateOne({ _id: userId }, { password: newPassword });
  }
}
