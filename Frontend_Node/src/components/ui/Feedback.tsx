'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Inline spinner. Inherits `currentColor` so it works on any background. */
export const Spinner: React.FC<{ className?: string; label?: string }> = ({
  className,
  label = 'Loading',
}) => (
  <span
    role="status"
    aria-label={label}
    className={cn(
      'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
      'h-4 w-4 align-[-0.125em]',
      className
    )}
  />
);

/** Grey shimmer block used to build page-shaped skeletons. */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-hidden
    className={cn('animate-pulse rounded-md bg-surface-container-high', className)}
  />
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="space-y-3 p-4">
      <Skeleton className="h-2.5 w-1/3" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  </div>
);

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

export const ListRowSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
      >
        <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-lowest px-6 py-16 text-center',
      className
    )}
  >
    <span className="material-symbols-outlined text-5xl text-outline">{icon}</span>
    <h3 className="font-headline text-lg font-bold tracking-tight text-primary">{title}</h3>
    {description && (
      <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">{description}</p>
    )}
    {actionLabel && actionHref && (
      <Link
        href={actionHref}
        className="mt-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
      >
        {actionLabel}
      </Link>
    )}
    {actionLabel && !actionHref && onAction && (
      <button
        onClick={onAction}
        className="mt-2 rounded-md bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Failed-fetch state with a retry affordance. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-xl border border-error/30 bg-error-container/40 px-6 py-14 text-center',
      className
    )}
  >
    <span className="material-symbols-outlined text-4xl text-error">error</span>
    <h3 className="font-headline text-lg font-bold tracking-tight text-on-error-container">{title}</h3>
    <p className="max-w-sm text-sm leading-relaxed text-on-surface-variant">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
      >
        <span className="material-symbols-outlined text-sm">refresh</span>
        Try again
      </button>
    )}
  </div>
);
