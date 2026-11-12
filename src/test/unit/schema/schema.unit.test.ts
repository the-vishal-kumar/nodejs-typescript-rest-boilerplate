import { AuthSchema, LoanSchema, RepaymentSchema } from '../../../schema';

describe('request schemas', () => {
  it('should normalise the email on sign-up', () => {
    const { value, error } = AuthSchema.signupSchema.body.validate({
      email: '  Ada@Example.COM ',
      password: 'password123',
      firstName: ' Ada ',
    });
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ email: 'ada@example.com', firstName: 'Ada' });
  });

  it('should keep spaces inside a password', () => {
    const { value } = AuthSchema.signinSchema.body.validate({ email: 'a@example.com', password: ' pass word ' });
    expect(value.password).toBe(' pass word ');
  });

  it.each([
    [{ amount: 100, term: 4 }, undefined],
    [{ amount: 0.1, term: 10 }, undefined],
    [{ amount: 0.07, term: 1 }, undefined],
    [{ amount: 19.99, term: 3 }, undefined],
    [{ amount: 10.001, term: 1 }, '"amount" must have no more than 2 decimal places'],
    [{ amount: 0, term: 1 }, '"amount" must be greater than or equal to 0.01'],
    [{ amount: 100, term: 0 }, '"term" must be greater than or equal to 1'],
  ])('loan request %j', (body, message) => {
    const { error } = LoanSchema.loanRequestSchema.body.validate(body);
    expect(error?.message).toBe(message);
  });

  it('should require a UUID loan id', () => {
    expect(RepaymentSchema.makePaymentSchema.params.validate({ id: '123' }).error?.message).toBe(
      '"id" must be a valid GUID',
    );
  });
});
