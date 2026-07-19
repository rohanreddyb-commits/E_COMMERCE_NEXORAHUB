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
