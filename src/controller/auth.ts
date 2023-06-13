import { TestDatabaseApp } from '../app';
import { CustomError } from '../error';

export default class AuthController {
  async signup(email: string, password: string): Promise<void> {
    await TestDatabaseApp.userExists(email);
    await TestDatabaseApp.createUser(email, password);
  }

  async signin(email: string, password: string): Promise<string> {
    const user = await TestDatabaseApp.findUser({ email }, []);
    if (!user) throw new CustomError('Invalid email or password', 401);
    await TestDatabaseApp.comparePassword({ email }, password);
    const token = TestDatabaseApp.generateAccessToken(user.id as string);
    return token;
  }

  async signoff(token: string): Promise<void> {
    await TestDatabaseApp.invalidateAccessToken(token);
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    await TestDatabaseApp.updateUser({ id: userId }, { password });
  }
}
