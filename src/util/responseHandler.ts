import { Response } from 'express';
import { ForbiddenError, NotFoundError, ValidationError } from '../error';

export default class ResponseHandler {
  /**
   * Handles a successful response by sending a JSON response with a status code of 200 and the provided data.
   * @param {Object} res - The response object used to send the response.
   * @param {any} data - The data to be included in the response.
   * @returns {void}
   */
  static handleSuccess = (res: Response, data: unknown): void => {
    res.json({
      status: 200,
      data,
    });
  };

  /**
   * Handles a forbidden error by sending a JSON response with a status code of 403 and the provided error message.
   * @param {Object} res - The response object used to send the response.
   * @param {string} error - The error message to be included in the response.
   * @returns {void}
   */
  static handleForbidden = (res: Response, error: string): void => {
    const status = 403;
    res.status(status).json({
      status,
      error,
    });
  };

  /**
   * Handles a not found error by sending a JSON response with a status code of 404 and the provided error message.
   * @param {Object} res - The response object used to send the response.
   * @param {string} error - The error message to be included in the response.
   * @returns {void}
   */
  static handleNotFound = (res: Response, error = 'Resource not found'): void => {
    const status = 404;
    res.status(status).json({
      status,
      error,
    });
  };

  /**
   * Handles a not found error by sending a JSON response with a status code of 400 and the provided error message.
   * @param {Object} res - The response object used to send the response.
   * @param {string} error - The error message to be included in the response.
   * @returns {void}
   */
  static handleValidation = (res: Response, error: string): void => {
    const status = 400;
    res.status(status).json({
      status,
      error,
    });
  };

  /**
   * Handles an error by sending an appropriate JSON response based on the type of error.
   * If the error is an instance of NotFoundError, it calls handleNotFound with the error message.
   * If the error is an instance of ForbiddenError, it calls handleForbidden with the error message.
   * Otherwise, it sends a JSON response with a status code of 500 and a generic error message.
   * @param {Object} res - The response object used to send the response.
   * @param {Error} error - The error object to be handled.
   * @returns {void}
   */
  static handleError = (res: Response, error: Error): void => {
    const { message } = error;
    if (error instanceof ValidationError) this.handleValidation(res, message);
    else if (error instanceof ForbiddenError) this.handleForbidden(res, message);
    else if (error instanceof NotFoundError) this.handleNotFound(res, message);
    else
      res.status(500).json({
        status: 500,
        error: 'An error occurred',
      });
  };
}
