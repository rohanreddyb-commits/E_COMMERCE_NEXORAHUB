'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useToast } from '@/context/ToastContext';
import { getImageUrl, discountPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Price, StarRating } from '@/components/ui/Primitives';
import { Spinner } from '@/components/ui/Feedback';
import type { ProductSummary } from '@/types/api';

interface ProductCardProps {
  product: ProductSummary;
  /** Hide the hover "quick add" bar where a compact card is wanted. */
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const wishlistHydrated = useWishlistStore((s) => s.hydrated);
  const toast = useToast();

  const [adding, setAdding] = useState(false);

  // Suppress wishlist state until hydration so SSR and client markup match.
  const isWishlisted = wishlistHydrated && isInWishlist(product.product_id);

  const outOfStock = product.stock_quantity !== undefined && (product.stock_quantity ?? 0) <= 0;
  const discount = product.discount_percent ?? discountPercent(product.price, product.sale_price);
  const href = `/product/${product.product_id}`;

  const handleQuickAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) return;

    setAdding(true);
    try {
      await addItem(product);
      toast.success(`${product.name} added to your bag.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to bag.');
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const saved = await toggleWishlist(product);
      toast.success(saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your wishlist.');
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-xl">
      <Link
        href={href}
        className="relative block aspect-[3/4] w-full overflow-hidden bg-surface-container"
      >
        <Image
          src={getImageUrl(product.primary_image)}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className={cn(
            'object-cover transition-transform duration-700 ease-out group-hover:scale-105',
            outOfStock && 'opacity-60 grayscale'
          )}
        />

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {product.is_featured && (
            <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-on-primary shadow-sm">
              Featured
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-md bg-secondary-container px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-on-secondary-container">
              {discount}% Off
            </span>
          )}
          {outOfStock && (
            <span className="rounded-md bg-error px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-on-error">
              Sold Out
            </span>
          )}
        </div>

        <button
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={isWishlisted}
          className="absolute right-3 top-3 z-10 rounded-full bg-surface-container-lowest/80 p-2 text-on-surface shadow-md backdrop-blur-md transition-colors hover:text-error"
        >
          <span className={cn('material-symbols-outlined text-lg', isWishlisted && 'fill text-error')}>
            favorite
          </span>
        </button>

        {!compact && (
          <div className="absolute inset-x-3 bottom-3 z-10 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={handleQuickAdd}
              disabled={outOfStock || adding}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/95 py-3 text-xs font-bold uppercase tracking-widest text-on-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? (
                <Spinner />
              ) : (
                <span className="material-symbols-outlined text-sm">shopping_bag</span>
              )}
              {outOfStock ? 'Out of Stock' : 'Quick Add to Bag'}
            </button>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between space-y-2 p-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            {product.category_name || product.brand_name || 'Collection'}
          </span>
          <Link href={href}>
            <h3 className="line-clamp-1 font-headline text-base font-bold text-primary transition-colors group-hover:text-secondary-fixed-dim">
              {product.name}
            </h3>
          </Link>
          {product.short_description && (
            <p className="mt-0.5 line-clamp-1 text-xs font-medium text-on-surface-variant">
              {product.short_description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2">
          {product.avg_rating !== undefined && product.avg_rating > 0 ? (
            <StarRating rating={product.avg_rating} count={product.review_count} />
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-wider text-outline">
              No reviews yet
            </span>
          )}
          <Price price={product.price} salePrice={product.sale_price} />
        </div>
      </div>
    </div>
  );
};
