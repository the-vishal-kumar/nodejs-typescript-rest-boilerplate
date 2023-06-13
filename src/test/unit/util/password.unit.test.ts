import { Password } from '../../../util';

describe('Password', () => {
  describe('hashPassword', () => {
    test('should return a hashed password with salt', async () => {
      const password = 'myPassword123';
      const hashedPassword = await Password.hashPassword(password);
      expect(hashedPassword).toMatch(/^[0-9a-fA-F]+\.[0-9a-fA-F]+$/);
    });

    test('should throw an error for an empty password', async () => {
      const password = '';
      await expect(Password.hashPassword(password)).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    test('should return true for a valid password', async () => {
      const password = 'myPassword123';
      const hashedPassword = await Password.hashPassword(password);
      const isMatch = await Password.comparePassword(hashedPassword, password);
      expect(isMatch).toBe(true);
    });

    test('should return false for an invalid password', async () => {
      const password = 'myPassword123';
      const wrongPassword = 'wrongPassword123';
      const hashedPassword = await Password.hashPassword(password);
      const isMatch = await Password.comparePassword(hashedPassword, wrongPassword);
      expect(isMatch).toBe(false);
    });

    test('should throw an error for an empty password', async () => {
      const password = '';
      const hashedPassword = await Password.hashPassword('myPassword123');
      await expect(Password.comparePassword(hashedPassword, password)).rejects.toThrow();
    });

    test('should throw an error for an invalid hashed password', async () => {
      const password = 'myPassword123';
      const hashedPassword = 'invalidHashedPassword';
      await expect(Password.comparePassword(hashedPassword, password)).rejects.toThrow();
    });
  });
});
