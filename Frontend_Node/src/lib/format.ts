import { CURRENCY, SERVER_ORIGIN } from './config';

/** Inline SVG placeholder — avoids a network round-trip for missing images. */
const IMAGE_FALLBACK =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgNDAwIDUwMCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNlZWVlZWUiLz48ZyBzdHJva2U9IiM3ZTc1NzYiIHN0cm9rZS13aWR0aD0iMS41IiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE3NiAyMjYpIHNjYWxlKDIpIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9nPjwvc3ZnPg==';

/**
 * Resolve a product/avatar image path to a fully-qualified URL.
 * Mirrors getImageUrl() in the admin frontend (Frontend/src/utils/api.ts):
 * absolute URLs pass through, relative /uploads paths get the server origin.
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return IMAGE_FALLBACK;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${SERVER_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a money amount as ₹1,234.00. Backend totals are all INR. */
export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(amount);
};

/** The price a customer actually pays — sale price when one is set. */
export const effectivePrice = (price: number, salePrice?: number | null): number =>
  salePrice !== null && salePrice !== undefined && salePrice < price ? salePrice : price;

export const discountPercent = (price: number, salePrice?: number | null): number => {
  if (!salePrice || salePrice >= price || price <= 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
};

/** Round a rating to one decimal for display (backend returns a raw AVG). */
export const formatRating = (rating: number | null | undefined): string =>
  (rating ?? 0).toFixed(1);

/** Convert a backend stock count into a customer-facing availability label. */
export const stockLabel = (
  quantity: number | null | undefined
): { label: string; tone: 'in' | 'low' | 'out' } => {
  const qty = quantity ?? 0;
  if (qty <= 0) return { label: 'Out of stock', tone: 'out' };
  if (qty <= 5) return { label: `Only ${qty} left`, tone: 'low' };
  return { label: 'In stock', tone: 'in' };
};

export const initials = (firstName?: string | null, lastName?: string | null): string =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
