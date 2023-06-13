import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import { NodeApp } from '../../app';
import { IncomingMessage, Server, ServerResponse } from 'http';

describe('Authentication Endpoints', () => {
  let app: NodeApp;
  let server: Server<typeof IncomingMessage, typeof ServerResponse>;

  beforeAll(async () => {
    app = new NodeApp();
    server = await app.start(5000);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should signup a new user', async () => {
    const email = 'test-signup@example.com',
      password = 'password123';
    await request(app.expressApp).post('/auth/signup').send({ email, password }).expect(204);
  });

  it('should signin and return an access token', async () => {
    const email = 'test-signin@example.com',
      password = 'password123';
    await request(app.expressApp).post('/auth/signup').send({ email, password });

    const response = await request(app.expressApp).post('/auth/signin').send({ email, password }).expect(200);
    expect(response.body.data).toHaveProperty('accessToken');
  });

  it('should signoff and return a success message', async () => {
    const email = 'test-signoff@example.com',
      password = 'password123';
    await request(app.expressApp).post('/auth/signup').send({ email, password });

    const signinResponse = await request(app.expressApp).post('/auth/signin').send({ email, password }).expect(200);
    const accessToken = signinResponse.body.data.accessToken;

    await request(app.expressApp).post('/auth/signoff').set('Authorization', `Bearer ${accessToken}`).expect(204);
  });

  it('should reset the password', async () => {
    const email = 'test-reset-password@example.com',
      password = 'password123';
    await request(app.expressApp).post('/auth/signup').send({ email, password });

    const signinResponse = await request(app.expressApp).post('/auth/signin').send({ email, password }).expect(200);
    const accessToken = signinResponse.body.data.accessToken;

    await request(app.expressApp)
      .post('/auth/password/reset')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'newPassword123' })
      .expect(204);
  });
});
