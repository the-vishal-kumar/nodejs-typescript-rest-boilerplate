import { CustomError, NotFoundError, ValidationError } from '../error';
import { IResponseHandler } from '../type';

export default class ResponseHandler {
  /**
   * Handles a successful response by sending a JSON response with a default status code of 200 and the provided data.
   * @param {IResponseHandler.SuccessData} successData - An object having the response object, optional statusCode and optional data object.
   * @returns {void}
   */
  static handleSuccess = (successData: IResponseHandler.SuccessData): void => {
    const { res, statusCode, data } = successData;
    const status = statusCode ?? 200;
    res.status(status).json({
      status,
      data,
    });
  };

  /**
   * Handles a custom error by sending a JSON response with a status code of 403 and the provided error message.
   * @param {IResponseHandler.ErrorData} errorData - An object having the response object, optional statusCode and optional error message.
   * @returns {void}
   */
  static handleCustom = (errorData: IResponseHandler.ErrorData): void => {
    const { res, statusCode, error } = errorData;
    const message = error?.message;
    const status = statusCode ?? 403;
    res.status(status).json({
      status,
      error: message ?? 'Forbidden',
    });
  };

  /**
   * Handles a not found error by sending a JSON response with a status code of 400 and the provided error message.
   * @param {IResponseHandler.ErrorData} errorData - An object having the response object, optional statusCode and optional error message.
   * @returns {void}
   */
  static handleValidation = (errorData: IResponseHandler.ErrorData): void => {
    const { res, error, errors } = errorData;
    const message = error?.message;
    const status = 400;
    res.status(status).json({
      status,
      error: message ?? 'Validation error',
      errors,
    });
  };

  /**
   * Handles an authentication error by sending a JSON response with a status code of 401 and the provided error message.
   * @param {IResponseHandler.ErrorData} errorData - An object having the response object, optional statusCode and optional error message.
   * @returns {void}
   */
  static handleAuthentication = (errorData: IResponseHandler.ErrorData): void => {
    const { res, error, errors } = errorData;
    const message = error?.message;
    const status = 401;
    res.status(status).json({
      status,
      error: message ?? 'Authentication error',
      errors,
    });
  };

  /**
   * Handles a not found error by sending a JSON response with a status code of 404 and the provided error message.
   * @param {IResponseHandler.ErrorData} errorData - An object having the response object, optional statusCode and optional error message.
   * @returns {void}
   */
  static handleNotFound = (errorData: IResponseHandler.ErrorData): void => {
    const { res, error } = errorData;
    const message = error?.message;
    const status = 404;
    res.status(status).json({
      status,
      error: message ?? 'Resource not found',
    });
  };

  /**
   * Handles an error by sending an appropriate JSON response based on the type of error.
   * If the error is an instance of CustomError, it calls handleCustom method.
   * If the error is an instance of ValidationError, it calls handleValidation method.
   * If the error is an instance of NotFoundError, it calls handleNotFound method.
   * Otherwise, it sends a JSON response with a status code of 500 and a generic error message.
   * @param {Object} res - The response object used to send the response.
   * @param {Error} error - The error object to be handled.
   * @returns {void}
   */
  static handleError = (errorData: IResponseHandler.ErrorData): void => {
    const { res, error } = errorData;
    if (error instanceof CustomError) {
      const { statusCode } = error;
      this.handleCustom({ res, statusCode, error });
    } else if (error instanceof ValidationError) this.handleValidation({ res, error });
    else if (error instanceof NotFoundError) this.handleNotFound({ res, error });
    else
      res.status(500).json({
        status: 500,
        error: 'An error occurred',
      });
  };
}
