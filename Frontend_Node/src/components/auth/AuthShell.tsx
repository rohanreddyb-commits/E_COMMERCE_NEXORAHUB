import React from 'react';
import Link from 'next/link';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Shared editorial frame for every authentication screen. */
export const AuthShell: React.FC<AuthShellProps> = ({
  eyebrow,
  title,
  description,
  children,
  footer,
}) => (
  <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-16 sm:px-0">
    <div className="mb-8 space-y-2 text-center">
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-outline">
        {eyebrow}
      </span>
      <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="text-sm leading-relaxed text-on-surface-variant">{description}</p>
      )}
    </div>

    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-sm sm:p-8">
      {children}
    </div>

    {footer && <div className="mt-6 text-center text-sm text-on-surface-variant">{footer}</div>}

    <p className="mt-8 text-center text-xs text-outline">
      By continuing you agree to our{' '}
      <Link href="/" className="underline hover:text-primary">
        Terms
      </Link>{' '}
      and{' '}
      <Link href="/" className="underline hover:text-primary">
        Privacy Policy
      </Link>
      .
    </p>
  </div>
);
