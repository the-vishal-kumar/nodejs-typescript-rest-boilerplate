import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  api,
  createUser,
  decodeJwt,
  expectStatus,
  forgeJwt,
  PASSWORD,
  uniqueEmail,
  USER_TOKEN_TTL_MINUTES,
} from './lib.mjs';

describe('auth: sign-up', () => {
  const email = uniqueEmail('signup');

  it('creates a customer with 204', async () => {
    expectStatus(await api('POST', '/auth/signup', { body: { email, password: PASSWORD, firstName: 'User' } }), 204);
  });

  it('answers 409 for an email already registered, in any letter case', async () => {
    const response = await api('POST', '/auth/signup', {
      body: { email: email.toUpperCase(), password: PASSWORD, firstName: 'User' },
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.status, 409);
    assert.equal(typeof response.body.error, 'string');
  });

  it('answers 409, not 500, when sign-ups with one email race', async () => {
    const body = { email: uniqueEmail('race'), password: PASSWORD, firstName: 'User' };
    const statuses = (await Promise.all([1, 2, 3].map(() => api('POST', '/auth/signup', { body })))).map(r => r.status);
    assert.equal(statuses.filter(status => status === 204).length, 1, `statuses: ${statuses}`);
    assert.equal(statuses.filter(status => status === 409).length, 2, `statuses: ${statuses}`);
  });

  const invalid = [
    [{ password: PASSWORD, firstName: 'User' }, '"email" is required'],
    [{ email: 'not-an-email', password: PASSWORD, firstName: 'User' }, '"email" must be a valid email'],
    [{ email: 'a@example.com', password: 'short', firstName: 'User' }, '"password" length must be at least 8'],
    [{ email: 'a@example.com', password: PASSWORD }, '"firstName" is required'],
    [{ email: 'a@example.com', password: PASSWORD, firstName: 'User', isAdmin: true }, '"isAdmin" is not allowed'],
  ];
  for (const [body, message] of invalid) {
    it(`rejects ${JSON.stringify(body)} with 422`, async () => {
      const response = await api('POST', '/auth/signup', { body });
      assert.equal(response.status, 422);
      assert.equal(response.body.status, 422);
      assert.ok(Array.isArray(response.body.errors), 'errors is an array');
      assert.ok(response.body.errors.join(' ').includes(message), `errors: ${JSON.stringify(response.body.errors)}`);
    });
  }

  it('never returns the password hash', async () => {
    const response = await api('POST', '/auth/signin', { body: { email, password: PASSWORD } });
    assert.equal(response.status, 200);
    assert.ok(!response.text.includes('password'));
  });
});

describe('auth: sign-in', () => {
  it('returns a signed Bearer token with the configured customer lifetime', async () => {
    const { token } = await createUser();
    const payload = decodeJwt(token);
    assert.equal(payload.exp - payload.iat, USER_TOKEN_TTL_MINUTES * 60);
  });

  it('answers the same 401 for an unknown email and a wrong password', async () => {
    const { email } = await createUser();
    const unknown = await api('POST', '/auth/signin', { body: { email: uniqueEmail('nobody'), password: PASSWORD } });
    const wrong = await api('POST', '/auth/signin', { body: { email, password: 'wrong-password' } });
    assert.equal(unknown.status, 401);
    assert.equal(wrong.status, 401);
    assert.deepEqual(unknown.body, wrong.body);
    assert.deepEqual(unknown.body, { status: 401, error: 'Invalid email or password' });
  });

  it('accepts the email in any letter case', async () => {
    const { email } = await createUser();
    expectStatus(await api('POST', '/auth/signin', { body: { email: email.toUpperCase(), password: PASSWORD } }), 200);
  });
});

describe('auth: admin', () => {
  it('signs up and signs in an admin with a 20 minute token', async () => {
    const { token } = await createUser({ admin: true });
    const payload = decodeJwt(token);
    assert.equal(payload.exp - payload.iat, 20 * 60);
  });

  it('answers 409 when an admin email is already registered', async () => {
    const { email } = await createUser({ admin: true });
    const response = await api('POST', '/auth/signup/admin', { body: { email, password: PASSWORD, firstName: 'A' } });
    assert.equal(response.status, 409);
  });

  it('refuses admin sign-in for a customer, but only after checking the password', async () => {
    const { email } = await createUser();
    const wrongPassword = await api('POST', '/auth/signin/admin', { body: { email, password: 'wrong-password' } });
    assert.equal(wrongPassword.status, 401);
    const rightPassword = await api('POST', '/auth/signin/admin', { body: { email, password: PASSWORD } });
    assert.equal(rightPassword.status, 403);
    assert.equal(rightPassword.body.error, 'Admin access required');
  });
});

describe('auth: access tokens', () => {
  const cases = [
    ['no header', undefined, 'Missing access token'],
    ['a non-Bearer scheme', 'Basic abc', 'Missing access token'],
    ['a malformed token', 'Bearer not-a-jwt', 'Invalid access token'],
  ];
  for (const [label, header, message] of cases) {
    it(`answers 401 for ${label}`, async () => {
      const response = await api('GET', '/loan', { headers: header ? { Authorization: header } : {} });
      assert.equal(response.status, 401);
      assert.equal(response.body.error, message);
    });
  }

  it('rejects a token signed with another key', async () => {
    const response = await api('GET', '/loan', { token: forgeJwt({ userId: 'x' }) });
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Invalid access token');
  });
});

describe('auth: password reset', () => {
  for (const admin of [false, true]) {
    it(`changes the password (admin: ${admin})`, async () => {
      const { email, token } = await createUser({ admin });
      expectStatus(
        await api('PUT', '/auth/password/reset', {
          token,
          body: { currentPassword: PASSWORD, password: 'newPassword123' },
        }),
        204,
      );
      const signin = admin ? '/auth/signin/admin' : '/auth/signin';
      expectStatus(await api('POST', signin, { body: { email, password: 'newPassword123' } }), 200);
      expectStatus(await api('POST', signin, { body: { email, password: PASSWORD } }), 401);
    });
  }

  it('requires the current password', async () => {
    const { token } = await createUser();
    const response = await api('PUT', '/auth/password/reset', {
      token,
      body: { currentPassword: 'wrong-password', password: 'newPassword123' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Current password is incorrect');
  });

  it('refuses the same password', async () => {
    const { token } = await createUser();
    const response = await api('PUT', '/auth/password/reset', {
      token,
      body: { currentPassword: PASSWORD, password: PASSWORD },
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'New password cannot be same as Old password');
  });

  it('validates the payload', async () => {
    const { token } = await createUser();
    const response = await api('PUT', '/auth/password/reset', { token, body: { currentPassword: PASSWORD } });
    assert.equal(response.status, 422);
    assert.ok(response.body.errors.join(' ').includes('"password" is required'));
  });

  it('ends every other session of the user', async () => {
    const { email, token } = await createUser();
    const other = expectStatus(await api('POST', '/auth/signin', { body: { email, password: PASSWORD } }), 200);
    const otherToken = other.body.data.accessToken;
    expectStatus(
      await api('PUT', '/auth/password/reset', { token, body: { currentPassword: PASSWORD, password: 'newPassword123' } }),
      204,
    );
    expectStatus(await api('GET', '/loan', { token: otherToken }), 401);
    expectStatus(await api('GET', '/loan', { token }), 200);
  });
});

describe('auth: sign-off', () => {
  for (const admin of [false, true]) {
    it(`invalidates the access token (admin: ${admin})`, async () => {
      const { token } = await createUser({ admin });
      expectStatus(await api('POST', '/auth/signoff', { token }), 204);
      const response = await api('PUT', '/auth/password/reset', {
        token,
        body: { currentPassword: PASSWORD, password: 'newPassword123' },
      });
      assert.equal(response.status, 401);
      assert.equal(response.body.error, 'Invalid access token');
    });
  }
});
