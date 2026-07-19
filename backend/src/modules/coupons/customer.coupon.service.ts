import { executeQuery } from '../../database/db';
import sql from 'mssql';
import { cacheService } from '../../common/cache/cache.factory';
import { CACHE_KEYS, CACHE_TTL } from '../../core/constants/customer.constants';

export class CustomerCouponService {
  async getAvailableCoupons() {
    const query = `
      SELECT coupon_id, code, description, discount_type, discount_value,
             min_order_amount, max_discount_amount, expiry_date
      FROM Coupons
      WHERE is_active = 1
        AND expiry_date > GETDATE()
        AND (start_date IS NULL OR start_date <= GETDATE())
        AND (usage_limit IS NULL OR used_count < usage_limit)
      ORDER BY expiry_date ASC
    `;
    const result = await executeQuery(query);
    return result.recordset.map((c: any) => ({
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minOrderAmount: c.min_order_amount,
      maxDiscountAmount: c.max_discount_amount,
      expiresAt: c.expiry_date,
    }));
  }

  async validateCoupon(code: string, subtotal: number) {
    const query = `
      SELECT * FROM Coupons
      WHERE code = @code AND is_active = 1 AND expiry_date > GETDATE()
        AND (start_date IS NULL OR start_date <= GETDATE())
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `;
    const result = await executeQuery(query, {
      code: { type: sql.VarChar(50), value: code.toUpperCase() },
    });

    const coupon = result.recordset[0];
    if (!coupon) {
      return { valid: false, message: 'Invalid or expired coupon code.' };
    }

    if (subtotal < coupon.min_order_amount) {
      return {
        valid: false,
        message: `Minimum order amount of ₹${coupon.min_order_amount} required to use this coupon.`,
      };
    }

    const { calculateDiscount } = await import('../../common/utils/helpers.util');
    const discountAmount = calculateDiscount(
      subtotal,
      coupon.discount_type,
      coupon.discount_value,
      coupon.max_discount_amount
    );

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      discountAmount,
      message: `Coupon is valid! You save ₹${discountAmount.toFixed(2)}.`,
    };
  }
}
