import { apiClient } from '@/lib/apiClient';
import type { MyReview, Paginated, ProductReviews, ReviewPayload } from '@/types/api';

/** /api/v1/customer/reviews/* — product reviews are public, mutations are not. */
export const reviewService = {
  forProduct: (
    productId: number,
    params: { page?: number; limit?: number; sort?: 'recent' | 'rating_high' | 'rating_low' | 'helpful' } = {},
    signal?: AbortSignal
  ) =>
    apiClient.get<ProductReviews>(`/reviews/product/${productId}`, {
      query: { ...params },
      signal,
    }),

  create: (productId: number, payload: ReviewPayload) =>
    apiClient.post<{ reviewId: number; isVerifiedPurchase: boolean; message: string }>(
      `/reviews/product/${productId}`,
      payload
    ),

  update: (reviewId: number, payload: Partial<ReviewPayload>) =>
    apiClient.patch<{ message: string }>(`/reviews/${reviewId}`, payload),

  remove: (reviewId: number) => apiClient.delete<null>(`/reviews/${reviewId}`),

  voteHelpful: (reviewId: number) => apiClient.post<null>(`/reviews/${reviewId}/helpful`),

  mine: (params: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiClient.get<Paginated<MyReview>>('/reviews/me', { query: { ...params }, signal }),
};
