import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "yup";

export const validate = (schema: ObjectSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      next();
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: err.inner ? err.inner.map((e: any) => ({
          field: e.path,
          message: e.message,
        })) : [err.message],
      });
    }
  };
};
export const validateQuery = (schema: ObjectSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      next();
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: "Query validation failed",
        errors: err.inner ? err.inner.map((e: any) => ({
          field: e.path,
          message: e.message,
        })) : [err.message],
      });
    }
  };
};
