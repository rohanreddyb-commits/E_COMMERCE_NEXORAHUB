/**
 * Generate a URL-safe slug from any string.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug by appending a suffix if needed.
 */
export function generateUniqueSlug(text: string, suffix?: string | number): string {
  const base = generateSlug(text);
  return suffix !== undefined ? `${base}-${suffix}` : base;
}

/**
 * Build a hash string from filter/sort params for cache keying.
 */
export function buildCacheHash(params: Record<string, unknown>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join('&');
}

/**
 * Generate a random order number.
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NXR-${timestamp}-${random}`;
}

/**
 * Format money value to 2 decimal places.
 */
export function formatMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate discount amount from coupon.
 */
export function calculateDiscount(
  subtotal: number,
  discountType: 'Percentage' | 'Fixed' | 'Free Shipping',
  discountValue: number,
  maxDiscountAmount?: number | null
): number {
  let discount = 0;
  if (discountType === 'Percentage') {
    discount = (subtotal * discountValue) / 100;
    if (maxDiscountAmount && discount > maxDiscountAmount) {
      discount = maxDiscountAmount;
    }
  } else if (discountType === 'Fixed') {
    discount = Math.min(discountValue, subtotal);
  } else if (discountType === 'Free Shipping') {
    discount = 0; // shipping handled separately
  }
  return formatMoney(discount);
}
