import { apiClient } from '@/lib/apiClient';
import type {
  Brand,
  Category,
  Paginated,
  ProductDetail,
  ProductQuery,
  ProductSummary,
} from '@/types/api';

/** GET /api/v1/customer/products/* — public, optional auth for view tracking. */
export const productService = {
  list: (query: ProductQuery = {}, signal?: AbortSignal) =>
    apiClient.get<Paginated<ProductSummary>>('/products', {
      query: { ...query },
      signal,
    }),

  detail: (productId: number | string, signal?: AbortSignal) =>
    apiClient.get<ProductDetail>(`/products/${productId}`, { signal }),

  featured: (signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>('/products/featured', { signal }),

  newArrivals: (signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>('/products/new-arrivals', { signal }),

  bestSellers: (signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>('/products/best-sellers', { signal }),

  related: (productId: number | string, signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>(`/products/${productId}/related`, { signal }),

  recentlyViewed: (signal?: AbortSignal) =>
    apiClient.get<ProductSummary[]>('/products/recently-viewed', { signal }),
};

/**
 * Categories and brands are served by the legacy /api routes, whose GET
 * handlers are public. Reused rather than duplicated under /v1/customer.
 */
export const catalogService = {
  categories: (signal?: AbortSignal) =>
    apiClient.get<Category[]>('/categories', { legacy: true, withAuth: false, signal }),

  brands: (signal?: AbortSignal) =>
    apiClient.get<Brand[]>('/brands', { legacy: true, withAuth: false, signal }),
};
