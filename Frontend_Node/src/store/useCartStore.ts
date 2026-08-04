import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { cartService } from '@/services';
import { ApiError } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/lib/config';
import { tokenStorage } from '@/lib/tokenStorage';
import { effectivePrice } from '@/lib/format';
import type { Cart, CartSummary, ProductSummary, SavedCartItem } from '@/types/api';

/**
 * Cart store.
 *
 * Signed in → the server cart is the single source of truth. Every mutation
 *             returns the recalculated cart, which replaces local state, so
 *             pricing, tax and stock rules live only in the backend.
 * Guest     → items are held locally with a product snapshot for display.
 *             No totals are computed client-side: replicating the backend's
 *             GST/shipping rules would let them drift. Guests see a subtotal
 *             and get exact totals from /checkout/summary after signing in.
 *
 * On login, mergeGuestCart() replays local items through POST /cart/items.
 */

export interface CartLine {
  /** Stable React key across both modes. */
  key: string;
  /** Server cart item id; null for guest lines. */
  cartItemId: number | null;
  productId: number;
  quantity: number;
  name: string;
  slug: string;
  image: string | null;
  brandName: string | null;
  unitPrice: number;
  lineTotal: number;
  stockQuantity: number;
  isAvailable: boolean;
}

/** Minimum product shape needed to add something to the cart. */
export type CartAddable = Pick<
  ProductSummary,
  'product_id' | 'name' | 'slug' | 'price' | 'sale_price' | 'primary_image'
> & { brand_name?: string | null; stock_quantity?: number | null };

interface GuestLine {
  productId: number;
  quantity: number;
  name: string;
  slug: string;
  image: string | null;
  brandName: string | null;
  price: number;
  salePrice: number | null;
}

interface CartState {
  guestItems: GuestLine[];
  serverCart: Cart | null;
  savedItems: SavedCartItem[];
  loading: boolean;
  /** Key of the line currently mutating, for per-row spinners. */
  pendingKey: string | null;
  error: string | null;
  isDrawerOpen: boolean;
  /** False until persisted guest state has been read back on the client. */
  hydrated: boolean;

  setHydrated: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  fetchCart: () => Promise<void>;
  fetchSaved: () => Promise<void>;
  addItem: (product: CartAddable, quantity?: number) => Promise<void>;
  updateQuantity: (line: CartLine, quantity: number) => Promise<void>;
  removeItem: (line: CartLine) => Promise<void>;
  clearCart: () => Promise<void>;
  saveForLater: (line: CartLine) => Promise<void>;
  moveSavedToCart: (cartItemId: number) => Promise<void>;
  mergeGuestCart: () => Promise<number>;
  resetToGuest: () => void;

  getLines: () => CartLine[];
  getSummary: () => CartSummary | null;
  getSubtotal: () => number;
  getTotalItems: () => number;
  isInCart: (productId: number) => boolean;
}

const isSignedIn = () => tokenStorage.isAuthenticated();

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

