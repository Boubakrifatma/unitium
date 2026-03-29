export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'TUTOR' | 'PRODUCT_OWNER' | 'STUDENT' | 'VIEWER';
  mustChangePassword?: boolean;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  id: number;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  anomalyScore?: number | null;
  actionTaken?: 'NONE' | 'MFA_FORCED' | 'ACCOUNT_LOCKED' | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}
