import { randomUUID } from 'node:crypto';
import { Express } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp, connectMongo, disconnectMongo } from '../../app';
import { getConfig, loadConfig } from '../../config';

/**
 * Each test file gets its own database, created on start and dropped on
 * finish, so suites are isolated and can be re-run against the same server.
 */
export const useTestApp = (envOverrides: Record<string, string> = {}): { app: () => Express } => {
  let app: Express;

  beforeAll(async () => {
    const url = new URL(getConfig().mongoUri);
    url.pathname = `/ntrb-e2e-${randomUUID().slice(0, 8)}`;
    await connectMongo(url.toString());
    app = createApp(loadConfig({ ...process.env, ...envOverrides }));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectMongo();
  });

  return { app: () => app };
};

let counter = 0;
export const uniqueEmail = (prefix: string): string => `${prefix}-${Date.now()}-${counter++}@example.com`;

export const PASSWORD = 'password123';

export const createUser = async (
  app: Express,
  { admin = false, email = uniqueEmail(admin ? 'admin' : 'user') }: { admin?: boolean; email?: string } = {},
): Promise<{ email: string; token: string }> => {
  await request(app)
    .post(admin ? '/auth/signup/admin' : '/auth/signup')
    .send({ email, password: PASSWORD, firstName: admin ? 'Admin' : 'User' })
    .expect(204);
  const signin = await request(app)
    .post(admin ? '/auth/signin/admin' : '/auth/signin')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { email, token: signin.body.data.accessToken };
};

export const requestLoan = async (app: Express, token: string, amount = 22, term = 7): Promise<string> => {
  const response = await request(app)
    .post('/loan')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount, term })
    .expect(201);
  return response.body.data.id;
};

export const approveLoan = async (app: Express, adminToken: string, loanId: string): Promise<void> => {
  await request(app).put(`/loan/${loanId}/approve`).set('Authorization', `Bearer ${adminToken}`).expect(204);
};
