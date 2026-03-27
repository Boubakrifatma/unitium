export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'TUTOR' | 'PRODUCT_OWNER' | 'STUDENT' | 'VIEWER';
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  token: string;
  id: number;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}
