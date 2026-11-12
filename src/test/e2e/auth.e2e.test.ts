import request from 'supertest';
import jsonwebtoken from 'jsonwebtoken';
import { Token } from '../../model';
import { createUser, PASSWORD, uniqueEmail, useTestApp } from './helpers';

describe('Auth endpoints', () => {
  const { app } = useTestApp();

  describe('signup as user', () => {
    const email = uniqueEmail('user-auth-signup');

    it('should signup a new user', async () => {
      await request(app()).post('/auth/signup').send({ email, password: PASSWORD, firstName: 'User' }).expect(204);
    });

    it('should return 409 when the email is already registered, in any letter case', async () => {
      const response = await request(app())
        .post('/auth/signup')
        .send({ email: email.toUpperCase(), password: PASSWORD, firstName: 'User' });
      expect(response.status).toBe(409);
    });

    it('should return 409, not 500, for concurrent sign-ups with one email', async () => {
      const concurrentEmail = uniqueEmail('user-auth-race');
      const body = { email: concurrentEmail, password: PASSWORD, firstName: 'User' };
      const statuses = (await Promise.all([1, 2, 3].map(() => request(app()).post('/auth/signup').send(body)))).map(
        response => response.status,
      );
      expect(statuses.filter(status => status === 204)).toHaveLength(1);
      expect(statuses.filter(status => status === 409)).toHaveLength(2);
    });

    it.each([
      [{ password: PASSWORD, firstName: 'User' }, '"email" is required'],
      [{ email: 'not-an-email', password: PASSWORD, firstName: 'User' }, '"email" must be a valid email'],
      [{ email: 'a@example.com', password: 'short', firstName: 'User' }, '"password" length must be at least 8'],
      [{ email: 'a@example.com', password: PASSWORD }, '"firstName" is required'],
      [{ email: 'a@example.com', password: PASSWORD, firstName: 'User', isAdmin: true }, '"isAdmin" is not allowed'],
    ])('should reject %j with 422', async (body, message) => {
      const response = await request(app()).post('/auth/signup').send(body);
      expect(response.status).toBe(422);
      expect(response.body.errors.join(' ')).toContain(message);
    });

    it('should never return the password hash', async () => {
      const response = await request(app()).post('/auth/signin').send({ email, password: PASSWORD });
      expect(JSON.stringify(response.body)).not.toContain('password');
    });
  });

  describe('signin', () => {
    it('should signin and return a signed, expiring access token', async () => {
      const { token } = await createUser(app());
      const payload = jsonwebtoken.decode(token) as jsonwebtoken.JwtPayload;
      expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60);
    });

    it('should store only a hash of the token', async () => {
      const { token } = await createUser(app());
      expect(await Token.findOne({ accessToken: token })).toBeNull();
    });

    it('should return the same 401 for an unknown email and a wrong password', async () => {
      const { email } = await createUser(app());
      const unknown = await request(app())
        .post('/auth/signin')
        .send({ email: 'nobody@example.com', password: PASSWORD });
      const wrong = await request(app()).post('/auth/signin').send({ email, password: 'wrong-password' });
      expect(unknown.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(unknown.body).toEqual(wrong.body);
    });
  });

  describe('admin', () => {
    it('should signup and signin an admin with a 20 minute token', async () => {
      const { token } = await createUser(app(), { admin: true });
      const payload = jsonwebtoken.decode(token) as jsonwebtoken.JwtPayload;
      expect(payload.exp! - payload.iat!).toBe(20 * 60);
    });

    it('should return 409 when an admin email is already registered', async () => {
      const { email } = await createUser(app(), { admin: true });
      const response = await request(app())
        .post('/auth/signup/admin')
        .send({ email, password: PASSWORD, firstName: 'Admin' });
      expect(response.status).toBe(409);
    });

    it('should refuse admin signin for a customer, but only after checking the password', async () => {
      const { email } = await createUser(app());
      const wrongPassword = await request(app()).post('/auth/signin/admin').send({ email, password: 'wrong-password' });
      expect(wrongPassword.status).toBe(401);
      const rightPassword = await request(app()).post('/auth/signin/admin').send({ email, password: PASSWORD });
      expect(rightPassword.status).toBe(403);
    });
  });

  describe('access tokens', () => {
    it.each([
      ['no header', undefined, 'Missing access token'],
      ['a non-Bearer scheme', 'Basic abc', 'Missing access token'],
      ['a malformed token', 'Bearer not-a-jwt', 'Invalid access token'],
    ])('should return 401 for %s', async (_label, header, message) => {
      const call = request(app()).get('/loan');
      if (header) call.set('Authorization', header);
      const response = await call;
      expect(response.status).toBe(401);
      expect(response.body.error).toBe(message);
    });

    it('should reject a token signed with another key', async () => {
      const forged = jsonwebtoken.sign({ userId: 'x' }, 'some-other-secret-that-is-32-chars-long!!');
      const response = await request(app()).get('/loan').set('Authorization', `Bearer ${forged}`);
      expect(response.status).toBe(401);
    });

    it('should reject a session whose validity has passed', async () => {
      const { token } = await createUser(app());
      await Token.updateMany({}, { validTill: new Date(Date.now() - 1000) });
      const response = await request(app()).get('/loan').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(401);
    });
  });

  describe('reset password', () => {
    it.each([false, true])('should change the password (admin: %s)', async admin => {
      const { email, token } = await createUser(app(), { admin });
      await request(app())
        .put('/auth/password/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, password: 'newPassword123' })
        .expect(204);
      await request(app()).post('/auth/signin').send({ email, password: 'newPassword123' }).expect(200);
      await request(app()).post('/auth/signin').send({ email, password: PASSWORD }).expect(401);
    });

    it('should require the current password', async () => {
      const { token } = await createUser(app());
      const response = await request(app())
        .put('/auth/password/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'wrong-password', password: 'newPassword123' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should refuse the same password', async () => {
      const { token } = await createUser(app());
      const response = await request(app())
        .put('/auth/password/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, password: PASSWORD });
      expect(response.status).toBe(403);
    });

    it('should end every other session of the user', async () => {
      const { email, token } = await createUser(app());
      const other = await request(app()).post('/auth/signin').send({ email, password: PASSWORD });
      const otherToken = other.body.data.accessToken;
      await request(app())
        .put('/auth/password/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, password: 'newPassword123' })
        .expect(204);
      await request(app()).get('/loan').set('Authorization', `Bearer ${otherToken}`).expect(401);
      await request(app()).get('/loan').set('Authorization', `Bearer ${token}`).expect(200);
    });
  });

  describe('signoff', () => {
    it.each([false, true])('should invalidate the access token (admin: %s)', async admin => {
      const { token } = await createUser(app(), { admin });
      await request(app()).post('/auth/signoff').set('Authorization', `Bearer ${token}`).expect(204);
      const response = await request(app())
        .put('/auth/password/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, password: 'newPassword123' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid access token');
    });
  });
});

describe('Admin sign-up switch', () => {
  const { app } = useTestApp({ ADMIN_SIGNUP_ENABLED: 'false' });

  it('should refuse admin sign-up when ADMIN_SIGNUP_ENABLED is false', async () => {
    const response = await request(app())
      .post('/auth/signup/admin')
      .send({ email: uniqueEmail('admin-off'), password: PASSWORD, firstName: 'Admin' });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin sign-up is disabled');
  });
});
