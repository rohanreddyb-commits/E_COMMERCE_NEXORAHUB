import { CouponRepository, CouponDB } from "../repositories/couponRepository";
import { NotFoundError, BadRequestError } from "../utils/customError";

export class CouponService {
  /**
   * Quote a coupon without consuming it.
   *
   * This must apply exactly the same predicates as the atomic claim in
   * CheckoutService.placeOrder — start_date, usage_limit and
   * max_discount_amount included. Quoting a discount the checkout will then
   * refuse (or, worse, a larger one than it grants) is both a support burden
   * and a pricing-integrity problem.
   *
   * Uniform error messages avoid disclosing whether a guessed code exists.
   */
  static async validateCoupon(
    code: string,
    orderAmount: number
  ): Promise<CouponDB & { calculatedDiscount: number }> {
    const coupon = await CouponRepository.getCouponByCode(code.toUpperCase());

    const invalid = () => new BadRequestError("This coupon is invalid, expired, or fully redeemed.");

    if (!coupon) throw invalid();
    if (!coupon.is_active) throw invalid();

    const now = new Date();
    if (new Date(coupon.expiry_date) < now) throw invalid();

    // Not yet started.
    const startDate = (coupon as any).start_date;
    if (startDate && new Date(startDate) > now) throw invalid();

    // Global redemption cap — previously ignored here, so an exhausted coupon
    // still quoted a discount.
    const usageLimit = (coupon as any).usage_limit;
    const usedCount = (coupon as any).used_count ?? 0;
    if (usageLimit !== null && usageLimit !== undefined && usedCount >= usageLimit) {
      throw invalid();
    }

    // Minimum spend is a legitimate, non-sensitive constraint to disclose.
    if (orderAmount < coupon.min_order_amount) {
      throw new BadRequestError(
        `This coupon requires a minimum purchase of ₹${Number(coupon.min_order_amount).toFixed(2)}.`
      );
    }

    let calculatedDiscount = 0;
    if (coupon.discount_type === "Percentage") {
      calculatedDiscount = Number(((coupon.discount_value / 100) * orderAmount).toFixed(2));
      // max_discount_amount was not applied here, so a percentage coupon could
      // be quoted above its own cap.
      const cap = (coupon as any).max_discount_amount;
      if (cap !== null && cap !== undefined && calculatedDiscount > Number(cap)) {
        calculatedDiscount = Number(Number(cap).toFixed(2));
      }
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
