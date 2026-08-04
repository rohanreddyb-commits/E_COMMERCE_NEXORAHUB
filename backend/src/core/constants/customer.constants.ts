// ─── HTTP Error Codes ───────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── Customer Error Codes ───────────────────────────────────────────────────
export const CUSTOMER_ERRORS = {
  // Auth
  INVALID_CREDENTIALS: 'AUTH_001',
  ACCOUNT_LOCKED: 'AUTH_002',
  ACCOUNT_INACTIVE: 'AUTH_003',
  TOKEN_EXPIRED: 'AUTH_004',
  TOKEN_INVALID: 'AUTH_005',
  REFRESH_TOKEN_INVALID: 'AUTH_006',
  EMAIL_ALREADY_EXISTS: 'AUTH_007',
  EMAIL_NOT_VERIFIED: 'AUTH_008',
  OTP_INVALID: 'AUTH_009',
  OTP_EXPIRED: 'AUTH_010',
  PASSWORD_TOO_WEAK: 'AUTH_011',
  SAME_PASSWORD: 'AUTH_012',
  SESSION_NOT_FOUND: 'AUTH_013',

  // Profile
  PROFILE_NOT_FOUND: 'PROFILE_001',
  PROFILE_UPDATE_FAILED: 'PROFILE_002',

  // Address
  ADDRESS_NOT_FOUND: 'ADDR_001',
  ADDRESS_FORBIDDEN: 'ADDR_002',
  ADDRESS_LIMIT_REACHED: 'ADDR_003',

  // Cart
  CART_ITEM_NOT_FOUND: 'CART_001',
  CART_ITEM_FORBIDDEN: 'CART_002',
  CART_EMPTY: 'CART_003',
  INSUFFICIENT_STOCK: 'CART_004',
  PRODUCT_UNAVAILABLE: 'CART_005',
  CART_QUANTITY_EXCEEDS_STOCK: 'CART_006',

  // Order
  ORDER_NOT_FOUND: 'ORDER_001',
  ORDER_FORBIDDEN: 'ORDER_002',
  ORDER_NOT_CANCELLABLE: 'ORDER_003',
  ORDER_ALREADY_CANCELLED: 'ORDER_004',

  // Payment
  PAYMENT_FAILED: 'PAY_001',
  PAYMENT_ALREADY_DONE: 'PAY_002',
  PAYMENT_VERIFICATION_FAILED: 'PAY_003',

  // Product
  PRODUCT_NOT_FOUND: 'PROD_001',
  PRODUCT_INACTIVE: 'PROD_002',

  // Coupon
  COUPON_NOT_FOUND: 'COUP_001',
  COUPON_EXPIRED: 'COUP_002',
  COUPON_INACTIVE: 'COUP_003',
  COUPON_LIMIT_REACHED: 'COUP_004',
  COUPON_MIN_ORDER_NOT_MET: 'COUP_005',

  // Review
  REVIEW_NOT_FOUND: 'REV_001',
  REVIEW_ALREADY_EXISTS: 'REV_002',
  REVIEW_NOT_VERIFIED_PURCHASE: 'REV_003',
  REVIEW_FORBIDDEN: 'REV_004',

  // Support
  TICKET_NOT_FOUND: 'SUP_001',
  TICKET_FORBIDDEN: 'SUP_002',
  TICKET_CLOSED: 'SUP_003',

  // Return
  RETURN_NOT_FOUND: 'RET_001',
  RETURN_NOT_ELIGIBLE: 'RET_002',
  RETURN_ALREADY_EXISTS: 'RET_003',
  RETURN_WINDOW_EXPIRED: 'RET_004',

  // General
  VALIDATION_FAILED: 'GEN_001',
  NOT_FOUND: 'GEN_002',
  FORBIDDEN: 'GEN_003',
  INTERNAL_ERROR: 'GEN_004',
  IDEMPOTENCY_KEY_CONFLICT: 'GEN_005',
} as const;

// ─── Order Status ────────────────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
} as const;

export const CANCELLABLE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
];

export const RETURNABLE_ORDER_STATUSES = [ORDER_STATUS.DELIVERED];

// ─── Payment Status ──────────────────────────────────────────────────────────
export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
} as const;

// ─── Notification Types ──────────────────────────────────────────────────────
export const NOTIFICATION_TYPE = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  REVIEW_APPROVED: 'review_approved',
  COUPON_AVAILABLE: 'coupon_available',
  PRICE_DROP: 'price_drop',
  BACK_IN_STOCK: 'back_in_stock',
  REFERRAL_REWARD: 'referral_reward',
  LOYALTY_POINTS: 'loyalty_points',
  SUPPORT_REPLY: 'support_reply',
  RETURN_APPROVED: 'return_approved',
  REFUND_PROCESSED: 'refund_processed',
  GENERAL: 'general',
} as const;

