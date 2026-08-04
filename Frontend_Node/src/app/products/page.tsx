'use client';

import React, { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalogService, productService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { DEFAULT_PAGE_SIZE } from '@/lib/config';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductFilters, type FilterValues } from '@/components/product/ProductFilters';
import { Pagination, Select } from '@/components/ui/Primitives';
import {
  EmptyState,
  ErrorState,
  ProductGridSkeleton,
  Spinner,
} from '@/components/ui/Feedback';

/** Sort presets mapped onto the backend's whitelisted sort fields. */
const SORT_OPTIONS = [
  { label: 'Newest first', value: 'created_at:DESC' },
  { label: 'Price: low to high', value: 'price:ASC' },
  { label: 'Price: high to low', value: 'price:DESC' },
  { label: 'Top rated', value: 'rating:DESC' },
  { label: 'Name: A–Z', value: 'name:ASC' },
] as const;

const ProductsBrowser: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the single source of truth, so filters survive refresh and sharing.
  const page = Number(searchParams.get('page')) || 1;
  const sortValue = `${searchParams.get('sort') || 'created_at'}:${searchParams.get('order') || 'DESC'}`;

  const filters = useMemo<FilterValues>(
    () => ({
      category: searchParams.get('category') ? Number(searchParams.get('category')) : undefined,
      brand: searchParams.get('brand') ? Number(searchParams.get('brand')) : undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      onSale: searchParams.get('onSale') === 'true' || undefined,
      featured: searchParams.get('featured') === 'true' || undefined,
    }),
    [searchParams]
  );

  const query = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      sort: searchParams.get('sort') || 'created_at',
      order: (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC',
      ...filters,
    }),
    [page, searchParams, filters]
  );

  // Serialised so the effect re-runs on any real query change, not identity churn.
  const queryKey = JSON.stringify(query);

  const products = useApiResource(
    (signal) => productService.list(query, signal),
    [queryKey]
  );
  const categories = useApiResource((signal) => catalogService.categories(signal), [], {
    initialData: [],
  });
  const brands = useApiResource((signal) => catalogService.brands(signal), [], {
    initialData: [],
  });

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.push(`/products?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFilterChange = (next: FilterValues) => {
    pushParams((params) => {
      (['category', 'brand', 'minPrice', 'maxPrice', 'onSale', 'featured'] as const).forEach(
        (key) => {
          const value = next[key];
          if (value === undefined || value === false) params.delete(key);
          else params.set(key, String(value));
        }
      );
      params.delete('page'); // A changed filter invalidates the current page.
    });
  };

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split(':');
    pushParams((params) => {
      params.set('sort', sort);
      params.set('order', order);
      params.delete('page');
    });
  };

  const handlePageChange = (nextPage: number) => {
    pushParams((params) => params.set('page', String(nextPage)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const meta = products.data?.meta;
  const items = products.data?.data ?? [];

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-12 sm:px-8">
      <header className="space-y-2 border-b border-outline-variant/30 pb-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          The Archive
        </span>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
          Shop All
        </h1>
        <p className="text-sm text-on-surface-variant">
          {meta ? `${meta.total} product${meta.total === 1 ? '' : 's'} available` : 'Loading catalogue…'}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <ProductFilters
          categories={categories.data ?? []}
          brands={brands.data ?? []}
          value={filters}
          onChange={handleFilterChange}
          resultCount={meta?.total}
        />

        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-sm text-on-surface-variant">
              {products.loading && <Spinner className="text-outline" />}
              {meta && !products.loading && (
                <>
                  Showing{' '}
                  <strong className="text-primary">
                    {(meta.page - 1) * meta.limit + 1}–
                    {Math.min(meta.page * meta.limit, meta.total)}
                  </strong>{' '}
                  of {meta.total}
                </>
              )}
            </p>

            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-outline">
              Sort
              <Select
                value={sortValue}
                onChange={(event) => handleSortChange(event.target.value)}
                aria-label="Sort products"
                className="w-48 py-2 text-xs"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {products.loading && <ProductGridSkeleton count={DEFAULT_PAGE_SIZE} />}

          {!products.loading && products.error && (
            <ErrorState message={products.error} onRetry={products.reload} />
          )}

          {!products.loading && !products.error && items.length === 0 && (
            <EmptyState
              icon="search_off"
              title="No products match those filters"
              description="Try widening your price range or clearing a filter."
              actionLabel="Clear filters"
              onAction={() => router.push('/products')}
            />
          )}

          {!products.loading && !products.error && items.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>

              {meta && (
                <Pagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={handlePageChange}
                  className="pt-6"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8">
          <ProductGridSkeleton />
        </div>
      }
    >
      <ProductsBrowser />
    </Suspense>
  );
}
