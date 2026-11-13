// Shared helpers for the conformance suite. Plain Node 22: fetch, node:crypto,
// node:test. No dependencies, so it runs with `docker run node:22 node --test`.
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

export const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const PASSWORD = 'password123';
// Customer token lifetime the stack under test is configured with.
export const USER_TOKEN_TTL_MINUTES = Number(process.env.USER_TOKEN_TTL_MINUTES ?? 1440);

const RUN = randomBytes(4).toString('hex');
let counter = 0;

/** Unique per run and per call, so the suite can rerun against a live stack. */
export const uniqueEmail = prefix => `${prefix}-${RUN}-${process.pid}-${counter++}@example.com`;

/**
 * A fresh client address for each simulated client. The stack runs with
 * TRUST_PROXY=1, so its per-IP rate limits see this address; tests do not
 * starve each other and the rate-limit test owns its own address.
 */
export const clientIp = () => `10.${randomBytes(3).join('.')}`;

/**
 * Sends one request. `body` objects are sent as JSON; strings are sent as-is
 * (for malformed JSON). Returns status, headers, parsed JSON (or null) and text.
 */
export const api = async (method, path, { body, token, headers = {}, ip = clientIp(), redirect = 'manual' } = {}) => {
  const init = { method, headers: { 'X-Forwarded-For': ip, ...headers }, redirect };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    init.headers['Content-Type'] ??= 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, body: json, text };
};

/** Fails with the response body in the message, which makes failures readable. */
export const expectStatus = (response, status) => {
  if (response.status !== status) {
    throw new Error(`expected HTTP ${status}, got ${response.status}: ${response.text.slice(0, 500)}`);
  }
  return response;
};

export const createUser = async ({ admin = false, email = uniqueEmail(admin ? 'admin' : 'user') } = {}) => {
  expectStatus(
    await api('POST', admin ? '/auth/signup/admin' : '/auth/signup', {
      body: { email, password: PASSWORD, firstName: admin ? 'Admin' : 'User' },
    }),
    204,
  );
  const signin = expectStatus(
    await api('POST', admin ? '/auth/signin/admin' : '/auth/signin', { body: { email, password: PASSWORD } }),
    200,
  );
  return { email, token: signin.body.data.accessToken };
};

export const requestLoan = async (token, amount = 22, term = 7) =>
  expectStatus(await api('POST', '/loan', { token, body: { amount, term } }), 201).body.data.id;

export const approveLoan = async (adminToken, id) =>
  expectStatus(await api('PUT', `/loan/${id}/approve`, { token: adminToken }), 204);

export const getLoan = async (token, id) => expectStatus(await api('GET', `/loan/${id}`, { token }), 200).body.data;

export const pay = (token, id, amount) => api('PUT', `/loan/${id}/repayment`, { token, body: { amount } });

/** An approved loan owned by a fresh customer, approved by a fresh admin. */
export const approvedLoan = async (amount, term) => {
  const admin = await createUser({ admin: true });
  const user = await createUser();
  const id = await requestLoan(user.token, amount, term);
  await approveLoan(admin.token, id);
  return { token: user.token, id };
};

const base64url = value => Buffer.from(value).toString('base64url');

export const decodeJwt = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));

/** An HS256 JWT signed with a key the server does not know. */
export const forgeJwt = (payload, key = 'some-other-secret-that-is-32-chars-long!!') => {
  const now = Math.floor(Date.now() / 1000);
  const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ iat: now, exp: now + 600, jti: randomUUID(), ...payload }));
  const signature = createHmac('sha256', key).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
};

export const sumCents = amounts => amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0);
