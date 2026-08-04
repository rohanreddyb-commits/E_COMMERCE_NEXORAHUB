'use client';

import React, { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { DEFAULT_PAGE_SIZE } from '@/lib/config';
import { ProductCard } from '@/components/ui/ProductCard';
import { Pagination, Select } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/ui/Feedback';

const SORT_OPTIONS = [
  { label: 'Most relevant', value: 'created_at:DESC' },
  { label: 'Price: low to high', value: 'price:ASC' },
  { label: 'Price: high to low', value: 'price:DESC' },
  { label: 'Name: A–Z', value: 'name:ASC' },
] as const;

const SearchResults: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const term = searchParams.get('q')?.trim() ?? '';
  const page = Number(searchParams.get('page')) || 1;
  const sort = searchParams.get('sort') || 'created_at';
  const order = (searchParams.get('order') as 'ASC' | 'DESC') || 'DESC';

  const query = useMemo(
    () => ({ q: term, page, limit: DEFAULT_PAGE_SIZE, sort, order }),
    [term, page, sort, order]
  );
  const queryKey = JSON.stringify(query);

  const results = useApiResource(
    (signal) => searchService.search(query, signal),
    [queryKey],
    { enabled: term.length > 0 }
  );

  const trending = useApiResource((signal) => searchService.trending(signal), [], {
    enabled: term.length === 0,
    initialData: [],
  });

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  if (!term) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-20 text-center sm:px-8">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">Search</span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            What are you looking for?
          </h1>
          <p className="text-sm text-on-surface-variant">
            Use the search icon in the header to find products, brands and categories.
          </p>
        </div>

        {(trending.data ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Trending searches
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {trending.data!.map((item) => (
                <Link
                  key={item.term}
                  href={`/search?q=${encodeURIComponent(item.term)}`}
                  className="flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
                >
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  {item.term}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/products"
          className="inline-block rounded-md bg-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
        >
          Browse everything
        </Link>
      </div>
    );
  }

  const meta = results.data?.meta;
  const items = results.data?.data ?? [];

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-12 sm:px-8">
      <header className="space-y-2 border-b border-outline-variant/30 pb-6">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Search results
        </span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          “{term}”
        </h1>
        {meta && (
          <p className="text-sm text-on-surface-variant">
            {meta.total} result{meta.total === 1 ? '' : 's'} found
          </p>
        )}
      </header>

      {items.length > 0 && (
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-outline">
            Sort
            <Select
              value={`${sort}:${order}`}
              onChange={(event) => {
                const [nextSort, nextOrder] = event.target.value.split(':');
                pushParams((params) => {
                  params.set('sort', nextSort);
                  params.set('order', nextOrder);
                  params.delete('page');
                });
              }}
              aria-label="Sort search results"
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
      )}

      {results.loading && <ProductGridSkeleton count={DEFAULT_PAGE_SIZE} />}

      {!results.loading && results.error && (
        <ErrorState message={results.error} onRetry={results.reload} />
      )}

      {!results.loading && !results.error && items.length === 0 && (
        <EmptyState
          icon="search_off"
          title={`No results for “${term}”`}
          description="Check the spelling, try a broader term, or browse the full archive."
          actionLabel="Browse all products"
          actionHref="/products"
        />
      )}

      {!results.loading && !results.error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>

          {meta && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(nextPage) => {
                pushParams((params) => params.set('page', String(nextPage)));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="pt-6"
            />
          )}
        </>
      )}
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8">
          <ProductGridSkeleton />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
