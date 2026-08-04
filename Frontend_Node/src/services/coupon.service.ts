import { apiClient } from '@/lib/apiClient';
import type { Coupon, CouponValidation } from '@/types/api';

/** /api/v1/customer/coupons/* — public. */
export const couponService = {
  available: (signal?: AbortSignal) =>
    apiClient.get<Coupon[]>('/coupons/available', { withAuth: false, signal }),

  /**
   * Validates without applying. Returns { valid: false, message } for a bad
   * code rather than throwing — surface `message` directly to the customer.
   */
  validate: (code: string, subtotal: number) =>
    apiClient.post<CouponValidation>('/coupons/validate', { code, subtotal }, { withAuth: false }),
};
