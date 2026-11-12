import { redact } from '../../../util';

describe('redact', () => {
  it('should replace secrets at any depth and keep everything else', () => {
    const input = {
      email: 'a@example.com',
      password: 'p',
      nested: { currentPassword: 'p', accessToken: 't', list: [{ Authorization: 'Bearer x', ok: 1 }] },
    };
    expect(redact(input)).toEqual({
      email: 'a@example.com',
      password: '[REDACTED]',
      nested: {
        currentPassword: '[REDACTED]',
        accessToken: '[REDACTED]',
        list: [{ Authorization: '[REDACTED]', ok: 1 }],
      },
    });
  });

  it('should not modify the input', () => {
    const input = { password: 'p' };
    redact(input);
    expect(input.password).toBe('p');
  });

  it.each([null, undefined, 'text', 42])('should return %p unchanged', value => {
    expect(redact(value)).toBe(value);
  });
});
