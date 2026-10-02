// Standardized API Response & Error Handlers
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200, meta?: ApiResponse['meta']) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: AppError | Error | string, statusCode: number = 400, code: string = 'ERROR', details?: any) {
  if (error instanceof AppError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
    return res.status(error.statusCode).json(payload);
  }

  const message = typeof error === 'string' ? error : error.message;
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
  return res.status(statusCode).json(payload);
}
