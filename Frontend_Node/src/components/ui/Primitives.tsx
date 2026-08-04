'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { effectivePrice, formatCurrency } from '@/lib/format';
import { Spinner } from './Feedback';

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: string;
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-md',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container',
  outline: 'border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container',
  ghost: 'text-on-surface-variant hover:text-primary hover:bg-surface-container',
  danger: 'bg-error text-on-error hover:bg-error/90',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-xs font-bold uppercase tracking-widest',
      'transition-all duration-200 active:scale-[0.98]',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary',
      BUTTON_VARIANTS[variant],
      fullWidth && 'w-full',
      className
    )}
  >
    {loading ? (
      <Spinner />
    ) : (
      icon && <span className="material-symbols-outlined text-base">{icon}</span>
    )}
    {children}
  </button>
);

// ─── Form fields ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export const Field: React.FC<FieldProps> = ({ label, error, hint, required, children, htmlFor }) => (
  <div className="space-y-1.5">
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
    >
      {label}
      {required && <span className="ml-0.5 text-error">*</span>}
    </label>
    {children}
    {error ? (
      <p className="flex items-center gap-1 text-xs font-medium text-error">
        <span className="material-symbols-outlined text-sm">error</span>
        {error}
      </p>
    ) : (
      hint && <p className="text-xs text-outline">{hint}</p>
    )}
  </div>
);

const CONTROL_CLASS =
  'w-full rounded-md border bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-outline ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-60';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input: React.FC<InputProps> = ({ invalid, className, ...rest }) => (
  <input
    {...rest}
    aria-invalid={invalid || undefined}
    className={cn(
      CONTROL_CLASS,
      invalid ? 'border-error focus:border-error' : 'border-outline-variant focus:border-secondary',
      className
    )}
  />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select: React.FC<SelectProps> = ({ invalid, className, children, ...rest }) => (
  <select
    {...rest}
    aria-invalid={invalid || undefined}
    className={cn(
      CONTROL_CLASS,
      'cursor-pointer appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
      "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237e7576' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
      invalid ? 'border-error' : 'border-outline-variant focus:border-secondary',
      className
    )}
  >
    {children}
  </select>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ invalid, className, ...rest }) => (
  <textarea
    {...rest}
    aria-invalid={invalid || undefined}
    className={cn(
      CONTROL_CLASS,
      'resize-y',
      invalid ? 'border-error' : 'border-outline-variant focus:border-secondary',
      className
    )}
  />
);

// ─── Price ───────────────────────────────────────────────────────────────────

interface PriceProps {
  price: number;
  salePrice?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PRICE_SIZES = {
  sm: { current: 'text-sm', original: 'text-xs' },
  md: { current: 'text-lg', original: 'text-sm' },
  lg: { current: 'text-3xl', original: 'text-base' },
};

/** Renders the payable price, striking through the original when discounted. */
export const Price: React.FC<PriceProps> = ({ price, salePrice, className, size = 'sm' }) => {
  const payable = effectivePrice(price, salePrice);
  const isDiscounted = payable < price;
  const sizes = PRICE_SIZES[size];

  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      {isDiscounted && (
        <span className={cn('text-outline line-through', sizes.original)}>
          {formatCurrency(price)}
        </span>
      )}
      <span className={cn('font-headline font-bold text-primary', sizes.current)}>
        {formatCurrency(payable)}
      </span>
    </span>
  );
};

// ─── Star rating ─────────────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
  /** Renders interactive stars and reports the chosen value. */
  onChange?: (rating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count,
  size = 'sm',
  className,
  onChange,
}) => {
  const starClass = size === 'sm' ? 'text-sm' : 'text-2xl';
  const interactive = typeof onChange === 'function';

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="flex" role={interactive ? 'radiogroup' : 'img'} aria-label={`Rated ${rating} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          const starIcon = (
            <span
              className={cn(
                'material-symbols-outlined leading-none',
                starClass,
                filled ? 'fill text-secondary' : 'text-outline-variant'
              )}
            >
              star
            </span>
          );

          return interactive ? (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === Math.round(rating)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onClick={() => onChange?.(star)}
              className="transition-transform hover:scale-110"
            >
              {starIcon}
            </button>
          ) : (
            <React.Fragment key={star}>{starIcon}</React.Fragment>
          );
        })}
      </span>
      {count !== undefined && (
        <span className="text-xs font-medium text-outline">({count})</span>
      )}
    </span>
  );
};

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant',
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-error-container text-on-error-container',
  accent: 'bg-primary text-on-primary',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
      BADGE_TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

// ─── Pagination ──────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Windowed page list: first, last, and up to two neighbours around current. */
const buildPageWindow = (page: number, totalPages: number): (number | 'gap')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < totalPages) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) result.push('gap');
    result.push(value);
  });
  return result;
};

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>

      {buildPageWindow(page, totalPages).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-outline">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-md px-3 text-xs font-bold transition-colors',
              item === page
                ? 'bg-primary text-on-primary'
                : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>
    </nav>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-primary/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          widths[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <h2 className="font-headline text-lg font-bold tracking-tight text-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-outline-variant/30 bg-surface-container-low px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
