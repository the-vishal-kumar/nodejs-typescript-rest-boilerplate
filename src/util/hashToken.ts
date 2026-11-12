import { createHash } from 'node:crypto';

/** SHA-256 hex digest used to store and look up session tokens. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export default hashToken;
