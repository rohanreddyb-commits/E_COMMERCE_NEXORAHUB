import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomerAuthPayload } from '../../modules/authentication/dto/auth.dto';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';

/**
 * Customer authentication middleware.
 * Verifies JWT access token and attaches customer payload to req.customer.
 * Does NOT interfere with the admin auth middleware.
 */
export const authenticateCustomer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required. Please provide a valid Bearer token.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as CustomerAuthPayload;

    // Ensure this is a customer token (has sessionId field from our new flow)
    if (!decoded.userId || !decoded.sessionId) {
      return next(new ApiError(401, 'Invalid token format.'));
    }

    req.customer = {
      userId: decoded.userId,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'Access token has expired. Please refresh your token.'));
    }
    return next(new ApiError(401, 'Invalid access token.'));
  }
};

/**
 * Optional auth — attaches customer if token is present, proceeds otherwise.
 * Used for public endpoints that have different behavior when authenticated.
 */
export const optionalAuthCustomer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as CustomerAuthPayload;
    if (decoded.userId && decoded.sessionId) {
      req.customer = decoded;
    }
  } catch {
    // Silently ignore — optional auth
  }
  next();
};
