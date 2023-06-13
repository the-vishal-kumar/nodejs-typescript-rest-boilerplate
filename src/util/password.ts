import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export default class Password {
  static async hashPassword(password: string): Promise<string> {
    if (!password) throw new Error('Password cannot be empty');
    const salt = randomBytes(16).toString('hex');
    const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buffer.toString('hex')}.${salt}`;
  }

  static async comparePassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
    if (!storedPassword || !suppliedPassword) throw new Error('Password cannot be empty');
    const [hashedPassword, salt] = storedPassword.split('.');
    const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
}
