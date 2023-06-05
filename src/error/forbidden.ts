/**
 * Custom error class representing a Forbidden error.
 * Inherits from the built-in Error class.
 * @class ForbiddenError
 * @extends Error
 */
export default class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}
