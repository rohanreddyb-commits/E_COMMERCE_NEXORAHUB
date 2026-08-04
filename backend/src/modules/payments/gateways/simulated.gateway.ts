import crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentIntent,
  PaymentVerificationResult,
} from './payment.gateway.interface';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';

/**
 * Development-only gateway.
 *
 * It still cannot be driven purely from the client: createPaymentIntent
 * returns an HMAC over (gatewayOrderId, amount) keyed on a server secret, and
 * verifyPayment recomputes it. That keeps the local flow honest and means the
 * simulated path exercises the same signature-checking code shape as a real
 * provider.
 *
 * getPaymentGateway() refuses to return this class when NODE_ENV=production.
 */
export class SimulatedGateway implements IPaymentGateway {
  name = 'Simulated';

  /** Derived from the admin secret so it is never a hardcoded constant. */
  private get signingKey(): string {
    return crypto
      .createHmac('sha256', env.JWT_ADMIN_SECRET)
      .update('nexora:simulated-gateway')
      .digest('hex');
  }

  private sign(gatewayOrderId: string, amount: number): string {
    return crypto
      .createHmac('sha256', this.signingKey)
      .update(`${gatewayOrderId}|${amount.toFixed(2)}`)
      .digest('hex');
  }

  async createPaymentIntent(
    orderId: number,
    amount: number,
    currency: string
  ): Promise<PaymentIntent> {
    const gatewayOrderId = `SIM_${orderId}_${Date.now()}`;
    logger.info(`[SimulatedGateway] Creating payment intent for order ${orderId}`);

    return {
      gatewayOrderId,
      amount,
      currency,
      gatewayData: {
        gatewayOrderId,
        key: 'simulated_key',
        amount: Math.round(amount * 100), // paise
        currency,
        description: `NexoraHub Order #${orderId}`,
        // The client echoes this back on verify; it cannot be forged without
        // the server-side signing key.
        signature: this.sign(gatewayOrderId, amount),
      },
    };
  }

  async verifyPayment(paymentData: Record<string, string>): Promise<PaymentVerificationResult> {
    const gatewayOrderId = paymentData.gatewayOrderId || '';
    const signature = paymentData.signature || '';
    const amount = Number.parseFloat(paymentData.amount || '0');

    const failed: PaymentVerificationResult = {
      success: false,
      gatewayTransactionId: '',
      amount: 0,
      status: 'Failed',
      rawResponse: { reason: 'signature_mismatch' },
    };

    if (!gatewayOrderId || !signature || !Number.isFinite(amount)) return failed;

    const expected = this.sign(gatewayOrderId, amount);
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      logger.warn(`[SimulatedGateway] Signature mismatch for ${gatewayOrderId}`);
      return failed;
    }

    return {
      success: true,
      gatewayTransactionId: `SIM_TXN_${gatewayOrderId}`,
      amount,
      status: 'Success',
      // Never echo the raw client payload back into storage.
      rawResponse: { gatewayOrderId, verified: true },
    };
  }

  async processRefund(
    transactionId: string,
    amount: number
  ): Promise<{ success: boolean; refundId: string }> {
    logger.info(`[SimulatedGateway] Refund for transaction ${transactionId}: ${amount}`);
    return { success: true, refundId: `SIM_REFUND_${Date.now()}` };
  }
}

/**
 * Razorpay. Verification is an HMAC-SHA256 over `order_id|payment_id` keyed on
 * the account secret, exactly as documented by the provider, compared in
 * constant time. The authoritative amount comes from the signed payload the
 * client returns and is re-checked against the order total by PaymentService.
 */
export class RazorpayGateway implements IPaymentGateway {
  name = 'Razorpay';

  constructor() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'Razorpay gateway selected but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.'
      );
    }
  }

  async createPaymentIntent(
    orderId: number,
    amount: number,
    currency: string
  ): Promise<PaymentIntent> {
    // The Razorpay Orders API call belongs here once the SDK is installed:
    //   const order = await this.client.orders.create({
    //     amount: Math.round(amount * 100), currency, receipt: `order_${orderId}` });
    // Until then fail loudly rather than silently degrading to no verification.
    throw new Error(
      'Razorpay order creation is not implemented. Install the `razorpay` package and ' +
        'wire RazorpayGateway.createPaymentIntent before enabling this gateway.'
    );
  }

  async verifyPayment(paymentData: Record<string, string>): Promise<PaymentVerificationResult> {
    const orderId = paymentData.razorpay_order_id || '';
    const paymentId = paymentData.razorpay_payment_id || '';
    const providedSignature = paymentData.razorpay_signature || '';

    const failed: PaymentVerificationResult = {
      success: false,
      gatewayTransactionId: '',
      amount: 0,
      status: 'Failed',
      rawResponse: { reason: 'signature_verification_failed' },
    };

    if (!orderId || !paymentId || !providedSignature) return failed;

    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(providedSignature, 'hex');

    if (
      expectedBuf.length !== providedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
      logger.warn(`[RazorpayGateway] Signature verification failed for order ${orderId}`);
      return failed;
    }

    // With the SDK installed, replace this with an authoritative fetch:
    //   const payment = await this.client.payments.fetch(paymentId);
    //   return { success: payment.status === 'captured', amount: payment.amount / 100, ... };
    throw new Error(
      'Razorpay signature verified, but the authoritative payment fetch is not implemented. ' +
        'Install the `razorpay` package and complete RazorpayGateway.verifyPayment.'
    );
  }

  async processRefund(): Promise<{ success: boolean; refundId: string }> {
    throw new Error('Razorpay refunds are not implemented.');
  }
}

/**
 * Gateway factory.
 *
 * The simulator approves anything it has signed and performs no real capture,
 * so selecting it in production would mean shipping goods for free. That is a
 * boot-time error, not a warning.
 */
export function getPaymentGateway(): IPaymentGateway {
  const configured = (env.PAYMENT_GATEWAY || 'simulated').toLowerCase();

  if (env.IS_PRODUCTION && (configured === 'simulated' || !configured)) {
    throw new Error(
      'FATAL: the simulated payment gateway cannot be used in production. ' +
        'Set PAYMENT_GATEWAY to a real provider (e.g. razorpay) and configure its credentials.'
    );
  }

  switch (configured) {
    case 'razorpay':
      return new RazorpayGateway();
    case 'simulated':
      return new SimulatedGateway();
    default:
      throw new Error(`Unknown PAYMENT_GATEWAY '${configured}'. Expected: simulated | razorpay.`);
  }
}

/**
 * Called once at startup so a misconfigured gateway fails the deploy rather
 * than the first customer checkout.
 */
export function assertPaymentGatewayConfigured(): void {
  const gateway = getPaymentGateway();
  logger.info(`[Payments] Gateway configured: ${gateway.name}`);
}
