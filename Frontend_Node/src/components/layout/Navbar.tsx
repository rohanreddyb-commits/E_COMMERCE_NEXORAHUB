'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore, useCartCount } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAuth } from '@/context/AuthContext';
import { catalogService, notificationService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SearchOverlay } from './SearchOverlay';

const ACCOUNT_LINKS = [
  { label: 'My Orders', href: '/account/orders', icon: 'package_2' },
  { label: 'Wishlist', href: '/account/wishlist', icon: 'favorite' },
  { label: 'Addresses', href: '/account/addresses', icon: 'home_pin' },
  { label: 'My Reviews', href: '/account/reviews', icon: 'reviews' },
  { label: 'Notifications', href: '/account/notifications', icon: 'notifications' },
  { label: 'Profile Settings', href: '/account/profile', icon: 'settings' },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  const openDrawer = useCartStore((s) => s.openDrawer);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Gated on hydration inside the hook so the server-rendered badge matches
  // the first client render — persisted guest items are absent during SSR.
  const cartCount = useCartCount();

  const wishlistCount = useWishlistStore((s) =>
    !s.hydrated ? 0 : isAuthenticated ? s.serverItems.length : s.guestItems.length
  );

  const { data: categories } = useApiResource(
    (signal) => catalogService.categories(signal),
    [],
    { initialData: [] }
  );

  const { data: unread } = useApiResource(
    (signal) => notificationService.unreadCount(signal),
    [isAuthenticated],
    { enabled: isAuthenticated }
  );

  // Close menus on navigation.
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isAccountMenuOpen]);

  const topCategories = (categories ?? []).slice(0, 4);

  const navLinks = [
    { label: 'HOME', href: '/' },
    { label: 'SHOP ALL', href: '/products' },
    ...topCategories.map((category) => ({
      label: category.name.toUpperCase(),
      href: `/products?category=${category.category_id}`,
    })),
  ];

  return (
    <>
      <div className="bg-primary px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-on-primary">
        Complimentary express shipping on all orders over ₹500
      </div>

      <header className="glass-nav sticky top-0 z-40 border-b border-outline-variant/30 transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="p-2 text-on-surface transition-colors hover:text-secondary"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
            <button
              onClick={() => setIsSearchOpen((open) => !open)}
              className="p-2 text-on-surface transition-colors hover:text-secondary"
              aria-label="Search"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          </div>

          <nav className="hidden items-center space-x-6 text-[12px] font-semibold tracking-[0.15em] lg:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href.split('?')[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative py-1 transition-colors hover:text-secondary-fixed-dim',
                    isActive
                      ? 'font-bold text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-primary after:content-[""]'
                      : 'text-on-surface-variant'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link href="/" className="group flex flex-col items-center">
            <span className="font-headline text-2xl font-extrabold tracking-tighter text-primary transition-opacity group-hover:opacity-90 sm:text-3xl">
              AESTHETE
            </span>
            <span className="-mt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-outline">
              Paris • New York
            </span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-3">
            <button
              onClick={() => setIsSearchOpen((open) => !open)}
              className="hidden items-center gap-2 p-2 text-xs font-semibold tracking-wider text-on-surface-variant transition-colors hover:text-primary lg:flex"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
              <span className="hidden uppercase xl:inline">Search</span>
            </button>

            {isAuthenticated && (
              <Link
                href="/account/notifications"
                className="relative hidden p-2 text-on-surface-variant transition-colors hover:text-primary sm:block"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {(unread?.unreadCount ?? 0) > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                    {unread!.unreadCount > 9 ? '9+' : unread!.unreadCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/account/wishlist"
              className="relative hidden p-2 text-on-surface-variant transition-colors hover:text-primary sm:block"
              title="Wishlist"
            >
              <span className="material-symbols-outlined text-2xl">favorite</span>
              {wishlistCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary-container text-[10px] font-bold text-on-secondary-container">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Account menu */}
            <div className="relative" ref={accountMenuRef}>
              {isAuthenticated ? (
                <button
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-surface-container"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                    {initials(user?.firstName, user?.lastName)}
                  </span>
                  <span className="hidden text-xs font-semibold text-on-surface xl:inline">
                    {user?.firstName}
                  </span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1 p-2 text-on-surface-variant transition-colors hover:text-primary"
                  title="Sign in"
                >
                  <span className="material-symbols-outlined text-2xl">account_circle</span>
                </Link>
              )}

              {isAccountMenuOpen && isAuthenticated && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container-lowest shadow-2xl duration-150 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="border-b border-outline-variant/30 bg-surface-container-low px-4 py-3">
                    <p className="truncate text-sm font-bold text-primary">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
                      {user?.loyaltyTier} • {user?.rewardPoints ?? 0} pts
                    </p>
                  </div>
                  <nav className="py-1">
                    {ACCOUNT_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-lg text-outline">
                          {link.icon}
                        </span>
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                  <button
                    onClick={logout}
                    role="menuitem"
                    className="flex w-full items-center gap-3 border-t border-outline-variant/30 px-4 py-3 text-sm font-semibold text-error transition-colors hover:bg-error-container/40"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={openDrawer}
              className="relative flex items-center justify-center rounded-full bg-primary p-2.5 text-on-primary shadow-sm transition-transform hover:bg-primary-container active:scale-95"
              aria-label={`Open shopping bag, ${cartCount} items`}
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-container text-[10px] font-bold text-on-secondary-container shadow-md">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <SearchOverlay open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {isMobileMenuOpen && (
          <div className="space-y-4 border-t border-outline-variant/30 bg-surface-container-lowest px-6 py-6 shadow-xl lg:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm font-semibold tracking-widest text-on-surface hover:text-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
              <Link
                href="/cart"
                className="flex items-center gap-2 text-xs font-semibold tracking-widest text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                BAG ({cartCount})
              </Link>
              <Link
                href={isAuthenticated ? '/account/orders' : '/login'}
                className="flex items-center gap-2 text-xs font-semibold tracking-widest text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">person</span>
                {isAuthenticated ? 'ACCOUNT' : 'SIGN IN'}
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
