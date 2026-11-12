import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Loan } from '../../model';
import { approveLoan, createUser, requestLoan, useTestApp } from './helpers';

describe('Loan endpoints', () => {
  const { app } = useTestApp();

  describe('request loan', () => {
    it('should not raise loan request for unauthenticated user', async () => {
      const response = await request(app()).post('/loan').send({ amount: 22, term: 7 });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing access token');
    });

    it('should raise loan request with a schedule that adds up exactly', async () => {
      const { token } = await createUser(app());
      const id = await requestLoan(app(), token, 10000, 3);
      const loan = await request(app()).get(`/loan/${id}`).set('Authorization', `Bearer ${token}`).expect(200);
      expect(loan.body.data.status).toBe('PENDING');
      const dueAmounts = loan.body.data.repayments.map((repayment: { dueAmount: number }) => repayment.dueAmount);
      expect(dueAmounts).toEqual([3333.33, 3333.33, 3333.34]);
    });

    it.each([
      [{ amount: 22 }, '"term" is required'],
      [{ amount: -5, term: 3 }, '"amount" must be greater than or equal to 0.01'],
      [{ amount: 10.005, term: 3 }, '"amount" must have no more than 2 decimal places'],
      [{ amount: 100, term: 2.5 }, '"term" must be an integer'],
      [{ amount: 100, term: 521 }, '"term" must be less than or equal to 520'],
      [{ amount: 0.05, term: 10 }, '"amount" must be at least 0.01 per week of "term"'],
      [{ amount: 100, term: 3, status: 'APPROVED' }, '"status" is not allowed'],
    ])('should reject %j with 422', async (body, message) => {
      const { token } = await createUser(app());
      const response = await request(app()).post('/loan').set('Authorization', `Bearer ${token}`).send(body);
      expect(response.status).toBe(422);
      expect(response.body.errors).toContain(message);
    });

    it('should convert a numeric string amount instead of storing a string', async () => {
      const { token } = await createUser(app());
      const response = await request(app())
        .post('/loan')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: '22', term: '7' })
        .expect(201);
      const loan = await Loan.findOne({ id: response.body.data.id });
      expect(loan?.amount).toBe(22);
    });
  });

  describe('view loans', () => {
    it('should list only my loans, each with its schedule', async () => {
      const me = await createUser(app());
      const someoneElse = await createUser(app());
      await requestLoan(app(), me.token);
      await requestLoan(app(), me.token, 50, 2);
      await requestLoan(app(), someoneElse.token);

      const response = await request(app()).get('/loan').set('Authorization', `Bearer ${me.token}`).expect(200);
      expect(response.body.data).toHaveLength(2);
      for (const loan of response.body.data) {
        for (const key of ['id', 'userId', 'amount', 'term', 'status', 'createdAt', 'updatedAt', 'repayments']) {
          expect(loan).toHaveProperty(key);
        }
        expect(loan).not.toHaveProperty('_id');
        expect(loan.repayments).toHaveLength(loan.term);
        for (const repayment of loan.repayments) {
          for (const key of ['id', 'loanId', 'dueAmount', 'paidAmount', 'isLast', 'status', 'dueDate']) {
            expect(repayment).toHaveProperty(key);
          }
          expect(repayment.loanId).toBe(loan.id);
        }
      }
    });

    it('should not show another customer their loan', async () => {
      const owner = await createUser(app());
      const other = await createUser(app());
      const id = await requestLoan(app(), owner.token);
      await request(app()).get(`/loan/${id}`).set('Authorization', `Bearer ${other.token}`).expect(403);
    });

    it('should return 404 for an unknown loan and 422 for a malformed id', async () => {
      const { token } = await createUser(app());
      await request(app()).get(`/loan/${randomUUID()}`).set('Authorization', `Bearer ${token}`).expect(404);
      await request(app()).get('/loan/not-a-uuid').set('Authorization', `Bearer ${token}`).expect(422);
    });
  });

  describe('approve loan', () => {
    it('should let an admin approve a pending loan and record who approved it', async () => {
      const admin = await createUser(app(), { admin: true });
      const user = await createUser(app());
      const id = await requestLoan(app(), user.token);
      await approveLoan(app(), admin.token, id);
      const loan = await Loan.findOne({ id });
      expect(loan?.status).toBe('APPROVED');
      expect(loan?.approvedBy).toBeDefined();
    });

    it('should not let a customer approve a loan', async () => {
      const user = await createUser(app());
      const id = await requestLoan(app(), user.token);
      const response = await request(app()).put(`/loan/${id}/approve`).set('Authorization', `Bearer ${user.token}`);
      expect(response.status).toBe(403);
    });

    it('should not let an admin approve their own loan', async () => {
      const admin = await createUser(app(), { admin: true });
      const id = await requestLoan(app(), admin.token);
      const response = await request(app()).put(`/loan/${id}/approve`).set('Authorization', `Bearer ${admin.token}`);
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot approve your own loan request');
    });

    it('should not approve a loan twice', async () => {
      const admin = await createUser(app(), { admin: true });
      const user = await createUser(app());
      const id = await requestLoan(app(), user.token);
      await approveLoan(app(), admin.token, id);
      const response = await request(app()).put(`/loan/${id}/approve`).set('Authorization', `Bearer ${admin.token}`);
      expect(response.status).toBe(403);
    });
  });
});
