'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore, useCartLines, type CartLine } from '@/store/useCartStore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getImageUrl, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Feedback';

export const CartDrawer: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const loading = useCartStore((s) => s.loading);
  const pendingKey = useCartStore((s) => s.pendingKey);
  const summary = useCartStore((s) => s.serverCart?.summary ?? null);
  const lines = useCartLines();

  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const totalItems = lines.reduce((count, line) => count + line.quantity, 0);
  const subtotal = summary?.subtotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const changeQuantity = async (line: CartLine, delta: number) => {
    try {
      await updateQuantity(line, line.quantity + delta);
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm" onClick={closeDrawer} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-surface-container-lowest text-on-surface shadow-2xl duration-300 animate-in slide-in-from-right"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="font-headline text-lg font-bold tracking-tight">SHOPPING BAG</span>
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
              {totalItems}
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="Close bag"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="flex-1 divide-y divide-outline-variant/20 overflow-y-auto px-6 py-4">
          {loading && lines.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          )}

          {!loading && lines.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center space-y-4 py-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline">shopping_bag</span>
              <p className="text-sm font-semibold uppercase tracking-wider text-outline">
                Your bag is currently empty.
              </p>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="mt-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
              >
                Discover collections
              </Link>
            </div>
          )}

          {lines.map((line) => {
            const busy = pendingKey === line.key;
            return (
              <div key={line.key} className="flex gap-4 pt-4 first:pt-0">
                <Link
                  href={`/product/${line.productId}`}
                  onClick={closeDrawer}
                  className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md border border-outline-variant/30 bg-surface-container"
                >
                  <Image
                    src={getImageUrl(line.image)}
                    alt={line.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/product/${line.productId}`} onClick={closeDrawer}>
                        <h4 className="font-headline text-sm font-bold leading-snug text-primary hover:underline">
                          {line.name}
                        </h4>
                      </Link>
                      <button
                        onClick={() => drop(line)}
                        disabled={busy}
                        className="text-outline transition-colors hover:text-error disabled:opacity-40"
                        aria-label={`Remove ${line.name}`}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                    {line.brandName && (
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                        {line.brandName}
                      </p>
                    )}
                    {!line.isAvailable && (
                      <p className="mt-1 text-[11px] font-semibold text-error">
                        Out of stock — remove to continue
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div
                      className={cn(
                        'flex items-center overflow-hidden rounded-md border border-outline-variant bg-surface',
                        busy && 'opacity-50'
                      )}
                    >
                      <button
                        onClick={() => changeQuantity(line, -1)}
                        disabled={busy}
                        className="px-2 py-0.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-primary">
                        {busy ? <Spinner className="h-3 w-3" /> : line.quantity}
                      </span>
                      <button
                        onClick={() => changeQuantity(line, 1)}
                        disabled={busy || line.quantity >= line.stockQuantity}
                        className="px-2 py-0.5 text-xs font-bold text-on-surface hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-headline text-sm font-bold text-primary">
                      {formatCurrency(line.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {lines.length > 0 && (
          <div className="space-y-4 border-t border-outline-variant/30 bg-surface-container-low p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold uppercase tracking-wider text-on-surface-variant">
                Subtotal
              </span>
              <span className="font-headline text-lg font-extrabold text-primary">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {summary ? (
              <p className="text-[11px] text-outline">{summary.freeShippingMessage}</p>
            ) : (
              <p className="text-[11px] text-outline">
                Taxes and shipping calculated at checkout.{' '}
                {!isAuthenticated && 'Sign in to see your final total.'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="w-full rounded-md border border-outline-variant/50 bg-surface-container py-3.5 text-center text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-high"
              >
                View bag
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="w-full rounded-md bg-primary py-3.5 text-center text-xs font-bold uppercase tracking-widest text-on-primary shadow-md transition-colors hover:bg-primary-container"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
