import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/response.util';
import { HTTP_STATUS, CUSTOMER_ERRORS } from '../../core/constants/customer.constants';

/**
 * Validates express-validator results and returns 422 with details on failure.
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg,
      value: err.type === 'field' ? (err as any).value : undefined,
    }));

    res.status(HTTP_STATUS.UNPROCESSABLE).json(
      errorResponse(
        'Validation failed. Please check your input.',
        HTTP_STATUS.UNPROCESSABLE,
        CUSTOMER_ERRORS.VALIDATION_FAILED,
        formattedErrors,
        req.requestId
      )
    );
    return;
  }
  next();
};
