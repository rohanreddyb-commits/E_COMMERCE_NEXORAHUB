'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { orderService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge, Pagination } from '@/components/ui/Primitives';
import { EmptyState, ErrorState, ListRowSkeleton } from '@/components/ui/Feedback';
import { FILTERABLE_STATUSES, ORDER_STATUS_TONE } from '@/components/account/orderStatus';
import type { OrderStatus } from '@/types/api';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');

  const orders = useApiResource(
    (signal) => orderService.list({ page, limit: 10, status: status || undefined }, signal),
    [page, status]
  );

  const items = orders.data?.data ?? [];
  const meta = orders.data?.meta;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
          Order history
        </span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          My Orders
        </h1>
        {meta && (
          <p className="text-sm text-on-surface-variant">
            {meta.total} order{meta.total === 1 ? '' : 's'}
          </p>
        )}
      </header>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/30 pb-4">
        <button
          onClick={() => {
            setStatus('');
            setPage(1);
          }}
          className={cn(
            'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
            status === ''
              ? 'bg-primary text-on-primary'
              : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
          )}
        >
          All
        </button>
        {FILTERABLE_STATUSES.map((value) => (
          <button
            key={value}
            onClick={() => {
              setStatus(value);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
              status === value
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {orders.loading && <ListRowSkeleton count={4} />}

      {!orders.loading && orders.error && (
        <ErrorState message={orders.error} onRetry={orders.reload} />
      )}

      {!orders.loading && !orders.error && items.length === 0 && (
        <EmptyState
          icon="package_2"
          title={status ? `No ${status.toLowerCase()} orders` : 'No orders yet'}
          description={
            status
              ? 'Try a different status filter.'
              : 'When you place an order it will appear here.'
          }
          actionLabel={status ? undefined : 'Start shopping'}
          actionHref={status ? undefined : '/products'}
        />
      )}

      {!orders.loading && !orders.error && items.length > 0 && (
        <>
          <ul className="space-y-4">
            {items.map((order) => (
              <li key={order.order_id}>
                <Link
                  href={`/account/orders/${order.order_id}`}
                  className="block rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-headline text-base font-bold text-primary">
                          {order.order_number}
                        </span>
                        <Badge tone={ORDER_STATUS_TONE[order.order_status] ?? 'neutral'}>
                          {order.order_status}
                        </Badge>
                        {order.payment_status === 'Pending' && (
                          <Badge tone="warning">Payment pending</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-outline">
                        Placed {formatDate(order.created_at)} · {order.item_count} item
                        {order.item_count === 1 ? '' : 's'} · {order.payment_method}
                      </p>
                      {order.tracking_number && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Tracking: <strong>{order.tracking_number}</strong>
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="block font-headline text-xl font-extrabold text-primary">
                        {formatCurrency(order.total_amount)}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary">
                        View details
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {meta && (
            <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
