import { apiClient } from '@/lib/apiClient';
import type { Address, AddressPayload } from '@/types/api';

/** /api/v1/customer/addresses/* — authenticated. Max 10 per customer. */
export const addressService = {
  list: (signal?: AbortSignal) => apiClient.get<Address[]>('/addresses', { signal }),

  get: (id: number) => apiClient.get<Address>(`/addresses/${id}`),

  create: (payload: AddressPayload) => apiClient.post<Address>('/addresses', payload),

  update: (id: number, payload: AddressPayload) =>
    apiClient.put<Address>(`/addresses/${id}`, payload),

  remove: (id: number) => apiClient.delete<null>(`/addresses/${id}`),

  setDefault: (id: number) => apiClient.patch<null>(`/addresses/${id}/default`),
};
