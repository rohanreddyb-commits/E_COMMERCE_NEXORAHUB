import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/customError";
import { logger } from "../config/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if it is a known custom API error
  if (err instanceof ApiError) {
    logger.warn(`API Error [${req.method} ${req.url}]: ${err.message} (${err.statusCode})`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle express-validator or Yup validation errors (if thrown)
  if (err.name === "ValidationError") {
    logger.warn(`Validation Error [${req.method} ${req.url}]: ${err.message}`);
    res.status(400).json({
      success: false,
      message: err.message,
      errors: (err as any).errors || [],
    });
    return;
  }

  // Handle standard MSSQL database errors (log complete details, but hide internals from user)
  if ((err as any).code === "EREQUEST" || (err as any).number) {
    logger.error(`Database Error [${req.method} ${req.url}]: ${err.message}\nStack: ${err.stack}`);
    res.status(500).json({
      success: false,
      message: "A database error occurred while processing your request.",
    });
    return;
  }

  // Handle all other unexpected errors
  logger.error(`Unexpected Error [${req.method} ${req.url}]: ${err.message}\nStack: ${err.stack}`);
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === "development" ? err.message : "An unexpected server error occurred.",
  });
};
