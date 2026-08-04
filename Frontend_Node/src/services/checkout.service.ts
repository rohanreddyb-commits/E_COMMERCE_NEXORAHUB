import { apiClient } from '@/lib/apiClient';
import type { OrderTotals, PlaceOrderPayload, PlaceOrderResult } from '@/types/api';

/**
 * /api/v1/customer/checkout/* — authenticated.
 *
 * placeOrder sends an X-Idempotency-Key so a retried or double-submitted
 * request returns the original order instead of creating a duplicate.
 */
export const checkoutService = {
  summary: (
    payload: { addressId: number; couponCode?: string; pointsToRedeem?: number },
    signal?: AbortSignal
  ) => apiClient.post<OrderTotals>('/checkout/summary', payload, { signal }),

  placeOrder: (payload: PlaceOrderPayload, idempotencyKey: string) =>
    apiClient.post<PlaceOrderResult>('/checkout/place-order', payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),
};

/** Stable key for one checkout attempt. Survives retries within a session. */
export const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