/** Pure projection of either cart source into the unified line list. */
const buildCartLines = (
  hydrated: boolean,
  serverCart: Cart | null,
  guestItems: GuestLine[]
): CartLine[] => {
  if (!hydrated) return [];

  if (serverCart) {
    return serverCart.items.map((item) => ({
      key: `srv-${item.cartItemId}`,
      cartItemId: item.cartItemId,
      productId: item.productId,
      quantity: item.quantity,
      name: item.product.name,
      slug: item.product.slug,
      image: item.product.primaryImage,
      brandName: item.product.brandName,
      unitPrice: item.product.effectivePrice,
      lineTotal: item.lineTotal,
      stockQuantity: item.product.stockQuantity,
      isAvailable: item.product.isAvailable,
    }));
  }

  return guestItems.map((item) => {
    const unitPrice = effectivePrice(item.price, item.salePrice);
    return {
      key: `guest-${item.productId}`,
      cartItemId: null,
      productId: item.productId,
      quantity: item.quantity,
      name: item.name,
      slug: item.slug,
      image: item.image,
      brandName: item.brandName,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      // Guests have no stock projection; the server validates on merge.
      stockQuantity: Number.MAX_SAFE_INTEGER,
      isAvailable: true,
    };
  });
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      guestItems: [],
      serverCart: null,
      savedItems: [],
      loading: false,
      pendingKey: null,
      error: null,
      isDrawerOpen: false,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      async fetchCart() {
        if (!isSignedIn()) {
          set({ serverCart: null, loading: false, error: null });
          return;
        }
        set({ loading: true, error: null });
        try {
          const cart = await cartService.get();
          set({ serverCart: cart, loading: false });
        } catch (error) {
          set({ loading: false, error: toMessage(error, 'Could not load your bag.') });
        }
      },

      async fetchSaved() {
        if (!isSignedIn()) {
          set({ savedItems: [] });
          return;
        }
        try {
          set({ savedItems: await cartService.getSaved() });
        } catch {
          /* Saved-for-later is supplementary — never block the cart on it. */
        }
      },

      async addItem(product, quantity = 1) {
        if (!isSignedIn()) {
          set((state) => {
            const existing = state.guestItems.find((i) => i.productId === product.product_id);
            const guestItems = existing
              ? state.guestItems.map((i) =>
                  i.productId === product.product_id
                    ? { ...i, quantity: Math.min(i.quantity + quantity, 100) }
                    : i
                )
              : [
                  ...state.guestItems,
                  {
                    productId: product.product_id,
                    quantity,
                    name: product.name,
                    slug: product.slug,
                    image: product.primary_image ?? null,
                    brandName: product.brand_name ?? null,
                    price: product.price,
                    salePrice: product.sale_price ?? null,
                  },
                ];
            return { guestItems, isDrawerOpen: true, error: null };
          });
          return;
        }

        set({ pendingKey: `add-${product.product_id}`, error: null });
        try {
          const cart = await cartService.addItem(product.product_id, quantity);
          set({ serverCart: cart, isDrawerOpen: true, pendingKey: null });
        } catch (error) {
          set({ pendingKey: null });
          throw new Error(toMessage(error, 'Could not add this item to your bag.'));
        }
      },

      async updateQuantity(line, quantity) {
        if (quantity < 1) return get().removeItem(line);

        if (!line.cartItemId) {
          set((state) => ({
            guestItems: state.guestItems.map((i) =>
              i.productId === line.productId ? { ...i, quantity } : i
            ),
          }));
          return;
        }

        set({ pendingKey: line.key, error: null });
        try {
          const cart = await cartService.updateItem(line.cartItemId, quantity);
          set({ serverCart: cart, pendingKey: null });
        } catch (error) {
          set({ pendingKey: null });
          throw new Error(toMessage(error, 'Could not update the quantity.'));
        }
      },

      async removeItem(line) {
        if (!line.cartItemId) {
          set((state) => ({
            guestItems: state.guestItems.filter((i) => i.productId !== line.productId),
          }));
          return;
        }

        set({ pendingKey: line.key, error: null });
        try {
          const cart = await cartService.removeItem(line.cartItemId);
          set({ serverCart: cart, pendingKey: null });
        } catch (error) {
          set({ pendingKey: null });
          throw new Error(toMessage(error, 'Could not remove this item.'));
        }
      },

      async clearCart() {
        if (!isSignedIn()) {
          set({ guestItems: [] });
          return;
        }
        await cartService.clear();
        await get().fetchCart();
      },

      async saveForLater(line) {
        if (!line.cartItemId) return;
        set({ pendingKey: line.key });
        try {
          await cartService.saveForLater(line.cartItemId);
          await Promise.all([get().fetchCart(), get().fetchSaved()]);
        } finally {
          set({ pendingKey: null });
        }
      },

      async moveSavedToCart(cartItemId) {
        set({ pendingKey: `saved-${cartItemId}` });
        try {
          const cart = await cartService.moveSavedToCart(cartItemId);
          set({ serverCart: cart });
          await get().fetchSaved();
        } finally {
          set({ pendingKey: null });
        }
      },

      /**
       * Replay the guest cart onto the server after sign-in.
       * Items are added sequentially so a stock rejection on one does not
       * abort the rest. Returns how many merged successfully.
       */
      async mergeGuestCart() {
        const { guestItems } = get();
        if (!guestItems.length) {
          await get().fetchCart();
          return 0;
        }

        let merged = 0;
        for (const item of guestItems) {
          try {
            await cartService.addItem(item.productId, item.quantity);
            merged += 1;
          } catch {
            /* Out of stock or unavailable — skip and keep going. */
          }
        }

        set({ guestItems: [] });
        await get().fetchCart();
        return merged;
      },

      resetToGuest() {
        set({ serverCart: null, savedItems: [], guestItems: [], error: null });
      },

      getLines: () => {
        const { hydrated, serverCart, guestItems } = get();
        return buildCartLines(hydrated, serverCart, guestItems);
      },

      /** Null for guests — only the backend computes tax and shipping. */
      getSummary: () => get().serverCart?.summary ?? null,

      getSubtotal() {
        const summary = get().serverCart?.summary;
        if (summary) return summary.subtotal;
        return get()
          .getLines()
          .reduce((total, line) => total + line.lineTotal, 0);
      },

      getTotalItems() {
        return get()
          .getLines()
          .reduce((count, line) => count + line.quantity, 0);
      },

      isInCart: (productId) => get().getLines().some((line) => line.productId === productId),
    }),
    {
      name: STORAGE_KEYS.guestCart,
      storage: createJSONStorage(() => localStorage),
      // Only the guest cart survives a reload; server state is always re-fetched.
      partialize: (state) => ({ guestItems: state.guestItems }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

/**
 * Subscribe to the unified line list.
 *
 * Each store slice is selected separately so every subscription returns a
 * stable reference, then the projection is memoised. Selecting a freshly built
 * array straight from the store would hand useSyncExternalStore a new snapshot
 * on every read and re-render in a loop.
 */
export const useCartLines = (): CartLine[] => {
  const hydrated = useCartStore((s) => s.hydrated);
  const serverCart = useCartStore((s) => s.serverCart);
  const guestItems = useCartStore((s) => s.guestItems);

  return useMemo(
    () => buildCartLines(hydrated, serverCart, guestItems),
    [hydrated, serverCart, guestItems]
  );
};

/** Total units in the bag, safe to render during SSR. */
export const useCartCount = (): number =>
  useCartStore((s) =>
    !s.hydrated
      ? 0
      : s.serverCart
        ? s.serverCart.items.reduce((total, item) => total + item.quantity, 0)
        : s.guestItems.reduce((total, item) => total + item.quantity, 0)
  );
