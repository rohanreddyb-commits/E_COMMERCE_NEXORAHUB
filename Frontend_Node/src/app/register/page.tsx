'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { authService } from '@/services';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Field, Input } from '@/components/ui/Primitives';

/** Mirrors the backend's passwordRules in customer.auth.validators.ts. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const NAME_RULE = /^[a-zA-Z\s'-]+$/;

type Stage = 'form' | 'verify';

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>('form');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.first_name.trim()) errors.first_name = 'First name is required.';
    else if (!NAME_RULE.test(form.first_name.trim()))
      errors.first_name = 'Letters, spaces, hyphens and apostrophes only.';

    if (!form.last_name.trim()) errors.last_name = 'Last name is required.';
    else if (!NAME_RULE.test(form.last_name.trim()))
      errors.last_name = 'Letters, spaces, hyphens and apostrophes only.';

    if (!form.email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = 'Enter a valid email address.';

    if (form.phone.trim() && !/^[+]?[\d\s()-]{7,20}$/.test(form.phone.trim()))
      errors.phone = 'Enter a valid phone number.';

    if (!PASSWORD_RULE.test(form.password))
      errors.password =
        'At least 8 characters, with one uppercase letter, one lowercase letter and one number.';

    if (form.confirmPassword !== form.password)
      errors.confirmPassword = 'Passwords do not match.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      toast.success('Account created. Check your email for the verification code.');
      setStage('verify');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!/^\d{6}$/.test(otp)) {
      setFieldErrors({ otp: 'Enter the 6-digit code from your email.' });
      return;
    }

    setSubmitting(true);
    try {
      await authService.verifyOtp(form.email.trim(), otp, 'email_verify');
      toast.success('Email verified. Signing you in…');
      // The account is already active, so sign in directly after verification.
      await login(form.email.trim(), form.password);
      router.replace('/');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Verification failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /** Verification is optional — the account is usable immediately. */
  const skipVerification = async () => {
    setSubmitting(true);
    try {
      await login(form.email.trim(), form.password);
      router.replace('/');
    } catch {
      router.replace('/login');
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === 'verify') {
    return (
      <AuthShell
        eyebrow="One last step"
        title="Verify Your Email"
        description={`We sent a 6-digit code to ${form.email.trim()}. It expires in 10 minutes.`}
      >
        {formError && (
          <div
            role="alert"
            className="mb-5 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleVerify} noValidate className="space-y-5">
          <Field label="Verification code" required error={fieldErrors.otp} htmlFor="otp">
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              invalid={!!fieldErrors.otp}
              placeholder="000000"
              className="text-center font-headline text-2xl tracking-[0.5em]"
            />
          </Field>

          <Button type="submit" fullWidth loading={submitting}>
            Verify & Continue
          </Button>

          <button
            type="button"
            onClick={skipVerification}
            disabled={submitting}
            className="w-full text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary disabled:opacity-50"
          >
            Skip for now
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Join the house"
      title="Create Account"
      description="Save your details for faster checkout and track every order."
      footer={
        <>
          Already a member?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
        >
          <span className="material-symbols-outlined text-base">error</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleRegister} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="First name" required error={fieldErrors.first_name} htmlFor="first_name">
            <Input
              id="first_name"
              autoComplete="given-name"
              value={form.first_name}
              onChange={update('first_name')}
              invalid={!!fieldErrors.first_name}
            />
          </Field>
          <Field label="Last name" required error={fieldErrors.last_name} htmlFor="last_name">
            <Input
              id="last_name"
              autoComplete="family-name"
              value={form.last_name}
              onChange={update('last_name')}
              invalid={!!fieldErrors.last_name}
            />
          </Field>
        </div>

        <Field label="Email address" required error={fieldErrors.email} htmlFor="reg_email">
          <Input
            id="reg_email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            invalid={!!fieldErrors.email}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Phone"
          error={fieldErrors.phone}
          hint="Optional — used for delivery updates."
          htmlFor="phone"
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            invalid={!!fieldErrors.phone}
            placeholder="+91 98765 43210"
          />
        </Field>

        <Field
          label="Password"
          required
          error={fieldErrors.password}
          hint="Minimum 8 characters with upper, lower and a number."
          htmlFor="reg_password"
        >
          <div className="relative">
            <Input
              id="reg_password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              invalid={!!fieldErrors.password}
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

        <Field
          label="Confirm password"
          required
          error={fieldErrors.confirmPassword}
          htmlFor="confirm_password"
        >
          <Input
            id="confirm_password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            invalid={!!fieldErrors.confirmPassword}
          />
        </Field>

        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? 'Creating account' : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  );
}