// ─── Support Ticket Status ───────────────────────────────────────────────────
export const TICKET_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
} as const;

// ─── Return Status ───────────────────────────────────────────────────────────
export const RETURN_STATUS = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PICKED_UP: 'Picked Up',
  REFUNDED: 'Refunded',
} as const;

// ─── Loyalty ─────────────────────────────────────────────────────────────────
export const LOYALTY_TIER = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
} as const;

export const POINTS_PER_RUPEE = 1; // 1 point per ₹1 spent
export const POINT_VALUE_IN_RUPEES = 0.25; // 1 point = ₹0.25
export const MAX_REDEEM_PERCENT = 0.2; // max 20% of order value can be paid via points
export const RETURN_WINDOW_DAYS = 7;

// ─── Cache Keys ──────────────────────────────────────────────────────────────
export const CACHE_KEYS = {
  PRODUCT: (id: number) => `product:${id}`,
  PRODUCTS_LIST: (hash: string) => `products:${hash}`,
  CATEGORIES: 'categories:all',
  BRANDS: 'brands:all',
  TRENDING_PRODUCTS: 'products:trending',
  FEATURED_PRODUCTS: 'products:featured',
  BEST_SELLERS: 'products:best-sellers',
  NEW_ARRIVALS: 'products:new-arrivals',
  FLASH_SALE: 'products:flash-sale',
  TRENDING_SEARCHES: 'search:trending',
  POPULAR_SEARCHES: 'search:popular',
  COUPON: (code: string) => `coupon:${code}`,
  CUSTOMER_CART: (userId: number) => `cart:${userId}`,
  CUSTOMER_WISHLIST: (userId: number) => `wishlist:${userId}`,
  CUSTOMER_NOTIFICATIONS: (userId: number) => `notifications:${userId}`,
} as const;

// ─── Cache TTL (seconds) ─────────────────────────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60,        // 1 min
  MEDIUM: 300,      // 5 min
  LONG: 1800,       // 30 min
  VERY_LONG: 3600,  // 1 hour
  DAY: 86400,       // 24 hours
} as const;

// ─── Rate Limit Configs ──────────────────────────────────────────────────────
export const RATE_LIMITS = {
  AUTH: { windowMs: 15 * 60 * 1000, max: 10 },           // 10 per 15 min
  FORGOT_PASSWORD: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 per hour
  OTP_VERIFY: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 per 15 min — 6-digit keyspace
  API: { windowMs: 15 * 60 * 1000, max: 200 },           // 200 per 15 min
  SEARCH: { windowMs: 60 * 1000, max: 50 },              // 50 per minute
  CHECKOUT: { windowMs: 60 * 60 * 1000, max: 20 },       // 20 per hour
  CONTENT_WRITE: { windowMs: 60 * 60 * 1000, max: 30 },  // reviews/tickets/returns
  UPLOAD: { windowMs: 60 * 60 * 1000, max: 20 },         // 20 files per hour
} as const;

// ─── Misc ────────────────────────────────────────────────────────────────────
export const MAX_ADDRESSES = 10;
export const MAX_CART_ITEMS = 50;
export const MAX_WISHLIST_ITEMS = 100;
export const OTP_EXPIRY_MINUTES = 10;
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const ACCESS_TOKEN_EXPIRY = '15m';
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_DURATION_MINUTES = 30;

// ─── Security ────────────────────────────────────────────────────────────────
/** bcrypt work factor. Single source of truth for both auth stacks. */
export const BCRYPT_COST = 12;

/**
 * The only message returned for a failed sign-in. Constant across "no such
 * user", "wrong password", "locked" and "inactive" so the response cannot be
 * used to enumerate accounts or to pace a spray under the lockout threshold.
 */
export const GENERIC_LOGIN_FAILURE = 'Invalid email or password.';

/** Wrong-OTP guesses tolerated before the OTP is invalidated outright. */
export const MAX_OTP_ATTEMPTS = 5;

/** Roles permitted to sign in to the admin console. */
export const STAFF_ROLES = ['Super Admin', 'Admin', 'Support', 'Inventory Manager'] as const;

/** Seconds a validated session is cached before it is re-read from the DB. */
export const SESSION_CACHE_TTL_SECONDS = 30;
