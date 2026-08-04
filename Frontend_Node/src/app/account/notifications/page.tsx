'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { notificationService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button, Pagination } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui/Feedback';

/** Icon per backend NOTIFICATION_TYPE value. */
const TYPE_ICON: Record<string, string> = {
  order_placed: 'shopping_bag',
  order_confirmed: 'task_alt',
  order_shipped: 'local_shipping',
  order_delivered: 'check_circle',
  order_cancelled: 'cancel',
  payment_success: 'payments',
  payment_failed: 'error',
  review_approved: 'reviews',
  coupon_available: 'local_offer',
  price_drop: 'trending_down',
  back_in_stock: 'inventory',
  referral_reward: 'group_add',
  loyalty_points: 'stars',
  support_reply: 'support_agent',
  return_approved: 'assignment_return',
  refund_processed: 'currency_exchange',
  general: 'notifications',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const notifications = useApiResource(
    (signal) =>
      notificationService.list({ page, limit: 15, unread: unreadOnly || undefined }, signal),
    [page, unreadOnly]
  );

  const items = notifications.data?.data ?? [];
  const meta = notifications.data?.meta;
  const hasUnread = items.some((item) => !item.is_read);

  const markRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      notifications.reload();
    } catch {
      /* Read receipts are best-effort. */
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await notificationService.markAllAsRead();
      toast.success('All notifications marked as read.');
      notifications.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update notifications.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await notificationService.remove(id);
      notifications.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete this notification.');
    }
  };

  /** Prefer an explicit action URL; fall back to the referenced order. */
  const linkFor = (actionUrl: string | null, type: string, referenceId: number | null) => {
    if (actionUrl) return actionUrl;
    if (referenceId && type.startsWith('order')) return `/account/orders/${referenceId}`;
    if (referenceId && type.startsWith('payment')) return `/account/orders/${referenceId}`;
    return null;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">Updates</span>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Notifications
          </h1>
        </div>

        {hasUnread && (
          <Button variant="outline" onClick={markAllRead} loading={busy} className="py-2.5">
            Mark all as read
          </Button>
        )}
      </header>

      <div className="flex gap-2 border-b border-outline-variant/30 pb-4">
        {[
          { label: 'All', value: false },
          { label: 'Unread', value: true },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => {
              setUnreadOnly(tab.value);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
              unreadOnly === tab.value
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notifications.loading && <ListRowSkeleton count={5} />}

      {!notifications.loading && notifications.error && (
        <ErrorState message={notifications.error} onRetry={notifications.reload} />
      )}

      {!notifications.loading && !notifications.error && items.length === 0 && (
        <EmptyState
          icon="notifications_off"
          title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
          description="Order updates, offers and account alerts will show up here."
        />
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const href = linkFor(item.action_url, item.type, item.reference_id);
          const content = (
            <div
              className={cn(
                'flex gap-4 rounded-xl border p-4 transition-shadow',
                item.is_read
                  ? 'border-outline-variant/30 bg-surface-container-lowest'
                  : 'border-secondary/40 bg-secondary-container/25',
                href && 'hover:shadow-md'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  item.is_read ? 'bg-surface-container' : 'bg-secondary-container'
                )}
              >
                <span className="material-symbols-outlined text-xl text-primary">
                  {TYPE_ICON[item.type] ?? 'notifications'}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-headline text-sm font-bold text-primary">{item.title}</h2>
                  {!item.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />
                  )}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-on-surface-variant">
                  {item.message}
                </p>
                <p className="mt-1 text-xs text-outline">{formatDateTime(item.created_at)}</p>
              </div>
            </div>
          );

          return (
            <li key={item.notification_id} className="group relative">
              {href ? (
                <Link
                  href={href}
                  onClick={() => !item.is_read && markRead(item.notification_id)}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                <button
                  onClick={() => !item.is_read && markRead(item.notification_id)}
                  className="block w-full text-left"
                >
                  {content}
                </button>
              )}

              <button
                onClick={() => remove(item.notification_id)}
                aria-label="Delete notification"
                className="absolute right-3 top-3 rounded-full p-1.5 text-outline opacity-0 transition-opacity hover:text-error focus:opacity-100 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </li>
          );
        })}
      </ul>

      {meta && meta.totalPages > 1 && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
