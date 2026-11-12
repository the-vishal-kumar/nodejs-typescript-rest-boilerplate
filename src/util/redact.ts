const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie/i;
const REDACTED = '[REDACTED]';

/**
 * Returns a deep copy of `value` with sensitive fields replaced, so request
 * payloads can be logged without leaking passwords or tokens.
 */
const redact = (value: unknown, depth = 0): unknown => {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => redact(item, depth + 1));

  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1);
  }
  return copy;
};

export default redact;
