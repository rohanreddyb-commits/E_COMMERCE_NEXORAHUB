import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique requestId and correlationId to every request.
 * requestId — per-request UUID for distributed tracing.
 * correlationId — can be passed by client for end-to-end correlation.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.requestId = uuidv4();
  req.correlationId = (req.headers['x-correlation-id'] as string) || req.requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Correlation-ID', req.correlationId);

  next();
};
