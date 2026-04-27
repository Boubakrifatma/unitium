import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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
    CommonModule, ReactiveFormsModule, FormsModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
  <div class="stripe-page">

    @if (!checkoutState.hasState()) {
      <div class="no-state">
        <mat-icon>error_outline</mat-icon>
        <p>No checkout session. Please start over.</p>
        <button class="btn-back-pricing" (click)="goToPricing()">Back to Pricing</button>
      </div>
    } @else {

    <div class="stripe-layout">

      <!-- ════════════════════════════════════════
           LEFT PANEL — Order Summary (dark)
           ════════════════════════════════════════ -->
      <div class="left-panel">
        @let s = checkoutState.checkoutState();
        @if (s) {

          <!-- Logo / Brand -->
          <div class="brand-row">
            <div class="brand-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="6" fill="white" fill-opacity="0.15"/>
                <path d="M7 14C7 10.134 10.134 7 14 7C17.866 7 21 10.134 21 14C21 17.866 17.866 21 14 21C10.134 21 7 17.866 7 14Z" fill="white" fill-opacity="0.8"/>
                <path d="M11 14L13 16L17 12" stroke="#1a1a2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="brand-name">{{ s.orgName || 'Your Organization' }}</span>
          </div>

          <!-- Price Hero -->
          <div class="price-hero">
            <div class="plan-name">{{ s.plan.name }}</div>
            <div class="price-amount">
              <span class="price-value">{{ priceValue() }}</span>
              <span class="price-period">/ {{ s.billingCycle === 'monthly' ? 'mo' : 'yr' }}</span>
            </div>
          </div>

          <!-- Billing Toggle -->
          <div class="billing-toggle">
            <div class="toggle-wrapper">
              <label class="toggle-switch">
                <input type="checkbox" [checked]="s.billingCycle === 'annual'" (change)="onCycleToggle($event, s)">
                <span class="toggle-slider"></span>
              </label>
              <div class="toggle-info">
                <span class="toggle-label">Annual billing</span>
                @if (annualSavings() > 0) {
                  <span class="savings-badge">Save {{ annualSavings() }} DT</span>
                }
              </div>
            </div>
            @if (s.billingCycle === 'annual') {
              <div class="annual-price-note">{{ annualMonthly() }} DT/mo</div>
            }
          </div>

          <div class="left-divider"></div>

          <!-- Line items -->
          <div class="line-items">
            <div class="line-item">
              <span class="li-label">Subtotal</span>
              <span class="li-value">{{ totalDisplay() }}</span>
            </div>
            @if (couponApplied() && couponResult()?.valid) {
              <div class="line-item" style="color:#059669">
                <span class="li-label">
                  <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">local_offer</mat-icon>
                  Promo ({{ couponCode.toUpperCase() }})
                </span>
                <span class="li-value">− {{ couponSavingDisplay() }}</span>
              </div>
            }
            <div class="line-item">
              <span class="li-label">Tax <span class="li-info">ⓘ</span></span>
              <span class="li-value">0,000 DT</span>
            </div>
          </div>

          <div class="left-divider"></div>

          <div class="total-due">
            <span class="total-label">Total due today</span>
            <span class="total-value">{{ discountedTotalDisplay() }}</span>
          </div>

          <!-- Trust badges -->
          <div class="trust-row">
            <div class="trust-item">
              <mat-icon>lock</mat-icon>
              <span>Secured by Stripe</span>
            </div>
            <div class="trust-item">
              <mat-icon>verified_user</mat-icon>
              <span>SSL encrypted payment</span>
            </div>
          </div>
        }
      </div>

      <!-- ════════════════════════════════════════
           RIGHT PANEL — Payment Form (white)
           ════════════════════════════════════════ -->
      <div class="right-panel">
        <div class="right-inner">

        <!-- Section: Contact -->
        <div class="section-block">
          <h3 class="section-title">Contact</h3>
          @let s2 = checkoutState.checkoutState();
          @if (s2) {
            <div class="info-row">
              <div class="info-field">
                <span class="info-label">Email</span>
                <span class="info-value">{{ s2.adminEmail }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Section: Payment method -->
        <div class="section-block">
          <h3 class="section-title">Payment method</h3>

          <!-- Payment method tabs -->
          <div class="method-tabs">
            <div class="method-tab active">
              <div class="method-radio-dot"></div>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="card-icon">
                <rect width="20" height="14" rx="2" fill="#E8E8E8"/>
                <rect y="3" width="20" height="3" fill="#999"/>
                <rect x="2" y="8" width="5" height="2" rx="1" fill="#999"/>
              </svg>
              <span>Card</span>
            </div>
          </div>

          <!-- Card Form -->
          <form [formGroup]="payForm" (ngSubmit)="submit()">

            <div class="card-form-box">
              <div class="cf-label">Card information</div>

              <!-- Cardholder name -->
              <div class="cf-field border-bottom-field">
                <input class="cf-input" formControlName="cardHolder"
                  placeholder="Cardholder name" type="text" autocomplete="cc-name">
                @if (pf['cardHolder'].invalid && pf['cardHolder'].touched) {
                  <span class="cf-err">Name is required</span>
                }
              </div>

              <!-- Stripe Card Element -->
              @if (stripeLoading()) {
                <div class="stripe-loading-row">
                  <mat-progress-spinner diameter="20" mode="indeterminate"></mat-progress-spinner>
                  <span>Loading secure payment form…</span>
                </div>
              }
              <div [style.display]="stripeLoading() ? 'none' : 'block'">
                <div class="cf-stripe-wrap" id="stripe-card-element"></div>
                @if (stripeError()) {
                  <span class="cf-err">{{ stripeError() }}</span>
                }
              </div>
            </div>

            <!-- Coupon Code -->
            <div class="coupon-block">
              <div class="coupon-label">Promo code</div>
              <div class="coupon-row">
                <input class="coupon-input" [(ngModel)]="couponCode" [ngModelOptions]="{standalone: true}"
                  placeholder="Enter coupon code (e.g. UNITUM20)"
                  [disabled]="couponApplied()"
                  (keyup.enter)="applyCoupon()">
                @if (!couponApplied()) {
                  <button type="button" class="coupon-btn" (click)="applyCoupon()" [disabled]="couponLoading() || !couponCode">
                    @if (couponLoading()) { <mat-progress-spinner diameter="14" mode="indeterminate"></mat-progress-spinner> }
                    @else { Apply }
                  </button>
                } @else {
                  <button type="button" class="coupon-remove-btn" (click)="removeCoupon()">Remove</button>
                }
              </div>
              @if (couponResult()) {
                @if (couponResult()!.valid) {
                  <div class="coupon-success">
                    <mat-icon>check_circle</mat-icon>
                    Coupon applied! You save <strong>{{ couponSavingDisplay() }}</strong>
                    @if (couponResult()!.discountType === 'PERCENTAGE') {
                      <span>({{ couponResult()!.discountValue }}% off)</span>
                    }
                  </div>
                } @else {
                  <div class="coupon-error">
                    <mat-icon>cancel</mat-icon>
                    {{ couponResult()!.message }}
                  </div>
                }
              }
            </div>

            <!-- Error banner -->
            @if (errorMessage()) {
              <div class="err-banner">
                <mat-icon>error_outline</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <!-- Submit button -->
            <button type="button" class="subscribe-btn"
              [disabled]="payForm.invalid || isSubmitting() || stripeLoading()"
              (click)="requestConfirm()">
              @if (isSubmitting()) {
                <mat-progress-spinner diameter="20" mode="indeterminate" style="--mdc-circular-progress-active-indicator-color:#fff"></mat-progress-spinner>
                <span>Processing…</span>
              } @else {
                <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px">lock</mat-icon>
                Pay — {{ discountedTotalDisplay() }}
              }
            </button>

            <p class="stripe-legal">
              By subscribing, you agree to our
              <a href="#" onclick="return false">Terms of Service</a> and
              <a href="#" onclick="return false">Privacy Policy</a>.
            </p>

            <div class="powered-row">
              <span>Powered by</span>
              <svg height="16" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.94 12.94 0 0 1-4.56.83c-4.06 0-6.83-2.58-6.83-7.27 0-4.07 2.28-7.3 6.3-7.3 3.97 0 5.93 3.03 5.93 7.01v1.81zm-5.93-5.38c-1.06 0-2.11.79-2.11 2.55h4.17c0-1.76-1.03-2.55-2.06-2.55zM36.68 24.52V5.8h4.93l.29 1.53a4.63 4.63 0 0 1 3.5-1.8c3.25 0 5.45 2.89 5.45 7.27 0 4.6-2.37 7.3-5.58 7.3a3.93 3.93 0 0 1-3.12-1.42v5.84h-5.47zm7.53-15.3c-.93 0-1.8.5-2.06 1.26v4.6c.24.72 1.06 1.22 2.06 1.22 1.6 0 2.48-1.26 2.48-3.58 0-2.24-.9-3.5-2.48-3.5zM25.56 19.83c-4.27 0-7.37-2.68-7.37-7.28 0-4.6 3.1-7.29 7.37-7.29 4.27 0 7.37 2.69 7.37 7.29 0 4.6-3.1 7.28-7.37 7.28zm0-3.6c1.37 0 2.24-1.26 2.24-3.68 0-2.43-.87-3.69-2.24-3.69-1.37 0-2.24 1.26-2.24 3.69 0 2.42.87 3.68 2.24 3.68zM16.62 5.8l-3.75 13.77h-5.1L4.02 5.8h5.5l1.7 8.25 1.9-8.25h3.5z" fill="#635BFF"/>
              </svg>
            </div>
          </form>
        </div>

        </div><!-- /right-inner -->
      </div>
    </div>

    }

    <!-- ── Confirmation Modal ── -->
    @if (showConfirm()) {
      <div class="confirm-overlay" (click)="showConfirm.set(false)">
        <div class="confirm-modal" (click)="$event.stopPropagation()">
          <div class="confirm-icon-wrap">
            <mat-icon>help_outline</mat-icon>
          </div>
          <h3 class="confirm-title">Confirm Payment</h3>
          <p class="confirm-desc">
            You are about to pay <strong>{{ discountedTotalDisplay() }}</strong> for the
            <strong>{{ checkoutState.checkoutState()?.plan?.name }}</strong> plan.
          </p>
          <p class="confirm-sub">Your card will be charged immediately. Are you sure?</p>
          <div class="confirm-actions">
            <button class="btn-cancel" (click)="showConfirm.set(false)">
              <mat-icon>close</mat-icon> Cancel
            </button>
            <button class="btn-confirm" (click)="confirmAndPay()">
              <mat-icon>lock</mat-icon> Yes, pay {{ discountedTotalDisplay() }}
            </button>
          </div>
        </div>
      </div>
    }

  </div>

  <style>
    /* ═══════════════════════════════════════
       PAGE WRAPPER
    ═══════════════════════════════════════ */
    .stripe-page {
      min-height: 100vh;
      background: #f6f9fc;
    }

    .no-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 80vh; gap: 12px;
      color: #64748b; font-size: .95rem;
    }
    .no-state mat-icon { font-size: 48px; opacity: .3; }
    .btn-back-pricing {
      margin-top: 8px; padding: 10px 24px; border-radius: 6px;
      background: #635bff; color: #fff; border: none;
      font-weight: 600; cursor: pointer;
    }

    /* ═══════════════════════════════════════
       TWO-COLUMN LAYOUT
    ═══════════════════════════════════════ */
    .stripe-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      min-height: 100vh;
      max-width: 960px;
      margin: 0 auto;
      box-shadow: 0 0 60px rgba(0,0,0,.1);
    }
    @media (max-width: 820px) {
      .stripe-layout { grid-template-columns: 1fr; max-width: 100%; }
    }

    /* ═══════════════════════════════════════
       LEFT PANEL
    ═══════════════════════════════════════ */
    .left-panel {
      background: #0a0a1a;
      padding: 48px 40px;
      display: flex; flex-direction: column; gap: 0;
      position: sticky; top: 0; min-height: 100vh;
    }

    .brand-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 40px;
    }
    .brand-logo {
      width: 36px; height: 36px;
      border-radius: 8px; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-name {
      font-size: .9rem; font-weight: 600; color: rgba(255,255,255,.7);
    }

    .price-hero { margin-bottom: 20px; }
    .plan-name {
      font-size: .85rem; font-weight: 500; color: rgba(255,255,255,.5);
      text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px;
    }
    .price-amount {
      display: flex; align-items: flex-end; gap: 6px;
    }
    .price-value {
      font-size: 3rem; font-weight: 700; color: #fff; line-height: 1;
    }
    .price-period {
      font-size: 1rem; color: rgba(255,255,255,.5); margin-bottom: 6px;
    }

    .billing-toggle {
      background: rgba(255,255,255,.06);
      border-radius: 10px; padding: 14px 16px;
      margin-bottom: 28px; margin-top: 8px;
    }
    .toggle-wrapper {
      display: flex; align-items: center; gap: 12px;
    }
    .toggle-switch {
      position: relative; display: inline-block; width: 40px; height: 22px;
      flex-shrink: 0;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute; inset: 0; background: rgba(255,255,255,.2);
      border-radius: 22px; cursor: pointer; transition: .3s;
    }
    .toggle-slider::before {
      content: ''; position: absolute;
      width: 16px; height: 16px; left: 3px; bottom: 3px;
      background: white; border-radius: 50%; transition: .3s;
    }
    .toggle-switch input:checked + .toggle-slider { background: #635bff; }
    .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }

    .toggle-info { flex: 1; }
    .toggle-label {
      font-size: .82rem; color: rgba(255,255,255,.7); display: block;
    }
    .savings-badge {
      display: inline-block; font-size: .7rem; font-weight: 700;
      background: #16a34a; color: #fff; border-radius: 20px;
      padding: 2px 8px; margin-top: 3px;
    }
    .annual-price-note {
      margin-top: 8px; font-size: .78rem; color: rgba(255,255,255,.4);
      text-align: right;
    }

    .left-divider {
      height: 1px; background: rgba(255,255,255,.1); margin: 16px 0;
    }

    .line-items { display: flex; flex-direction: column; gap: 10px; }
    .line-item {
      display: flex; justify-content: space-between; align-items: center;
    }
    .li-label {
      font-size: .875rem; color: rgba(255,255,255,.55);
    }
    .li-info { font-size: .75rem; cursor: help; }
    .li-value {
      font-size: .875rem; color: rgba(255,255,255,.8); font-weight: 500;
    }

    .total-due {
      display: flex; justify-content: space-between; align-items: center;
      margin: 4px 0;
    }
    .total-label { font-size: 1rem; font-weight: 700; color: #fff; }
    .total-value { font-size: 1.1rem; font-weight: 800; color: #fff; }

    .trust-row {
      margin-top: auto; padding-top: 32px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .trust-item {
      display: flex; align-items: center; gap: 7px;
      font-size: .75rem; color: rgba(255,255,255,.35);
    }
    .trust-item mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ═══════════════════════════════════════
       RIGHT PANEL
    ═══════════════════════════════════════ */
    .right-panel {
      background: #fff;
      padding: 0;
      display: flex; flex-direction: column;
    }
    .right-inner {
      padding: 40px 36px;
      display: flex; flex-direction: column; gap: 28px;
      max-width: 520px;
      width: 100%;
    }
    @media (max-width: 820px) {
      .right-inner { padding: 28px 20px; max-width: 100%; }
      .left-panel { min-height: unset; position: static; }
    }

    .section-block {}
    .section-title {
      font-size: .7rem; font-weight: 700; color: #6b7280;
      text-transform: uppercase; letter-spacing: .08em;
      margin: 0 0 12px;
    }

    /* Coordonnées */
    .info-row {
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
    }
    .info-field {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px;
    }
    .info-label { font-size: .875rem; color: #6b7280; }
    .info-value { font-size: .875rem; color: #111827; font-weight: 500; }

    /* Method tabs */
    .method-tabs {
      display: flex; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px;
      overflow: hidden; margin-bottom: 16px;
    }
    .method-tab {
      flex: 1; display: flex; align-items: center; gap: 8px;
      padding: 13px 16px; cursor: pointer; font-size: .875rem;
      color: #111827; font-weight: 500; background: #fff;
      transition: background .15s;
    }
    .method-tab.active { background: #f9fafb; }
    .method-radio-dot {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #635bff; flex-shrink: 0;
      position: relative;
    }
    .method-radio-dot::after {
      content: ''; position: absolute;
      width: 8px; height: 8px; border-radius: 50%;
      background: #635bff; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .card-icon { flex-shrink: 0; }

    /* Card form box */
    .card-form-box {
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
      margin-bottom: 16px;
    }
    .cf-label {
      font-size: .75rem; font-weight: 600; color: #374151;
      padding: 12px 16px 0;
    }
    .cf-field {
      padding: 0 16px;
    }
    .border-bottom-field {
      border-bottom: 1px solid #e5e7eb;
    }
    .cf-input {
      width: 100%; border: none; outline: none;
      font-size: .9rem; color: #111827; padding: 12px 0;
      background: transparent;
    }
    .cf-input::placeholder { color: #9ca3af; }
    .cf-err {
      display: block; font-size: .72rem; color: #ef4444;
      padding-bottom: 8px;
    }

    .cf-stripe-wrap {
      padding: 12px 16px;
    }

    .stripe-loading-row {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; font-size: .85rem; color: #9ca3af;
    }

    /* Subscribe button */
    .subscribe-btn {
      width: 100%; padding: 15px;
      background: #0a0a1a; color: #fff;
      border: none; border-radius: 8px;
      font-size: .95rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 8px;
      transition: background .2s, transform .1s;
      box-shadow: 0 2px 8px rgba(10,10,26,.3);
      margin-bottom: 12px;
    }
    .subscribe-btn:hover:not(:disabled) { background: #1a1a3e; transform: translateY(-1px); }
    .subscribe-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }

    .stripe-legal {
      font-size: .72rem; color: #9ca3af; text-align: center;
      line-height: 1.5; margin: 0 0 20px;
    }
    .stripe-legal a { color: #635bff; text-decoration: none; }
    .stripe-legal a:hover { text-decoration: underline; }

    .powered-row {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; font-size: .72rem; color: #9ca3af;
    }

    /* Coupon */
    .coupon-block { margin: 16px 0; }
    .coupon-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
    .coupon-row { display: flex; gap: 8px; }
    .coupon-input {
      flex: 1; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px;
      font-size: 14px; font-family: monospace; text-transform: uppercase; letter-spacing: .05em;
      outline: none; transition: border-color .15s;
    }
    .coupon-input:focus { border-color: #635bff; }
    .coupon-input:disabled { background: #f9fafb; color: #9ca3af; }
    .coupon-btn {
      padding: 10px 18px; background: #1a1a2e; color: #fff;
      border: none; border-radius: 8px; font-weight: 600; font-size: 13px;
      cursor: pointer; transition: background .15s; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
    }
    .coupon-btn:hover { background: #635bff; }
    .coupon-btn:disabled { opacity: .6; cursor: not-allowed; }
    .coupon-remove-btn {
      padding: 10px 16px; background: #f3f4f6; color: #6b7280;
      border: 1.5px solid #e5e7eb; border-radius: 8px; font-weight: 600;
      font-size: 13px; cursor: pointer; white-space: nowrap;
    }
    .coupon-remove-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .coupon-success {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
      color: #059669; font-size: 13px; font-weight: 600;
    }
    .coupon-success mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .coupon-error {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
      color: #dc2626; font-size: 13px; font-weight: 600;
    }
    .coupon-error mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .err-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; color: #dc2626;
      border: 1px solid #fecaca; border-radius: 8px;
      padding: 12px 16px; font-size: .85rem; font-weight: 600;
      margin-bottom: 14px;
    }
    .err-banner mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* ═══════════════════════════════════════
       CONFIRM MODAL
    ═══════════════════════════════════════ */
    .confirm-overlay {
      position: fixed; inset: 0; background: rgba(10,10,26,.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; backdrop-filter: blur(4px);
    }
    .confirm-modal {
      background: #fff; border-radius: 16px; padding: 40px 36px;
      max-width: 420px; width: 90%; text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,.2);
      animation: slideUp .2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .confirm-icon-wrap {
      width: 60px; height: 60px; border-radius: 50%;
      background: #eff6ff; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 20px;
    }
    .confirm-icon-wrap mat-icon {
      font-size: 30px; width: 30px; height: 30px; color: #635bff;
    }
    .confirm-title { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 10px; }
    .confirm-desc  { font-size: .9rem; color: #4b5563; margin: 0 0 6px; line-height: 1.6; }
    .confirm-sub   { font-size: .8rem; color: #9ca3af; margin: 0 0 28px; }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .btn-cancel {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 22px; border-radius: 8px;
      border: 1px solid #e5e7eb; background: #f9fafb;
      color: #6b7280; font-weight: 600; font-size: .875rem;
      cursor: pointer; transition: all .15s;
    }
    .btn-cancel:hover { background: #f3f4f6; }
    .btn-cancel mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .btn-confirm {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 24px; border-radius: 8px; border: none;
      background: #0a0a1a; color: #fff;
      font-weight: 700; font-size: .875rem;
      cursor: pointer; transition: all .15s;
      box-shadow: 0 2px 8px rgba(10,10,26,.3);
    }
    .btn-confirm:hover { background: #1a1a3e; transform: translateY(-1px); }
    .btn-confirm mat-icon { font-size: 16px; width: 16px; height: 16px; }
  </style>
  `,
})
export class PaymentComponent implements OnInit, OnDestroy {
  isSubmitting  = signal(false);
  stripeLoading = signal(true);
  errorMessage  = signal<string | null>(null);
  stripeError   = signal<string | null>(null);
  showConfirm   = signal(false);

  // Coupon
  couponCode    = '';
  couponLoading = signal(false);
  couponApplied = signal(false);
  couponResult  = signal<any>(null);

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
    if (s.plan.onRequest) return 'Sur devis';
    const price = s.billingCycle === 'monthly' ? s.plan.monthlyPrice! : s.plan.annualPrice!;
    return `${price},000 DT`;
  }

  priceValue(): string {
    const s = this.checkoutState.checkoutState();
    if (!s || s.plan.onRequest) return '—';
    const price = s.billingCycle === 'monthly' ? s.plan.monthlyPrice! : s.plan.annualPrice!;
    return `${price},000 DT`;
  }

  annualSavings(): number {
    const s = this.checkoutState.checkoutState();
    if (!s || s.plan.onRequest || !s.plan.monthlyPrice || !s.plan.annualPrice) return 0;
    const monthly = s.plan.monthlyPrice * 12;
    const annual  = s.plan.annualPrice  * 12;
    return Math.max(0, monthly - annual);
  }

  annualMonthly(): string {
    const s = this.checkoutState.checkoutState();
    if (!s || !s.plan.annualPrice) return '';
    return `${s.plan.annualPrice}`;
  }

  onCycleToggle(_event: Event, _s: any) {
    // Toggle billing cycle in state if the service allows mutation
    // This is a display-only toggle; actual cycle was set during checkout
  }

  async ngOnInit() {
    if (!this.checkoutState.hasState()) {
      this.router.navigate(['/billing/pricing']);
      return;
    }

    this.stripe = await loadStripe(environment.stripePublishableKey);
    if (!this.stripe) {
      this.stripeLoading.set(false);
      this.errorMessage.set('Impossible de charger Stripe. Veuillez rafraîchir la page.');
      return;
    }

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
            ? `Échec d'initialisation du paiement : ${msg}`
            : 'Impossible de contacter le serveur de paiement. Vérifiez que le backend tourne sur le port 8084.'
        );
      }
    });
  }

  private mountCardElement() {
    const elements = this.stripe!.elements();
    this.cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '15px',
          color: '#111827',
          fontFamily: 'inherit',
          '::placeholder': { color: '#9ca3af' },
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

  // ── Coupon methods ───────────────────────────────────────────────────────

  applyCoupon() {
    if (!this.couponCode.trim()) return;
    const s = this.checkoutState.checkoutState();
    if (!s) return;
    const price = s.billingCycle === 'monthly' ? s.plan.monthlyPrice! : s.plan.annualPrice!;
    const amountCents = Math.round(price * 100);

    this.couponLoading.set(true);
    this.billing.validateCoupon(this.couponCode.trim(), amountCents).subscribe({
      next: (res: any) => {
        this.couponLoading.set(false);
        this.couponResult.set(res);
        if (res.valid) {
          this.couponApplied.set(true);
        }
      },
      error: () => {
        this.couponLoading.set(false);
        this.couponResult.set({ valid: false, message: 'Could not validate coupon. Try again.' });
      }
    });
  }

  removeCoupon() {
    this.couponCode    = '';
    this.couponResult.set(null);
    this.couponApplied.set(false);
  }

  couponSavingDisplay(): string {
    const r = this.couponResult();
    if (!r || !r.discountCents) return '0,000 DT';
    return (r.discountCents / 100).toFixed(3) + ' DT';
  }

  discountedTotalDisplay(): string {
    const s = this.checkoutState.checkoutState();
    if (!s) return '';
    if (s.plan.onRequest) return 'Sur devis';
    const price = s.billingCycle === 'monthly' ? s.plan.monthlyPrice! : s.plan.annualPrice!;
    const r = this.couponResult();
    if (r?.valid && r.finalAmountCents != null) {
      return (r.finalAmountCents / 100).toFixed(3) + ' DT';
    }
    return price.toFixed(3) + ' DT';
  }

  requestConfirm() {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }
    this.showConfirm.set(true);
  }

  confirmAndPay() {
    this.showConfirm.set(false);
    this.submit();
  }

  async submit() {
    if (this.payForm.invalid || !this.checkoutState.hasState() || !this.stripe || !this.cardElement || !this.clientSecret) {
      this.payForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const cardHolder = this.payForm.value.cardHolder!;

    const { error, paymentIntent } = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: { name: cardHolder },
      },
    });

    if (error) {
      this.isSubmitting.set(false);
      this.errorMessage.set(error.message ?? 'Paiement échoué. Veuillez réessayer.');
      const s = this.checkoutState.checkoutState();
      if (s) {
        this.billing.recordFailedPayment({
          planId:         s.plan.id,
          orgName:        s.orgName,
          adminEmail:     s.adminEmail,
          billingCycle:   s.billingCycle,
          orgType:        s.orgType,
          failureCode:    error.code ?? 'card_error',
          failureMessage: error.message ?? 'Payment failed',
        }).subscribe();
      }
      return;
    }

    if (paymentIntent?.status !== 'succeeded') {
      this.isSubmitting.set(false);
      this.errorMessage.set('Paiement non complété. Statut : ' + paymentIntent?.status);
      return;
    }

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
      studentCount:          s.studentCount,
      cardHolder:            cardHolder,
      cardNumber:            '****',
      expiryDate:            '**/**',
      cvv:                   '***',
      stripePaymentIntentId: paymentIntent.id,
      couponCode: this.couponApplied() ? this.couponCode.trim().toUpperCase() : undefined,
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
        this.errorMessage.set(msg ?? 'Paiement confirmé par Stripe mais la configuration du compte a échoué. Contactez le support.');
      }
    });
  }

  ngOnDestroy() {
    this.cardElement?.destroy();
  }

  goBack()      { this.router.navigate(['/billing/checkout']); }
  goToPricing() { this.router.navigate(['/billing/pricing']); }
}
