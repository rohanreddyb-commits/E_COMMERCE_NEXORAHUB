'use client';

import React, { useEffect, useRef, useState } from 'react';
import { authService, profileService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiError } from '@/lib/apiClient';
import { getImageUrl, formatDate, formatDateTime, initials } from '@/lib/format';
import { Badge, Button, Field, Input, Modal, Select } from '@/components/ui/Primitives';
import { ErrorState, Skeleton, Spinner } from '@/components/ui/Feedback';
import type { SessionInfo } from '@/types/api';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function ProfileSettingsPage() {
  const { refreshUser, logout } = useAuth();
  const toast = useToast();

  const profile = useApiResource((signal) => profileService.get(signal), []);
  const sessions = useApiResource((signal) => authService.getSessions(), []);

  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);

  // Seed the form once the profile lands.
  useEffect(() => {
    if (!profile.data) return;
    setForm({
      first_name: profile.data.firstName ?? '',
      last_name: profile.data.lastName ?? '',
      phone: profile.data.phone ?? '',
      // <input type="date"> needs a bare YYYY-MM-DD value.
      date_of_birth: profile.data.dateOfBirth ? profile.data.dateOfBirth.slice(0, 10) : '',
      gender: profile.data.gender ?? '',
    });
  }, [profile.data]);

  const update =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!form.first_name.trim()) nextErrors.first_name = 'First name is required.';
    if (!form.last_name.trim()) nextErrors.last_name = 'Last name is required.';
    if (form.phone.trim() && !/^[+]?[\d\s()-]{7,20}$/.test(form.phone.trim()))
      nextErrors.phone = 'Enter a valid phone number.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      // Send only what the customer actually filled in — every field is optional
      // server-side and empty strings would fail validation.
      await profileService.update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.date_of_birth ? { date_of_birth: form.date_of_birth } : {}),
        ...(form.gender ? { gender: form.gender as 'Male' | 'Female' | 'Other' | 'Prefer not to say' } : {}),
      });
      toast.success('Profile updated.');
      profile.reload();
      refreshUser();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        toast.error(error.message);
      } else {
        toast.error('Could not save your profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Images must be 2 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      await profileService.uploadAvatar(file);
      toast.success('Profile photo updated.');
      profile.reload();
      refreshUser();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await profileService.removeAvatar();
      toast.success('Profile photo removed.');
      profile.reload();
      refreshUser();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not remove the photo.');
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!passwords.current) nextErrors.current = 'Enter your current password.';
    if (!PASSWORD_RULE.test(passwords.next))
      nextErrors.next =
        'At least 8 characters, with one uppercase letter, one lowercase letter and one number.';
    if (passwords.confirm !== passwords.next) nextErrors.confirm = 'Passwords do not match.';
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setChangingPassword(true);
    try {
      await authService.changePassword(passwords.current, passwords.next);
      toast.success('Password changed. Please sign in again.');
      setPasswordOpen(false);
      // The backend invalidates other sessions on change; sign out cleanly.
      await logout();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not change your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const revokeSession = async (session: SessionInfo) => {
    try {
      await authService.revokeSession(session.sessionId);
      toast.success('Session signed out.');
      sessions.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not revoke that session.');
    }
  };

  if (profile.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <ErrorState
        title="Could not load your profile"
        message={profile.error ?? 'Please try again.'}
        onRetry={profile.reload}
      />
    );
  }

  const data = profile.data;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">Account</span>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          Profile Settings
        </h1>
      </header>

      {/* Avatar */}
      <section className="flex flex-col items-center gap-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:flex-row">
        <div className="relative">
          {data.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getImageUrl(data.avatar)}
              alt=""
              className="h-24 w-24 rounded-full border border-outline-variant/40 object-cover"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary font-headline text-2xl font-bold text-on-primary">
              {initials(data.firstName, data.lastName)}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/50">
              <Spinner className="h-6 w-6 text-on-primary" />
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="font-headline text-xl font-bold text-primary">{data.fullName}</h2>
            <Badge tone="accent">{data.loyalty.tier}</Badge>
            <Badge tone={data.isEmailVerified ? 'success' : 'warning'}>
              {data.isEmailVerified ? 'Email verified' : 'Email unverified'}
            </Badge>
          </div>
          <p className="text-sm text-on-surface-variant">{data.email}</p>
          <p className="text-xs text-outline">
            Member since {formatDate(data.memberSince)} · {data.loyalty.points} reward points
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2 sm:justify-start">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              className="hidden"
              aria-label="Upload profile photo"
            />
            <Button
              variant="outline"
              icon="photo_camera"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="py-2.5"
            >
              {data.avatar ? 'Change photo' : 'Upload photo'}
            </Button>
            {data.avatar && (
              <Button
                variant="ghost"
                onClick={removeAvatar}
                disabled={uploading}
                className="py-2.5"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Personal details */}
      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6">
        <h2 className="mb-5 font-headline text-xl font-bold tracking-tight text-primary">
          Personal details
        </h2>

        <form onSubmit={saveProfile} noValidate className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="First name" required error={errors.first_name} htmlFor="p-first">
              <Input
                id="p-first"
                autoComplete="given-name"
                value={form.first_name}
                onChange={update('first_name')}
                invalid={!!errors.first_name}
              />
            </Field>
            <Field label="Last name" required error={errors.last_name} htmlFor="p-last">
              <Input
                id="p-last"
                autoComplete="family-name"
                value={form.last_name}
                onChange={update('last_name')}
                invalid={!!errors.last_name}
              />
            </Field>
          </div>

          <Field label="Email" hint="Contact support to change your email." htmlFor="p-email">
            <Input id="p-email" value={data.email} disabled readOnly />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label="Phone" error={errors.phone} htmlFor="p-phone">
              <Input
                id="p-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={update('phone')}
                invalid={!!errors.phone}
                placeholder="+91 98765 43210"
              />
            </Field>
            <Field label="Date of birth" error={errors.date_of_birth} htmlFor="p-dob">
              <Input
                id="p-dob"
                type="date"
                value={form.date_of_birth}
                onChange={update('date_of_birth')}
                invalid={!!errors.date_of_birth}
              />
            </Field>
            <Field label="Gender" htmlFor="p-gender">
              <Select id="p-gender" value={form.gender} onChange={update('gender')}>
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end border-t border-outline-variant/30 pt-4">
            <Button type="submit" loading={saving} className="py-3">
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {/* Security */}
      <section className="space-y-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl font-bold tracking-tight text-primary">
              Security
            </h2>
            <p className="text-sm text-on-surface-variant">
              Last signed in {formatDateTime(data.lastLogin)}
            </p>
          </div>
          <Button variant="outline" icon="lock" onClick={() => setPasswordOpen(true)} className="py-2.5">
            Change password
          </Button>
        </div>

        <div className="border-t border-outline-variant/30 pt-4">
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Active sessions
          </h3>

          {sessions.loading && <Skeleton className="h-16 w-full" />}
          {!sessions.loading && sessions.error && (
            <p className="text-sm text-outline">Could not load your active sessions.</p>
          )}

          <ul className="space-y-2">
            {(sessions.data ?? []).map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-container px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-semibold text-primary">
                    {session.deviceName || session.deviceType || 'Web browser'}
                  </p>
                  <p className="text-xs text-outline">
                    {session.ipAddress || 'Unknown IP'} · last used{' '}
                    {formatDateTime(session.lastUsed)}
                  </p>
                </div>
                <button
                  onClick={() => revokeSession(session)}
                  className="text-xs font-bold uppercase tracking-wider text-outline transition-colors hover:text-error"
                >
                  Sign out
                </button>
              </li>
            ))}
          </ul>

          {!sessions.loading && (sessions.data?.length ?? 0) === 0 && (
            <p className="text-sm text-outline">No other active sessions.</p>
          )}
        </div>
      </section>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPasswordOpen(false)} className="py-2.5">
              Cancel
            </Button>
            <Button
              type="submit"
              form="password-form"
              loading={changingPassword}
              className="py-2.5"
            >
              Change password
            </Button>
          </div>
        }
      >
        <form id="password-form" onSubmit={changePassword} noValidate className="space-y-5">
          <p className="rounded-md bg-surface-container px-4 py-3 text-xs text-on-surface-variant">
            You will be signed out on every device after changing your password.
          </p>

          <Field label="Current password" required error={passwordErrors.current} htmlFor="pw-current">
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, current: event.target.value }))
              }
              invalid={!!passwordErrors.current}
            />
          </Field>

          <Field
            label="New password"
            required
            error={passwordErrors.next}
            hint="Minimum 8 characters with upper, lower and a number."
            htmlFor="pw-next"
          >
            <Input
              id="pw-next"
              type="password"
              autoComplete="new-password"
              value={passwords.next}
              onChange={(event) => setPasswords((prev) => ({ ...prev, next: event.target.value }))}
              invalid={!!passwordErrors.next}
            />
          </Field>

          <Field
            label="Confirm new password"
            required
            error={passwordErrors.confirm}
            htmlFor="pw-confirm"
          >
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(event) =>
                setPasswords((prev) => ({ ...prev, confirm: event.target.value }))
              }
              invalid={!!passwordErrors.confirm}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
