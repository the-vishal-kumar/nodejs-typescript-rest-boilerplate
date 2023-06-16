import { Response } from 'express';

interface SuccessData {
  res: Response;
  statusCode?: number;
  data?: object;
}

interface ErrorData {
  res: Response;
  statusCode?: number;
  error?: Error;
  errors?: string[];
}

export { SuccessData, ErrorData };
