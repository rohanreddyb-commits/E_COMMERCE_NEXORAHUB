'use client';

import React from 'react';
import Link from 'next/link';
import { loyaltyService, orderService, wishlistService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton, Skeleton } from '@/components/ui/Feedback';
import { ORDER_STATUS_TONE } from '@/components/account/orderStatus';

export default function AccountOverviewPage() {
  const { user } = useAuth();

  const recentOrders = useApiResource((signal) => orderService.recent(signal), []);
  const wishlist = useApiResource((signal) => wishlistService.get(signal), []);
  const loyalty = useApiResource((signal) => loyaltyService.dashboard(signal), []);

  const stats = [
    {
      label: 'Recent orders',
      value: recentOrders.data?.length ?? 0,
      icon: 'package_2',
      href: '/account/orders',
    },
    {
      label: 'Wishlist items',
      value: wishlist.data?.length ?? 0,
      icon: 'favorite',
      href: '/account/wishlist',
    },
    {
      label: 'Reward points',
      value: loyalty.data?.pointsBalance ?? user?.rewardPoints ?? 0,
      icon: 'stars',
      href: '/account/orders',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Your account
        </span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          Welcome back, {user?.firstName}
        </h1>
      </header>

      {/* Loyalty */}
      <section className="overflow-hidden rounded-xl bg-primary p-6 text-on-primary">
        {loyalty.loading ? (
          <Skeleton className="h-16 w-full bg-white/20" />
        ) : loyalty.data ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-on-primary/70">
                {loyalty.data.tier} member
              </span>
              <p className="font-headline text-3xl font-extrabold">
                {loyalty.data.pointsBalance} points
              </p>
              <p className="mt-1 text-xs text-on-primary/70">{loyalty.data.pointValue}</p>
            </div>
            {loyalty.data.nextTierInfo?.nextTier && (
              <div className="text-left sm:text-right">
                <p className="text-xs text-on-primary/70">Next tier</p>
                <p className="font-headline text-lg font-bold">
                  {loyalty.data.nextTierInfo.nextTier}
                </p>
                <p className="text-xs text-on-primary/70">
                  {loyalty.data.nextTierInfo.pointsNeeded} points to go
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-on-primary/80">
            Your loyalty summary is unavailable right now.
          </p>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex items-center gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 transition-shadow hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container">
              <span className="material-symbols-outlined text-xl text-primary">{stat.icon}</span>
            </span>
            <span>
              <span className="block font-headline text-2xl font-extrabold text-primary">
                {stat.value}
              </span>
              <span className="block text-xs uppercase tracking-wider text-outline">
                {stat.label}
              </span>
            </span>
          </Link>
        ))}
      </section>

      {/* Recent orders */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
            Recent orders
          </h2>
          <Link
            href="/account/orders"
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {recentOrders.loading && <ListRowSkeleton count={3} />}

        {!recentOrders.loading && recentOrders.error && (
          <ErrorState message={recentOrders.error} onRetry={recentOrders.reload} />
        )}

        {!recentOrders.loading && !recentOrders.error && (recentOrders.data?.length ?? 0) === 0 && (
          <EmptyState
            icon="package_2"
            title="No orders yet"
            description="When you place an order it will appear here."
            actionLabel="Start shopping"
            actionHref="/products"
          />
        )}

        {(recentOrders.data ?? []).map((order) => (
          <Link
            key={order.order_id}
            href={`/account/orders/${order.order_id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-shadow hover:shadow-md"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-headline text-sm font-bold text-primary">
                  {order.order_number}
                </span>
                <Badge tone={ORDER_STATUS_TONE[order.order_status] ?? 'neutral'}>
                  {order.order_status}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                {order.first_item}
                {order.item_count > 1 && ` and ${order.item_count - 1} more`}
              </p>
              <p className="text-xs text-outline">{formatDate(order.created_at)}</p>
            </div>
            <span className="font-headline text-lg font-extrabold text-primary">
              {formatCurrency(order.total_amount)}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
