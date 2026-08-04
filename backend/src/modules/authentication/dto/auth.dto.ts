export interface CustomerAuthPayload {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export interface RegisterDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  /** Optional referral code; validated and rejected on self-referral. */
  referralCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
  deviceInfo?: {
    deviceName?: string;
    deviceType?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
  type: 'password_reset' | 'email_verify';
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResponse {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    isEmailVerified: boolean;
    roles: string[];
    loyaltyTier: string;
    rewardPoints: number;
  };
  tokens: AuthTokens;
}
