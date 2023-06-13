import jsonwebtoken, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

import { Password } from '../util';
import { CustomError } from '../error';
import { IAccessToken, IUser } from '../type';

const { sign, verify } = jsonwebtoken;
const { JWT_SECRET_KEY } = process.env;

class TestDatabase {
  static instance: TestDatabase;
  users: IUser[];
  accessTokens: IAccessToken[];

  constructor() {
    this.users = [];
    this.accessTokens = [];
  }

  async reset(): Promise<void> {
    this.users = [];
    this.accessTokens = [];
  }

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) TestDatabase.instance = new TestDatabase();
    return TestDatabase.instance;
  }

  async userExists(email: string): Promise<void> {
    const userEmail = email.trim().toLowerCase();
    const userExists = this.users.some(({ email }) => email === userEmail);
    if (userExists) throw new CustomError('User already exists', 409);
  }

  async createUser(email: string, password: string): Promise<void> {
    const userEmail = email.trim().toLowerCase();
    const user: IUser = {
      id: uuid(),
      email: userEmail,
      password: await Password.hashPassword(password),
      created: Date.now(),
      updated: Date.now(),
    };
    this.users.push(user);
  }

  async findUser(criteria: Partial<IUser>, projection?: (keyof IUser)[]): Promise<Partial<IUser> | null> {
    if (criteria.email) {
      criteria.email = criteria.email.trim().toLowerCase();
    }
    const keysToInclude = projection ? new Set([...projection, 'id']) : null;
    const user: Partial<IUser> | undefined = this.users.find((user: Partial<IUser>) => {
      for (const key in criteria) {
        if (criteria.hasOwnProperty(key) && user[key as keyof Partial<IUser>] !== criteria[key as keyof Partial<IUser>])
          return false;
      }
      return true;
    });

    if (user) {
      const userProjection: Partial<IUser> = {};
      const keys: (keyof Partial<IUser>)[] = projection
        ? [...(keysToInclude as Set<keyof IUser>)]
        : (Object.keys(user) as (keyof IUser)[]);
      for (const key of keys) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (key !== 'password') userProjection[key] = user[key];
      }
      return userProjection;
    }

    return null;
  }

  async updateUser(criteria: Partial<IUser>, updates: Partial<IUser>): Promise<void> {
    const user = await this.findUser(criteria);
    const userIndex = this.users.findIndex(dbUser => dbUser.id === (user as IUser).id);
    if (userIndex === -1) throw new CustomError('User not found', 404);

    let updatesToBeWritten = updates;
    delete updatesToBeWritten.id;
    delete updatesToBeWritten.created;
    if (updates.hasOwnProperty('password')) {
      updatesToBeWritten = {
        ...updates,
        password: await Password.hashPassword(updates.password as string),
      };
    }

    const updatedUser: IUser = {
      ...this.users[userIndex],
      ...updatesToBeWritten,
      updated: Date.now(),
    };

    this.users[userIndex] = updatedUser;
  }

  async findUsers(criteria: Partial<IUser>, projection: (keyof IUser)[]): Promise<Partial<IUser>[]> {
    if (criteria.email) {
      criteria.email = criteria.email.trim().toLowerCase();
    }
    const keysToInclude = projection ? new Set([...projection, 'id']) : null;
    const users: Partial<IUser>[] = this.users.filter(user => {
      for (const key in criteria) {
        if (criteria.hasOwnProperty(key) && user[key as keyof Partial<IUser>] !== criteria[key as keyof Partial<IUser>])
          return false;
      }
      return true;
    });

    return users.map(user => {
      const keys: (keyof Partial<IUser>)[] = projection
        ? [...(keysToInclude as Set<keyof IUser>)]
        : (Object.keys(user) as (keyof IUser)[]);
      const result: Partial<IUser> = {};
      for (const key of keys) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (key !== 'password') result[key] = user[key];
      }
      return result;
    });
  }

  async comparePassword(criteria: Partial<IUser>, suppliedPassword: string): Promise<void> {
    if (criteria.email) {
      criteria.email = criteria.email.trim().toLowerCase();
    }
    const user: Partial<IUser> | undefined = this.users.find((user: Partial<IUser>) => {
      for (const key in criteria) {
        if (criteria.hasOwnProperty(key) && user[key as keyof Partial<IUser>] !== criteria[key as keyof Partial<IUser>])
          return false;
      }
      return true;
    });
    if (!user) throw new CustomError('Invalid email or password', 401);
    const passwordMatches = await Password.comparePassword(user.password as string, suppliedPassword);
    if (!passwordMatches) throw new CustomError('Invalid email or password', 401);
  }

  async generateAccessToken(userId: string, expiresIn = '365d'): Promise<string> {
    const token = sign({ userId }, JWT_SECRET_KEY as string, { expiresIn });
    const accessToken: IAccessToken = {
      id: uuid(),
      userId,
      token,
      created: Date.now(),
      updated: Date.now(),
    };
    this.accessTokens.push(accessToken);
    return token;
  }

  async findAccessToken(
    criteria: Partial<IAccessToken>,
    projection?: (keyof IAccessToken)[],
  ): Promise<Partial<IAccessToken> | null> {
    const keysToInclude = projection ? new Set([...projection, 'id', 'token']) : null;
    const accessToken: Partial<IAccessToken> | undefined = this.accessTokens.find(accessToken => {
      for (const key in criteria) {
        if (
          criteria.hasOwnProperty(key) &&
          accessToken[key as keyof Partial<IAccessToken>] !== criteria[key as keyof Partial<IAccessToken>]
        )
          return false;
      }
      return true;
    });

    if (accessToken) {
      const accessTokenProjection: Partial<IAccessToken> = {};
      const keys: (keyof Partial<IAccessToken>)[] = projection
        ? [...(keysToInclude as Set<keyof IAccessToken>)]
        : (Object.keys(accessToken) as (keyof IAccessToken)[]);
      for (const key of keys) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        accessTokenProjection[key] = accessToken[key];
      }
      return accessTokenProjection;
    }

    return null;
  }

  async invalidateAccessToken(suppliedToken: string): Promise<void> {
    const tokenIndex = this.accessTokens.findIndex(({ token }) => token === suppliedToken);
    if (tokenIndex !== -1) this.accessTokens.splice(tokenIndex, 1);
  }

  verifyAccessToken(token: string): boolean {
    const decoded = verify(token, JWT_SECRET_KEY as string) as JwtPayload;
    return !!decoded.userId;
  }
}

export default TestDatabase.getInstance();
