/**
 * Custom error class representing a custom error.
 * Inherits from the built-in Error class.
 * @class CustomError
 * @extends Error
 */
export default class CustomError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
  }
}
