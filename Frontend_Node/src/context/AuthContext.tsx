'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { authService, profileService } from '@/services';
import { ApiError } from '@/lib/apiClient';
import { AUTH_EXPIRED_EVENT, tokenStorage } from '@/lib/tokenStorage';
import type { AuthUser, RegisterPayload } from '@/types/api';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored session has been validated against the server. */
  initializing: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<{ message: string; email: string }>;
  logout: () => Promise<void>;
  /** Re-pull the profile after an update so the header/avatar stay in sync. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed from storage so the first paint after a reload isn't logged-out.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Validate the persisted session once on mount.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (!tokenStorage.isAuthenticated()) {
        setInitializing(false);
        return;
      }

      setUser(tokenStorage.getUser());

      try {
        const profile = await profileService.get();
        if (cancelled) return;

        const hydrated: AuthUser = {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar,
          isEmailVerified: profile.isEmailVerified,
          roles: tokenStorage.getUser()?.roles ?? [],
          loyaltyTier: profile.loyalty.tier,
          rewardPoints: profile.loyalty.points,
        };

        tokenStorage.setUser(hydrated);
        setUser(hydrated);
      } catch (error) {
        // A 401 means refresh already failed inside the client — session is dead.
        // Anything else (network/server) keeps the cached user so the app degrades gracefully.
        if (!cancelled && error instanceof ApiError && error.isAuthError) clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // React to a forced logout raised anywhere in the app by the API client.
  useEffect(() => {
    const handleExpiry = () => {
      clearSession();
      router.push('/login?reason=session-expired');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiry);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiry);
  }, [clearSession, router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    tokenStorage.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    tokenStorage.setUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    (payload: RegisterPayload) => authService.register(payload),
    []
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Revoking server-side is best-effort; the local session goes either way.
    }
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.isAuthenticated()) return;
    try {
      const profile = await profileService.get();
      const hydrated: AuthUser = {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar,
        isEmailVerified: profile.isEmailVerified,
        roles: tokenStorage.getUser()?.roles ?? [],
        loyaltyTier: profile.loyalty.tier,
        rewardPoints: profile.loyalty.points,
      };
      tokenStorage.setUser(hydrated);
      setUser(hydrated);
    } catch {
      /* Keep the current user on transient failures. */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, initializing, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
