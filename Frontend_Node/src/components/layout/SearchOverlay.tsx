'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { searchService, recentSearches } from '@/services';
import { useDebounce } from '@/hooks/useDebounce';
import { getImageUrl, formatCurrency, effectivePrice } from '@/lib/format';
import { Spinner } from '@/components/ui/Feedback';
import type { AutocompleteItem, TrendingSearch } from '@/types/api';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Search drawer with debounced autocomplete.
 *
 * The backend rate-limits /search/autocomplete to 50 req/min and ignores
 * queries under 2 characters, so requests are debounced by 300 ms and gated on
 * length before firing.
 */
export const SearchOverlay: React.FC<SearchOverlayProps> = ({ open, onClose }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [trending, setTrending] = useState<TrendingSearch[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    setRecent(recentSearches.get());

    const controller = new AbortController();
    searchService
      .trending(controller.signal)
      .then(setTrending)
      .catch(() => setTrending([]));
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    searchService
      .autocomplete(term, controller.signal)
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    recentSearches.add(trimmed);
    setQuery('');
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const openProduct = (productId: number) => {
    onClose();
    router.push(`/product/${productId}`);
  };

  return (
    <div className="border-t border-outline-variant/30 bg-surface-container-lowest px-4 py-4 shadow-lg duration-200 animate-in slide-in-from-top sm:px-6">
      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(query);
          }}
          className="flex items-center gap-3 border-b border-outline-variant/50 pb-3"
        >
          <span className="material-symbols-outlined text-outline">search</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, brands and categories…"
            aria-label="Search products"
            className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
          />
          {loading && <Spinner className="text-outline" />}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary"
          >
            Close
          </button>
        </form>

        <div className="max-h-[60vh] overflow-y-auto pt-4">
          {suggestions.length > 0 && (
            <ul className="space-y-1">
              {suggestions.map((item) => (
                <li key={item.product_id}>
                  <button
                    onClick={() => openProduct(item.product_id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-container"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-container">
                      <Image
                        src={getImageUrl(item.primary_image)}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-primary">
                        {item.name}
                      </span>
                      <span className="block text-[11px] uppercase tracking-wider text-outline">
                        {item.category_name || 'Product'}
                      </span>
                    </span>
                    <span className="font-headline text-sm font-bold text-primary">
                      {formatCurrency(effectivePrice(item.price, item.sale_price))}
                    </span>
                  </button>
                </li>
              ))}
              <li className="pt-2">
                <button
                  onClick={() => submitSearch(query)}
                  className="w-full rounded-md bg-surface-container px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container-high"
                >
                  View all results for “{query.trim()}”
                </button>
              </li>
            </ul>
          )}

          {suggestions.length === 0 && debouncedQuery.trim().length >= 2 && !loading && (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              No matches for “{debouncedQuery.trim()}”. Try a different term.
            </p>
          )}

          {debouncedQuery.trim().length < 2 && (
            <div className="space-y-5">
              {recent.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline">
                      Recent searches
                    </h3>
                    <button
                      onClick={() => {
                        recentSearches.clear();
                        setRecent([]);
                      }}
                      className="text-[10px] font-semibold uppercase tracking-wider text-outline hover:text-error"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <button
                        key={term}
                        onClick={() => submitSearch(term)}
                        className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {trending.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-outline">
                    Trending now
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((item) => (
                      <button
                        key={item.term}
                        onClick={() => submitSearch(item.term)}
                        className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
                      >
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        {item.term}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
