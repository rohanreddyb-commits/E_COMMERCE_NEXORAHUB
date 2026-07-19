import { IPaymentGateway, PaymentIntent, PaymentVerificationResult } from './payment.gateway.interface';
import { logger } from '../../../config/logger';

/**
 * Simulated gateway for development/testing.
 * Always succeeds — replace with real gateway in production.
 */
export class SimulatedGateway implements IPaymentGateway {
  name = 'Simulated';

  async createPaymentIntent(orderId: number, amount: number, currency: string): Promise<PaymentIntent> {
    const gatewayOrderId = `SIM_${orderId}_${Date.now()}`;
    logger.info(`[SimulatedGateway] Creating payment intent for order ${orderId}: ₹${amount}`);
    return {
      gatewayOrderId,
      amount,
      currency,
      gatewayData: {
        gatewayOrderId,
        key: 'simulated_key',
        amount: amount * 100, // paise
        currency,
        description: `NexoraHub Order #${orderId}`,
      },
    };
  }

  async verifyPayment(paymentData: Record<string, string>): Promise<PaymentVerificationResult> {
    logger.info(`[SimulatedGateway] Verifying payment: ${JSON.stringify(paymentData)}`);
    // In simulation, any non-empty gatewayPaymentId = success
    const success = !!(paymentData.gatewayPaymentId || paymentData.razorpay_payment_id);
    return {
      success,
      gatewayTransactionId: paymentData.gatewayPaymentId || `SIM_TXN_${Date.now()}`,
      amount: parseFloat(paymentData.amount || '0'),
      status: success ? 'Success' : 'Failed',
      rawResponse: paymentData,
    };
  }

  async processRefund(transactionId: string, amount: number): Promise<{ success: boolean; refundId: string }> {
    logger.info(`[SimulatedGateway] Processing refund for transaction ${transactionId}: ₹${amount}`);
    return { success: true, refundId: `SIM_REFUND_${Date.now()}` };
  }
}

/**
 * Razorpay gateway stub — wire up razorpay package when ready.
 * Install: npm install razorpay @types/razorpay
 */
export class RazorpayGateway implements IPaymentGateway {
  name = 'Razorpay';

  async createPaymentIntent(orderId: number, amount: number, currency: string): Promise<PaymentIntent> {
    // TODO: const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    // const order = await razorpay.orders.create({ amount: amount * 100, currency, receipt: `order_${orderId}` });
    throw new Error('Razorpay gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }

  async verifyPayment(paymentData: Record<string, string>): Promise<PaymentVerificationResult> {
    // TODO: verify HMAC signature
    throw new Error('Razorpay gateway not configured.');
  }

  async processRefund(transactionId: string, amount: number): Promise<{ success: boolean; refundId: string }> {
    throw new Error('Razorpay gateway not configured.');
  }
}

/**
 * Factory: returns the configured gateway based on env.
 */
export function getPaymentGateway(): IPaymentGateway {
  const gateway = process.env.PAYMENT_GATEWAY || 'simulated';
  if (gateway === 'razorpay') return new RazorpayGateway();
  return new SimulatedGateway();
}
