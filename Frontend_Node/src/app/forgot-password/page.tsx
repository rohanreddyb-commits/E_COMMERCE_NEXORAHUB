'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button, Field, Input } from '@/components/ui/Primitives';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

/**
 * Three-step reset, matching the backend OTP flow:
 *   1. POST /auth/forgot-password  → emails a 6-digit OTP
 *   2. POST /auth/verify-otp       → exchanges the OTP for a single-use token
 *   3. POST /auth/reset-password   → sets the new password, revokes all sessions
 */
type Stage = 'request' | 'verify' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fail = (error: unknown, fallback: string) => {
    setFormError(error instanceof ApiError ? error.message : fallback);
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors({ email: 'Enter a valid email address.' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.forgotPassword(email.trim());
      // The backend returns an identical message whether or not the account
      // exists, to avoid leaking which emails are registered.
      toast.info(result.message);
      setStage('verify');
    } catch (error) {
      fail(error, 'Could not send the reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!/^\d{6}$/.test(otp)) {
      setFieldErrors({ otp: 'Enter the 6-digit code from your email.' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.verifyOtp(email.trim(), otp, 'password_reset');
      if (!result.token) {
        setFormError('Verification did not return a reset token. Please request a new code.');
        return;
      }
      setResetToken(result.token);
      setStage('reset');
    } catch (error) {
      fail(error, 'Invalid or expired code.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const errors: Record<string, string> = {};
    if (!PASSWORD_RULE.test(newPassword))
      errors.newPassword =
        'At least 8 characters, with one uppercase letter, one lowercase letter and one number.';
    if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match.';

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await authService.resetPassword(email.trim(), resetToken, newPassword);
      toast.success('Password reset. Please sign in with your new password.');
      router.replace('/login');
    } catch (error) {
      fail(error, 'Could not reset your password. Please request a new code.');
    } finally {
      setSubmitting(false);
    }
  };

  const errorBanner = formError && (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2 rounded-md border-l-4 border-error bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
    >
      <span className="material-symbols-outlined text-base">error</span>
      <span>{formError}</span>
    </div>
  );

  if (stage === 'verify') {
    return (
      <AuthShell
        eyebrow="Step 2 of 3"
        title="Enter Your Code"
        description={`If an account exists for ${email.trim()}, a 6-digit code is on its way. It expires in 10 minutes.`}
      >
        {errorBanner}
        <form onSubmit={verifyOtp} noValidate className="space-y-5">
          <Field label="Reset code" required error={fieldErrors.otp} htmlFor="otp">
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
            Verify Code
          </Button>

          <button
            type="button"
            onClick={() => {
              setStage('request');
              setOtp('');
              setFormError(null);
            }}
            className="w-full text-xs font-semibold uppercase tracking-wider text-outline transition-colors hover:text-primary"
          >
            Use a different email
          </button>
        </form>
      </AuthShell>
    );
  }

  if (stage === 'reset') {
    return (
      <AuthShell
        eyebrow="Step 3 of 3"
        title="Set a New Password"
        description="Choose a password you have not used recently. All other sessions will be signed out."
      >
        {errorBanner}
        <form onSubmit={resetPassword} noValidate className="space-y-5">
          <Field
            label="New password"
            required
            error={fieldErrors.newPassword}
            hint="Minimum 8 characters with upper, lower and a number."
            htmlFor="new_password"
          >
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              invalid={!!fieldErrors.newPassword}
            />
          </Field>

          <Field
            label="Confirm new password"
            required
            error={fieldErrors.confirmPassword}
            htmlFor="confirm_new_password"
          >
            <Input
              id="confirm_new_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              invalid={!!fieldErrors.confirmPassword}
            />
          </Field>

          <Button type="submit" fullWidth loading={submitting}>
            Reset Password
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Step 1 of 3"
      title="Forgot Password"
      description="Enter your email and we will send a code to reset your password."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {errorBanner}
      <form onSubmit={requestOtp} noValidate className="space-y-5">
        <Field label="Email address" required error={fieldErrors.email} htmlFor="forgot_email">
          <Input
            id="forgot_email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={!!fieldErrors.email}
            placeholder="you@example.com"
          />
        </Field>

        <Button type="submit" fullWidth loading={submitting}>
          Send Reset Code
        </Button>
      </form>
    </AuthShell>
  );
}
