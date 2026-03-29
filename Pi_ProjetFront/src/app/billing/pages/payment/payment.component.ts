import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { BillingService } from '../../services/billing.service';
import { PendingPaymentsService } from '../../services/pending-payments.service';
import { PaymentRequest } from '../../models/billing.models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule,
    MatIconModule, MatInputModule, MatFormFieldModule, MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
  <div class="pay-page">
    <div class="container py-4 py-lg-5" style="max-width:900px">

      <!-- Title -->
      <h2 class="pay-title text-center mb-4">Complete Your Subscription</h2>

      <!-- Stepper -->
      <div class="stepper-row mb-4">
        <div class="step-item done">
          <div class="step-circle"><mat-icon>check</mat-icon></div>
          <span class="step-label">Organization Info</span>
        </div>
        <div class="step-line"></div>
        <div class="step-item active">
          <div class="step-circle"><span>2</span></div>
          <span class="step-label">Payment</span>
        </div>
      </div>

      @if (!checkoutState.hasState()) {
        <div class="text-center py-5">
          <mat-icon style="font-size:56px;opacity:.25">error_outline</mat-icon>
          <p class="text-secondary mt-3">No checkout session. Please start over.</p>
          <button matButton="filled" (click)="goToPricing()">Back to Pricing</button>
        </div>
      } @else {

      <div class="pay-grid">

        <!-- ── LEFT: Order Summary ── -->
        <div class="summary-col">
          <div class="summary-box">
            <h5 class="summary-heading">Order Summary</h5>
            @let s = checkoutState.checkoutState();
            @if (s) {
              <div class="summary-row"><span class="sl">Plan:</span><span class="sv fw-bold">{{ s.plan.name }}</span></div>
              <div class="summary-row"><span class="sl">Billing Cycle:</span><span class="sv">{{ s.billingCycle === 'monthly' ? 'Monthly' : 'Annual' }}</span></div>
              <div class="summary-row"><span class="sl">Organization:</span><span class="sv">{{ s.orgName }}</span></div>
              <div class="summary-row"><span class="sl">Users:</span><span class="sv">{{ s.numUsers }}</span></div>
              <hr class="summary-hr">
              <div class="summary-row total-row">
                <span class="sl">Subtotal:</span>
                <span class="sv fw-bold">{{ totalDisplay() }}</span>
              </div>
              <div class="summary-notice">
                <mat-icon>check_circle</mat-icon>
                <span>Your subscription will be activated immediately upon payment.</span>
              </div>
              <div class="summary-notice mt-2">
                <mat-icon>lock</mat-icon>
                <span>Secured by Stripe. We never store your card details.</span>
              </div>
            }
          </div>
        </div>

        <!-- ── RIGHT: Stripe Card Form ── -->
        <div class="card-col">
          <div class="card-box">
            <h5 class="card-heading">Card Information</h5>

            <!-- Stripe loading indicator -->
            @if (stripeLoading()) {
              <div class="stripe-loading">
                <mat-progress-spinner diameter="32" mode="indeterminate"></mat-progress-spinner>
                <span>Loading secure payment form…</span>
              </div>
            }

            <form [formGroup]="payForm" (ngSubmit)="submit()" [style.display]="stripeLoading() ? 'none' : 'block'">

              <!-- Cardholder name -->
              <div class="field-group">
                <input class="pay-input" formControlName="cardHolder"
                  placeholder="Cardholder Name*" type="text" autocomplete="cc-name">
                @if (pf['cardHolder'].invalid && pf['cardHolder'].touched) {
                  <span class="err">Cardholder name is required</span>
                }
              </div>

              <!-- Stripe Card Element -->
              <div class="field-group">
                <div id="stripe-card-element" class="stripe-element"></div>
                @if (stripeError()) {
                  <span class="err">{{ stripeError() }}</span>
                }
              </div>

              <!-- Error message -->
              @if (errorMessage()) {
                <div class="err-banner">
                  <mat-icon class="material-icons-outlined">error_outline</mat-icon>
                  {{ errorMessage() }}
                </div>
              }

              <!-- Actions -->
              <div class="form-actions">
                <button type="button" matButton class="back-btn" (click)="goBack()">Back</button>
                <button type="submit" matButton="filled" class="pay-btn"
                  [disabled]="payForm.invalid || isSubmitting() || stripeLoading()">
                  @if (isSubmitting()) {
                    <mat-progress-spinner diameter="18" mode="indeterminate"></mat-progress-spinner>
                    <span>Processing…</span>
                  } @else {
                    <ng-container>
                      <mat-icon style="font-size:18px;width:18px;height:18px">lock</mat-icon>
                      Pay {{ totalDisplay() }}
                    </ng-container>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      }
    </div>
  </div>

  <style>
    .pay-page {
      min-height: 80vh;
      background: #f0f4fa;
    }

    .pay-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--bs-body-color);
      letter-spacing: -.3px;
    }

    /* ── Stepper ── */
    .stepper-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      max-width: 500px;
      margin: 0 auto;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
    }
    .step-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .9rem; font-weight: 700;
      border: 2px solid #cbd5e1;
      background: #fff;
      color: #94a3b8;
      transition: all .25s;
    }
    .step-circle mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .step-label {
      font-size: .85rem; font-weight: 600; color: #94a3b8; white-space: nowrap;
    }
    .step-item.done .step-circle {
      background: #2563eb; border-color: #2563eb; color: #fff;
    }
    .step-item.done .step-label { color: #2563eb; }
    .step-item.active .step-circle {
      background: #2563eb; border-color: #2563eb; color: #fff;
      box-shadow: 0 0 0 4px rgba(37,99,235,.18);
    }
    .step-item.active .step-label { color: #2563eb; font-weight: 700; }
    .step-line {
      flex: 1; height: 2px; background: #cbd5e1;
      min-width: 120px; margin: 0 12px;
    }

    /* ── 2-col grid ── */
    .pay-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 700px) {
      .pay-grid { grid-template-columns: 1fr; }
      .step-line { min-width: 60px; }
    }

    /* ── Summary Box ── */
    .summary-box {
      background: #dbeafe;
      border-radius: 16px;
      padding: 24px;
    }
    .summary-heading {
      font-weight: 700; font-size: 1rem; margin-bottom: 16px;
      color: #1e40af;
    }
    .summary-row {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 10px;
      font-size: .875rem;
    }
    .sl { color: #64748b; }
    .sv { color: var(--bs-body-color); text-align: right; max-width: 60%; }
    .summary-hr { border: none; border-top: 1px solid #bfdbfe; margin: 12px 0; }
    .total-row .sl,.total-row .sv { font-weight: 700; font-size: .95rem; }
    .summary-notice {
      display: flex; align-items: flex-start; gap: 7px;
      margin-top: 12px; font-size: .78rem; color: #64748b; line-height: 1.4;
    }
    .summary-notice mat-icon {
      font-size: 15px; width: 15px; height: 15px;
      flex-shrink: 0; margin-top: 1px; color: #2563eb;
    }

    /* ── Card Box ── */
    .card-box {
      background: #fff;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 2px 16px rgba(0,0,0,.07);
      overflow: hidden;
    }
    .card-heading {
      font-weight: 700; font-size: 1rem; margin-bottom: 20px;
      color: var(--bs-body-color);
    }

    /* Stripe loading */
    .stripe-loading {
      display: flex; align-items: center; gap: 12px;
      padding: 24px 0; color: #64748b; font-size: .9rem;
    }

    /* Fields */
    .field-group { margin-bottom: 14px; position: relative; }
    .pay-input {
      width: 100%; padding: 14px 18px;
      border: 1.5px solid #e2e8f0; border-radius: 50px;
      font-size: .9rem; outline: none; background: #f8fafc;
      transition: border-color .2s;
      color: var(--bs-body-color);
      box-sizing: border-box;
    }
    .pay-input:focus { border-color: #2563eb; background: #fff; }
    .pay-input::placeholder { color: #94a3b8; }

    /* Stripe Element container */
    .stripe-element {
      padding: 14px 18px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
      transition: border-color .2s;
    }
    .stripe-element.StripeElement--focus { border-color: #2563eb; background: #fff; }
    .stripe-element.StripeElement--invalid { border-color: #ef4444; }

    .err { font-size: .75rem; color: #ef4444; padding-left: 14px; margin-top: 4px; display: block; }

    /* Actions bar */
    .form-actions {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 24px; padding-top: 20px;
      border-top: 1px solid #f1f5f9;
    }
    .back-btn {
      color: #64748b !important; font-weight: 600 !important;
      font-size: .9rem !important;
    }
    .pay-btn {
      background: #2563eb !important; color: #fff !important;
      border-radius: 50px !important; padding: 10px 32px !important;
      font-weight: 700 !important; font-size: .9rem !important;
      display: flex !important; align-items: center !important; gap: 8px !important;
      box-shadow: 0 4px 14px rgba(37,99,235,.35) !important;
    }
    .pay-btn:disabled { opacity: .6 !important; cursor: not-allowed !important; }
    .err-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fee2e2; color: #dc2626; border-radius: 10px;
      padding: 12px 16px; font-size: .85rem; font-weight: 600;
      margin-bottom: 12px;
    }
    .err-banner mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
  </style>
  `,
})
export class PaymentComponent implements OnInit, OnDestroy {
  isSubmitting  = signal(false);
  stripeLoading = signal(true);
  errorMessage  = signal<string | null>(null);
  stripeError   = signal<string | null>(null);

  private fb           = inject(FormBuilder);
  private router       = inject(Router);
  checkoutState        = inject(CheckoutStateService);
  private billing      = inject(BillingService);
  private pendingSvc   = inject(PendingPaymentsService);

  private stripe: Stripe | null = null;
  private cardElement: StripeCardElement | null = null;
  private clientSecret: string | null = null;

  payForm = this.fb.group({
    cardHolder: ['', Validators.required],
  });

  get pf() { return this.payForm.controls; }

  totalDisplay(): string {
    const s = this.checkoutState.checkoutState();
    if (!s) return '';
    const plan = s.plan;
    if (plan.onRequest) return 'Custom';
    const price = s.billingCycle === 'monthly' ? plan.monthlyPrice! : plan.annualPrice!;
    return `$ ${price}.00`;
  }

  async ngOnInit() {
    if (!this.checkoutState.hasState()) {
      this.router.navigate(['/billing/pricing']);
      return;
    }

    // 1. Load Stripe.js
    this.stripe = await loadStripe(environment.stripePublishableKey);
    if (!this.stripe) {
      this.stripeLoading.set(false);
      this.errorMessage.set('Failed to load Stripe. Please refresh the page.');
      return;
    }

    // 2. Create PaymentIntent on backend
    const s = this.checkoutState.checkoutState()!;
    this.billing.createPaymentIntent(s.plan.id, s.billingCycle).subscribe({
      next: (res) => {
        this.clientSecret = res.clientSecret;
        this.mountCardElement();
      },
      error: (err) => {
        this.stripeLoading.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? err?.message ?? null;
        this.errorMessage.set(
          msg
            ? `Payment initialization failed: ${msg}`
            : 'Could not reach the payment server. Make sure the backend is running on port 8084.'
        );
        console.error('PaymentIntent error:', err);
      }
    });
  }

  private mountCardElement() {
    const elements = this.stripe!.elements();
    this.cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '15px',
          color: '#334155',
          fontFamily: 'inherit',
          '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444' },
      },
      hidePostalCode: true,
    });

    this.cardElement.mount('#stripe-card-element');

    this.cardElement.on('change', (event) => {
      this.stripeError.set(event.error ? event.error.message : null);
    });

    this.stripeLoading.set(false);
  }

  async submit() {
    if (this.payForm.invalid || !this.checkoutState.hasState() || !this.stripe || !this.cardElement || !this.clientSecret) {
      this.payForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const cardHolder = this.payForm.value.cardHolder!;

    // 3. Confirm card payment with Stripe.js
    const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: { name: cardHolder },
      },
    });

    if (error) {
      this.isSubmitting.set(false);
      this.errorMessage.set(error.message ?? 'Payment failed. Please try again.');
      return;
    }

    if (paymentIntent?.status !== 'succeeded') {
      this.isSubmitting.set(false);
      this.errorMessage.set('Payment was not completed. Status: ' + paymentIntent?.status);
      return;
    }

    // 4. Send everything to backend with the real PaymentIntent ID
    const s = this.checkoutState.checkoutState()!;
    const payload: PaymentRequest & { stripePaymentIntentId: string } = {
      planId:                s.plan.id,
      orgType:               s.orgType,
      billingCycle:          s.billingCycle,
      orgName:               s.orgName,
      adminEmail:            s.adminEmail,
      adminName:             s.adminName,
      phone:                 s.phone,
      numUsers:              s.numUsers,
      address:               s.address,
      vatNumber:             s.vatNumber,
      institution:           s.institution,
      department:            s.department,
      cardHolder:            cardHolder,
      cardNumber:            '****',
      expiryDate:            '**/**',
      cvv:                   '***',
      stripePaymentIntentId: paymentIntent.id,
    };

    const isUpgrade = this.checkoutState.isUpgradeMode();
    this.billing.submitPayment(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.pendingSvc.addPending(res, payload);
        this.checkoutState.clear();
        this.checkoutState.clearUpgradeMode();
        const destination = isUpgrade ? '/app/upgrade-confirmation' : '/billing/confirmation';
        this.router.navigate([destination], {
          state: { payment: res, email: s.adminEmail, orgName: s.orgName }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.error ?? err?.error?.message ?? null;
        this.errorMessage.set(msg ?? 'Payment confirmed by Stripe but account setup failed. Contact support.');
      }
    });
  }

  ngOnDestroy() {
    this.cardElement?.destroy();
  }

  goBack()      { this.router.navigate(['/billing/checkout']); }
  goToPricing() { this.router.navigate(['/billing/pricing']); }
}
