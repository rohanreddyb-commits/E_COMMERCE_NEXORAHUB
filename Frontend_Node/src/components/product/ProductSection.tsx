'use client';

import React from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductGridSkeleton, ErrorState, EmptyState } from '@/components/ui/Feedback';
import type { ProductSummary } from '@/types/api';

interface ProductSectionProps {
  eyebrow: string;
  title: string;
  products: ProductSummary[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  viewAllHref?: string;
  /** Cap the number of cards rendered — sections show a curated slice. */
  limit?: number;
  /** Render nothing at all when the API returns no products. */
  hideWhenEmpty?: boolean;
  emptyMessage?: string;
}

/**
 * Standard homepage/detail-page product strip with its own loading, error and
 * empty states, so a single failing endpoint never blanks the whole page.
 */
export const ProductSection: React.FC<ProductSectionProps> = ({
  eyebrow,
  title,
  products,
  loading,
  error,
  onRetry,
  viewAllHref,
  limit = 8,
  hideWhenEmpty = false,
  emptyMessage = 'Nothing here just yet. Check back soon.',
}) => {
  if (hideWhenEmpty && !loading && !error && (!products || products.length === 0)) {
    return null;
  }

  const visible = (products ?? []).slice(0, limit);

  return (
    <section className="mx-auto max-w-[1440px] space-y-8 px-4 sm:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/30 pb-6 md:flex-row md:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            {eyebrow}
          </span>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-primary transition-colors hover:text-secondary-fixed-dim"
          >
            View all
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        )}
      </div>

      {loading && <ProductGridSkeleton count={limit > 4 ? 4 : limit} />}

      {!loading && error && (
        <ErrorState title={`Could not load ${title.toLowerCase()}`} message={error} onRetry={onRetry} />
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState icon="apparel" title="No products yet" description={emptyMessage} />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
