export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'TUTOR' | 'PRODUCT_OWNER' | 'STUDENT' | 'VIEWER';
  mustChangePassword?: boolean;
  avatarUrl?: string | null;
}

export interface OrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: string;
  membershipRole: string;
}

export interface OrganizationOption {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: string;
  membershipRole: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  orgType: string;
  memberRole: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword?: boolean;
  avatarUrl?: string;
  organizations?: AuthOrganization[];
}

export interface LoginRequest {
  email: string;
  password: string;
}
