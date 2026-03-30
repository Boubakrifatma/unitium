import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaymentResponse } from '../../models/billing.models';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-payment-confirmation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
  <div class="conf-page">
    <div class="container py-5" style="max-width:600px">
      <div class="conf-card">

        <!-- ── CAS 1 : Utilisateur DÉJÀ CONNECTÉ (upgrade depuis l'app) ── -->
        @if (isLoggedIn) {

          <!-- Icône succès -->
          <div class="success-icon-wrap">
            <div class="success-circle">
              <mat-icon>check_circle</mat-icon>
            </div>
          </div>

          <h2 class="conf-title">Subscription Updated!</h2>
          <p class="conf-subtitle">
            Your plan has been successfully upgraded to
            <strong>{{ payment()?.planName ?? 'your new plan' }}</strong>.
            Your subscription is now active.
          </p>

          <!-- Résumé de la mise à jour -->
          <div class="update-summary">
            <div class="sum-row" *ngIf="payment()?.planName">
              <mat-icon class="material-icons-outlined sum-icon">workspace_premium</mat-icon>
              <span class="sum-label">New Plan</span>
              <strong class="sum-val">{{ payment()!.planName }}</strong>
            </div>
            <div class="sum-row" *ngIf="payment()?.amount">
              <mat-icon class="material-icons-outlined sum-icon">payments</mat-icon>
              <span class="sum-label">Amount</span>
              <strong class="sum-val">\${{ payment()!.amount | number:'1.2-2' }} {{ payment()!.currency }}</strong>
            </div>
            <div class="sum-row" *ngIf="payment()?.paymentId">
              <mat-icon class="material-icons-outlined sum-icon">tag</mat-icon>
              <span class="sum-label">Transaction ID</span>
              <code class="sum-code">{{ payment()!.paymentId }}</code>
            </div>
          </div>

          <!-- Retour au billing -->
          <div class="text-center mt-4">
            <button mat-flat-button color="primary" class="action-btn" (click)="goToBilling()">
              <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
              Return to My Billing
            </button>
          </div>
        }

        <!-- ── CAS 2 : Utilisateur NON CONNECTÉ (premier achat) ── -->
        @else {

          <!-- Icône email -->
          <div class="success-icon-wrap">
            <div class="success-circle pending">
              <mat-icon>mark_email_read</mat-icon>
            </div>
          </div>

          <h2 class="conf-title">Payment Received!</h2>

          <p class="conf-main-text">
            Your payment has been successfully recorded.
            Your organisation account has been created and is now active.
          </p>

          <!-- Check inbox -->
          <div class="conf-inbox-row">
            <mat-icon class="inbox-icon">mark_email_read</mat-icon>
            <div>
              <p class="inbox-title">Check your inbox!</p>
              <p class="inbox-body">
                We have sent a confirmation email with your login credentials
                (email + default password). Please log in and change your password on first access.
              </p>
            </div>
          </div>

          <!-- Transaction ID -->
          @if (payment()?.paymentId) {
            <p class="tx-id">
              Transaction ID: <span class="tx-code">{{ payment()!.paymentId }}</span>
            </p>
          }

          <!-- Go to login -->
          <div class="text-center mt-4">
            <button mat-flat-button color="primary" class="action-btn" (click)="goToLogin()">
              Go to Login &nbsp;→
            </button>
          </div>
        }

      </div>
    </div>
  </div>
  `,
  styles: [`
    .conf-page {
      min-height: 80vh; background: #f0f4fa;
      display: flex; align-items: center;
    }
    .conf-card {
      background: #fff; border-radius: 20px;
      padding: 40px 44px; box-shadow: 0 4px 32px rgba(0,0,0,.10);
    }

    /* Success icon */
    .success-icon-wrap { text-align: center; margin-bottom: 24px; }
    .success-circle {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #059669, #047857);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto;
      box-shadow: 0 4px 18px rgba(5,150,105,.35);
    }
    .success-circle.pending {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 18px rgba(37,99,235,.35);
    }
    .success-circle mat-icon { color: #fff; font-size: 34px; width: 34px; height: 34px; }

    /* Titles */
    .conf-title { text-align: center; font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; }
    .conf-subtitle { text-align: center; color: #64748b; font-size: .95rem; line-height: 1.6; margin-bottom: 24px; }

    /* Update summary */
    .update-summary { background: #f0fdf4; border-radius: 14px; padding: 16px 20px; margin-bottom: 8px; }
    .sum-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #d1fae5; }
    .sum-row:last-child { border-bottom: none; }
    .sum-icon { font-size: 18px; width: 18px; height: 18px; color: #059669; flex-shrink: 0; }
    .sum-label { font-size: 13px; color: #64748b; flex: 1; }
    .sum-val { font-size: 14px; font-weight: 700; color: #1e293b; }
    .sum-code { font-family: monospace; font-size: 13px; color: #2563eb; font-weight: 700; }

    /* Inbox notice (non-logged) */
    .conf-main-text { font-size: .975rem; color: #1e293b; line-height: 1.65; margin-bottom: 24px; }
    .conf-inbox-row {
      display: flex; align-items: flex-start; gap: 14px;
      background: #f8fafc; border-radius: 12px;
      padding: 16px 18px; margin-bottom: 20px;
    }
    .inbox-icon { color: #1e293b; font-size: 22px; flex-shrink: 0; margin-top: 2px; }
    .inbox-title { font-weight: 700; font-size: .9rem; color: #1e293b; margin-bottom: 4px; }
    .inbox-body { font-size: .83rem; color: #64748b; line-height: 1.55; margin: 0; }

    /* Transaction ID */
    .tx-id { text-align: center; font-size: .83rem; color: #94a3b8; margin-bottom: 0; }
    .tx-code { font-weight: 700; color: #2563eb; font-family: monospace; letter-spacing: .5px; }

    /* Button */
    .action-btn {
      border-radius: 50px !important;
      padding: 10px 36px !important;
      font-weight: 700 !important;
      font-size: .9rem !important;
    }
  `],
})
export class PaymentConfirmationComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  payment = signal<PaymentResponse | null>(null);

  /** True si l'utilisateur était déjà connecté quand il a fait le paiement (upgrade) */
  get isLoggedIn(): boolean {
    // Only consider it an "upgrade" if:
    // 1. User is logged in AND
    // 2. Payment data exists (not a first-time purchase)
    const hasPaymentData = !!this.payment();
    const isAuthenticated = !!this.authService.getToken() && !!this.authService.currentUser();
    return isAuthenticated && hasPaymentData;
  }

  ngOnInit() {
    // Récupérer les données du paiement depuis la navigation state
    const nav = this.router.getCurrentNavigation();
    const st = nav?.extras?.state as any;
    if (st?.payment) {
      this.payment.set(st.payment);
      return;
    }
    // Fallback : history.state (rechargement page)
    const hist = history.state;
    if (hist?.payment) {
      this.payment.set(hist.payment);
    }
  }

  /** Retour au billing de l'org (utilisateur connecté) */
  goToBilling(): void {
    this.router.navigate(['/app/org-billing']);
  }

  /** Redirection vers login (premier achat, pas encore connecté) */
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
