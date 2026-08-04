import { apiClient } from '@/lib/apiClient';
import type { WishlistItem } from '@/types/api';

/** /api/v1/customer/wishlist/* — authenticated. */
export const wishlistService = {
  get: (signal?: AbortSignal) => apiClient.get<WishlistItem[]>('/wishlist', { signal }),

  add: (productId: number) => apiClient.post<null>('/wishlist', { productId }),

  remove: (productId: number) => apiClient.delete<null>(`/wishlist/${productId}`),

  /** Adds to cart and removes from wishlist in a single backend call. */
  moveToCart: (productId: number, quantity = 1) =>
    apiClient.post<null>(`/wishlist/${productId}/move-to-cart`, { quantity }),
};
