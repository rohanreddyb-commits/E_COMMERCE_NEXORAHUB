import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wishlistService } from '@/services';
import { ApiError } from '@/lib/apiClient';
import { STORAGE_KEYS } from '@/lib/config';
import { tokenStorage } from '@/lib/tokenStorage';
import type { ProductSummary, WishlistItem } from '@/types/api';

/**
 * Wishlist store, mirroring the cart's two-mode design.
 *
 * Signed in → GET /wishlist is the source of truth.
 * Guest     → product snapshots held locally, merged on sign-in.
 */

export interface WishlistLine {
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  brandName: string | null;
  price: number;
  salePrice: number | null;
  isAvailable: boolean;
  stockQuantity: number;
}

export type WishlistAddable = Pick<
  ProductSummary,
  'product_id' | 'name' | 'slug' | 'price' | 'sale_price' | 'primary_image'
> & { brand_name?: string | null; stock_quantity?: number | null };

interface WishlistState {
  guestItems: WishlistLine[];
  serverItems: WishlistItem[];
  loading: boolean;
  pendingId: number | null;
  hydrated: boolean;

  setHydrated: () => void;
  fetchWishlist: () => Promise<void>;
  /** Adds or removes depending on current membership. Returns the new state. */
  toggle: (product: WishlistAddable) => Promise<boolean>;
  remove: (productId: number) => Promise<void>;
  moveToCart: (productId: number, quantity?: number) => Promise<void>;
  mergeGuestWishlist: () => Promise<number>;
  resetToGuest: () => void;

  getLines: () => WishlistLine[];
  isInWishlist: (productId: number) => boolean;
  getCount: () => number;
}

const isSignedIn = () => tokenStorage.isAuthenticated();

const toMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback;

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      guestItems: [],
      serverItems: [],
      loading: false,
      pendingId: null,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      async fetchWishlist() {
        if (!isSignedIn()) {
          set({ serverItems: [], loading: false });
          return;
        }
        set({ loading: true });
        try {
          set({ serverItems: await wishlistService.get(), loading: false });
        } catch {
          set({ loading: false });
        }
      },

      async toggle(product) {
        const productId = product.product_id;
        const currentlySaved = get().isInWishlist(productId);

        if (!isSignedIn()) {
          set((state) => ({
            guestItems: currentlySaved
              ? state.guestItems.filter((i) => i.productId !== productId)
              : [
                  ...state.guestItems,
                  {
                    productId,
                    name: product.name,
                    slug: product.slug,
                    image: product.primary_image ?? null,
                    brandName: product.brand_name ?? null,
                    price: product.price,
                    salePrice: product.sale_price ?? null,
                    isAvailable: (product.stock_quantity ?? 1) > 0,
                    stockQuantity: product.stock_quantity ?? 0,
                  },
                ],
          }));
          return !currentlySaved;
        }

        set({ pendingId: productId });
        try {
          if (currentlySaved) await wishlistService.remove(productId);
          else await wishlistService.add(productId);
          await get().fetchWishlist();
          return !currentlySaved;
        } catch (error) {
          // 409 means it is already saved — treat as success rather than an error.
          if (error instanceof ApiError && error.statusCode === 409) {
            await get().fetchWishlist();
            return true;
          }
          throw new Error(toMessage(error, 'Could not update your wishlist.'));
        } finally {
          set({ pendingId: null });
        }
      },

      async remove(productId) {
        if (!isSignedIn()) {
          set((state) => ({
            guestItems: state.guestItems.filter((i) => i.productId !== productId),
          }));
          return;
        }
        set({ pendingId: productId });
        try {
          await wishlistService.remove(productId);
          await get().fetchWishlist();
        } finally {
          set({ pendingId: null });
        }
      },

      async moveToCart(productId, quantity = 1) {
        set({ pendingId: productId });
        try {
          await wishlistService.moveToCart(productId, quantity);
          await get().fetchWishlist();
        } catch (error) {
          throw new Error(toMessage(error, 'Could not move this item to your bag.'));
        } finally {
          set({ pendingId: null });
        }
      },

      async mergeGuestWishlist() {
        const { guestItems } = get();
        if (!guestItems.length) {
          await get().fetchWishlist();
          return 0;
        }

        let merged = 0;
        for (const item of guestItems) {
          try {
            await wishlistService.add(item.productId);
            merged += 1;
          } catch {
            /* Already saved or limit reached — skip. */
          }
        }

        set({ guestItems: [] });
        await get().fetchWishlist();
        return merged;
      },

      resetToGuest() {
        set({ serverItems: [], guestItems: [] });
      },

      getLines() {
        const { serverItems, guestItems } = get();
        if (isSignedIn()) {
          return serverItems.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            slug: item.product.slug,
            image: item.product.primaryImage,
            brandName: item.product.brandName,
            price: item.product.price,
            salePrice: item.product.salePrice,
            isAvailable: item.product.isAvailable,
            stockQuantity: item.product.stockQuantity,
          }));
        }
        return guestItems;
      },

      isInWishlist: (productId) => get().getLines().some((i) => i.productId === productId),

      getCount: () => get().getLines().length,
    }),
    {
      name: STORAGE_KEYS.guestWishlist,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestItems: state.guestItems }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);
