'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Field, Input } from '@/components/ui/Primitives';
import { Spinner } from '@/components/ui/Feedback';

const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, initializing } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nextPath = searchParams.get('next') || '/';
  const expired = searchParams.get('reason') === 'session-expired';

  // Already signed in — skip the form entirely.
  useEffect(() => {
    if (!initializing && isAuthenticated) router.replace(nextPath);
  }, [initializing, isAuthenticated, nextPath, router]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.firstName}.`);
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Members"
      title="Sign In"
      description="Access your orders, wishlist and saved addresses."
      footer={
        <>
          New to Aesthete?{' '}
          <Link href="/register" className="font-semibold text-primary underline">
            Create an account
          </Link>
        </>
      }
    >
      {expired && (
        <div
          role="status"
          className="mb-5 rounded-md border-l-4 border-outline bg-surface-container px-4 py-3 text-sm text-on-surface"
        >
          Your session expired. Please sign in again.
        </div>
      )}

      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
        >
          <span className="material-symbols-outlined text-base">error</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field label="Email address" required error={fieldErrors.email} htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={!!fieldErrors.email}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" required error={fieldErrors.password} htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={!!fieldErrors.password}
              placeholder="••••••••"
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? 'Signing in' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  );
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
