import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomerAuthPayload } from '../../modules/authentication/dto/auth.dto';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { sessionRegistry } from '../../shared/session/session.registry';

/**
 * Decode and cryptographically validate a customer access token.
 *
 * Pins the algorithm, issuer and audience, and requires an explicit token
 * type. Admin tokens are signed with a different key and carry a different
 * audience, so they cannot satisfy this check even though both realms share
 * the Users table.
 */
const verifyCustomerToken = (token: string): CustomerAuthPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE_CUSTOMER,
    algorithms: ['HS256'],
  }) as jwt.JwtPayload & CustomerAuthPayload;

  if (decoded.typ !== 'customer' || !decoded.userId || !decoded.sessionId) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    firstName: decoded.firstName,
    lastName: decoded.lastName,
    roles: decoded.roles || [],
    permissions: decoded.permissions || [],
    sessionId: decoded.sessionId,
  };
};

/**
 * Customer authentication.
 *
 * A valid signature is necessary but not sufficient: the embedded sessionId
 * must still correspond to an active, unexpired row in CustomerSessions.
 * Without that check, logout, logout-all, password reset and account
 * deactivation had no effect until the token expired on its own, so a stolen
 * token survived every containment action the user or support could take.
 */
export const authenticateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required. Please provide a valid Bearer token.'));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please provide a valid Bearer token.'));
  }

  let payload: CustomerAuthPayload;
  try {
    payload = verifyCustomerToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'Access token has expired. Please refresh your token.'));
    }
    return next(new ApiError(401, 'Invalid access token.'));
  }

  try {
    const isActive = await sessionRegistry.isSessionActive(payload.sessionId, payload.userId);
    if (!isActive) {
      return next(new ApiError(401, 'Your session has ended. Please sign in again.'));
    }
  } catch {
    // A registry failure must not silently grant access.
    return next(new ApiError(503, 'Unable to verify your session. Please try again.'));
  }

  req.customer = payload;
  next();
};

/**
 * Optional auth — attaches the customer when a valid, live session is
 * presented and proceeds anonymously otherwise. Used by public endpoints that
 * personalise their response (recently-viewed tracking, search history).
 */
export const optionalAuthCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return next();

  try {
    const payload = verifyCustomerToken(token);
    // Revoked sessions must not receive personalised data either.
    if (await sessionRegistry.isSessionActive(payload.sessionId, payload.userId)) {
      req.customer = payload;
    }
  } catch {
    // Silently ignore — this endpoint works anonymously.
  }
  next();
};
