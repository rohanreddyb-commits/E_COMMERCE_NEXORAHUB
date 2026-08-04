import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

/**
 * Normalise a roles claim that may hold either strings or Role objects.
 * Missing/!array claims collapse to [] so authorization fails closed with a
 * 403 rather than throwing a TypeError that would surface as a 500.
 */
const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) =>
      typeof role === 'string' ? role : (role as { name?: string })?.name ?? ''
    )
    .filter(Boolean);
};

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    const userRoles = normalizeRoles(req.user.roles);
    const hasRole = userRoles.some((role) => roles.includes(role));

    if (!hasRole) {
      logger.warn(
        `[RBAC] Denied ${req.method} ${req.originalUrl} for user_id=${req.user.user_id} ` +
          `(has: ${userRoles.join(',') || 'none'}; needs one of: ${roles.join(',')})`
      );
      return next(new ApiError(403, 'Forbidden: Insufficient privileges'));
    }
    next();
  };
};

export const authorizePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (!permissions.includes(permission)) {
      logger.warn(
        `[RBAC] Denied ${req.method} ${req.originalUrl} for user_id=${req.user.user_id} ` +
          `(missing permission: ${permission})`
      );
      return next(new ApiError(403, 'Forbidden: Missing required permission'));
    }
    next();
  };
};
