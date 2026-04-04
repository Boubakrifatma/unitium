import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { BillingService } from '../../services/billing.service';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { Plan, OrgType, BillingCycle } from '../../models/billing.models';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatCardModule, MatIconModule,
    MatListModule, MatButtonToggleModule, MatChipsModule, MatRippleModule,
  ],
  template: `
  <div class="pricing-page">

    <!-- Hero Section -->
    <div class="pricing-hero text-center py-5">
      <div class="container">
        <span class="badge badge-outline-theme mb-3">Pricing & Plans</span>
        <h1 class="display-5 fw-bold mb-2">Choose the right plan for your<br><span class="text-theme">organization</span></h1>
        <p class="lead text-secondary mb-4">Transparent pricing. No hidden fees. Cancel anytime.</p>

        <!-- Org Type Selector -->
        <div class="org-type-selector mx-auto mb-4">
          <button class="org-tab" [class.active]="orgType() === 'enterprise'" (click)="setOrgType('enterprise')">
            <mat-icon>corporate_fare</mat-icon>
            <span>Enterprise</span>
          </button>
          <button class="org-tab" [class.active]="orgType() === 'academic'" (click)="setOrgType('academic')">
            <mat-icon>school</mat-icon>
            <span>Academic</span>
          </button>
        </div>

        <!-- Billing Cycle Toggle -->
        <div class="d-flex align-items-center justify-content-center gap-3">
          <span [class.text-secondary]="billingCycle() === 'annual'" class="fw-medium">Monthly</span>
          <div class="billing-toggle" (click)="toggleCycle()">
            <div class="toggle-track" [class.annual]="billingCycle() === 'annual'">
              <div class="toggle-thumb"></div>
            </div>
          </div>
          <span [class.text-secondary]="billingCycle() === 'monthly'" class="fw-medium">
            Annual
            <span class="badge badge-theme ms-2">Save 20%</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Context Description -->
    <div class="container mb-4">
      <div class="context-banner" [class.academic-banner]="orgType() === 'academic'">
        <mat-icon>{{ orgType() === 'enterprise' ? 'business_center' : 'auto_stories' }}</mat-icon>
        <div>
          <strong>{{ orgType() === 'enterprise' ? 'Enterprise Context' : 'Academic Context' }}</strong>
          <p class="mb-0 text-secondary small">
            {{ orgType() === 'enterprise'
              ? 'For companies, startups & NGOs. Billing per Organization. Includes ML-powered risk, churn & productivity insights.'
              : 'For universities, faculties & research labs. Includes grading workflows, plagiarism detection & academic ML signals.'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Plans Grid -->
    <div class="container pb-5">
      <div class="row gx-3 gx-lg-4 align-items-stretch">
        @for (plan of currentPlans(); track plan.id) {
          <div class="col-12 col-md-6 col-xl-3 mb-4">
            <div class="plan-card h-100" [class.recommended-card]="plan.recommended" [class.on-request-card]="plan.onRequest" matRipple>

              @if (plan.recommended) {
                <div class="recommended-badge">
                  <mat-icon>star</mat-icon> Recommended
                </div>
              }

              <!-- Plan Header -->
              <div class="plan-header">
                <div class="plan-icon" [class.icon-enterprise]="orgType() === 'enterprise'" [class.icon-academic]="orgType() === 'academic'">
                  <mat-icon>{{ plan.icon }}</mat-icon>
                </div>
                <div>
                  <h3 class="mb-0">{{ plan.name }}</h3>
                  <p class="text-secondary small mb-0">{{ plan.subtitle }}</p>
                </div>
              </div>

              <!-- Price -->
              <div class="plan-price">
                @if (plan.onRequest) {
                  <div>
                    <span class="price-amount">On Request</span>
                    <p class="text-secondary small mb-0">Custom pricing</p>
                  </div>
                } @else {
                  <div>
                    <span class="price-currency">$</span>
                    <span class="price-amount">{{ getPrice(plan) }}</span>
                    <span class="price-period">/ {{ billingCycle() === 'monthly' ? 'mo' : 'mo · billed annually' }}</span>
                  </div>
                }
              </div>

              <!-- Limits -->
              <div class="plan-limits">
                <span class="limit-badge"><mat-icon>people</mat-icon> {{ plan.limits.users }} users</span>
                <span class="limit-badge"><mat-icon>workspaces</mat-icon> {{ plan.limits.workspaces }} workspaces</span>
                <span class="limit-badge"><mat-icon>folder</mat-icon> {{ plan.limits.projects }} projects</span>
                <span class="limit-badge"><mat-icon>storage</mat-icon> {{ plan.limits.storage }}</span>
              </div>

              <!-- Features -->
              <ul class="plan-features">
                @for (feature of plan.features; track feature) {
                  <li>
                    <mat-icon class="feature-check">check_circle</mat-icon>
                    {{ feature }}
                  </li>
                }
              </ul>

              <!-- CTA -->
              <div class="plan-cta mt-auto pt-3">
                @if (plan.onRequest) {
                  <button matButton="outlined" class="w-100" (click)="contactUs(plan)">
                    <mat-icon>mail</mat-icon> Contact Sales
                  </button>
                } @else {
                  <button matButton="filled" class="w-100" [class.btn-recommended]="plan.recommended" (click)="choosePlan(plan)">
                    Get Started
                    <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Trust Signals -->
      <div class="trust-section mt-4">
        <div class="row gx-4 text-center">
          <div class="col-6 col-md-3 mb-3">
            <mat-icon class="trust-icon">security</mat-icon>
            <p class="small mb-0 fw-medium">GDPR Compliant</p>
          </div>
          <div class="col-6 col-md-3 mb-3">
            <mat-icon class="trust-icon">payment</mat-icon>
            <p class="small mb-0 fw-medium">Secure Card Payment</p>
          </div>
          <div class="col-6 col-md-3 mb-3">
            <mat-icon class="trust-icon">support_agent</mat-icon>
            <p class="small mb-0 fw-medium">24/7 Support</p>
          </div>
          <div class="col-6 col-md-3 mb-3">
            <mat-icon class="trust-icon">cancel</mat-icon>
            <p class="small mb-0 fw-medium">Cancel Anytime</p>
          </div>
        </div>
      </div>

      <!-- FAQ Quick Note -->
      <div class="faq-note text-center mt-4 opacity-75">
        <p class="small">
          <mat-icon style="font-size:16px;vertical-align:middle">info</mat-icon>
          Subscriptions are activated after admin validation (typically within 24–48h).
          You'll receive your login credentials by email.
        </p>
      </div>
    </div>
  </div>

  <style>
    .pricing-page { background: var(--bs-body-bg); }

    .pricing-hero {
      background: linear-gradient(135deg, rgba(var(--theme-color-rgb, 0,123,255), 0.06) 0%, transparent 60%);
      border-bottom: 1px solid var(--bs-border-color);
    }

    .badge-outline-theme {
      border: 1.5px solid var(--bs-primary, #0d6efd);
      color: var(--bs-primary, #0d6efd);
      background: transparent;
      padding: 4px 14px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 0.78rem;
      letter-spacing: .5px;
    }

    .org-type-selector {
      display: inline-flex;
      background: var(--bs-tertiary-bg);
      border-radius: 50px;
      padding: 4px;
      gap: 4px;
    }
    .org-tab {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 24px; border-radius: 50px; border: none; cursor: pointer;
      font-weight: 600; font-size: .9rem; transition: all .25s;
      background: transparent; color: var(--bs-secondary-color);
    }
    .org-tab mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .org-tab.active {
      background: #fff; color: var(--bs-primary, #0d6efd);
      box-shadow: 0 2px 10px rgba(0,0,0,.12);
    }
    :host-context(.dark-theme) .org-tab.active { background: var(--bs-card-bg); }

    .billing-toggle { cursor: pointer; }
    .toggle-track {
      width: 52px; height: 28px; border-radius: 50px;
      background: var(--bs-secondary-bg); position: relative; transition: background .3s;
    }
    .toggle-track.annual { background: var(--bs-primary, #0d6efd); }
    .toggle-thumb {
      width: 22px; height: 22px; border-radius: 50%; background: #fff;
      position: absolute; top: 3px; left: 3px; transition: transform .3s;
      box-shadow: 0 2px 6px rgba(0,0,0,.2);
    }
    .toggle-track.annual .toggle-thumb { transform: translateX(24px); }

    .context-banner {
      display: flex; align-items: flex-start; gap: 14px;
      background: rgba(13,110,253,.07); border: 1px solid rgba(13,110,253,.2);
      border-radius: 12px; padding: 14px 20px;
    }
    .context-banner mat-icon { color: var(--bs-primary, #0d6efd); margin-top: 2px; flex-shrink: 0; }
    .academic-banner { background: rgba(25,135,84,.07); border-color: rgba(25,135,84,.2); }
    .academic-banner mat-icon { color: #198754; }

    /* Plan Cards */
    .plan-card {
      border: 1.5px solid var(--bs-border-color); border-radius: 16px;
      padding: 24px; background: var(--bs-card-bg);
      display: flex; flex-direction: column;
      transition: transform .2s, box-shadow .2s, border-color .2s;
      position: relative; overflow: hidden; cursor: default;
    }
    .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.1); }

    .recommended-card {
      border-color: var(--bs-primary, #0d6efd);
      box-shadow: 0 6px 30px rgba(13,110,253,.15);
    }

    .recommended-badge {
      position: absolute; top: 0; right: 0;
      background: var(--bs-primary, #0d6efd); color: #fff;
      font-size: .75rem; font-weight: 700; padding: 6px 14px;
      border-radius: 0 16px 0 12px; display: flex; align-items: center; gap: 4px;
    }
    .recommended-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .on-request-card { border-style: dashed; border-color: var(--bs-secondary-color); }

    .plan-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .plan-icon {
      width: 48px; height: 48px; border-radius: 12px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .plan-icon.icon-enterprise { background: rgba(13,110,253,.12); color: var(--bs-primary, #0d6efd); }
    .plan-icon.icon-academic { background: rgba(25,135,84,.12); color: #198754; }
    .plan-icon mat-icon { font-size: 24px; }

    .plan-price { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--bs-border-color); }
    .price-currency { font-size: 1.4rem; font-weight: 700; vertical-align: top; margin-top: 6px; display: inline-block; }
    .price-amount { font-size: 2.8rem; font-weight: 800; line-height: 1; }
    .price-period { font-size: .8rem; color: var(--bs-secondary-color); margin-left: 4px; }

    .plan-limits {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;
    }
    .limit-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--bs-tertiary-bg); border-radius: 6px;
      padding: 3px 8px; font-size: .72rem; font-weight: 600;
    }
    .limit-badge mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .plan-features { list-style: none; padding: 0; margin: 0 0 16px 0; }
    .plan-features li {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: .875rem; margin-bottom: 8px; color: var(--bs-body-color);
    }
    .feature-check { font-size: 17px; width: 17px; height: 17px; color: #198754; margin-top: 1px; flex-shrink: 0; }

    .plan-cta button { border-radius: 10px !important; font-weight: 600 !important; height: 44px; }
    .btn-recommended { background: var(--bs-primary, #0d6efd) !important; }

    .trust-section { padding: 24px 0; border-top: 1px solid var(--bs-border-color); }
    .trust-icon { color: var(--bs-primary, #0d6efd); display: block; margin: 0 auto 6px; }

    .faq-note { color: var(--bs-secondary-color); }
    .faq-note mat-icon { color: inherit; }
  </style>
  `,
})
export class PricingComponent {
  orgType = signal<OrgType>('enterprise');
  billingCycle = signal<BillingCycle>('monthly');

  currentPlans = computed(() =>
    this.orgType() === 'enterprise' ? this.billing.enterprisePlans : this.billing.academicPlans
  );

  constructor(private billing: BillingService, private checkoutState: CheckoutStateService, private router: Router) {}

  setOrgType(type: OrgType) { this.orgType.set(type); }

  toggleCycle() {
    this.billingCycle.set(this.billingCycle() === 'monthly' ? 'annual' : 'monthly');
  }

  getPrice(plan: Plan): number {
    return this.billingCycle() === 'monthly' ? plan.monthlyPrice! : plan.annualPrice!;
  }

  choosePlan(plan: Plan) {
    // Store minimal plan info, then go to checkout
    this.router.navigate(['/billing/checkout'], {
      queryParams: { plan: plan.id, type: this.orgType(), cycle: this.billingCycle() }
    });
  }

  contactUs(plan: Plan) {
    this.router.navigate(['/web/contactus']);
  }
}
