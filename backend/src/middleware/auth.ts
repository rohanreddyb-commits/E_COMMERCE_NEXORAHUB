import { Request, Response, NextFunction } from "express";
import { verifyToken, UserPayload } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../utils/customError";

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Access denied. No token provided.");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    throw new UnauthorizedError("Invalid or expired authentication token.");
  }
};

export const authorizeRoles = (...allowedRoles: number[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("User session not authenticated.");
    }

    if (!allowedRoles.includes(req.user.roleId)) {
      throw new ForbiddenError("Access denied. Insufficient permissions.");
    }

    next();
  };
};
