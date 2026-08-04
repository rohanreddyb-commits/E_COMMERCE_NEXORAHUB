import { apiClient } from '@/lib/apiClient';
import type {
  OrderDetail,
  OrderListItem,
  OrderStatus,
  OrderStatusEvent,
  Paginated,
  RecentOrder,
} from '@/types/api';

/** /api/v1/customer/orders/* — authenticated. */
export const orderService = {
  list: (
    params: { page?: number; limit?: number; status?: OrderStatus | string } = {},
    signal?: AbortSignal
  ) => apiClient.get<Paginated<OrderListItem>>('/orders', { query: { ...params }, signal }),

  recent: (signal?: AbortSignal) => apiClient.get<RecentOrder[]>('/orders/recent', { signal }),

  detail: (orderId: number, signal?: AbortSignal) =>
    apiClient.get<OrderDetail>(`/orders/${orderId}`, { signal }),

  timeline: (orderId: number, signal?: AbortSignal) =>
    apiClient.get<OrderStatusEvent[]>(`/orders/${orderId}/timeline`, { signal }),

  cancel: (orderId: number, reason?: string) =>
    apiClient.post<null>(`/orders/${orderId}/cancel`, { reason }),
};
