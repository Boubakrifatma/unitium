import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SubscriptionDTO {
  id: string; status: string; billingCycle: string;
  planName: string; planDisplayName: string;
  planPriceMonthly: number; planPriceYearly: number;
  currentPeriodStart: string; currentPeriodEnd: string; createdAt: string;
}

export interface InvoiceDTO {
  id: string; invoiceNumber: string; status: string;
  subtotal: number; taxAmount: number; total: number; currency: string;
  billingPeriodStart: string; billingPeriodEnd: string;
  dueDate: string; paidAt: string; pdfUrl: string;
  planName: string; createdAt: string;
  lineItems?: InvoiceLineItemDTO[];
}

export interface PlanDTO {
  id: string; name: string; displayName: string;
  priceMonthly: number; priceYearly: number;
  maxWorkspaces: number; maxMembersPerWs: number; maxActiveProjects: number;
  storageMb: number; mlTier: string; supportTier: string;
  apiAccess: boolean; ssoEnabled: boolean; isActive: boolean;
}

export interface InvoiceLineItemDTO {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  periodStart: string;
  periodEnd: string;
}

export interface PaymentAttemptDTO {
  id: string;
  orgId: string;
  orgName: string;
  subscriptionId: string;
  invoiceId: string;
  invoiceNumber: string;
  attemptNumber: number;
  status: string;
  amount: number;
  failureCode: string;
  failureMessage: string;
  nextRetryAt: string;
  attemptedAt: string;
}

export interface UsageQuotaDTO {
  id: string;
  orgId: string;
  orgName: string;
  planId: string;
  planName: string;
  metricDate: string;
  activeMembersCount: number;
  workspacesCount: number;
  projectsCount: number;
  storageUsedGb: number;
  apiCallsCount: number;
  mlInferencesCount: number;
  maxMembers: number;
  maxWorkspaces: number;
  maxProjects: number;
  maxStorageGb: number;
  membersPct: number;
  workspacesPct: number;
  projectsPct: number;
  storagePct: number;
  alert80Sent: boolean;
  alert100Sent: boolean;
  updatedAt: string;
}

export interface MyPaymentDTO {
  paymentId: string; orgId: string; status: string;
  planName: string; amount: number; currency: string;
  createdAt: string; estimatedValidationDate: string;
  tempPassword: string; adminEmail: string;
  orgName: string; orgType: string; billingCycle: string;
  phone: string; numUsers: number; address: string;
}

@Injectable({ providedIn: 'root' })
export class OrgBillingService {
  private http = inject(HttpClient);
  private readonly API = 'http://localhost:8084/api/billing';

  getMySubscription(): Observable<SubscriptionDTO | null> {
    return this.http.get<SubscriptionDTO>(`${this.API}/my-subscription`).pipe(
      catchError(() => of(null))
    );
  }

  getMyInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.API}/my-invoices`).pipe(
      catchError(() => of([]))
    );
  }

  /** Fallback : récupère le paiement par email de l'user connecté */
  getMyPayment(): Observable<MyPaymentDTO | null> {
    return this.http.get<MyPaymentDTO>(`${this.API}/my-payment`).pipe(
      catchError(() => of(null))
    );
  }

  getActivePlans(): Observable<PlanDTO[]> {
    return this.http.get<PlanDTO[]>(`${this.API}/plans`).pipe(
      catchError(() => of([]))
    );
  }

  getAllInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.API}/invoices`).pipe(
      catchError(() => of([]))
    );
  }

  getMyLineItems(): Observable<InvoiceLineItemDTO[]> {
    return this.http.get<InvoiceLineItemDTO[]>(`${this.API}/my-line-items`).pipe(
      catchError(() => of([]))
    );
  }

  getLineItemsByInvoice(invoiceId: string): Observable<InvoiceLineItemDTO[]> {
    return this.http.get<InvoiceLineItemDTO[]>(`${this.API}/invoices/${invoiceId}/line-items`).pipe(
      catchError(() => of([]))
    );
  }

  getMyPaymentAttempts(): Observable<PaymentAttemptDTO[]> {
    return this.http.get<PaymentAttemptDTO[]>(`${this.API}/my-payment-attempts`).pipe(
      catchError(() => of([]))
    );
  }

  getMyUsage(): Observable<UsageQuotaDTO | null> {
    return this.http.get<UsageQuotaDTO>(`${this.API}/my-usage`).pipe(
      catchError(() => of(null))
    );
  }

  getAllPaymentAttempts(): Observable<PaymentAttemptDTO[]> {
    return this.http.get<PaymentAttemptDTO[]>(`${this.API}/payment-attempts`).pipe(
      catchError(() => of([]))
    );
  }

  getAllUsageQuotas(): Observable<UsageQuotaDTO[]> {
    return this.http.get<UsageQuotaDTO[]>(`${this.API}/usage-quotas`).pipe(
      catchError(() => of([]))
    );
  }
}
