import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    user_id: number;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

/**
 * Admin/staff authentication.
 *
 * Verifies against JWT_ADMIN_SECRET with a pinned issuer and audience, and
 * requires an explicit `typ` claim. A customer access token — signed with a
 * different key and carrying a different audience — cannot satisfy this
 * middleware even though both realms share the Users table.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Unauthorized: Missing or invalid token'));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next(new ApiError(401, 'Unauthorized: Missing or invalid token'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ADMIN_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE_ADMIN,
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;

    if (decoded.typ !== 'admin') {
      return next(new ApiError(401, 'Unauthorized: Invalid token'));
    }

    const userId = decoded.userId ?? decoded.user_id;
    if (typeof userId !== 'number') {
      return next(new ApiError(401, 'Unauthorized: Invalid token'));
    }

    // Normalise to string[] and fail closed on a missing claim rather than
    // letting rbac.middleware throw a TypeError that surfaces as a 500.
    req.user = {
      user_id: userId,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      roles: Array.isArray(decoded.roles)
        ? decoded.roles.map((r: unknown) =>
            typeof r === 'string' ? r : String((r as { name?: string })?.name ?? '')
          )
        : [],
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError(401, 'Unauthorized: Token has expired'));
    }
    next(new ApiError(401, 'Unauthorized: Invalid token'));
  }
};
