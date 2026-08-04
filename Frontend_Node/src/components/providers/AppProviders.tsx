'use client';

import React, { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';

/**
 * Keeps cart and wishlist aligned with the auth session.
 *
 * On sign-in the locally held guest items are replayed onto the server, then
 * both stores re-read from the API. On sign-out they drop back to empty guest
 * state so the next visitor on this browser starts clean.
 */
const SessionSync: React.FC = () => {
  const { user, initializing } = useAuth();
  const toast = useToast();

  const cartHydrated = useCartStore((s) => s.hydrated);
  const wishlistHydrated = useWishlistStore((s) => s.hydrated);

  // Tracks the user id the stores are currently synced against.
  const syncedUserId = useRef<number | null>(null);

  useEffect(() => {
    // Wait for persisted guest state, otherwise the merge would see an empty list.
    if (initializing || !cartHydrated || !wishlistHydrated) return;

    const currentId = user?.id ?? null;
    if (syncedUserId.current === currentId) return;
    syncedUserId.current = currentId;

    if (!currentId) {
      useCartStore.getState().resetToGuest();
      useWishlistStore.getState().resetToGuest();
      return;
    }

    let cancelled = false;

    (async () => {
      const [mergedCart, mergedWishlist] = await Promise.all([
        useCartStore.getState().mergeGuestCart(),
        useWishlistStore.getState().mergeGuestWishlist(),
      ]);
      useCartStore.getState().fetchSaved();

      if (cancelled) return;
      if (mergedCart > 0) {
        toast.success(
          `${mergedCart} item${mergedCart > 1 ? 's' : ''} from your guest bag moved to your account.`
        );
      }
      if (mergedWishlist > 0) {
        toast.info(
          `${mergedWishlist} saved item${mergedWishlist > 1 ? 's' : ''} added to your wishlist.`
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, initializing, cartHydrated, wishlistHydrated, toast]);

  return null;
};

/** Single mount point for every client-side provider used by the app shell. */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <AuthProvider>
      <SessionSync />
      {children}
    </AuthProvider>
  </ToastProvider>
);
