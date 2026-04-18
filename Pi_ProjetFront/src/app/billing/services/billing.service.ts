import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Plan, PaymentRequest, PaymentResponse } from '../models/billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly API = 'http://localhost:8084/api/billing';

  // ─── Default Plans (fallback if API fails) ─────────────────────────────────
  readonly defaultEnterprisePlans: Plan[] = [
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

  // ─── Default Academic Plans (fallback if API fails) ──────────────────────
  readonly defaultAcademicPlans: Plan[] = [
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
      subtitle: 'Departments & labs',
      icon: 'menu_book',
      monthlyPrice: 39,
      annualPrice: 31,
      orgType: 'academic',
      features: [
        '100 students',
        '5 professors',
        'Grade management',
        'Plagiarism signals',
        'Email support',
      ],
      limits: { users: 100, workspaces: 5, projects: 20, storage: '20 GB' },
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

  // ─── Dynamic Plans (loaded from API, reactive signals) ───────────────────
  enterprisePlans = signal<Plan[]>([]);
  academicPlans = signal<Plan[]>([]);

  getPlanById(id: string): Plan | undefined {
    return [...this.enterprisePlans(), ...this.academicPlans()].find(p => p.id === id)
      ?? [...this.defaultEnterprisePlans, ...this.defaultAcademicPlans].find(p => p.id === id);
  }

  constructor(private http: HttpClient) {
    this.loadPlansFromAPI();
  }

  // Load plans directly from API — same source as super-admin
  loadPlansFromAPI(): void {
    this.http.get<any[]>(`${this.API}/plans`).subscribe({
      next: (apiPlans) => {
        if (apiPlans && apiPlans.length > 0) {
          const planOrder: Record<string, number> = {
            'starter': 1, 'pro': 2, 'business': 3, 'enterprise': 4,
            'academic-starter': 1, 'academic-faculty': 2, 'faculty': 2,
            'academic-institution': 3, 'institution': 3, 'campus': 4,
          };
          const sort = (plans: any[]) =>
            plans.sort((a, b) => (planOrder[a.id] ?? 99) - (planOrder[b.id] ?? 99));
          const allPlans = apiPlans.map((p: any) => this.mapApiPlanToFrontend(p));
          this.enterprisePlans.set(sort(allPlans.filter(p => p.orgType === 'enterprise')));
          this.academicPlans.set(sort(allPlans.filter(p => p.orgType === 'academic')));
          console.log('Plans loaded from API:', { enterprise: this.enterprisePlans().length, academic: this.academicPlans().length });
        } else {
          this.useFallbackPlans();
        }
      },
      error: (err) => {
        console.warn('Failed to load plans from API, using defaults:', err);
        this.useFallbackPlans();
      }
    });
  }

  private useFallbackPlans(): void {
    this.enterprisePlans.set(this.defaultEnterprisePlans);
    this.academicPlans.set(this.defaultAcademicPlans);
  }

  // Map a raw API PlanDTO to the frontend Plan interface for admin-created plans
  private mapApiPlanToFrontend(p: any): Plan {
    const isAcademic = p.orgType === 'academic' || (p.name ?? '').includes('academic') || (p.displayName ?? '').toLowerCase().includes('academic');
    const storageMb: number = p.storageMb ?? 10240;
    const storageLabel = storageMb >= 1024 ? `${Math.round(storageMb / 1024)} GB` : `${storageMb} MB`;
    const nameLower = (p.name ?? '').toLowerCase();

    const iconMap: Record<string, string> = {
      starter: 'rocket_launch', pro: 'workspace_premium', business: 'corporate_fare',
      enterprise: 'apartment', 'academic-starter': 'school', 'academic-faculty': 'menu_book',
      faculty: 'menu_book', 'academic-institution': 'account_balance', institution: 'account_balance',
      campus: 'domain',
    };
    const subtitleMap: Record<string, string> = {
      starter: 'Perfect for small teams', pro: 'For growing organizations',
      business: 'For large enterprises', enterprise: 'Custom scale & compliance',
      'academic-starter': 'For small classes & labs', 'academic-faculty': 'Departments & labs',
      faculty: 'Departments & labs', 'academic-institution': 'For the whole school',
      institution: 'For the whole school', campus: 'University-wide license',
    };
    const icon = iconMap[nameLower] ?? (isAcademic ? 'school' : 'workspace_premium');
    const subtitle = subtitleMap[nameLower] ?? (isAcademic ? 'Academic plan' : 'Enterprise plan');

    const recommended = ['pro', 'academic-institution', 'institution'].includes(nameLower);
    const onRequest   = ['enterprise', 'campus'].includes(nameLower) || (p.priceMonthly === 0 && !recommended);

    const features: string[] = [];
    if (p.maxMembersPerWs) features.push(`${p.maxMembersPerWs} team members`);
    if (p.maxWorkspaces)   features.push(`${p.maxWorkspaces} workspaces`);
    if (p.maxActiveProjects) features.push(`${p.maxActiveProjects} active projects`);
    features.push(`${storageLabel} storage`);
    if (p.mlTier === 'FULL' || p.mlTier === 'FULL_API') features.push('Full ML suite (churn, risk)');
    else if (p.mlTier === 'BASIC') features.push('Basic ML insights');
    if (p.supportTier === 'PRIORITY') features.push('Priority support');
    else if (p.supportTier === 'DEDICATED') features.push('Dedicated CSM');
    else if (p.supportTier === 'ACADEMIC') features.push('Academic support');
    else if (p.supportTier === 'EMAIL') features.push('Email support');
    if (p.apiAccess)       features.push('API access');
    if (p.ssoEnabled)      features.push('SSO / SAML');
    if (p.lmsIntegration)  features.push('LMS integration');
    if (p.gradeExport)     features.push('Grade export');

    return {
      id: p.name ?? String(p.id),
      name: p.displayName ?? p.name,
      subtitle,
      icon,
      monthlyPrice: p.priceMonthly ?? null,
      annualPrice:  p.priceYearly  ?? null,
      orgType: isAcademic ? 'academic' : 'enterprise',
      recommended,
      onRequest,
      features,
      limits: {
        users:      p.maxMembersPerWs   ?? 'Unlimited',
        workspaces: p.maxWorkspaces     ?? 'Unlimited',
        projects:   p.maxActiveProjects ?? 'Unlimited',
        storage:    storageLabel,
      },
    };
  }

  createPaymentIntent(planId: string, billingCycle: string): Observable<{ clientSecret: string; paymentIntentId: string; amount: number }> {
    return this.http.post<{ clientSecret: string; paymentIntentId: string; amount: number }>(
      `${this.API}/create-payment-intent`,
      { planId, billingCycle }
    );
  }

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

  recordFailedPayment(data: {
    planId: string; orgName: string; adminEmail: string;
    billingCycle: string; orgType: string;
    failureCode: string; failureMessage: string;
  }): Observable<any> {
    return this.http.post(`${this.API}/payment/failed`, data);
  }

  getSecurityAlerts(): Observable<{ count: number; hasAlerts: boolean; alerts: any[] }> {
    return this.http.get<{ count: number; hasAlerts: boolean; alerts: any[] }>(`${this.API}/security/alerts`);
  }

  clearSecurityAlerts(): Observable<any> {
    return this.http.delete(`${this.API}/security/alerts`);
  }

  // ── Coupons ──────────────────────────────────────────────────────────────

  validateCoupon(code: string, amountCents: number): Observable<any> {
    return this.http.get(`${this.API}/coupons/validate/${encodeURIComponent(code)}`, { params: { amountCents: amountCents.toString() } });
  }

  getAllCoupons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/coupons`);
  }

  createCoupon(body: any): Observable<any> {
    return this.http.post(`${this.API}/coupons`, body);
  }

  updateCoupon(id: string, body: any): Observable<any> {
    return this.http.put(`${this.API}/coupons/${id}`, body);
  }

  toggleCoupon(id: string): Observable<any> {
    return this.http.patch(`${this.API}/coupons/${id}/toggle`, {});
  }

  deleteCoupon(id: string): Observable<any> {
    return this.http.delete(`${this.API}/coupons/${id}`);
  }
}
