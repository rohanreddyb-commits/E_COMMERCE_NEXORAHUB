import { apiClient } from '@/lib/apiClient';
import type {
  Paginated,
  PaymentHistoryItem,
  PaymentIntentResponse,
  PaymentVerifyResult,
} from '@/types/api';

/**
 * /api/v1/customer/payments/* — authenticated.
 *
 * The backend abstracts gateways behind IPaymentGateway (currently the
 * Simulated gateway, with a Razorpay implementation stubbed in). The frontend
 * only ever calls initiate → verify, so swapping gateways server-side needs no
 * change here.
 */
export const paymentService = {
  initiate: (orderId: number) =>
    apiClient.post<PaymentIntentResponse>('/payments/initiate', { orderId }),

  verify: (orderId: number, gatewayPayload: Record<string, string> = {}) =>
    apiClient.post<PaymentVerifyResult>('/payments/verify', { orderId, ...gatewayPayload }),

  history: (params: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiClient.get<Paginated<PaymentHistoryItem>>('/payments/history', {
      query: { ...params },
      signal,
    }),
};
