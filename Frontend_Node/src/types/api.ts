/**
 * Types mirroring the backend customer API (backend/src/modules/**).
 *
 * Field names follow the backend exactly — SQL rows come back snake_case while
 * hand-mapped service responses are camelCase. Both are represented faithfully
 * rather than normalised, so a response can be traced straight to its query.
 */

// ─── Envelope ────────────────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  roles: string[];
  loyaltyTier: string;
  rewardPoints: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyOtpResponse {
  token?: string;
  message: string;
}

export type OtpType = 'password_reset' | 'email_verify';

export interface SessionInfo {
  sessionId: string;
  deviceName: string | null;
  deviceType: string | null;
  ipAddress: string | null;
  lastUsed: string;
  createdAt: string;
}

// ─── Products ────────────────────────────────────────────────────────────────

/**
 * Superset of every product projection the API returns. Endpoints select
 * different column sets (list, featured, best-sellers, related, recently
 * viewed), so anything not present in all of them is optional.
 */
export interface ProductSummary {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  primary_image: string | null;
  short_description?: string | null;
  sku?: string;
  is_featured?: boolean;
  created_at?: string;
  category_name?: string | null;
  brand_name?: string | null;
  stock_quantity?: number | null;
  stock_status?: string | null;
  avg_rating?: number;
  review_count?: number;
  discount_percent?: number;
  total_sold?: number;
  viewed_at?: string;
}

export interface ProductImage {
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  barcode?: string | null;
  status: string;
  meta_title?: string | null;
  meta_description?: string | null;
  category_slug?: string | null;
  brand_slug?: string | null;
  brand_logo?: string | null;
  images: ProductImage[];
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: number;
  brand?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Backend whitelist: price | name | created_at | rating */
  sort?: string;
  order?: 'ASC' | 'DESC';
  featured?: boolean;
  onSale?: boolean;
}

// ─── Categories & Brands (legacy /api routes, public GET) ────────────────────

export interface Category {
  category_id: number;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: number | null;
  image_url?: string | null;
  status?: 'Active' | 'Inactive' | string;
}

export interface Brand {
  brand_id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  cartItemId: number;
  productId: number;
  quantity: number;
  lineTotal: number;
  product: {
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    effectivePrice: number;
    brandName: string | null;
    primaryImage: string | null;
    stockQuantity: number;
    isAvailable: boolean;
  };
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  freeShippingMessage: string;
}

export interface AppliedCoupon {
  couponCode: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  message: string;
}

export interface Cart {
  items: CartItem[];
  summary: CartSummary;
  coupon: AppliedCoupon | null;
}

/** Raw CartItems row shape returned by GET /cart/saved. */
export interface SavedCartItem {
  cart_item_id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  brand_name: string | null;
  primary_image: string | null;
  stock_quantity: number;
  product_status?: string;
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistItem {
  wishlistItemId: number;
  productId: number;
  addedAt: string;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    brandName: string | null;
    primaryImage: string | null;
    stockStatus: string | null;
    stockQuantity: number;
    isAvailable: boolean;
  };
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export interface Address {
  address_id: number;
  user_id: number;
  type: 'Shipping' | 'Billing';
  title: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddressPayload {
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  type?: 'Shipping' | 'Billing';
  title?: string;
  is_default?: boolean;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  isEmailVerified: boolean;
  memberSince: string;
  lastLogin: string | null;
  loyalty: {
    tier: string;
    points: number;
  };
}

export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface OrderTotals {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  pointsDiscount: number;
  shippingFee: number;
  tax: number;
  total: number;
  appliedCoupon: { code: string; discount: number } | null;
}

export type PaymentMethod = 'COD' | 'Razorpay' | 'Stripe' | 'Wallet' | 'UPI' | 'Card';

export interface PlaceOrderPayload {
  addressId: number;
  couponCode?: string;
  paymentMethod: PaymentMethod;
  pointsToRedeem?: number;
  giftMessage?: string;
}

export interface PlaceOrderResult {
  orderId: number;
  orderNumber: string;
  totals?: OrderTotals;
  isIdempotent?: boolean;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export interface OrderListItem {
  order_id: number;
  order_number: string;
  order_status: OrderStatus;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface RecentOrder {
  order_id: number;
  order_number: string;
  order_status: OrderStatus;
  total_amount: number;
  created_at: string;
  item_count: number;
  first_item: string | null;
}

export interface OrderItemDetail {
  order_item_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image: string | null;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  changed_at: string;
  notes: string | null;
}

export interface OrderDetail {
  orderId: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  trackingNumber: string | null;
  giftMessage: string | null;
  pricing: {
    subtotal: number;
    shippingFee: number;
    tax: number;
    discount: number;
    total: number;
  };
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  items: OrderItemDetail[];
  payment: {
    gateway_transaction_id: string;
    payment_method: string;
    amount: number;
    status: string;
    response_json: string | null;
    created_at: string;
  } | null;
  statusHistory: OrderStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface PaymentIntentResponse {
  /** Present for COD orders — no gateway round-trip needed. */
  method?: 'COD';
  message?: string;
  orderId?: number;
  gateway?: string;
  intent?: {
    gatewayOrderId: string;
    amount: number;
    currency: string;
    gatewayData: Record<string, unknown>;
  };
}

export interface PaymentVerifyResult {
  success: boolean;
  orderStatus: string;
  paymentStatus: string;
}

export interface PaymentHistoryItem {
  transaction_id: number;
  order_id: number;
  order_number: string;
  gateway_transaction_id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  review_id: number;
  rating: number;
  title: string;
  body: string;
  helpful_votes: number;
  created_at: string;
  is_verified_purchase: boolean;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

export type RatingBreakdown = Record<1 | 2 | 3 | 4 | 5, number>;

export interface ProductReviews extends Paginated<Review> {
  ratingBreakdown: RatingBreakdown;
}

export interface ReviewPayload {
  rating: number;
  title: string;
  body: string;
}

export interface MyReview {
  review_id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  is_verified_purchase: boolean;
  helpful_votes: number;
  created_at: string;
  /** Named product_image here, unlike the primary_image used on product endpoints. */
  product_image: string | null;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export interface Coupon {
  code: string;
  description: string | null;
  discountType: 'Percentage' | 'Fixed' | string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  expiresAt: string;
}

export interface CouponValidation {
  valid: boolean;
  message: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface AutocompleteItem {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  category_name: string | null;
  primary_image: string | null;
}

export interface TrendingSearch {
  term: string;
  search_count: number;
}

export interface SearchHistoryItem {
  search_term: string;
  searched_at: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  reference_id: number | null;
  image_url: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyDashboard {
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
  pointValue: string;
  tiers: Record<string, { minPoints: number; maxPoints: number | null }>;
  nextTierInfo: {
    nextTier: string | null;
    pointsNeeded: number;
  } | null;
}

export interface LoyaltyTransaction {
  transaction_id: number;
  points: number;
  type: string;
  description: string;
  created_at: string;
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export interface ReturnRequestPayload {
  orderId: number;
  orderItemId: number;
  reason: string;
  description?: string;
}

export interface ReturnRequest {
  return_id: number;
  order_id: number;
  order_number?: string;
  order_item_id: number;
  product_name?: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}
