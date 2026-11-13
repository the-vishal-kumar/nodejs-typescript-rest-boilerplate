import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { api, approveLoan, createUser, expectStatus, getLoan, requestLoan, sumCents } from './lib.mjs';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('loans: request', () => {
  it('refuses an anonymous caller with 401 before validating the payload', async () => {
    const response = await api('POST', '/loan', { body: { amount: 'nonsense' } });
    assert.equal(response.status, 401);
    assert.equal(response.body.error, 'Missing access token');
  });

  it('creates a PENDING loan with a UUID v4 id and a schedule that adds up exactly', async () => {
    const { token } = await createUser();
    const response = expectStatus(await api('POST', '/loan', { token, body: { amount: 10000, term: 3 } }), 201);
    assert.equal(response.body.status, 201);
    assert.match(response.body.data.id, UUID_V4);
    const loan = await getLoan(token, response.body.data.id);
    assert.equal(loan.status, 'PENDING');
    assert.deepEqual(
      loan.repayments.map(repayment => repayment.dueAmount),
      [3333.33, 3333.33, 3333.34],
    );
  });

  it('puts the whole remainder on the last instalment', async () => {
    const { token } = await createUser();
    const loan = await getLoan(token, await requestLoan(token, 100, 7));
    const dueAmounts = loan.repayments.map(repayment => repayment.dueAmount);
    assert.deepEqual(dueAmounts, [14.28, 14.28, 14.28, 14.28, 14.28, 14.28, 14.32]);
    assert.equal(sumCents(dueAmounts), 10000);
    assert.deepEqual(
      loan.repayments.map(repayment => repayment.isLast),
      [false, false, false, false, false, false, true],
    );
  });

  it('schedules weekly due dates in order, each a week apart', async () => {
    const { token } = await createUser();
    const loan = await getLoan(token, await requestLoan(token, 30, 3));
    const dates = loan.repayments.map(repayment => Date.parse(repayment.dueDate));
    assert.ok(dates.every(Number.isFinite), 'dueDate is an ISO date-time');
    assert.equal(dates[1] - dates[0], 7 * 24 * 3600 * 1000);
    assert.equal(dates[2] - dates[1], 7 * 24 * 3600 * 1000);
    assert.ok(dates[0] > Date.now(), 'first instalment is due in the future');
  });

  const invalid = [
    [{ amount: 22 }, '"term" is required'],
    [{ term: 3 }, '"amount" is required'],
    [{ amount: -5, term: 3 }, '"amount" must be greater than or equal to 0.01'],
    [{ amount: 0, term: 3 }, '"amount" must be greater than or equal to 0.01'],
    [{ amount: 10.005, term: 3 }, '"amount" must have no more than 2 decimal places'],
    [{ amount: 'lots', term: 3 }, '"amount" must be a number'],
    [{ amount: 1000000000.01, term: 3 }, '"amount" must be less than or equal to 1000000000'],
    [{ amount: 100, term: 2.5 }, '"term" must be an integer'],
    [{ amount: 100, term: 0 }, '"term" must be greater than or equal to 1'],
    [{ amount: 100, term: 521 }, '"term" must be less than or equal to 520'],
    [{ amount: 0.05, term: 10 }, '"amount" must be at least 0.01 per week of "term"'],
    [{ amount: 100, term: 3, status: 'APPROVED' }, '"status" is not allowed'],
  ];
  for (const [body, message] of invalid) {
    it(`rejects ${JSON.stringify(body)} with 422`, async () => {
      const { token } = await createUser();
      const response = await api('POST', '/loan', { token, body });
      assert.equal(response.status, 422);
      assert.equal(response.body.status, 422);
      assert.ok(response.body.errors.includes(message), `errors: ${JSON.stringify(response.body.errors)}`);
    });
  }

  it('converts numeric strings instead of storing strings', async () => {
    const { token } = await createUser();
    const id = expectStatus(await api('POST', '/loan', { token, body: { amount: '22', term: '7' } }), 201).body.data.id;
    const loan = await getLoan(token, id);
    assert.equal(loan.amount, 22);
    assert.equal(loan.term, 7);
  });
});

