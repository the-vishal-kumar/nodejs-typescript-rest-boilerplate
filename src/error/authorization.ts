/**
 * Custom error class representing a Authorization error.
 * Inherits from the built-in Error class.
 * @class AuthorizationError
 * @extends Error
 */
export default class AuthorizationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
