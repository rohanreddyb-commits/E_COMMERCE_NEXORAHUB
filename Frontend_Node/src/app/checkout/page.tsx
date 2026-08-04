'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addressService,
  checkoutService,
  createIdempotencyKey,
  loyaltyService,
  paymentService,
} from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useCartStore, useCartLines } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { getImageUrl, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AddressForm } from '@/components/account/AddressForm';
import { Button, Field, Input, Modal } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton, Spinner } from '@/components/ui/Feedback';
import type { Address, OrderTotals, PaymentMethod } from '@/types/api';

/** Only the methods the backend's placeOrderValidation accepts. */
const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string; icon: string }[] = [
  { value: 'COD', label: 'Cash on Delivery', hint: 'Pay when your order arrives', icon: 'payments' },
  { value: 'Card', label: 'Card', hint: 'Credit or debit card', icon: 'credit_card' },
  { value: 'UPI', label: 'UPI', hint: 'Pay via any UPI app', icon: 'qr_code_2' },
  {
    value: 'Wallet',
    label: 'Wallet',
    hint: 'Pay from your wallet balance',
    icon: 'account_balance_wallet',
  },
];

const CheckoutFlow: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const lines = useCartLines();
  const hydrated = useCartStore((s) => s.hydrated);
  const cartLoading = useCartStore((s) => s.loading);
  const fetchCart = useCartStore((s) => s.fetchCart);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [pointsInput, setPointsInput] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [giftMessage, setGiftMessage] = useState('');

  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  /**
   * One idempotency key per checkout session. Reusing it means a retry after a
   * network blip returns the original order instead of creating a second one.
   */
  const idempotencyKey = useRef(createIdempotencyKey());

  const addresses = useApiResource((signal) => addressService.list(signal), []);
  const loyalty = useApiResource((signal) => loyaltyService.dashboard(signal), []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Default to the customer's default address, else the first one.
  useEffect(() => {
    if (selectedAddressId !== null || !addresses.data?.length) return;
    const preferred = addresses.data.find((address) => address.is_default) ?? addresses.data[0];
    setSelectedAddressId(preferred.address_id);
  }, [addresses.data, selectedAddressId]);

  const lineSubtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [lines]
  );

  /**
   * The backend is the only authority on pricing, so every input change
   * re-requests /checkout/summary instead of recomputing anything here.
   */
  const refreshSummary = useCallback(async () => {
    if (!selectedAddressId || lines.length === 0) {
      setTotals(null);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await checkoutService.summary({
        addressId: selectedAddressId,
        couponCode: appliedCoupon,
        pointsToRedeem: pointsToRedeem || undefined,
      });
      setTotals(result);
    } catch (error) {
      setTotals(null);
      const message =
        error instanceof ApiError ? error.message : 'Could not calculate your order total.';
      setSummaryError(message);

      // A rejected coupon must not stick, or every later preview fails too.
      if (appliedCoupon && error instanceof ApiError && error.statusCode === 400) {
        setAppliedCoupon(undefined);
        toast.error(message);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedAddressId, appliedCoupon, pointsToRedeem, lines.length, toast]);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  const maxRedeemablePoints = useMemo(() => {
    const balance = loyalty.data?.pointsBalance ?? 0;
    // Mirrors the backend cap: 20% of subtotal, valued at ₹0.25 per point.
    const subtotal = totals?.subtotal ?? lineSubtotal;
    const capByOrder = Math.floor((subtotal * 0.2) / 0.25);
    return Math.max(0, Math.min(balance, capByOrder));
  }, [loyalty.data?.pointsBalance, totals, lineSubtotal]);

  const applyCoupon = (event: React.FormEvent) => {
    event.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (code) setAppliedCoupon(code);
  };

  const removeCoupon = () => {
    setAppliedCoupon(undefined);
    setCouponInput('');
  };

  const applyPoints = (event: React.FormEvent) => {
    event.preventDefault();
    const requested = Number(pointsInput);
    if (!Number.isFinite(requested) || requested < 0) return;

    const clamped = Math.min(Math.floor(requested), maxRedeemablePoints);
    if (clamped !== Math.floor(requested)) {
      toast.info(`You can redeem up to ${maxRedeemablePoints} points on this order.`);
    }
    setPointsToRedeem(clamped);
    setPointsInput(String(clamped));
  };

  const placeOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Choose a delivery address to continue.');
      return;
    }
    if (!totals) {
      toast.error('Your total is still being calculated. Please wait a moment.');
      return;
    }

    setPlacing(true);
    setPlaceError(null);
    try {
      const order = await checkoutService.placeOrder(
        {
          addressId: selectedAddressId,
          couponCode: appliedCoupon,
          paymentMethod,
          pointsToRedeem: pointsToRedeem || undefined,
          giftMessage: giftMessage.trim() || undefined,
        },
        idempotencyKey.current
      );

      // Settle payment through the gateway abstraction. COD short-circuits
      // server-side; every other method runs initiate → verify.
      try {
        const intent = await paymentService.initiate(order.orderId);
        if (intent.method !== 'COD') {
          await paymentService.verify(order.orderId, {
            gatewayPaymentId: intent.intent?.gatewayOrderId ?? `web_${order.orderId}`,
            amount: String(totals.total),
          });
        }
        toast.success(`Order ${order.orderNumber} placed successfully.`);
      } catch (paymentError) {
        // The order exists regardless — route to it so payment can be retried
        // rather than leaving the customer thinking nothing happened.
        toast.warning(
          paymentError instanceof ApiError
            ? `Order placed, but payment needs attention: ${paymentError.message}`
            : 'Order placed, but the payment could not be confirmed.'
        );
      }

      await fetchCart();
      router.replace(`/account/orders/${order.orderId}?placed=1`);
    } catch (error) {
      setPlaceError(
        error instanceof ApiError ? error.message : 'Could not place your order. Please try again.'
      );
      // Stock or coupon state may have shifted — re-sync before a retry.
      refreshSummary();
    } finally {
      setPlacing(false);
    }
  };

  if (!hydrated || cartLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-12 sm:px-8">
        <div className="h-10 w-64 animate-pulse rounded bg-surface-container-high" />
        <ListRowSkeleton count={3} />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-8">
        <EmptyState
          icon="shopping_bag"
          title="Nothing to check out"
          description="Add something to your bag first."
          actionLabel="Browse products"
          actionHref="/products"
        />
      </div>
    );
  }

  const addressList: Address[] = addresses.data ?? [];
  const canPlaceOrder = !!selectedAddressId && !!totals && !summaryLoading && !placing;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8">
      <header className="mb-8 space-y-2 border-b border-outline-variant/30 pb-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Secure checkout
        </span>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
          Checkout
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* 1. Address */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-headline text-xl font-bold tracking-tight text-primary">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
                  1
                </span>
                Delivery address
              </h2>
              <Button
                variant="outline"
                icon="add"
                onClick={() => setAddressModalOpen(true)}
                className="shrink-0 px-4 py-2.5"
              >
                New address
              </Button>
            </div>

            {addresses.loading && <ListRowSkeleton count={2} />}

            {!addresses.loading && addresses.error && (
              <ErrorState message={addresses.error} onRetry={addresses.reload} />
            )}

            {!addresses.loading && !addresses.error && addressList.length === 0 && (
              <EmptyState
                icon="home_pin"
                title="No saved addresses"
                description="Add a delivery address to continue with your order."
                actionLabel="Add address"
                onAction={() => setAddressModalOpen(true)}
              />
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {addressList.map((address) => (
                <label
                  key={address.address_id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border-2 bg-surface-container-lowest p-4 transition-colors',
                    selectedAddressId === address.address_id
                      ? 'border-primary'
                      : 'border-outline-variant/40 hover:border-outline'
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === address.address_id}
                    onChange={() => setSelectedAddressId(address.address_id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="min-w-0 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary">
                        {address.first_name} {address.last_name}
                      </span>
                      {address.is_default && (
                        <span className="rounded bg-secondary-container px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-on-secondary-container">
                          Default
                        </span>
                      )}
                      {address.title && (
                        <span className="text-[10px] uppercase tracking-wider text-outline">
                          {address.title}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 leading-relaxed text-on-surface-variant">
                      {address.street}, {address.city}, {address.state} {address.postal_code}
                      <br />
                      {address.country}
                    </p>
                    <p className="mt-1 text-xs text-outline">{address.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* 2. Payment */}
          <section className="space-y-4 border-t border-outline-variant/30 pt-8">
            <h2 className="flex items-center gap-2 font-headline text-xl font-bold tracking-tight text-primary">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
                2
              </span>
              Payment method
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-surface-container-lowest p-4 transition-colors',
                    paymentMethod === method.value
                      ? 'border-primary'
                      : 'border-outline-variant/40 hover:border-outline'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="material-symbols-outlined text-2xl text-outline">
                    {method.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-primary">{method.label}</span>
                    <span className="block text-xs text-on-surface-variant">{method.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* 3. Review */}
          <section className="space-y-4 border-t border-outline-variant/30 pt-8">
            <h2 className="flex items-center gap-2 font-headline text-xl font-bold tracking-tight text-primary">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-on-primary">
                3
              </span>
              Review your items
            </h2>

            <ul className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-4 p-4">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface-container">
                    <Image
                      src={getImageUrl(line.image)}
                      alt={line.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-sm font-bold text-primary">
                      {line.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Qty {line.quantity} × {formatCurrency(line.unitPrice)}
                    </p>
                  </div>
                  <span className="font-headline text-sm font-bold text-primary">
                    {formatCurrency(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <Field label="Gift message" hint="Optional, up to 500 characters." htmlFor="gift">
              <Input
                id="gift"
                maxLength={500}
                value={giftMessage}
                onChange={(event) => setGiftMessage(event.target.value)}
                placeholder="Add a note for the recipient"
              />
            </Field>
          </section>
        </div>

        {/* Summary rail */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6">
            <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
              Order Summary
            </h2>

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md border border-secondary/40 bg-secondary-container/40 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-on-secondary-container">
                  <span className="material-symbols-outlined text-base">local_offer</span>
                  {appliedCoupon}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-bold uppercase tracking-wider text-on-secondary-container underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={applyCoupon}>
                <Field label="Promo code" htmlFor="checkout-coupon">
                  <div className="flex gap-2">
                    <Input
                      id="checkout-coupon"
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="uppercase"
                    />
                    <Button type="submit" variant="outline" className="shrink-0 px-4 py-3">
                      Apply
                    </Button>
                  </div>
                </Field>
              </form>
            )}

            {maxRedeemablePoints > 0 && (
              <form onSubmit={applyPoints}>
                <Field
                  label="Reward points"
                  hint={`Balance ${loyalty.data?.pointsBalance ?? 0} pts · up to ${maxRedeemablePoints} usable here (₹0.25/pt).`}
                  htmlFor="points"
                >
                  <div className="flex gap-2">
                    <Input
                      id="points"
                      type="number"
                      min={0}
                      max={maxRedeemablePoints}
                      inputMode="numeric"
                      value={pointsInput}
                      onChange={(event) => setPointsInput(event.target.value)}
                      placeholder="0"
                    />
                    <Button type="submit" variant="outline" className="shrink-0 px-4 py-3">
                      Redeem
                    </Button>
                  </div>
                </Field>
              </form>
            )}

            <div className="border-t border-outline-variant/30 pt-4">
              {summaryLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-outline">
                  <Spinner /> Calculating total…
                </div>
              )}

              {!summaryLoading && summaryError && (
                <div className="space-y-3 py-2">
                  <p className="flex items-start gap-1.5 text-sm text-error">
                    <span className="material-symbols-outlined text-base">error</span>
                    {summaryError}
                  </p>
                  <Button variant="outline" fullWidth onClick={refreshSummary} className="py-2.5">
                    Recalculate
                  </Button>
                </div>
              )}

              {!summaryLoading && !summaryError && totals && (
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Subtotal</dt>
                    <dd className="font-semibold text-primary">{formatCurrency(totals.subtotal)}</dd>
                  </div>
                  {totals.couponDiscount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <dt>Coupon ({totals.appliedCoupon?.code})</dt>
                      <dd className="font-semibold">−{formatCurrency(totals.couponDiscount)}</dd>
                    </div>
                  )}
                  {totals.pointsDiscount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <dt>Points ({pointsToRedeem} pts)</dt>
                      <dd className="font-semibold">−{formatCurrency(totals.pointsDiscount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Shipping</dt>
                    <dd className="font-semibold text-primary">
                      {totals.shippingFee === 0 ? 'Free' : formatCurrency(totals.shippingFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Tax (GST 18%)</dt>
                    <dd className="font-semibold text-primary">{formatCurrency(totals.tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-3 text-base">
                    <dt className="font-bold text-primary">Total payable</dt>
                    <dd className="font-headline text-2xl font-extrabold text-primary">
                      {formatCurrency(totals.total)}
                    </dd>
                  </div>
                </dl>
              )}

              {!summaryLoading && !summaryError && !totals && (
                <p className="py-4 text-center text-sm text-outline">
                  Select a delivery address to see your total.
                </p>
              )}
            </div>

            {placeError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
              >
                <span className="material-symbols-outlined text-base">error</span>
                <span>{placeError}</span>
              </div>
            )}

            <Button
              fullWidth
              onClick={placeOrder}
              loading={placing}
              disabled={!canPlaceOrder}
              className="py-4"
            >
              {paymentMethod === 'COD'
                ? 'Place Order'
                : `Pay ${totals ? formatCurrency(totals.total) : ''}`}
            </Button>

            <p className="text-center text-[11px] leading-relaxed text-outline">
              Placing this order confirms delivery to the selected address.
              {user?.email && ` A confirmation will be sent to ${user.email}.`}
            </p>

            <Link
              href="/cart"
              className="block text-center text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary"
            >
              Back to bag
            </Link>
          </div>
        </aside>
      </div>

      <Modal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title="Add a delivery address"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddressModalOpen(false)} className="py-2.5">
              Cancel
            </Button>
            <Button
              type="submit"
              form="checkout-address-form"
              loading={addressSaving}
              className="py-2.5"
            >
              Save address
            </Button>
          </div>
        }
      >
        <AddressForm
          formId="checkout-address-form"
          hideActions
          onSubmittingChange={setAddressSaving}
          onCancel={() => setAddressModalOpen(false)}
          onSaved={(address) => {
            setAddressModalOpen(false);
            setSelectedAddressId(address.address_id);
            addresses.reload();
            toast.success('Address saved.');
          }}
        />
      </Modal>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutFlow />
    </RequireAuth>
  );
}
