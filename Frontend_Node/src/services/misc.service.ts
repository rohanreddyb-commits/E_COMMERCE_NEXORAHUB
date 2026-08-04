import { apiClient } from '@/lib/apiClient';
import type {
  LoyaltyDashboard,
  LoyaltyTransaction,
  Paginated,
  ProductSummary,
  ReturnRequest,
  ReturnRequestPayload,
} from '@/types/api';

/** /api/v1/customer/recommendations/* */
export const recommendationService = {
  /** Requires auth; falls back to featured/trending server-side for new customers. */
  personalized: (signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>('/recommendations/personalized', { signal }),

  frequentlyBoughtTogether: (productId: number, signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>(
      `/recommendations/frequently-bought-together/${productId}`,
      { signal }
    ),
};

/** /api/v1/customer/loyalty/* — authenticated. */
export const loyaltyService = {
  dashboard: (signal?: AbortSignal) => apiClient.get<LoyaltyDashboard>('/loyalty', { signal }),

  history: (params: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiClient.get<Paginated<LoyaltyTransaction>>('/loyalty/history', {
      query: { ...params },
      signal,
    }),
};

/** /api/v1/customer/returns/* — authenticated. 7-day window on Delivered orders. */
export const returnService = {
  request: (payload: ReturnRequestPayload) => apiClient.post<ReturnRequest>('/returns', payload),

  list: (params: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiClient.get<Paginated<ReturnRequest>>('/returns', { query: { ...params }, signal }),

  detail: (returnId: number, signal?: AbortSignal) =>
    apiClient.get<ReturnRequest>(`/returns/${returnId}`, { signal }),
};
