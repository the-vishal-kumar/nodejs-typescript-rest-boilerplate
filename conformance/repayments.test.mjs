import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { approvedLoan, createUser, expectStatus, getLoan, pay, requestLoan, sumCents } from './lib.mjs';

describe('repayments', () => {
  it('refuses payment on a loan that is not approved', async () => {
    const user = await createUser();
    const id = await requestLoan(user.token, 100, 2);
    const response = await pay(user.token, id, 50);
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'Cannot make payment on Pending or Paid loan');
  });

  it('pays instalments in order and marks the loan PAID after the last one', async () => {
    const { token, id } = await approvedLoan(10000, 3);

    expectStatus(await pay(token, id, 3333.33), 204);
    let loan = await getLoan(token, id);
    assert.deepEqual(
      loan.repayments.map(repayment => repayment.status),
      ['PAID', 'PENDING', 'PENDING'],
    );
    assert.equal(loan.status, 'APPROVED');

    expectStatus(await pay(token, id, 3333.33), 204);
    expectStatus(await pay(token, id, 3333.34), 204);
    loan = await getLoan(token, id);
    assert.ok(loan.repayments.every(repayment => repayment.status === 'PAID'));
    assert.equal(sumCents(loan.repayments.map(repayment => repayment.paidAmount)), 1000000);
    assert.equal(loan.status, 'PAID');

    const afterPaid = await pay(token, id, 1);
    assert.equal(afterPaid.status, 403);
    assert.equal(afterPaid.body.error, 'Cannot make payment on Pending or Paid loan');
  });

  it('applies a larger payment to the following instalments', async () => {
    const { token, id } = await approvedLoan(90, 3);
    expectStatus(await pay(token, id, 45), 204);
    const loan = await getLoan(token, id);
    assert.deepEqual(
      loan.repayments.map(repayment => [repayment.status, repayment.dueAmount, repayment.paidAmount]),
      [
        ['PAID', 0, 30],
        ['PENDING', 15, 15],
        ['PENDING', 30, 0],
      ],
    );
  });

  it('accepts a payment of exactly the partly paid instalment', async () => {
    const { token, id } = await approvedLoan(90, 3);
    expectStatus(await pay(token, id, 45), 204);
    expectStatus(await pay(token, id, 15), 204);
    const loan = await getLoan(token, id);
    assert.deepEqual(
      loan.repayments.map(repayment => repayment.status),
      ['PAID', 'PAID', 'PENDING'],
    );
  });

  it('pays the whole balance in one payment', async () => {
    const { token, id } = await approvedLoan(100, 7);
    expectStatus(await pay(token, id, 100), 204);
    const loan = await getLoan(token, id);
    assert.equal(loan.status, 'PAID');
    assert.equal(sumCents(loan.repayments.map(repayment => repayment.paidAmount)), 10000);
  });

  it('refuses less than the due instalment and more than the balance', async () => {
    const { token, id } = await approvedLoan(90, 3);
    const less = await pay(token, id, 10);
    assert.equal(less.status, 403);
    assert.equal(less.body.error, 'Cannot make a payment less than due amount');
    const more = await pay(token, id, 91);
    assert.equal(more.status, 403);
    assert.equal(more.body.error, 'Cannot make a payment more than loan amount');
    expectStatus(await pay(token, id, 60), 204);
    const overBalance = await pay(token, id, 31);
    assert.equal(overBalance.status, 403);
    assert.equal(overBalance.body.error, 'Cannot make a payment more than total due amount');
    const loan = await getLoan(token, id);
    assert.equal(sumCents(loan.repayments.map(repayment => repayment.paidAmount)), 6000);
  });

  it("does not let a customer pay someone else's loan", async () => {
    const { id } = await approvedLoan(90, 3);
    const other = await createUser();
    expectStatus(await pay(other.token, id, 30), 403);
  });

  it('answers 404 for an unknown loan and 422 for a malformed id', async () => {
    const { token } = await createUser();
    expectStatus(await pay(token, randomUUID(), 30), 404);
    expectStatus(await pay(token, 'not-a-uuid', 30), 422);
  });

  it('never applies money twice or loses it when two payments race', async () => {
    const { token, id } = await approvedLoan(100, 2);
    const statuses = (await Promise.all([pay(token, id, 50), pay(token, id, 50)])).map(response => response.status);
    const loan = await getLoan(token, id);
    const paidCents = sumCents(loan.repayments.map(repayment => repayment.paidAmount));
    assert.ok(
      statuses.every(status => status === 204 || status === 409),
      `statuses: ${statuses}`,
    );
    // Either both ran one after the other, or exactly one lost with 409.
    assert.equal(paidCents, statuses.filter(status => status === 204).length * 5000, `statuses: ${statuses}`);
    assert.ok(statuses.includes(204));
  });

  it('keeps the books exact under a burst of concurrent payments', async () => {
    const { token, id } = await approvedLoan(100, 10);
    const statuses = (await Promise.all(Array.from({ length: 8 }, () => pay(token, id, 10)))).map(r => r.status);
    const loan = await getLoan(token, id);
    const paidCents = sumCents(loan.repayments.map(repayment => repayment.paidAmount));
    const dueCents = sumCents(loan.repayments.map(repayment => repayment.dueAmount));
    assert.equal(paidCents, statuses.filter(status => status === 204).length * 1000, `statuses: ${statuses}`);
    assert.equal(paidCents + dueCents, 10000);
  });

  const invalid = [
    ['lots', '"amount" must be a number'],
    [30.001, '"amount" must have no more than 2 decimal places'],
    [0, '"amount" must be greater than or equal to 0.01'],
    [-1, '"amount" must be greater than or equal to 0.01'],
  ];
  for (const [amount, message] of invalid) {
    it(`rejects a payment of ${JSON.stringify(amount)} with 422`, async () => {
      const { token, id } = await approvedLoan(90, 3);
      const response = await pay(token, id, amount);
      assert.equal(response.status, 422);
      assert.ok(response.body.errors.includes(message), `errors: ${JSON.stringify(response.body.errors)}`);
    });
  }

  it('accepts a numeric string amount', async () => {
    const { token, id } = await approvedLoan(90, 3);
    expectStatus(await pay(token, id, '30'), 204);
    assert.equal((await getLoan(token, id)).repayments[0].status, 'PAID');
  });
});
