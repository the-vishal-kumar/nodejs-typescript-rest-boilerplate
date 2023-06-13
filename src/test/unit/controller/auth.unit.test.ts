import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { AuthController } from '../../../controller';
import { TestDatabaseApp } from '../../../app';
import { CustomError } from '../../../error';

describe('AuthController', () => {
  let authController: AuthController;

  beforeAll(() => {
    authController = new AuthController();
  });

  afterEach(async () => {
    await TestDatabaseApp.reset();
  });

  describe('signup', () => {
    const email = 'test@example.com',
      password = 'password123';
    it('should create a new user when email is not already registered', async () => {
      await authController.signup(email, password);
      const user = await TestDatabaseApp.findUser({ email });
      expect(user).toBeDefined();
      expect(user?.email).toEqual(email);
    });

    it('should throw an error when email is already registered', async () => {
      await authController.signup(email, password);
      await expect(authController.signup(email, password)).rejects.toThrowError(
        new CustomError('User already exists', 409),
      );
    });
  });

  describe('signin', () => {
    const email = 'test@example.com',
      password = 'password123';

    beforeAll(async () => {
      await authController.signup(email, password);
    });

    it('should return an access token when email and password are valid', async () => {
      const token = await authController.signin(email, password);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should throw an error when email is not signed up', async () => {
      const invalidEmail = 'invalid@example.com';
      await expect(authController.signin(invalidEmail, password)).rejects.toThrowError(
        new CustomError('Invalid email or password', 401),
      );
    });

    it('should throw an error when password is invalid', async () => {
      const invalidPassword = 'wrongPassword';
      await expect(authController.signin(email, invalidPassword)).rejects.toThrowError(
        new CustomError('Invalid email or password', 401),
      );
    });
  });

  describe('signoff', () => {
    const email = 'test@example.com',
      password = 'password123';
    let token: string;

    beforeAll(async () => {
      await authController.signup(email, password);
      token = await authController.signin(email, password);
    });

    it('should invalidate the access token', async () => {
      await authController.signoff(token);

      const accessToken = await TestDatabaseApp.findAccessToken({ token });
      expect(accessToken).toBeNull();
    });
  });

  describe('resetPassword', () => {
    const email = 'test@example.com',
      password = 'password123';

    beforeAll(async () => {
      await authController.signup(email, password);
    });

    it('should update the user password', async () => {
      const newPassword = 'newPassword123';
      const user = await TestDatabaseApp.findUser({ email });
      await authController.resetPassword(user?.id as string, newPassword);
      await expect(() => TestDatabaseApp.comparePassword({ email }, newPassword)).not.toThrowError();
    });
  });
});
