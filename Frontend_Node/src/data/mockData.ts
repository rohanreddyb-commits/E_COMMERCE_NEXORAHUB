import { Product, UserProfile, Order } from '@/types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'aesthete-essential-hoodie',
    slug: 'aesthete-essential-hoodie',
    name: 'Aesthete Heavyweight Hoodie',
    subtitle: '500GSM Organic Cotton Fleece • Boxy Cut',
    price: 185.00,
    originalPrice: 220.00,
    category: 'Outerwear',
    tag: 'EDITORIAL EXCLUSIVE',
    badge: 'NEW ARRIVAL',
    description: 'Constructed from custom-developed 500GSM double-faced organic cotton fleece. Features dropped shoulders, clean raw-edge hems, double-layered hood without drawstrings, and subtle tonal embroidery at the nape.',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85'
    ],
    colors: [
      { name: 'Onyx Black', hex: '#121212' },
      { name: 'Chalk White', hex: '#F5F5F3' },
      { name: 'Raw Slate', hex: '#58595B' },
      { name: 'Teal Pulse', hex: '#37D6C4' }
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    specs: [
      { title: 'Material & Construction', content: '100% Organic French Terry Fleece (500GSM). Pre-shrunk garment process with reactive dye treatment for deep tone preservation.' },
      { title: 'Fit & Sizing', content: 'Relaxed boxy silhouette with exaggerated drop shoulders. True to size for intentional oversized aesthetic; size down for standard fit.' },
      { title: 'Care Instructions', content: 'Machine wash cold inside out with mild detergent. Hang dry in shade. Do not tumble dry or dry clean.' },
      { title: 'Shipping & Returns', content: 'Complimentary express global shipping on orders over $250. 30-day hassle-free returns.' }
    ],
    isNewArrival: true,
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 48
  },
  {
    id: 'monolith-oversized-blazer',
    slug: 'monolith-oversized-blazer',
    name: 'Monolith Architectural Blazer',
    subtitle: 'Virgin Wool Blend • Structured Shoulders',
    price: 380.00,
    category: 'Tailoring',
    tag: 'LIMITED DROP',
    badge: 'HOT',
    description: 'Precision-cut double-breasted blazer featuring sharp peak lapels, concealed matte horn buttons, and an architectural structural shoulder line.',
    images: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85'
    ],
    colors: [
      { name: 'Onyx Black', hex: '#121212' },
      { name: 'Concrete Gray', hex: '#8C8C8C' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    specs: [
      { title: 'Material', content: '85% Virgin Wool, 15% Cashmere lining.' },
      { title: 'Fit', content: 'Tailored oversized fit.' }
    ],
    isNewArrival: true,
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 19
  },
  {
    id: 'tactile-cargo-trousers',
    slug: 'tactile-cargo-trousers',
    name: 'Tactile Ergonomic Cargo Trousers',
    subtitle: 'Water-Repellent Ripstop • Modular Pockets',
    price: 240.00,
    category: 'Bottoms',
    tag: 'CORE SERIES',
    description: 'Technical trousers engineered with articulated knee darts, magnetic closure utility pockets, and adjustable ankle cinches.',
    images: [
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1200&q=85'
    ],
    colors: [
      { name: 'Shadow Black', hex: '#1a1c1c' },
      { name: 'Military Olive', hex: '#3E4437' }
    ],
    sizes: ['28', '30', '32', '34', '36'],
    specs: [
      { title: 'Material', content: 'Technical Cordura Ripstop with DWR coating.' }
    ],
    isFeatured: true,
    rating: 4.8,
    reviewsCount: 34
  },
  {
    id: 'kinetic-trench-coat',
    slug: 'kinetic-trench-coat',
    name: 'Kinetic Storm Trench Coat',
    subtitle: '3-Layer Membrane • Storm Flap',
    price: 490.00,
    category: 'Outerwear',
    tag: 'EDITORIAL',
    badge: 'ESSENTIAL',
    description: 'Modern interpretation of the classic trench coat with high collar, magnetic belt closure, and laser-bonded seam sealing.',
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=85'
    ],
    colors: [
      { name: 'Chalk Sand', hex: '#E2E2E2' },
      { name: 'Midnight Black', hex: '#000000' }
    ],
    sizes: ['S', 'M', 'L'],
    specs: [
      { title: 'Protection', content: '20,000mm Waterproof Rating.' }
    ],
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 12
  }
];

export const MOCK_USER: UserProfile = {
  id: 'user-01',
  name: 'Julian Thorne',
  email: 'j.thorne@aesthete.design',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  memberTier: 'AESTHETE BLACK VIP',
  memberSince: '2023',
  phone: '+1 (555) 839-2041',
  addresses: [
    {
      id: 'addr-01',
      fullName: 'Julian Thorne',
      street: '742 Mercer Street',
      apartment: 'Suite 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10012',
      country: 'United States',
      isDefault: true
    },
    {
      id: 'addr-02',
      fullName: 'Julian Thorne',
      street: '18 Rue de la Paix',
      city: 'Paris',
      state: 'Île-de-France',
      zipCode: '75002',
      country: 'France',
      isDefault: false
    }
  ]
};

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-9402',
    orderNumber: 'AES-2026-9402',
    date: '2026-07-14',
    status: 'Delivered',
    trackingNumber: '1Z9999999999999999',
    estimatedDelivery: '2026-07-16',
    items: [
      {
        productId: 'aesthete-essential-hoodie',
        productName: 'Aesthete Heavyweight Hoodie',
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=400&q=80',
        color: 'Onyx Black',
        size: 'L',
        price: 185.00,
        quantity: 1
      },
      {
        productId: 'tactile-cargo-trousers',
        productName: 'Tactile Ergonomic Cargo Trousers',
        image: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=400&q=80',
        color: 'Shadow Black',
        size: '32',
        price: 240.00,
        quantity: 1
      }
    ],
    subtotal: 425.00,
    shippingFee: 0,
    tax: 37.19,
    total: 462.19,
    shippingAddress: MOCK_USER.addresses[0]
  },
  {
    id: 'ord-8105',
    orderNumber: 'AES-2026-8105',
    date: '2026-06-28',
    status: 'Processing',
    trackingNumber: '1Z8888888888888888',
    estimatedDelivery: '2026-07-24',
    items: [
      {
        productId: 'monolith-oversized-blazer',
        productName: 'Monolith Architectural Blazer',
        image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80',
        color: 'Onyx Black',
        size: 'M',
        price: 380.00,
        quantity: 1
      }
    ],
    subtotal: 380.00,
    shippingFee: 15.00,
    tax: 33.25,
    total: 428.25,
    shippingAddress: MOCK_USER.addresses[0]
  }
];
