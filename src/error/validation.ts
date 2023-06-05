/**
 * Custom error class representing a Validation error.
 * Inherits from the built-in Error class.
 * @class ValidationError
 * @extends Error
 */
export default class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
