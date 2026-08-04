'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, Field, Input, Select } from '@/components/ui/Primitives';
import type { Brand, Category } from '@/types/api';

export interface FilterValues {
  category?: number;
  brand?: number;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  featured?: boolean;
}

interface ProductFiltersProps {
  categories: Category[];
  brands: Brand[];
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  /** Total results, shown as a live count above the filters. */
  resultCount?: number;
}

const toNumber = (raw: string): number | undefined => {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/**
 * Filter rail. Price inputs are staged locally and only committed on Apply,
 * so typing a price does not fire a request per keystroke.
 */
export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  brands,
  value,
  onChange,
  resultCount,
}) => {
  const [minPrice, setMinPrice] = useState(value.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(value.maxPrice?.toString() ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [
    value.category,
    value.brand,
    value.minPrice,
    value.maxPrice,
    value.onSale || undefined,
    value.featured || undefined,
  ].filter((entry) => entry !== undefined).length;

  const applyPrice = () => {
    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    if (min !== undefined && max !== undefined && min > max) {
      onChange({ ...value, minPrice: max, maxPrice: min });
      setMinPrice(String(max));
      setMaxPrice(String(min));
      return;
    }
    onChange({ ...value, minPrice: min, maxPrice: max });
  };

  const clearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    onChange({});
  };

  const body = (
    <div className="space-y-6">
      <Field label="Category" htmlFor="filter-category">
        <Select
          id="filter-category"
          value={value.category ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              category: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Brand" htmlFor="filter-brand">
        <Select
          id="filter-brand"
          value={value.brand ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              brand: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.brand_id} value={brand.brand_id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2">
        <span className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Price range (₹)
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyPrice()}
          />
          <span className="text-outline">–</span>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyPrice()}
          />
        </div>
        <Button variant="outline" onClick={applyPrice} fullWidth className="py-2.5">
          Apply price
        </Button>
      </div>

      <div className="space-y-3 border-t border-outline-variant/30 pt-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={!!value.onSale}
            onChange={(event) => onChange({ ...value, onSale: event.target.checked || undefined })}
            className="h-4 w-4 accent-primary"
          />
          On sale only
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={!!value.featured}
            onChange={(event) =>
              onChange({ ...value, featured: event.target.checked || undefined })
            }
            className="h-4 w-4 accent-primary"
          />
          Featured only
        </label>
      </div>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex w-full items-center justify-center gap-1.5 border-t border-outline-variant/30 pt-4 text-xs font-bold uppercase tracking-widest text-error transition-opacity hover:opacity-75"
        >
          <span className="material-symbols-outlined text-sm">filter_alt_off</span>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest py-3 text-xs font-bold uppercase tracking-widest text-primary lg:hidden"
      >
        <span className="material-symbols-outlined text-base">tune</span>
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-on-primary">
            {activeCount}
          </span>
        )}
      </button>

      {/* Desktop rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-lg font-bold tracking-tight text-primary">Filters</h2>
            {resultCount !== undefined && (
              <span className="text-xs text-outline">{resultCount} items</span>
            )}
          </div>
          {body}
        </div>
      </aside>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden">
          <div
            className="fixed inset-0 bg-primary/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className={cn(
              'relative z-10 ml-auto flex h-full w-full max-w-xs flex-col bg-surface-container-lowest shadow-2xl',
              'duration-300 animate-in slide-in-from-right'
            )}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
              <h2 className="font-headline text-lg font-bold text-primary">Filters</h2>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{body}</div>
            <div className="border-t border-outline-variant/30 p-5">
              <Button fullWidth onClick={() => setMobileOpen(false)}>
                Show {resultCount ?? ''} results
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
