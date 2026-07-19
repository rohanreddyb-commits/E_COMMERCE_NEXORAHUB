/**
 * Payment Gateway Interface.
 * All payment gateway implementations must implement this interface.
 * Allows swapping gateways with zero changes to checkout/payment service.
 */
export interface PaymentIntent {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  gatewayData: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  success: boolean;
  gatewayTransactionId: string;
  amount: number;
  status: 'Success' | 'Failed' | 'Pending';
  rawResponse: Record<string, unknown>;
}

export interface IPaymentGateway {
  name: string;
  createPaymentIntent(orderId: number, amount: number, currency: string): Promise<PaymentIntent>;
  verifyPayment(paymentData: Record<string, string>): Promise<PaymentVerificationResult>;
  processRefund(transactionId: string, amount: number): Promise<{ success: boolean; refundId: string }>;
}