describe('loans: view', () => {
  it('lists only my loans, each with its schedule and the documented fields', async () => {
    const me = await createUser();
    const someoneElse = await createUser();
    await requestLoan(me.token);
    await requestLoan(me.token, 50, 2);
    await requestLoan(someoneElse.token);

    const response = expectStatus(await api('GET', '/loan', { token: me.token }), 200);
    assert.equal(response.body.status, 200);
    assert.equal(response.body.data.length, 2);
    for (const loan of response.body.data) {
      for (const key of ['id', 'userId', 'amount', 'term', 'status', 'createdAt', 'updatedAt', 'repayments']) {
        assert.ok(key in loan, `loan has ${key}`);
      }
      assert.ok(!('_id' in loan));
      assert.match(loan.id, UUID_V4);
      assert.match(loan.userId, UUID_V4);
      assert.ok(Number.isInteger(loan.createdAt) && Number.isInteger(loan.updatedAt), 'Unix seconds');
      assert.equal(loan.repayments.length, loan.term);
      for (const repayment of loan.repayments) {
        for (const key of ['id', 'loanId', 'dueAmount', 'paidAmount', 'isLast', 'status', 'dueDate']) {
          assert.ok(key in repayment, `repayment has ${key}`);
        }
        assert.match(repayment.id, UUID_V4);
        assert.equal(repayment.loanId, loan.id);
        assert.equal(repayment.paidAmount, 0);
        assert.equal(repayment.status, 'PENDING');
      }
    }
    assert.deepEqual(response.body.data.map(loan => loan.amount).sort(), [22, 50]);
  });

  it('returns an empty list for a customer without loans', async () => {
    const { token } = await createUser();
    const response = expectStatus(await api('GET', '/loan', { token }), 200);
    assert.deepEqual(response.body.data, []);
  });

  it('does not show another customer my loan', async () => {
    const owner = await createUser();
    const other = await createUser();
    const id = await requestLoan(owner.token);
    expectStatus(await api('GET', `/loan/${id}`, { token: other.token }), 403);
  });

  it('answers 404 for an unknown loan and 422 for a malformed id', async () => {
    const { token } = await createUser();
    const unknown = await api('GET', `/loan/${randomUUID()}`, { token });
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.error, 'Loan not found');
    const malformed = await api('GET', '/loan/not-a-uuid', { token });
    assert.equal(malformed.status, 422);
    assert.ok(Array.isArray(malformed.body.errors));
  });
});

describe('loans: approve', () => {
  it('lets an admin approve a pending loan', async () => {
    const admin = await createUser({ admin: true });
    const user = await createUser();
    const id = await requestLoan(user.token);
    await approveLoan(admin.token, id);
    assert.equal((await getLoan(user.token, id)).status, 'APPROVED');
  });

  it('does not let a customer approve a loan', async () => {
    const user = await createUser();
    const id = await requestLoan(user.token);
    const response = await api('PUT', `/loan/${id}/approve`, { token: user.token });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Admin access required');
  });

  it('does not let an admin approve their own loan', async () => {
    const admin = await createUser({ admin: true });
    const id = await requestLoan(admin.token);
    const response = await api('PUT', `/loan/${id}/approve`, { token: admin.token });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Cannot approve your own loan request');
  });

  it('does not approve a loan twice', async () => {
    const admin = await createUser({ admin: true });
    const user = await createUser();
    const id = await requestLoan(user.token);
    await approveLoan(admin.token, id);
    const response = await api('PUT', `/loan/${id}/approve`, { token: admin.token });
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Cannot approve an already approved or paid loan');
  });

  it('answers 404 for an unknown loan and 422 for a malformed id', async () => {
    const admin = await createUser({ admin: true });
    expectStatus(await api('PUT', `/loan/${randomUUID()}/approve`, { token: admin.token }), 404);
    expectStatus(await api('PUT', '/loan/not-a-uuid/approve', { token: admin.token }), 422);
  });
});
