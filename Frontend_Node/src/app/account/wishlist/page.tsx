'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartStore } from '@/store/useCartStore';
import { useToast } from '@/context/ToastContext';
import { getImageUrl, formatCurrency, effectivePrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button, Price } from '@/components/ui/Primitives';
import { EmptyState, ListRowSkeleton } from '@/components/ui/Feedback';

export default function WishlistPage() {
  const toast = useToast();

  const serverItems = useWishlistStore((s) => s.serverItems);
  const loading = useWishlistStore((s) => s.loading);
  const pendingId = useWishlistStore((s) => s.pendingId);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const removeFromWishlist = useWishlistStore((s) => s.remove);
  const moveToCart = useWishlistStore((s) => s.moveToCart);

  const fetchCart = useCartStore((s) => s.fetchCart);
  const [movingAll, setMovingAll] = useState(false);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const available = serverItems.filter((item) => item.product.isAvailable);

  const move = async (productId: number, name: string) => {
    try {
      await moveToCart(productId);
      await fetchCart();
      toast.success(`${name} moved to your bag.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not move this item.');
    }
  };

  /** Sequential so a single out-of-stock item does not abort the rest. */
  const moveAll = async () => {
    setMovingAll(true);
    let moved = 0;
    for (const item of available) {
      try {
        await moveToCart(item.productId);
        moved += 1;
      } catch {
        /* Skip and continue. */
      }
    }
    await fetchCart();
    setMovingAll(false);
    toast[moved > 0 ? 'success' : 'error'](
      moved > 0
        ? `${moved} item${moved === 1 ? '' : 's'} moved to your bag.`
        : 'None of those items could be moved.'
    );
  };

  const drop = async (productId: number) => {
    try {
      await removeFromWishlist(productId);
      toast.info('Removed from your wishlist.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove this item.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">Saved</span>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Wishlist
          </h1>
          <p className="text-sm text-on-surface-variant">
            {serverItems.length} item{serverItems.length === 1 ? '' : 's'} saved
          </p>
        </div>

        {available.length > 0 && (
          <Button icon="shopping_bag" onClick={moveAll} loading={movingAll} className="py-2.5">
            Move all to bag
          </Button>
        )}
      </header>

      {loading && serverItems.length === 0 && <ListRowSkeleton count={3} />}

      {!loading && serverItems.length === 0 && (
        <EmptyState
          icon="favorite"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it for later."
          actionLabel="Browse products"
          actionHref="/products"
        />
      )}

      <div className="space-y-4">
        {serverItems.map((item) => {
          const busy = pendingId === item.productId;
          const product = item.product;
          return (
            <article
              key={item.wishlistItemId}
              className={cn(
                'flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 sm:flex-row sm:items-center',
                !product.isAvailable && 'opacity-75'
              )}
            >
              <Link
                href={`/product/${item.productId}`}
                className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-surface-container sm:h-28 sm:w-24"
              >
                <Image
                  src={getImageUrl(product.primaryImage)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 96px"
                  className="object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                {product.brandName && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    {product.brandName}
                  </span>
                )}
                <Link href={`/product/${item.productId}`}>
                  <h2 className="font-headline text-lg font-bold text-primary hover:underline">
                    {product.name}
                  </h2>
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <Price price={product.price} salePrice={product.salePrice} />
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      product.isAvailable ? 'text-secondary' : 'text-error'
                    )}
                  >
                    {product.isAvailable
                      ? `In stock (${product.stockQuantity})`
                      : 'Out of stock'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-outline">
                  Line total if added: {formatCurrency(effectivePrice(product.price, product.salePrice))}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button
                  onClick={() => move(item.productId, product.name)}
                  loading={busy}
                  disabled={!product.isAvailable}
                  className="px-4 py-2.5"
                >
                  {product.isAvailable ? 'Move to bag' : 'Unavailable'}
                </Button>
                <button
                  onClick={() => drop(item.productId)}
                  disabled={busy}
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-outline-variant text-outline transition-colors hover:border-error hover:text-error disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
