import { apiClient } from '@/lib/apiClient';
import type { Notification, Paginated } from '@/types/api';

/** /api/v1/customer/notifications/* — authenticated. */
export const notificationService = {
  list: (
    params: { page?: number; limit?: number; unread?: boolean } = {},
    signal?: AbortSignal
  ) => apiClient.get<Paginated<Notification>>('/notifications', { query: { ...params }, signal }),

  unreadCount: (signal?: AbortSignal) =>
    apiClient.get<{ unreadCount: number }>('/notifications/unread-count', { signal }),

  markAsRead: (id: number) => apiClient.patch<null>(`/notifications/${id}/read`),

  markAllAsRead: () => apiClient.patch<null>('/notifications/read-all'),

  remove: (id: number) => apiClient.delete<null>(`/notifications/${id}`),
};
