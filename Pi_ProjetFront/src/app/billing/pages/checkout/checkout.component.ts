import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BillingService } from '../../services/billing.service';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { Plan, OrgType, BillingCycle } from '../../models/billing.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule],
  template: `
  <div class="checkout-page">
    <div class="checkout-container">

      <!-- Left column -->
      <div class="left-col">
        <h2 class="page-title">Complete your registration</h2>
        <p class="page-sub">Tell us about your organization to get started</p>

        @if (!selectedPlan()) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>No plan selected. <a (click)="goBack()" class="link">Back to pricing</a></p>
          </div>
        } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <!-- ── Company / Institution Information ── -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>{{ isAcademic() ? 'account_balance' : 'domain' }}</mat-icon>
              <span>{{ isAcademic() ? 'Institution Information' : 'Company Information' }}</span>
            </div>
            <div class="fields-grid">
              <div class="field-wrap">
                <input class="f-input" formControlName="orgName"
                  [placeholder]="(isAcademic() ? 'Institution' : 'Company') + ' Name **'"
                  type="text">
                <mat-icon class="f-icon">{{ isAcademic() ? 'account_balance' : 'domain' }}</mat-icon>
                @if (f['orgName'].invalid && f['orgName'].touched) {
                  <span class="f-err">Required</span>
                }
              </div>

              @if (isAcademic()) {
                <div class="field-wrap">
                  <input class="f-input" formControlName="department"
                    placeholder="Faculty / Department" type="text">
                  <mat-icon class="f-icon">menu_book</mat-icon>
                </div>
              } @else {
                <div class="field-wrap">
                  <input class="f-input" formControlName="vatNumber"
                    placeholder="VAT Number (optional)" type="text">
                  <mat-icon class="f-icon">receipt_long</mat-icon>
                </div>
              }

              <div class="field-wrap full-width">
                <input class="f-input" formControlName="address"
                  placeholder="Address" type="text">
                <mat-icon class="f-icon">location_on</mat-icon>
              </div>
            </div>
          </div>

          <!-- ── Admin Contact ── -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>manage_accounts</mat-icon>
              <span>Admin Contact</span>
            </div>
            <div class="info-banner">
              <mat-icon>info</mat-icon>
              <span>This person will be the <strong>Organization Admin</strong>. Login credentials will be sent to this email after activation.</span>
            </div>
            <div class="fields-grid mt-3">
              <div class="field-wrap">
                <input class="f-input" formControlName="adminName"
                  placeholder="Full Name **" type="text">
                <mat-icon class="f-icon">person</mat-icon>
                @if (f['adminName'].invalid && f['adminName'].touched) {
                  <span class="f-err">Required</span>
                }
              </div>
              <div class="field-wrap">
                <input class="f-input" formControlName="adminEmail"
                  placeholder="Email Address **" type="email">
                <mat-icon class="f-icon">email</mat-icon>
                @if (f['adminEmail'].invalid && f['adminEmail'].touched) {
                  <span class="f-err">Valid email required</span>
                }
              </div>
              <div class="field-wrap">
                <input class="f-input" formControlName="phone"
                  placeholder="Phone Number **" type="tel">
                <mat-icon class="f-icon">phone</mat-icon>
                @if (f['phone'].invalid && f['phone'].touched) {
                  <span class="f-err">Required</span>
                }
              </div>
              <div class="field-wrap number-wrap">
                <label class="number-label">Number of {{ isAcademic() ? 'Students' : 'Users' }} **</label>
                <div class="number-inner">
                  <input class="f-input number-input" formControlName="numUsers"
                    type="number" min="1">
                  <mat-icon class="f-icon">group</mat-icon>
                </div>
                @if (f['numUsers'].invalid && f['numUsers'].touched) {
                  <span class="f-err">Min. 1</span>
                }
              </div>
            </div>
          </div>

          <!-- ── Billing Cycle ── -->
          <div class="form-section">
            <div class="section-header">
              <mat-icon>calendar_today</mat-icon>
              <span>Billing Cycle</span>
            </div>
            <div class="cycle-options">
              <!-- Monthly -->
              <label class="cycle-option" [class.selected]="form.get('billingCycle')?.value === 'monthly'"
                (click)="form.get('billingCycle')?.setValue('monthly')">
                <div class="cycle-radio" [class.active]="form.get('billingCycle')?.value === 'monthly'"></div>
                <div class="cycle-info">
                  <strong>Monthly</strong>
                  <p>Billed every month. Flexible cancellation.</p>
                </div>
                <span class="cycle-price ms-auto">
                  @if (selectedPlan()?.monthlyPrice !== null) {
                    \${{ selectedPlan()?.monthlyPrice }}/mo
                  } @else { Custom }
                </span>
              </label>

              <!-- Annual -->
              <label class="cycle-option" [class.selected]="form.get('billingCycle')?.value === 'annual'"
                (click)="form.get('billingCycle')?.setValue('annual')">
                <div class="cycle-radio" [class.active]="form.get('billingCycle')?.value === 'annual'"></div>
                <div class="cycle-info">
                  <strong>Annual</strong>
                  <p>Billed once a year.</p>
                </div>
                <div class="ms-auto d-flex align-items-center gap-2">
                  @if (!selectedPlan()?.onRequest) {
                    <span class="save-badge">Save 20%</span>
                    <span class="cycle-price">\${{ selectedPlan()?.annualPrice }}/mo</span>
                  } @else {
                    <span class="cycle-price">Custom</span>
                  }
                </div>
              </label>
            </div>
          </div>

          <!-- Submit -->
          <button type="submit" class="submit-btn w-100"
            [disabled]="form.invalid || isSubmitting()">
            @if (isSubmitting()) {
              Processing…
            } @else {
              Continue to Payment &nbsp;→
            }
          </button>

          <p class="legal-note">
            <mat-icon>lock</mat-icon>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>

        </form>
        }
      </div>

      <!-- Right column — Order Summary -->
      <div class="right-col">
        @if (selectedPlan()) {
        <div class="summary-card">
          <h5 class="summary-title">Order Summary</h5>
          <hr class="summary-hr">

          <!-- Plan header -->
          <div class="summary-plan-row">
            <div class="plan-icon-sm">
              <mat-icon>{{ selectedPlan()!.icon }}</mat-icon>
            </div>
            <div>
              <p class="plan-name">{{ selectedPlan()!.name }} Plan</p>
              <p class="plan-type">{{ orgType() === 'enterprise' ? 'Enterprise' : 'Academic' }}</p>
            </div>
          </div>
          <hr class="summary-hr">

          <!-- Pricing -->
          <div class="summary-price-row">
            <span class="sp-label">Base price</span>
            <span class="sp-value">
              @if (selectedPlan()?.onRequest) { Custom }
              @else if (billingCycleValue() === 'monthly') { \${{ selectedPlan()?.monthlyPrice }}/mo }
              @else { \${{ selectedPlan()?.annualPrice }}/mo }
            </span>
          </div>
          <div class="summary-price-row total">
            <span class="sp-label">Total</span>
            <span class="sp-value">
              @if (selectedPlan()?.onRequest) { Custom }
              @else if (billingCycleValue() === 'monthly') { \${{ selectedPlan()?.monthlyPrice }}/mo }
              @else { \${{ selectedPlan()?.annualPrice }}/mo }
            </span>
          </div>
          <hr class="summary-hr">

          <!-- Features list -->
          <p class="features-label">Included in this plan:</p>
          <ul class="features-list">
            @for (feat of selectedPlan()!.features.slice(0,5); track feat) {
              <li><mat-icon>check</mat-icon> {{ feat }}</li>
            }
          </ul>
          <hr class="summary-hr">

          <!-- Secure checkout -->
          <div class="secure-row">
            <mat-icon class="secure-icon">verified_user</mat-icon>
            <div>
              <p class="secure-title">Secure Checkout</p>
              <p class="secure-body">Payment is manually validated by our team. Your data is protected by 256-bit SSL encryption.</p>
            </div>
          </div>
        </div>
        }
      </div>

    </div>
  </div>

  <style>
    .checkout-page {
      min-height: 80vh;
      background: #f0f4fa;
      padding: 40px 16px;
    }
    .checkout-container {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 28px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .checkout-container { grid-template-columns: 1fr; }
    }

    /* Page titles */
    .page-title { font-size: 1.6rem; font-weight: 800; margin-bottom: 4px; color: #1e293b; }
    .page-sub { color: #64748b; font-size: .9rem; margin-bottom: 24px; }

    /* Sections */
    .form-section {
      background: #fff;
      border-radius: 14px;
      padding: 22px 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,.06);
    }
    .section-header {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: .95rem; color: #1e293b; margin-bottom: 18px;
    }
    .section-header mat-icon { color: #2563eb; font-size: 20px; }

    /* Info banner */
    .info-banner {
      display: flex; align-items: flex-start; gap: 10px;
      background: #eff6ff; border-radius: 8px; padding: 10px 14px;
      font-size: .84rem; color: #1e40af; line-height: 1.5;
    }
    .info-banner mat-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; color: #2563eb; }

    /* Fields */
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) { .fields-grid { grid-template-columns: 1fr; } }
    .full-width { grid-column: 1 / -1; }
    .mt-3 { margin-top: 14px !important; }

    .field-wrap { position: relative; }
    .f-input {
      width: 100%; padding: 13px 44px 13px 16px;
      border: 1.5px solid #e2e8f0; border-radius: 50px;
      font-size: .875rem; color: #1e293b; background: #f8fafc;
      outline: none; box-sizing: border-box; transition: border-color .2s;
    }
    .f-input:focus { border-color: #2563eb; background: #fff; }
    .f-input::placeholder { color: #94a3b8; }
    .f-icon {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      color: #94a3b8; font-size: 18px; pointer-events: none;
    }
    .f-err { font-size: .73rem; color: #ef4444; padding-left: 14px; display: block; margin-top: 3px; }

    /* Number field */
    .number-wrap { position: relative; }
    .number-label {
      position: absolute; top: -8px; left: 16px; z-index: 2;
      font-size: .72rem; color: #64748b; background: #f8fafc;
      padding: 0 4px; pointer-events: none;
    }
    .number-inner { position: relative; }
    .number-input { padding-top: 18px !important; }

    /* Billing cycle */
    .cycle-options { display: flex; flex-direction: column; gap: 10px; }
    .cycle-option {
      display: flex; align-items: center; gap: 14px;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
      padding: 14px 18px; cursor: pointer; transition: all .18s;
    }
    .cycle-option:hover { border-color: #93c5fd; }
    .cycle-option.selected { border-color: #2563eb; background: #eff6ff; }
    .cycle-radio {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #cbd5e1; flex-shrink: 0; transition: all .18s;
    }
    .cycle-radio.active {
      border-color: #2563eb; background: #2563eb;
      box-shadow: inset 0 0 0 3px #fff;
    }
    .cycle-info strong { font-size: .875rem; color: #1e293b; display: block; }
    .cycle-info p { font-size: .78rem; color: #64748b; margin: 0; }
    .cycle-price { font-weight: 700; font-size: .875rem; color: #1e293b; white-space: nowrap; }
    .save-badge {
      background: #16a34a; color: #fff; font-size: .7rem; font-weight: 700;
      padding: 2px 9px; border-radius: 50px;
    }

    /* Submit */
    .submit-btn {
      display: block; width: 100%; padding: 15px;
      background: #64748b; color: #fff; border: none; border-radius: 10px;
      font-size: .95rem; font-weight: 700; cursor: pointer; transition: background .2s;
    }
    .submit-btn:not(:disabled):hover { background: #2563eb; }
    .submit-btn:disabled { opacity: .65; cursor: not-allowed; }
    .legal-note {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      font-size: .75rem; color: #94a3b8; margin-top: 12px;
    }
    .legal-note mat-icon { font-size: 14px; }

    /* ── Right: Summary card ── */
    .summary-card {
      background: #fff; border-radius: 16px; padding: 22px;
      box-shadow: 0 2px 12px rgba(0,0,0,.07);
      position: sticky; top: 80px;
    }
    .summary-title { font-weight: 700; font-size: .95rem; color: #1e293b; margin-bottom: 14px; }
    .summary-hr { border: none; border-top: 1px solid #f1f5f9; margin: 12px 0; }

    .summary-plan-row { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
    .plan-icon-sm {
      width: 40px; height: 40px; border-radius: 10px;
      background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .plan-icon-sm mat-icon { color: #2563eb; font-size: 20px; }
    .plan-name { font-weight: 700; font-size: .875rem; margin: 0; color: #1e293b; }
    .plan-type { font-size: .77rem; color: #64748b; margin: 0; }

    .summary-price-row {
      display: flex; justify-content: space-between; margin-bottom: 8px;
      font-size: .85rem;
    }
    .sp-label { color: #64748b; }
    .sp-value { color: #1e293b; }
    .total .sp-label, .total .sp-value { font-weight: 700; font-size: .9rem; color: #1e293b; }

    .features-label { font-size: .8rem; font-weight: 600; color: #64748b; margin-bottom: 8px; }
    .features-list { list-style: none; padding: 0; margin: 0; }
    .features-list li {
      display: flex; align-items: center; gap: 8px;
      font-size: .8rem; color: #374151; margin-bottom: 6px;
    }
    .features-list mat-icon { font-size: 15px; width: 15px; height: 15px; color: #16a34a; flex-shrink: 0; }

    .secure-row { display: flex; align-items: flex-start; gap: 10px; }
    .secure-icon { color: #16a34a; font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .secure-title { font-weight: 700; font-size: .82rem; color: #1e293b; margin: 0 0 3px; }
    .secure-body { font-size: .76rem; color: #64748b; margin: 0; line-height: 1.45; }

    .empty-state { text-align: center; padding: 60px 0; }
    .empty-state mat-icon { font-size: 56px; opacity: .25; display: block; margin: 0 auto 12px; }
    .link { color: #2563eb; cursor: pointer; }
    .d-flex { display: flex !important; }
    .align-items-center { align-items: center !important; }
    .gap-2 { gap: 8px !important; }
    .ms-auto { margin-left: auto !important; }
    .w-100 { width: 100% !important; }
  </style>
  `,
})
export class CheckoutComponent implements OnInit {
  selectedPlan = signal<Plan | null>(null);
  isSubmitting = signal(false);

