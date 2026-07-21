import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, ProductColor } from '@/types';
import { MOCK_PRODUCTS } from '@/data/mockData';

interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (product: Product, selectedColor: ProductColor, selectedSize: string, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

const defaultProduct = MOCK_PRODUCTS[0];

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: `${defaultProduct.id}-${defaultProduct.colors[0].name}-${defaultProduct.sizes[2]}`,
          product: defaultProduct,
          selectedColor: defaultProduct.colors[0],
          selectedSize: defaultProduct.sizes[2],
          quantity: 1,
        }
      ],
      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
      
      addItem: (product, selectedColor, selectedSize, quantity = 1) => {
        const itemId = `${product.id}-${selectedColor.name}-${selectedSize}`;
        const existing = get().items.find((item) => item.id === itemId);

        if (existing) {
          set({
            items: get().items.map((item) =>
              item.id === itemId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
            isDrawerOpen: true,
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                id: itemId,
                product,
                selectedColor,
                selectedSize,
                quantity,
              },
            ],
            isDrawerOpen: true,
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
      },

      updateQuantity: (id, delta) => {
        set({
          items: get().items
            .map((item) => {
              if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter(Boolean) as CartItem[],
        });
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getTotalItems: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'aesthete-cart-storage',
    }
  )
);
