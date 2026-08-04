import { STORAGE_KEYS } from './config';
import type { AuthUser } from '@/types/api';

/**
 * Session persistence for the customer app.
 *
 * Tokens live in localStorage to match the admin frontend's existing approach
 * and to survive full page reloads. All access is guarded for SSR.
 */

const isBrowser = () => typeof window !== 'undefined';

const read = (key: string): string | null => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  if (!isBrowser()) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* Storage full or blocked — non-fatal. */
  }
};

export const tokenStorage = {
  getAccessToken: () => read(STORAGE_KEYS.accessToken),
  getRefreshToken: () => read(STORAGE_KEYS.refreshToken),

  setTokens(accessToken: string, refreshToken: string): void {
    write(STORAGE_KEYS.accessToken, accessToken);
    write(STORAGE_KEYS.refreshToken, refreshToken);
  },

  getUser(): AuthUser | null {
    const raw = read(STORAGE_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser | null): void {
    write(STORAGE_KEYS.user, user ? JSON.stringify(user) : null);
  },

  clear(): void {
    write(STORAGE_KEYS.accessToken, null);
    write(STORAGE_KEYS.refreshToken, null);
    write(STORAGE_KEYS.user, null);
  },

  isAuthenticated(): boolean {
    return !!read(STORAGE_KEYS.accessToken);
  },
};

/**
 * Broadcast channel for forced logout (expired/revoked session).
 * AuthContext subscribes so the UI reacts wherever the 401 happened.
 */
export const AUTH_EXPIRED_EVENT = 'nexora:auth-expired';

export const emitAuthExpired = (): void => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
};
