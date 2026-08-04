'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore, useCartLines, type CartLine } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { couponService } from '@/services';
import { ApiError } from '@/lib/apiClient';
import { getImageUrl, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button, Field, Input } from '@/components/ui/Primitives';
import { EmptyState, ListRowSkeleton, Spinner } from '@/components/ui/Feedback';
import type { CouponValidation } from '@/types/api';

export default function CartPage() {
  const { isAuthenticated, initializing } = useAuth();
  const toast = useToast();

  const lines = useCartLines();
  const hydrated = useCartStore((s) => s.hydrated);
  const loading = useCartStore((s) => s.loading);
  const pendingKey = useCartStore((s) => s.pendingKey);
  const summary = useCartStore((s) => s.serverCart?.summary ?? null);
  const savedItems = useCartStore((s) => s.savedItems);

  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchSaved = useCartStore((s) => s.fetchSaved);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const saveForLater = useCartStore((s) => s.saveForLater);
  const moveSavedToCart = useCartStore((s) => s.moveSavedToCart);

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    if (initializing) return;
    fetchCart();
    fetchSaved();
  }, [initializing, isAuthenticated, fetchCart, fetchSaved]);

  const subtotal = summary?.subtotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const changeQuantity = async (line: CartLine, quantity: number) => {
    try {
      await updateQuantity(line, quantity);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the quantity.');
    }
  };

  const drop = async (line: CartLine) => {
    try {
      await removeItem(line);
      toast.info('Item removed from your bag.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the item.');
    }
  };

  /**
   * Pre-checks the code against the current subtotal. The discount is applied
   * for real at checkout, where the backend recalculates every total — this
   * only saves the customer a surprise later.
   */
  const checkCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setCheckingCoupon(true);
    setCouponResult(null);
    try {
      const result = await couponService.validate(code, subtotal);
      setCouponResult(result);
      if (result.valid) toast.success(result.message);
    } catch (error) {
      setCouponResult({
        valid: false,
        message: error instanceof ApiError ? error.message : 'Could not validate that code.',
      });
    } finally {
      setCheckingCoupon(false);
    }
  };

  if (initializing || !hydrated || (loading && lines.length === 0)) {
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
          title="Your bag is empty"
          description="Once you add pieces to your bag they will appear here."
          actionLabel="Start shopping"
          actionHref="/products"
        />
        {savedItems.length > 0 && (
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            You have {savedItems.length} item{savedItems.length === 1 ? '' : 's'} saved for later.{' '}
            <Link href="/account/orders" className="font-semibold text-primary underline">
              View your account
            </Link>
          </p>
        )}
      </div>
    );
  }

  const hasUnavailable = lines.some((line) => !line.isAvailable);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8">
      <header className="mb-8 space-y-2 border-b border-outline-variant/30 pb-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Your selection
        </span>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
          Shopping Bag
        </h1>
        <p className="text-sm text-on-surface-variant">
          {lines.length} item{lines.length === 1 ? '' : 's'} in your bag
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {hasUnavailable && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border-l-4 border-error bg-error-container/40 px-4 py-3 text-sm text-on-error-container"
            >
              <span className="material-symbols-outlined text-base">warning</span>
              <span>
                Some items are no longer available in the quantity selected. Reduce or remove them
                to continue to checkout.
              </span>
            </div>
          )}

          {lines.map((line) => {
            const busy = pendingKey === line.key;
            return (
              <article
                key={line.key}
                className={cn(
                  'flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:flex-row',
                  !line.isAvailable && 'border-error/40 bg-error-container/20'
                )}
              >
                <Link
                  href={`/product/${line.productId}`}
                  className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-surface-container sm:h-32 sm:w-28"
                >
                  <Image
                    src={getImageUrl(line.image)}
                    alt={line.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 112px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {line.brandName && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                          {line.brandName}
                        </span>
                      )}
                      <Link href={`/product/${line.productId}`}>
                        <h2 className="font-headline text-lg font-bold text-primary hover:underline">
                          {line.name}
                        </h2>
                      </Link>
                      <p className="mt-0.5 text-sm text-on-surface-variant">
                        {formatCurrency(line.unitPrice)} each
                      </p>
                      {!line.isAvailable && (
                        <p className="mt-1 text-xs font-semibold text-error">
                          Only {line.stockQuantity} in stock
                        </p>
                      )}
                    </div>
                    <span className="font-headline text-lg font-extrabold text-primary">
                      {formatCurrency(line.lineTotal)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      className={cn(
                        'flex items-center overflow-hidden rounded-md border border-outline-variant',
                        busy && 'opacity-50'
                      )}
                    >
                      <button
                        onClick={() => changeQuantity(line, line.quantity - 1)}
                        disabled={busy}
                        aria-label="Decrease quantity"
                        className="px-3 py-1.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span className="min-w-10 px-3 py-1.5 text-center text-sm font-bold text-primary">
                        {busy ? <Spinner className="h-3 w-3" /> : line.quantity}
                      </span>
                      <button
                        onClick={() => changeQuantity(line, line.quantity + 1)}
                        disabled={busy || line.quantity >= line.stockQuantity}
                        aria-label="Increase quantity"
                        className="px-3 py-1.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {line.cartItemId && (
                        <button
                          onClick={() => saveForLater(line)}
                          disabled={busy}
                          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-base">bookmark</span>
                          Save for later
                        </button>
                      )}
                      <button
                        onClick={() => drop(line)}
                        disabled={busy}
                        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-error disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {savedItems.length > 0 && (
            <section className="space-y-4 pt-8">
              <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
                Saved for later ({savedItems.length})
              </h2>
              <div className="space-y-3">
                {savedItems.map((item) => (
                  <div
                    key={item.cart_item_id}
                    className="flex items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
                  >
                    <Link
                      href={`/product/${item.product_id}`}
                      className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface-container"
                    >
                      <Image
                        src={getImageUrl(item.primary_image)}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${item.product_id}`}>
                        <h3 className="truncate font-headline text-sm font-bold text-primary hover:underline">
                          {item.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-on-surface-variant">
                        {formatCurrency(item.sale_price ?? item.price)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => moveSavedToCart(item.cart_item_id)}
                      loading={pendingKey === `saved-${item.cart_item_id}`}
                      className="shrink-0 px-4 py-2.5"
                    >
                      Move to bag
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6">
            <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
              Order Summary
            </h2>

            <form onSubmit={checkCoupon} className="space-y-2">
              <Field label="Promo code" htmlFor="coupon">
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    className="uppercase"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    loading={checkingCoupon}
                    className="shrink-0 px-4 py-3"
                  >
                    Check
                  </Button>
                </div>
              </Field>
              {couponResult && (
                <p
                  className={cn(
                    'flex items-start gap-1.5 text-xs font-medium',
                    couponResult.valid ? 'text-secondary' : 'text-error'
                  )}
                >
                  <span className="material-symbols-outlined text-sm">
                    {couponResult.valid ? 'check_circle' : 'error'}
                  </span>
                  {couponResult.message}
                </p>
              )}
              <p className="text-[11px] text-outline">
                Codes are applied at checkout, where the final discount is calculated.
              </p>
            </form>

            <dl className="space-y-2.5 border-t border-outline-variant/30 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">Subtotal</dt>
                <dd className="font-semibold text-primary">{formatCurrency(subtotal)}</dd>
              </div>

              {summary ? (
                <>
                  {summary.discount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <dt>Discount</dt>
                      <dd className="font-semibold">−{formatCurrency(summary.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Shipping</dt>
                    <dd className="font-semibold text-primary">
                      {summary.shippingFee === 0 ? 'Free' : formatCurrency(summary.shippingFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-on-surface-variant">Tax (GST)</dt>
                    <dd className="font-semibold text-primary">{formatCurrency(summary.tax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/30 pt-3 text-base">
                    <dt className="font-bold text-primary">Total</dt>
                    <dd className="font-headline text-xl font-extrabold text-primary">
                      {formatCurrency(summary.total)}
                    </dd>
                  </div>
                  <p className="text-[11px] text-outline">{summary.freeShippingMessage}</p>
                </>
              ) : (
                <p className="border-t border-outline-variant/30 pt-3 text-xs text-outline">
                  Shipping and GST are calculated at checkout.{' '}
                  {!isAuthenticated && 'Sign in to see your exact total.'}
                </p>
              )}
            </dl>

            <Link
              href="/checkout"
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-md bg-primary py-4 text-xs font-bold uppercase tracking-widest text-on-primary shadow-md transition-colors hover:bg-primary-container',
                hasUnavailable && 'pointer-events-none opacity-50'
              )}
              aria-disabled={hasUnavailable}
            >
              Proceed to Checkout
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>

            <Link
              href="/products"
              className="block text-center text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
