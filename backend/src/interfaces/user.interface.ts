export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Banned';
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * A user record with every credential field stripped. Repositories that feed
 * HTTP responses return this shape so a password hash can never reach a
 * client through an `OUTPUT inserted.*` or `SELECT *` projection.
 */
export type SafeUser = Omit<User, 'password_hash'>;

/** Columns that are safe to project into an API response. */
export const SAFE_USER_COLUMNS = [
  'user_id',
  'first_name',
  'last_name',
  'email',
  'phone',
  'status',
  'last_login',
  'created_at',
  'updated_at',
] as const;

/** Defensive strip for objects that may have come from a `SELECT *`. */
export const toSafeUser = <T extends { password_hash?: string }>(
  user: T
): Omit<T, 'password_hash'> => {
  const { password_hash: _omitted, ...safe } = user;
  return safe;
};

export interface Role {
  role_id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  permission_id: number;
  name: string;
  description?: string;
}

export interface UserRole {
  user_id: number;
  role_id: number;
}
