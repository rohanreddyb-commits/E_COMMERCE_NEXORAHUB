export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export interface ProductSpec {
  title: string;
  content: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  category: string;
  tag?: string;
  badge?: string;
  description: string;
  images: string[];
  colors: ProductColor[];
  sizes: string[];
  specs: ProductSpec[];
  isNewArrival?: boolean;
  isFeatured?: boolean;
  rating?: number;
  reviewsCount?: number;
}

export interface CartItem {
  id: string; // unique cart item id (product.id + color + size)
  product: Product;
  selectedColor: ProductColor;
  selectedSize: string;
  quantity: number;
}

export interface Address {
  id: string;
  fullName: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  shippingAddress: Address;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  memberTier: string;
  memberSince: string;
  phone: string;
  addresses: Address[];
}
