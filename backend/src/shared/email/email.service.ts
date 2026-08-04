import nodemailer from 'nodemailer';
import { logger } from '../../config/logger';

/**
 * Escape a value for interpolation into an HTML email body.
 *
 * Names, ticket messages and order numbers reach these templates from user
 * and staff input. An unescaped `<` there lets the sender inject markup into
 * a mail that carries our branding — a convincing phishing primitive, and in
 * clients that render it, a link-rewriting vector.
 */
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Partially mask an address so logs remain useful without storing full PII. */
const maskEmail = (email: string): string => {
  const [local, domain] = String(email).split('@');
  if (!domain) return '[invalid-email]';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
};

/**
 * Email service abstraction.
 * Stub mode (no EMAIL_HOST/EMAIL_USER) records that a message would have been
 * sent, without its contents.
 *
 * Nodemailer transport is pre-wired and activates when credentials are set.
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly isStubMode: boolean;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'NexoraHub <noreply@nexorahub.com>';
    this.isStubMode = !process.env.EMAIL_HOST || !process.env.EMAIL_USER;

    if (!this.isStubMode) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      logger.info('[EmailService] SMTP transport initialized');
    } else {
      logger.info('[EmailService] Running in stub mode — emails will be logged to console');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.isStubMode || !this.transporter) {
      // Recipient and subject only. The body carries password-reset and
      // email-verification OTPs; a log is a durable, frequently exported
      // artefact, so writing a live credential there discloses it.
      logger.info(`[EmailService STUB] Would send to ${maskEmail(to)} | SUBJECT: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.fromAddress, to, subject, html });
      logger.info(`[EmailService] Email sent to ${maskEmail(to)}: ${subject}`);
    } catch (err: any) {
      logger.error(`[EmailService] Failed to send email: ${err.message}`);
      throw err;
    }
  }

  async sendEmailVerification(to: string, firstName: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:8px">
        <div style="text-align:center;padding:20px 0">
          <h1 style="color:#6366f1;font-size:28px;margin:0">NexoraHub</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05)">
          <h2 style="color:#1e293b;margin-top:0">Verify Your Email</h2>
          <p style="color:#475569">Hi ${escapeHtml(firstName)},</p>
          <p style="color:#475569">Welcome to NexoraHub! Please use the OTP below to verify your email address.</p>
          <div style="text-align:center;margin:30px 0">
            <div style="display:inline-block;background:#6366f1;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;padding:15px 30px;border-radius:8px">${escapeHtml(otp)}</div>
          </div>
          <p style="color:#64748b;font-size:14px">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#64748b;font-size:14px">If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    `;
    await this.send(to, 'Verify Your NexoraHub Email', html);
  }

  async sendPasswordResetOtp(to: string, firstName: string, otp: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:8px">
        <div style="text-align:center;padding:20px 0">
          <h1 style="color:#6366f1;font-size:28px;margin:0">NexoraHub</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05)">
          <h2 style="color:#1e293b;margin-top:0">Reset Your Password</h2>
          <p style="color:#475569">Hi ${escapeHtml(firstName)},</p>
          <p style="color:#475569">You requested a password reset. Use the OTP below:</p>
          <div style="text-align:center;margin:30px 0">
            <div style="display:inline-block;background:#ef4444;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;padding:15px 30px;border-radius:8px">${escapeHtml(otp)}</div>
          </div>
          <p style="color:#64748b;font-size:14px">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#64748b;font-size:14px">If you didn't request this, please secure your account immediately.</p>
        </div>
      </div>
    `;
    await this.send(to, 'Password Reset OTP - NexoraHub', html);
  }

  async sendOrderConfirmation(to: string, firstName: string, orderNumber: string, total: number): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:8px">
        <div style="text-align:center;padding:20px 0">
          <h1 style="color:#6366f1;font-size:28px;margin:0">NexoraHub</h1>
        </div>
        <div style="background:white;padding:30px;border-radius:8px">
          <h2 style="color:#1e293b">Order Confirmed! 🎉</h2>
          <p style="color:#475569">Hi ${escapeHtml(firstName)}, your order has been confirmed.</p>
          <div style="background:#f1f5f9;padding:15px;border-radius:6px;margin:20px 0">
            <p style="margin:0;color:#475569"><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</p>
            <p style="margin:8px 0 0;color:#475569"><strong>Total:</strong> ₹${total.toFixed(2)}</p>
          </div>
          <p style="color:#475569">We'll notify you when your order ships.</p>
          <p style="color:#64748b;font-size:14px">Thank you for shopping with NexoraHub!</p>
        </div>
      </div>
    `;
    await this.send(to, `Order Confirmed - ${orderNumber} | NexoraHub`, html);
  }

  async sendOrderShipped(to: string, firstName: string, orderNumber: string, trackingNumber: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8fafc;border-radius:8px">
        <div style="background:white;padding:30px;border-radius:8px">
          <h2 style="color:#1e293b">Your Order Is On Its Way! 🚚</h2>
          <p style="color:#475569">Hi ${escapeHtml(firstName)},</p>
          <div style="background:#f1f5f9;padding:15px;border-radius:6px;margin:20px 0">
            <p style="margin:0;color:#475569"><strong>Order Number:</strong> ${escapeHtml(orderNumber)}</p>
            <p style="margin:8px 0 0;color:#475569"><strong>Tracking Number:</strong> ${escapeHtml(trackingNumber)}</p>
          </div>
        </div>
      </div>
    `;
    await this.send(to, `Your Order Shipped - ${orderNumber} | NexoraHub`, html);
  }

  async sendSupportTicketUpdate(to: string, firstName: string, ticketId: number, message: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1e293b">Support Ticket Update</h2>
        <p>Hi ${escapeHtml(firstName)}, there's an update on your support ticket #${escapeHtml(ticketId)}:</p>
        <div style="background:#f1f5f9;padding:15px;border-radius:6px">${escapeHtml(message)}</div>
      </div>
    `;
    await this.send(to, `Support Ticket #${ticketId} Update - NexoraHub`, html);
  }

  async sendRefundProcessed(to: string, firstName: string, orderNumber: string, amount: number): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1e293b">Refund Processed ✅</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>Your refund of <strong>₹${amount.toFixed(2)}</strong> for order <strong>${escapeHtml(orderNumber)}</strong> has been processed.</p>
        <p style="color:#64748b;font-size:14px">Refunds typically reflect in 5-7 business days.</p>
      </div>
    `;
    await this.send(to, `Refund Processed - ${orderNumber} | NexoraHub`, html);
  }
}
