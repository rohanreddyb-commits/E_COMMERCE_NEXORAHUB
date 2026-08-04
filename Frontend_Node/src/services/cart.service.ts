import { apiClient } from '@/lib/apiClient';
import type { AppliedCoupon, Cart, SavedCartItem } from '@/types/api';

/** GET/POST /api/v1/customer/cart/* — all routes require authentication. */
export const cartService = {
  get: (signal?: AbortSignal) => apiClient.get<Cart>('/cart', { signal }),

  addItem: (productId: number, quantity = 1) =>
    apiClient.post<Cart>('/cart/items', { productId, quantity }),

  updateItem: (cartItemId: number, quantity: number) =>
    apiClient.patch<Cart>(`/cart/items/${cartItemId}`, { quantity }),

  removeItem: (cartItemId: number) => apiClient.delete<Cart>(`/cart/items/${cartItemId}`),

  clear: () => apiClient.delete<null>('/cart'),

  saveForLater: (cartItemId: number) =>
    apiClient.post<{ message: string }>(`/cart/items/${cartItemId}/save-for-later`),

  getSaved: (signal?: AbortSignal) =>
    apiClient.get<SavedCartItem[]>('/cart/saved', { signal }),

  moveSavedToCart: (cartItemId: number) =>
    apiClient.post<Cart>(`/cart/saved/${cartItemId}/move-to-cart`),

  applyCoupon: (couponCode: string) =>
    apiClient.post<AppliedCoupon>('/cart/apply-coupon', { couponCode }),
};
