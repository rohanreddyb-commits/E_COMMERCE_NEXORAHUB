import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ApiError } from '../utils/ApiError';

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    const hasRole = req.user.roles.some((role: any) => 
      roles.includes(typeof role === 'string' ? role : role.name)
    );
    if (!hasRole) {
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

    if (!req.user.permissions.includes(permission)) {
      return next(new ApiError(403, 'Forbidden: Missing required permission'));
    }
    next();
  };
};
