import { Request, Response, NextFunction } from "express";
import { CouponService } from "../services/couponService";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/customError";

export class CouponController {
  // Validate a coupon for customer checkout
  static async validate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, orderAmount } = req.body;
      const result = await CouponService.validateCoupon(code, parseFloat(orderAmount));

      res.status(200).json({
        success: true,
        valid: true,
        discountType: result.discount_type,
        discountValue: result.discount_value,
        calculatedDiscount: result.calculatedDiscount,
      });
    } catch (err) {
      next(err);
    }
  }

  // --- Admin Coupon Management Handlers ---

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, discountType, discountValue, minOrderAmount, expiryDate, isActive } = req.body;
      
      const couponId = await CouponService.createCoupon(
        code,
        discountType,
        parseFloat(discountValue),
        parseFloat(minOrderAmount),
        new Date(expiryDate),
        isActive
      );

      res.status(201).json({
        success: true,
        message: "Coupon created successfully.",
        couponId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = await CouponService.getCoupons();
      res.status(200).json({
        success: true,
        coupons,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const couponId = parseInt(req.params.id, 10);
      if (isNaN(couponId)) {
        throw new BadRequestError("Invalid coupon ID.");
      }

      const coupon = await CouponService.getCouponById(couponId);
      res.status(200).json({
        success: true,
        coupon,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const couponId = parseInt(req.params.id, 10);
      if (isNaN(couponId)) {
        throw new BadRequestError("Invalid coupon ID.");
      }

      const { code, discountType, discountValue, minOrderAmount, expiryDate, isActive } = req.body;

      await CouponService.updateCoupon(
        couponId,
        code,
        discountType,
        parseFloat(discountValue),
        parseFloat(minOrderAmount),
        new Date(expiryDate),
        isActive
      );

      res.status(200).json({
        success: true,
        message: "Coupon updated successfully.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const couponId = parseInt(req.params.id, 10);
      if (isNaN(couponId)) {
        throw new BadRequestError("Invalid coupon ID.");
      }

      await CouponService.deleteCoupon(couponId);

      res.status(200).json({
        success: true,
        message: "Coupon deleted successfully.",
      });
    } catch (err) {
      next(err);
    }
  }
}
