import { apiClient } from '@/lib/apiClient';
import type {
  AuthTokens,
  LoginResponse,
  OtpType,
  RegisterPayload,
  RegisterResponse,
  SessionInfo,
  VerifyOtpResponse,
} from '@/types/api';

/** POST /api/v1/customer/auth/* */
export const authService = {
  register: (payload: RegisterPayload) =>
    apiClient.post<RegisterResponse>('/auth/register', payload, { withAuth: false }),

  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>(
      '/auth/login',
      {
        email,
        password,
        deviceInfo: {
          deviceType: 'Web',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        },
      },
      { withAuth: false }
    ),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>('/auth/refresh', { refreshToken }, {
      withAuth: false,
      skipRefresh: true,
    }),

  logout: () => apiClient.post<null>('/auth/logout'),

  logoutAll: () => apiClient.post<null>('/auth/logout-all'),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }, { withAuth: false }),

  /** For password_reset, the response carries the single-use reset token. */
  verifyOtp: (email: string, otp: string, type: OtpType) =>
    apiClient.post<VerifyOtpResponse>('/auth/verify-otp', { email, otp, type }, { withAuth: false }),

  resetPassword: (email: string, token: string, newPassword: string) =>
    apiClient.post<null>('/auth/reset-password', { email, token, newPassword }, { withAuth: false }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<null>('/auth/change-password', { currentPassword, newPassword }),

  getSessions: () => apiClient.get<SessionInfo[]>('/auth/sessions'),

  revokeSession: (sessionId: string) => apiClient.delete<null>(`/auth/sessions/${sessionId}`),
};
