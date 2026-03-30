export type OrgType = 'enterprise' | 'academic';
export type BillingCycle = 'monthly' | 'annual';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Plan {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  orgType: OrgType;
  recommended?: boolean;
  onRequest?: boolean;
  features: string[];
  limits: {
    users: number | string;
    workspaces: number | string;
    projects: number | string;
    storage: string;
  };
}

export interface CheckoutState {
  plan: Plan;
  orgType: OrgType;
  billingCycle: BillingCycle;
  orgName: string;
  adminEmail: string;
  adminName: string;
  phone: string;
  numUsers: number;
  address: string;
  vatNumber?: string;
  // Academic-specific
  institution?: string;
  department?: string;
  studentCount?: number;
}

export interface PaymentRequest {
  planId: string;
  orgType: OrgType;
  billingCycle: BillingCycle;
  orgName: string;
  adminEmail: string;
  adminName: string;
  phone: string;
  numUsers: number;
  address: string;
  vatNumber?: string;
  institution?: string;
  department?: string;
  studentCount?: number;
  // Payment
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

export interface PaymentResponse {
  paymentId: string;
  orgId: string;
  status: PaymentStatus;
  planName: string;
  amount: number;
  currency: string;
  createdAt: string;
  estimatedValidationDate: string;
  tempPassword: string;
  adminEmail?: string;
  // Extra fields returned by backend (stored in pending_payments)
  orgName?: string;
  orgType?: string;
  billingCycle?: string;
  phone?: string;
  numUsers?: number;
  address?: string;
}
