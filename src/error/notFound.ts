/**
 * Custom error class representing a Not Found error.
 * Inherits from the built-in Error class.
 * @class NotFoundError
 * @extends Error
 */
export default class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
