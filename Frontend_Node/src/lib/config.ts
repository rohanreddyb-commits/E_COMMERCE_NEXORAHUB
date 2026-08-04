/**
 * Central runtime configuration.
 * Never hardcode URLs elsewhere — import from here.
 */

/** Admin/legacy API root, e.g. http://localhost:5000/api */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Customer V1 API root, e.g. http://localhost:5000/api/v1/customer */
export const CUSTOMER_API_PREFIX = '/v1/customer';

/** Server origin without the /api suffix — used to resolve uploaded image paths. */
export const SERVER_ORIGIN = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -'/api'.length)
  : API_BASE_URL;

/** localStorage keys. Namespaced so they never collide with the admin app. */
export const STORAGE_KEYS = {
  accessToken: 'nexora.customer.accessToken',
  refreshToken: 'nexora.customer.refreshToken',
  user: 'nexora.customer.user',
  guestCart: 'nexora.customer.guestCart',
  guestWishlist: 'nexora.customer.guestWishlist',
  recentSearches: 'nexora.customer.recentSearches',
} as const;

/** Business constants mirrored from backend core/constants/customer.constants.ts. */
export const CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';
export const FREE_SHIPPING_THRESHOLD = 500;
export const MAX_RECENT_SEARCHES = 8;
export const DEFAULT_PAGE_SIZE = 12;
