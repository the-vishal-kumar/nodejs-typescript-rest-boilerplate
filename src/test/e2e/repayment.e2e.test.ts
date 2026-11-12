import { Express } from 'express';
import request from 'supertest';
import { approveLoan, createUser, requestLoan, useTestApp } from './helpers';

const pay = (app: Express, token: string, id: string, amount: number | string): request.Test =>
  request(app).put(`/loan/${id}/repayment`).set('Authorization', `Bearer ${token}`).send({ amount });

const getLoan = async (
  app: Express,
  token: string,
  id: string,
): Promise<{ status: string; repayments: { status: string; dueAmount: number; paidAmount: number }[] }> =>
  (await request(app).get(`/loan/${id}`).set('Authorization', `Bearer ${token}`).expect(200)).body.data;

describe('Repayment endpoint', () => {
  const { app } = useTestApp();

  const approvedLoan = async (amount: number, term: number): Promise<{ token: string; id: string }> => {
    const admin = await createUser(app(), { admin: true });
    const user = await createUser(app());
    const id = await requestLoan(app(), user.token, amount, term);
    await approveLoan(app(), admin.token, id);
    return { token: user.token, id };
  };

  it('should refuse payment on a loan that is not approved', async () => {
    const user = await createUser(app());
    const id = await requestLoan(app(), user.token, 100, 2);
    const response = await pay(app(), user.token, id, 50);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Cannot make payment on Pending or Paid loan');
  });

  it('should pay instalments in order and mark the loan PAID after the last one', async () => {
    const { token, id } = await approvedLoan(10000, 3);

    await pay(app(), token, id, 3333.33).expect(204);
    let loan = await getLoan(app(), token, id);
    expect(loan.repayments.map(repayment => repayment.status)).toEqual(['PAID', 'PENDING', 'PENDING']);
    expect(loan.status).toBe('APPROVED');

    await pay(app(), token, id, 3333.33).expect(204);
    await pay(app(), token, id, 3333.34).expect(204);
    loan = await getLoan(app(), token, id);
    expect(loan.repayments.every(repayment => repayment.status === 'PAID')).toBe(true);
    expect(loan.status).toBe('PAID');

    const afterPaid = await pay(app(), token, id, 1);
    expect(afterPaid.status).toBe(403);
  });

  it('should apply a larger payment to the following instalments', async () => {
    const { token, id } = await approvedLoan(90, 3);
    await pay(app(), token, id, 45).expect(204);
    const loan = await getLoan(app(), token, id);
    expect(loan.repayments.map(repayment => [repayment.status, repayment.dueAmount, repayment.paidAmount])).toEqual([
      ['PAID', 0, 30],
      ['PENDING', 15, 15],
      ['PENDING', 30, 0],
    ]);
  });

  it('should refuse less than the due instalment and more than the balance', async () => {
    const { token, id } = await approvedLoan(90, 3);
    expect((await pay(app(), token, id, 10)).body.error).toBe('Cannot make a payment less than due amount');
    expect((await pay(app(), token, id, 91)).body.error).toBe('Cannot make a payment more than loan amount');
    await pay(app(), token, id, 60).expect(204);
    expect((await pay(app(), token, id, 31)).body.error).toBe('Cannot make a payment more than total due amount');
  });

  it("should not let a customer pay someone else's loan", async () => {
    const { id } = await approvedLoan(90, 3);
    const other = await createUser(app());
    await pay(app(), other.token, id, 30).expect(403);
  });

  it('should apply only one of two concurrent payments for the same instalment', async () => {
    const { token, id } = await approvedLoan(100, 2);
    const statuses = (await Promise.all([pay(app(), token, id, 50), pay(app(), token, id, 50)])).map(
      response => response.status,
    );
    const loan = await getLoan(app(), token, id);
    const paid = loan.repayments.reduce((sum, repayment) => sum + repayment.paidAmount, 0);
    // Either both ran one after another (100 paid) or one lost the race (409).
    if (statuses.includes(409)) expect(paid).toBe(50);
    else expect(paid).toBe(100);
    expect(statuses.filter(status => status === 204).length).toBe(paid / 50);
  });

  it('should validate the payment payload', async () => {
    const { token, id } = await approvedLoan(90, 3);
    await pay(app(), token, id, 'lots').expect(422);
    await pay(app(), token, id, 30.001).expect(422);
  });
});
