import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import jsonwebtoken from 'jsonwebtoken';
import { getConfig } from '../config';
import { AuthenticationError, AuthorizationError, CustomError } from '../error';
import { hashToken, Password } from '../util';
import { Token, User } from '../model';
import { IToken, IUser } from '../type';

const INVALID_CREDENTIALS = 'Invalid email or password';

export default class AuthController {
  async signup({
    email,
    password,
    firstName,
    lastName,
    isAdmin,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    isAdmin?: boolean;
  }): Promise<void> {
    const userEmail = email.trim().toLowerCase();

    const userExists = !!(await User.findOne({ email: userEmail }, { _id: 1 }));
    if (userExists) throw new CustomError('User already exists', 409);

    const userToBeSaved: Partial<IUser> = {
      id: randomUUID(),
      email: userEmail,
      firstName: firstName,
      password: await Password.hashPassword(password),
    };
    if (lastName) userToBeSaved.lastName = lastName;
    if (isAdmin) userToBeSaved.isAdmin = true;

    // A concurrent sign-up with the same email still fails on the unique
    // index; the error handler maps that to 409.
    const user = User.build(userToBeSaved);
    await user.save();
  }

  /**
   * Checks the password first and the role second, so a caller cannot learn
   * whether an email belongs to an admin without knowing its password.
   */
  async signin({
    email,
    password,
    requireAdmin,
  }: {
    email: string;
    password: string;
    requireAdmin?: boolean;
  }): Promise<string> {
    const { jwtSecretKey, userTokenTtlMinutes, adminTokenTtlMinutes } = getConfig();
    const userEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: userEmail });
    if (!user || user.isDeleted) {
      // Spend the same scrypt time as a real check so response timing does
      // not reveal which emails are registered.
      await Password.hashPassword(password);
      throw new AuthenticationError(INVALID_CREDENTIALS);
    }

    const passwordMatches = await Password.comparePassword(user.password, password);
    if (!passwordMatches) throw new AuthenticationError(INVALID_CREDENTIALS);
    if (requireAdmin && !user.isAdmin) throw new AuthorizationError('Admin access required');

    const ttlMinutes = requireAdmin ? adminTokenTtlMinutes : userTokenTtlMinutes;
    const accessToken = jsonwebtoken.sign({ userId: String(user._id) }, jwtSecretKey, {
      algorithm: 'HS256',
      expiresIn: ttlMinutes * 60,
      jwtid: randomUUID(),
    });

    const tokenToBeSaved: Partial<IToken> = {
      id: randomUUID(),
      userId: user._id,
      accessToken: hashToken(accessToken),
      validTill: DateTime.utc().plus({ minutes: ttlMinutes }).toJSDate(),
    };
    await Token.build(tokenToBeSaved).save();

    return accessToken;
  }

  async signoff(tokenId: string): Promise<void> {
    await Token.deleteOne({ _id: tokenId });
  }

  /**
   * Requires the current password, so a stolen access token alone cannot take
   * over the account, and ends every other session of the user.
   */
  async resetPassword({
    userId,
    tokenId,
    storedPassword,
    currentPassword,
    newPassword,
  }: {
    userId: string;
    tokenId: string;
    storedPassword: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const currentMatches = await Password.comparePassword(storedPassword, currentPassword);
    if (!currentMatches) throw new AuthenticationError('Current password is incorrect');

    const sameAsOld = await Password.comparePassword(storedPassword, newPassword);
    if (sameAsOld) throw new CustomError('New password cannot be same as Old password', 403);

    await User.updateOne({ _id: userId }, { password: await Password.hashPassword(newPassword) });
    await Token.deleteMany({ userId, _id: { $ne: tokenId } });
  }
}
