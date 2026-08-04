import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

/**
 * Terminal error handler.
 *
 * Only messages the application authored (ApiError) are ever sent to the
 * client. Anything else — a driver error, a TypeError, a parse failure — is
 * logged in full server-side and replaced with a generic message, because
 * mssql errors carry table, column and constraint names that map out the
 * schema for an attacker, and stack traces expose filesystem paths and module
 * layout.
 *
 * The response never spreads the error object and never includes a stack,
 * in any environment.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode: number;
  let message: string;
  let errors: any[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = Array.isArray(err.errors) ? err.errors : [];
  } else if (err instanceof multer.MulterError) {
    // Upload failures are user-actionable, so surface a safe summary.
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Too many files, or an unexpected file field was supplied.'
        : 'File upload failed.';
  } else if (err?.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
  } else {
    statusCode = 500;
    message = 'An unexpected error occurred. Please try again.';
  }

  const logLine =
    `[${req.requestId ?? '-'}] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err?.message}`;

  if (statusCode >= 500) {
    logger.error(`${logLine}\n${err?.stack ?? '(no stack)'}`);
  } else {
    logger.warn(logLine);
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    // Correlates a user-visible failure with the full server-side record
    // without disclosing anything about it.
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};

/** 404 handler for unmatched routes — keeps unknown paths on the JSON contract. */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: 'The requested resource was not found.',
    errors: [],
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};
