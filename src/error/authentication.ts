/**
 * Custom error class representing a Authentication error.
 * Inherits from the built-in Error class.
 * @class AuthenticationError
 * @extends Error
 */
export default class AuthenticationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
