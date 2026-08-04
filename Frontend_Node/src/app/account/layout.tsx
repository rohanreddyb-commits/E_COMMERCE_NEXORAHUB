'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { getImageUrl, initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Overview', href: '/account', icon: 'dashboard', exact: true },
  { label: 'Orders', href: '/account/orders', icon: 'package_2' },
  { label: 'Wishlist', href: '/account/wishlist', icon: 'favorite' },
  { label: 'Addresses', href: '/account/addresses', icon: 'home_pin' },
  { label: 'Reviews', href: '/account/reviews', icon: 'reviews' },
  { label: 'Notifications', href: '/account/notifications', icon: 'notifications' },
  { label: 'Profile', href: '/account/profile', icon: 'settings' },
];

const AccountChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-3 border-b border-outline-variant/30 bg-surface-container-low p-5">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(user.avatar)}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {initials(user?.firstName, user?.lastName)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-headline text-sm font-bold text-primary">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
              </div>
            </div>

            <nav className="p-2" aria-label="Account">
              {NAV_ITEMS.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-primary font-semibold text-on-primary'
                        : 'text-on-surface hover:bg-surface-container'
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 border-t border-outline-variant/30 px-5 py-3.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/40"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AccountChrome>{children}</AccountChrome>
    </RequireAuth>
  );
}
