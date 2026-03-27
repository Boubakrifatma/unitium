import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Plan, PaymentRequest, PaymentResponse } from '../models/billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly API = 'http://localhost:8084/api/billing';

  // ─── Enterprise Plans ──────────────────────────────────────────────────────
  readonly enterprisePlans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      subtitle: 'Perfect for small teams',
      icon: 'rocket_launch',
      monthlyPrice: 49,
      annualPrice: 39,
      orgType: 'enterprise',
      features: [
        '5 team members',
        '3 workspaces',
        '10 projects',
        '5 GB storage',
        'Basic ML insights',
        'Email support',
        'Kanban & Gantt charts',
      ],
      limits: { users: 5, workspaces: 3, projects: 10, storage: '5 GB' },
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'For growing organizations',
      icon: 'workspace_premium',
      monthlyPrice: 149,
      annualPrice: 119,
      orgType: 'enterprise',
      recommended: true,
      features: [
        '25 team members',
        '10 workspaces',
        'Unlimited projects',
        '50 GB storage',
        'Full ML suite (churn, risk)',
        'Priority support',
        'Advanced analytics',
        'Time tracking',
        'Custom integrations',
      ],
      limits: { users: 25, workspaces: 10, projects: 'Unlimited', storage: '50 GB' },
    },
    {
      id: 'business',
      name: 'Business',
      subtitle: 'For large enterprises',
      icon: 'corporate_fare',
      monthlyPrice: 349,
      annualPrice: 279,
      orgType: 'enterprise',
      features: [
        '100 team members',
        'Unlimited workspaces',
        'Unlimited projects',
        '500 GB storage',
        'Advanced ML + custom models',
        'Dedicated CSM',
        'SSO / SAML',
        'Audit logs',
        'SLA 99.9%',
      ],
      limits: { users: 100, workspaces: 'Unlimited', projects: 'Unlimited', storage: '500 GB' },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Custom scale & compliance',
      icon: 'apartment',
      monthlyPrice: null,
      annualPrice: null,
      orgType: 'enterprise',
      onRequest: true,
      features: [
        'Unlimited members',
        'Unlimited workspaces',
        'On-premise deployment',
        'Custom storage',
        'Custom ML pipelines',
        'Dedicated infrastructure',
        'White-labeling',
        'Custom SLA',
      ],
      limits: { users: 'Unlimited', workspaces: 'Unlimited', projects: 'Unlimited', storage: 'Custom' },
    },
  ];

  // ─── Academic Plans (all require payment — no free tier) ───────────────────
  readonly academicPlans: Plan[] = [
    {
      id: 'academic-starter',
      name: 'Academic Starter',
      subtitle: 'For small classes & labs',
      icon: 'school',
      monthlyPrice: 29,
      annualPrice: 23,
      orgType: 'academic',
      features: [
        '50 students',
        '2 professors',
        '5 course projects',
        '5 GB storage',
        'Basic grading workflow',
        'Email support',
      ],
      limits: { users: 50, workspaces: 2, projects: 5, storage: '5 GB' },
    },
    {
      id: 'academic-faculty',
      name: 'Faculty',
      subtitle: 'For departments & labs',
      icon: 'menu_book',
      monthlyPrice: 39,
      annualPrice: 31,
      orgType: 'academic',
      features: [
        '100 students',
        '5 professors',
        '10 courses',
        '20 GB storage',
        'Grade management',
        'Plagiarism signals',
        'Deadline adherence ML',
        'Email support',
      ],
      limits: { users: 100, workspaces: 5, projects: 10, storage: '20 GB' },
    },
    {
      id: 'academic-institution',
      name: 'Institution',
      subtitle: 'For the whole school',
      icon: 'account_balance',
      monthlyPrice: 99,
      annualPrice: 79,
      orgType: 'academic',
      recommended: true,
      features: [
        '500 students',
        'Unlimited professors',
        'Unlimited courses',
        '200 GB storage',
        'Full academic ML suite',
        'Bulk CSV import',
        'University IdP (LDAP)',
        'FERPA compliance',
        'Priority support',
      ],
      limits: { users: 500, workspaces: 'Unlimited', projects: 'Unlimited', storage: '200 GB' },
    },
    {
      id: 'academic-campus',
      name: 'Campus',
      subtitle: 'University-wide license',
      icon: 'domain',
      monthlyPrice: null,
      annualPrice: null,
      orgType: 'academic',
      onRequest: true,
      features: [
        'Unlimited students',
        'Unlimited faculty',
        'Multi-faculty support',
        'Custom storage',
        'SAML / SSO',
        'On-premise option',
        'Institutional billing',
        'Custom SLA',
      ],
      limits: { users: 'Unlimited', workspaces: 'Unlimited', projects: 'Unlimited', storage: 'Custom' },
    },
  ];

  getPlanById(id: string): Plan | undefined {
    return [...this.enterprisePlans, ...this.academicPlans].find(p => p.id === id);
  }

  constructor(private http: HttpClient) {}

  submitPayment(payload: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.API}/payment`, payload);
  }

  getPaymentStatus(paymentId: string): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.API}/payment/${paymentId}`);
  }

  getAllPayments(): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(`${this.API}/payments`);
  }

  getPendingPayments(): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(`${this.API}/payments/pending`);
  }

  confirmPayment(paymentId: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.API}/payment/${paymentId}/confirm`, {});
  }

  rejectPayment(paymentId: string, reason: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.API}/payment/${paymentId}/reject`, { reason });
  }
}
