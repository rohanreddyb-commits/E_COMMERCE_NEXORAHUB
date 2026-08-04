'use client';

import React, { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { orderService, paymentService, returnService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { getImageUrl, formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge, Button, Field, Modal, Select, Textarea } from '@/components/ui/Primitives';
import { ErrorState, ListRowSkeleton, Skeleton } from '@/components/ui/Feedback';
import {
  ORDER_STATUS_ICON,
  ORDER_STATUS_TONE,
  isCancellable,
} from '@/components/account/orderStatus';
import type { OrderItemDetail } from '@/types/api';

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Delivery is taking too long',
  'Changed my mind',
  'Other',
];

const RETURN_REASONS = [
  'Item damaged or defective',
  'Wrong item delivered',
  'Size or fit issue',
  'Not as described',
  'Quality not as expected',
  'Other',
];

const OrderDetailView: React.FC = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const orderId = Number(params.id);
  const isValidId = Number.isFinite(orderId) && orderId > 0;
  const justPlaced = searchParams.get('placed') === '1';

  const order = useApiResource(
    (signal) => orderService.detail(orderId, signal),
    [orderId],
    { enabled: isValidId }
  );

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [returnItem, setReturnItem] = useState<OrderItemDetail | null>(null);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnNote, setReturnNote] = useState('');
  const [returning, setReturning] = useState(false);

  const [payingAgain, setPayingAgain] = useState(false);

  if (!isValidId) {
    return <ErrorState title="Order not found" message="That order link looks malformed." />;
  }

  if (order.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <ListRowSkeleton count={3} />
      </div>
    );
  }

  if (order.error || !order.data) {
    return (
      <div className="space-y-6">
        <ErrorState
          title="Could not load this order"
          message={order.error ?? 'The order does not exist or is not yours.'}
          onRetry={order.reload}
        />
        <Link
          href="/account/orders"
          className="block text-center text-xs font-bold uppercase tracking-widest text-primary underline"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const detail = order.data;
  const canCancel = isCancellable(detail.status);
  const canReturn = detail.status === 'Delivered';
  const paymentOutstanding =
    detail.paymentStatus !== 'Paid' && detail.paymentMethod !== 'COD' && detail.status !== 'Cancelled';

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      const reason = cancelNote.trim() ? `${cancelReason} — ${cancelNote.trim()}` : cancelReason;
      await orderService.cancel(orderId, reason);
      toast.success('Order cancelled. Any refund will be processed in 5–7 business days.');
      setCancelOpen(false);
      order.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  };

  const submitReturn = async () => {
    if (!returnItem) return;
    setReturning(true);
    try {
      await returnService.request({
        orderId,
        orderItemId: returnItem.order_item_id,
        reason: returnReason,
        description: returnNote.trim() || undefined,
      });
      toast.success('Return requested. We will email you once it is reviewed.');
      setReturnItem(null);
      setReturnNote('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not request a return.');
    } finally {
      setReturning(false);
    }
  };

  const retryPayment = async () => {
    setPayingAgain(true);
    try {
      const intent = await paymentService.initiate(orderId);
      if (intent.method === 'COD') {
        toast.info('This is a cash-on-delivery order — pay when it arrives.');
        return;
      }
      const result = await paymentService.verify(orderId, {
        gatewayPaymentId: intent.intent?.gatewayOrderId ?? `web_${orderId}`,
        amount: String(detail.pricing.total),
      });
      if (result.success) {
        toast.success('Payment confirmed.');
        order.reload();
      } else {
        toast.error('Payment could not be confirmed. Please try another method.');
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Payment failed. Please try again.');
    } finally {
      setPayingAgain(false);
    }
  };

  return (
    <div className="space-y-8">
      {justPlaced && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border-l-4 border-secondary bg-secondary-container/50 px-5 py-4"
        >
          <span className="material-symbols-outlined text-2xl text-on-secondary-container">
            check_circle
          </span>
          <div>
            <p className="font-headline text-base font-bold text-on-secondary-container">
              Thank you — your order is confirmed.
            </p>
            <p className="text-sm text-on-secondary-container/80">
              A confirmation email is on its way. You can track progress below.
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div className="space-y-2">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-outline hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
            All orders
          </Link>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
            {detail.orderNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={ORDER_STATUS_TONE[detail.status] ?? 'neutral'}>{detail.status}</Badge>
            <Badge tone={detail.paymentStatus === 'Paid' ? 'success' : 'warning'}>
              Payment {detail.paymentStatus}
            </Badge>
            <span className="text-xs text-outline">
              Placed {formatDateTime(detail.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {paymentOutstanding && (
            <Button onClick={retryPayment} loading={payingAgain} icon="credit_card" className="py-2.5">
              Complete payment
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setCancelOpen(true)}
              icon="cancel"
              className="py-2.5"
            >
              Cancel order
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Timeline */}
          <section className="space-y-4">
            <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
              Order tracking
            </h2>

            {detail.trackingNumber && (
              <p className="rounded-md bg-surface-container px-4 py-3 text-sm">
                Tracking number:{' '}
                <strong className="font-headline text-primary">{detail.trackingNumber}</strong>
              </p>
            )}

            {detail.statusHistory.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No tracking updates recorded yet.
              </p>
            ) : (
              <ol className="relative space-y-6 border-l-2 border-outline-variant/40 pl-6">
                {detail.statusHistory.map((event, index) => {
                  const isLatest = index === detail.statusHistory.length - 1;
                  return (
                    <li key={`${event.status}-${event.changed_at}`} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full',
                          isLatest ? 'bg-primary' : 'bg-outline-variant'
                        )}
                      >
                        <span
                          className={cn(
                            'material-symbols-outlined text-[12px]',
                            isLatest ? 'text-on-primary' : 'text-on-surface-variant'
                          )}
                        >
                          {ORDER_STATUS_ICON[event.status] ?? 'radio_button_checked'}
                        </span>
                      </span>
                      <p
                        className={cn(
                          'font-headline text-sm font-bold',
                          isLatest ? 'text-primary' : 'text-on-surface-variant'
                        )}
                      >
                        {event.status}
                      </p>
                      <p className="text-xs text-outline">{formatDateTime(event.changed_at)}</p>
                      {event.notes && (
                        <p className="mt-1 text-xs text-on-surface-variant">{event.notes}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Items */}
          <section className="space-y-4">
            <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
              Items ({detail.items.length})
            </h2>

            <ul className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              {detail.items.map((item) => (
                <li key={item.order_item_id} className="flex flex-wrap items-center gap-4 p-4">
                  <Link
                    href={`/product/${item.product_id}`}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container"
                  >
                    <Image
                      src={getImageUrl(item.product_image)}
                      alt={item.product_name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${item.product_id}`}>
                      <h3 className="font-headline text-sm font-bold text-primary hover:underline">
                        {item.product_name}
                      </h3>
                    </Link>
                    <p className="text-xs text-outline">SKU {item.sku}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Qty {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-headline text-base font-bold text-primary">
                      {formatCurrency(item.total_price)}
                    </span>
                    <div className="flex gap-3">
                      {canReturn && (
                        <button
                          onClick={() => setReturnItem(item)}
                          className="text-xs font-bold uppercase tracking-wider text-outline hover:text-primary"
                        >
                          Return
                        </button>
                      )}
                      {detail.status === 'Delivered' && (
                        <Link
                          href={`/product/${item.product_id}#reviews`}
                          className="text-xs font-bold uppercase tracking-wider text-outline hover:text-primary"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Side rail */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
            <h2 className="mb-4 font-headline text-base font-bold tracking-tight text-primary">
              Payment summary
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="font-semibold text-primary">
                  {formatCurrency(detail.pricing.subtotal)}
                </dd>
              </div>
              {detail.pricing.discount > 0 && (
                <div className="flex justify-between text-secondary">
                  <dt>Discount</dt>
                  <dd className="font-semibold">−{formatCurrency(detail.pricing.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Shipping</dt>
                <dd className="font-semibold text-primary">
                  {detail.pricing.shippingFee === 0
                    ? 'Free'
                    : formatCurrency(detail.pricing.shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Tax</dt>
                <dd className="font-semibold text-primary">{formatCurrency(detail.pricing.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-outline-variant/30 pt-2 text-base">
                <dt className="font-bold text-primary">Total</dt>
                <dd className="font-headline text-lg font-extrabold text-primary">
                  {formatCurrency(detail.pricing.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-1 border-t border-outline-variant/30 pt-4 text-xs text-on-surface-variant">
              <p>
                Method: <strong className="text-primary">{detail.paymentMethod}</strong>
              </p>
              {detail.payment?.gateway_transaction_id && (
                <p className="break-all">
                  Txn:{' '}
                  <strong className="text-primary">{detail.payment.gateway_transaction_id}</strong>
                </p>
              )}
            </div>
          </section>

          {detail.shippingAddress && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
              <h2 className="mb-3 font-headline text-base font-bold tracking-tight text-primary">
                Delivery address
              </h2>
              <address className="text-sm not-italic leading-relaxed text-on-surface-variant">
                <strong className="text-primary">{detail.shippingAddress.name}</strong>
                <br />
                {detail.shippingAddress.street}
                <br />
                {detail.shippingAddress.city}, {detail.shippingAddress.state}{' '}
                {detail.shippingAddress.postalCode}
                <br />
                {detail.shippingAddress.country}
                <br />
                <span className="text-xs text-outline">{detail.shippingAddress.phone}</span>
              </address>
            </section>
          )}

          {detail.giftMessage && (
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
              <h2 className="mb-2 font-headline text-base font-bold tracking-tight text-primary">
                Gift message
              </h2>
              <p className="text-sm italic text-on-surface-variant">“{detail.giftMessage}”</p>
            </section>
          )}
        </aside>
      </div>

      {/* Cancel dialog */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="py-2.5">
              Keep order
            </Button>
            <Button variant="danger" onClick={confirmCancel} loading={cancelling} className="py-2.5">
              Cancel order
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            This cannot be undone. Stock is returned immediately and any payment is refunded within
            5–7 business days.
          </p>

          <Field label="Reason" required htmlFor="cancel-reason">
            <Select
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            >
              {CANCEL_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Additional detail" hint="Optional" htmlFor="cancel-note">
            <Textarea
              id="cancel-note"
              rows={3}
              maxLength={400}
              value={cancelNote}
              onChange={(event) => setCancelNote(event.target.value)}
              placeholder="Tell us more so we can improve"
            />
          </Field>
        </div>
      </Modal>

      {/* Return dialog */}
      <Modal
        open={!!returnItem}
        onClose={() => setReturnItem(null)}
        title="Request a return"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReturnItem(null)} className="py-2.5">
              Cancel
            </Button>
            <Button onClick={submitReturn} loading={returning} className="py-2.5">
              Submit request
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {returnItem && (
            <p className="rounded-md bg-surface-container px-4 py-3 text-sm">
              Returning <strong className="text-primary">{returnItem.product_name}</strong>
            </p>
          )}
          <p className="text-xs text-outline">
            Returns are accepted within 7 days of delivery and are subject to review.
          </p>

          <Field label="Reason" required htmlFor="return-reason">
            <Select
              id="return-reason"
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
            >
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description" hint="Optional — helps us process it faster." htmlFor="return-note">
            <Textarea
              id="return-note"
              rows={4}
              maxLength={2000}
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
              placeholder="Describe the issue"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<ListRowSkeleton count={4} />}>
      <OrderDetailView />
    </Suspense>
  );
}
