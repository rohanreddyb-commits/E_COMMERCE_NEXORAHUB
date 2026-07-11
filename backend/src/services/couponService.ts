import { CouponRepository, CouponDB } from "../repositories/couponRepository";
import { NotFoundError, BadRequestError } from "../utils/customError";

export class CouponService {
  static async validateCoupon(
    code: string,
    orderAmount: number
  ): Promise<CouponDB & { calculatedDiscount: number }> {
    const coupon = await CouponRepository.getCouponByCode(code.toUpperCase());
    
    if (!coupon) {
      throw new NotFoundError("Coupon code not found.");
    }

    if (!coupon.is_active) {
      throw new BadRequestError("This coupon is no longer active.");
    }

    // Verify expiry date
    const now = new Date();
    if (new Date(coupon.expiry_date) < now) {
      throw new BadRequestError("This coupon has expired.");
    }

    // Verify minimum order amount
    if (orderAmount < coupon.min_order_amount) {
      throw new BadRequestError(
        `This coupon requires a minimum purchase of ₹${coupon.min_order_amount.toFixed(2)}. Your cart total is ₹${orderAmount.toFixed(
          2
        )}.`
      );
    }

    // Calculate coupon value
    let calculatedDiscount = 0;
    if (coupon.discount_type === "Percentage") {
      calculatedDiscount = Number(((coupon.discount_value / 100) * orderAmount).toFixed(2));
    } else {
      // Fixed amount discount cannot exceed the order amount itself
      calculatedDiscount = Math.min(Number(coupon.discount_value), orderAmount);
    }

    return {
      ...coupon,
      calculatedDiscount,
    };
  }

  // --- Admin Coupon CRUD Services ---

  static async createCoupon(
    code: string,
    discountType: "Percentage" | "Fixed",
    discountValue: number,
    minOrderAmount: number,
    expiryDate: Date,
    isActive: boolean = true
  ): Promise<number> {
    const existing = await CouponRepository.getCouponByCode(code.toUpperCase());
    if (existing) {
      throw new BadRequestError(`Coupon with code ${code.toUpperCase()} already exists.`);
    }

    return CouponRepository.createCoupon(
      code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount,
      expiryDate,
      isActive
    );
  }

  static async getCoupons(): Promise<CouponDB[]> {
    return CouponRepository.getAllCoupons();
  }

  static async getCouponById(couponId: number): Promise<CouponDB> {
    const coupon = await CouponRepository.getCouponById(couponId);
    if (!coupon) {
      throw new NotFoundError(`Coupon with ID ${couponId} not found.`);
    }
    return coupon;
  }

  static async updateCoupon(
    couponId: number,
    code: string,
    discountType: "Percentage" | "Fixed",
    discountValue: number,
    minOrderAmount: number,
    expiryDate: Date,
    isActive: boolean
  ): Promise<void> {
    await this.getCouponById(couponId); // Verification check

    const success = await CouponRepository.updateCoupon(
      couponId,
      code.toUpperCase(),
      discountType,
      discountValue,
      minOrderAmount,
      expiryDate,
      isActive
    );

    if (!success) {
      throw new BadRequestError("Failed to update coupon.");
    }
  }

  static async deleteCoupon(couponId: number): Promise<void> {
    await this.getCouponById(couponId); // Verification check
    const success = await CouponRepository.deleteCoupon(couponId);
    if (!success) {
      throw new BadRequestError("Failed to delete coupon.");
    }
  }
}