  private fb = inject(FormBuilder);
  private billing = inject(BillingService);
  private stateService = inject(CheckoutStateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.group({
    orgType: ['enterprise' as OrgType, Validators.required],
    orgName: ['', [Validators.required, Validators.minLength(2)]],
    adminName: ['', [Validators.required, Validators.minLength(2)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    numUsers: [1, [Validators.required, Validators.min(1)]],
    billingCycle: ['monthly' as BillingCycle, Validators.required],
    address: [''],
    vatNumber: [''],
    department: [''],
  });

  get f() { return this.form.controls; }
  isAcademic = () => this.form.get('orgType')?.value === 'academic';
  orgType = () => this.form.get('orgType')?.value as OrgType;
  billingCycleValue = () => this.form.get('billingCycle')?.value as BillingCycle;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const planId = params['plan'];
      const type = params['type'] as OrgType;
      const cycle = params['cycle'] as BillingCycle;

      if (planId) {
        const plan = this.billing.getPlanById(planId);
        if (plan) {
          this.selectedPlan.set(plan);
          if (type) this.form.get('orgType')?.setValue(type);
          if (cycle) this.form.get('billingCycle')?.setValue(cycle);
        }
      } else if (this.stateService.hasState()) {
        const state = this.stateService.checkoutState();
        if (state) {
          this.selectedPlan.set(state.plan);
          this.form.patchValue({
            orgType: state.orgType,
            orgName: state.orgName,
            adminName: state.adminName,
            adminEmail: state.adminEmail,
            phone: state.phone,
            numUsers: state.numUsers,
            billingCycle: state.billingCycle,
            address: state.address,
            vatNumber: state.vatNumber,
            department: state.department,
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.form.invalid || !this.selectedPlan()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const state = {
      plan: this.selectedPlan()!,
      orgType: v.orgType as OrgType,
      billingCycle: v.billingCycle as BillingCycle,
      orgName: v.orgName!,
      adminEmail: v.adminEmail!,
      adminName: v.adminName!,
      phone: v.phone!,
      numUsers: v.numUsers!,
      address: v.address || '',
      vatNumber: v.vatNumber || undefined,
      department: v.department || undefined,
    };
    this.stateService.save(state);

    // Payment is open without login — go directly
    this.router.navigate(['/billing/payment']);
  }

  goBack() { this.router.navigate(['/billing/pricing']); }
}
