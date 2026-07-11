import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface UserPayload {
  userId: number;
  name: string;
  email: string;
  roleId: number;
}

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as any,
  });
};

export const verifyToken = (token: string): UserPayload => {
  return jwt.verify(token, env.JWT_SECRET) as UserPayload;
};
