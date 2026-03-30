import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { BillingService } from '../../services/billing.service';
import { PaymentResponse } from '../../models/billing.models';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule, MatChipsModule,
    MatInputModule, MatFormFieldModule, MatProgressSpinnerModule,
    MatDialogModule, MatSelectModule,
  ],
  template: `
  <div class="admin-page">
    <div class="admin-container">

      <!-- Header -->
      <div class="admin-header">
        <div>
          <h1 class="admin-title">
            <mat-icon class="title-icon">account_balance_wallet</mat-icon>
            Pending Payments
          </h1>
          <p class="admin-subtitle">Review and validate subscription payment requests</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="loadPayments()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
          <div class="filter-tabs">
            <button [class.active]="filter() === 'all'" (click)="setFilter('all')">All ({{ allPayments().length }})</button>
            <button [class.active]="filter() === 'PENDING'" (click)="setFilter('PENDING')">
              Pending ({{ countByStatus('PENDING') }})
            </button>
            <button [class.active]="filter() === 'CONFIRMED'" (click)="setFilter('CONFIRMED')">Confirmed</button>
            <button [class.active]="filter() === 'REJECTED'" (click)="setFilter('REJECTED')">Rejected</button>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-card pending">
          <mat-icon>hourglass_empty</mat-icon>
          <div>
            <span class="stat-num">{{ countByStatus('PENDING') }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>
        <div class="stat-card confirmed">
          <mat-icon>check_circle</mat-icon>
          <div>
            <span class="stat-num">{{ countByStatus('CONFIRMED') }}</span>
            <span class="stat-label">Confirmed</span>
          </div>
        </div>
        <div class="stat-card rejected">
          <mat-icon>cancel</mat-icon>
          <div>
            <span class="stat-num">{{ countByStatus('REJECTED') }}</span>
            <span class="stat-label">Rejected</span>
          </div>
        </div>
        <div class="stat-card revenue">
          <mat-icon>attach_money</mat-icon>
          <div>
            <span class="stat-num">\${{ totalRevenue() | number:'1.0-0' }}</span>
            <span class="stat-label">Revenue Confirmed</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-box">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading payments...</p>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="error-box">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
        </div>
      }

      <!-- Payment cards -->
      @if (!loading()) {
        @if (filteredPayments().length === 0) {
          <div class="empty-box">
            <mat-icon>inbox</mat-icon>
            <p>No payments found</p>
          </div>
        }

        @for (p of filteredPayments(); track p.paymentId) {
          <div class="payment-card" [class.card-pending]="p.status === 'PENDING'"
               [class.card-confirmed]="p.status === 'CONFIRMED'"
               [class.card-rejected]="p.status === 'REJECTED'">

            <!-- Card Header -->
            <div class="card-head">
              <div class="card-id">
                <code>{{ p.paymentId }}</code>
                <span class="status-badge" [class]="'badge-' + p.status.toLowerCase()">
                  {{ p.status }}
                </span>
              </div>
              <div class="card-amount">
                <span class="amount">\${{ p.amount | number:'1.2-2' }}</span>
                <span class="currency">{{ p.currency }}</span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Plan</span>
                  <span class="info-value plan-badge">{{ p.planName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Organization</span>
                  <span class="info-value">{{ p.orgName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Admin Email</span>
                  <span class="info-value email-val">{{ p.adminEmail }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Billing Cycle</span>
                  <span class="info-value">{{ p.billingCycle | titlecase }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Users</span>
                  <span class="info-value">{{ p.numUsers }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Org Type</span>
                  <span class="info-value">{{ p.orgType | titlecase }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Submitted</span>
                  <span class="info-value">{{ p.createdAt | date:'dd MMM yyyy HH:mm' }}</span>
                </div>
                @if (p.phone) {
                  <div class="info-item">
                    <span class="info-label">Phone</span>
                    <span class="info-value">{{ p.phone }}</span>
                  </div>
                }
              </div>

              @if (p.address) {
                <div class="info-item full-width">
                  <span class="info-label">Address</span>
                  <span class="info-value">{{ p.address }}</span>
                </div>
              }
            </div>

            <!-- Card Actions (only for PENDING) -->
            @if (p.status === 'PENDING') {
              <div class="card-actions">
                <button class="btn-confirm" (click)="confirmPayment(p)"
                        [disabled]="actionLoading() === p.paymentId">
                  @if (actionLoading() === p.paymentId + '-confirm') {
                    <mat-spinner diameter="18"></mat-spinner>
                  } @else {
                    <mat-icon>check_circle</mat-icon>
                  }
                  Approve & Send Access Email
                </button>
                <button class="btn-reject" (click)="openRejectDialog(p)"
                        [disabled]="actionLoading() === p.paymentId">
                  <mat-icon>cancel</mat-icon>
                  Reject
                </button>
              </div>
            }

            @if (p.status === 'CONFIRMED') {
              <div class="confirmed-footer">
                <mat-icon>mark_email_read</mat-icon>
                Access email sent to {{ p.adminEmail }}
              </div>
            }
            @if (p.status === 'REJECTED') {
              <div class="rejected-footer">
                <mat-icon>do_not_disturb</mat-icon>
                Rejected · Rejection email sent
              </div>
            }
          </div>
        }
      }

    </div>
  </div>

  <!-- Reject Modal -->
  @if (rejectTarget()) {
    <div class="modal-overlay" (click)="closeRejectDialog()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <h3>Reject Payment</h3>
        <p>Payment ID: <code>{{ rejectTarget()!.paymentId }}</code></p>
        <p>Organization: <strong>{{ rejectTarget()!.orgName }}</strong></p>
        <label>Rejection Reason *</label>
        <textarea [(ngModel)]="rejectReason" rows="3" placeholder="e.g. Invalid card information, please contact us"></textarea>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="closeRejectDialog()">Cancel</button>
          <button class="btn-reject-confirm" (click)="confirmReject()"
                  [disabled]="!rejectReason.trim() || actionLoading()">
            @if (actionLoading()) {
              <mat-spinner diameter="18"></mat-spinner>
            }
            Reject & Notify Client
          </button>
        </div>
      </div>
    </div>
  }

  <style>
    .admin-page {
      min-height: 100vh;
      background: #f0f4fa;
      padding: 32px 16px;
    }
    .admin-container {
      max-width: 960px;
      margin: 0 auto;
    }
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 28px;
    }
    .admin-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px;
    }
    .title-icon { color: #2563eb; font-size: 28px !important; }
    .admin-subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

    .filter-tabs { display: flex; background: #e2e8f0; border-radius: 8px; padding: 3px; gap: 2px; }
    .filter-tabs button {
      border: none; background: transparent; padding: 6px 14px; border-radius: 6px;
      font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; white-space: nowrap;
    }
    .filter-tabs button.active { background: #fff; color: #2563eb; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.1); }

    /* Stats */
    .stats-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-card {
      flex: 1; min-width: 120px;
      display: flex; align-items: center; gap: 12px;
      background: #fff; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,.06);
    }
    .stat-card mat-icon { font-size: 28px; opacity: .7; }
    .stat-card.pending mat-icon { color: #f59e0b; }
    .stat-card.confirmed mat-icon { color: #059669; }
    .stat-card.rejected mat-icon { color: #dc2626; }
    .stat-card.revenue mat-icon { color: #2563eb; }
    .stat-num { display: block; font-size: 22px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 12px; color: #94a3b8; }

    /* Payment cards */
    .payment-card {
      background: #fff;
      border-radius: 14px;
      margin-bottom: 16px;
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      overflow: hidden;
      border-left: 4px solid #e2e8f0;
      transition: box-shadow .2s;
    }
    .payment-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,.1); }
    .card-pending { border-left-color: #f59e0b; }
    .card-confirmed { border-left-color: #059669; }
    .card-rejected { border-left-color: #dc2626; }

    .card-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; border-bottom: 1px solid #f1f5f9;
    }
    .card-id { display: flex; align-items: center; gap: 12px; }
    .card-id code { font-size: 15px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 4px 10px; border-radius: 6px; }
    .status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-confirmed { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    .card-amount { text-align: right; }
    .amount { font-size: 22px; font-weight: 700; color: #1e293b; }
    .currency { font-size: 12px; color: #94a3b8; margin-left: 4px; }

    .card-body { padding: 16px 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 2px; }
    .info-item.full-width { grid-column: 1 / -1; }
    .info-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
    .info-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .email-val { color: #2563eb; }
    .plan-badge { color: #7c3aed; background: #f3f0ff; padding: 2px 8px; border-radius: 4px; font-size: 12px; width: fit-content; }

    /* Actions */
    .card-actions { display: flex; gap: 10px; padding: 14px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
    .btn-confirm {
      display: flex; align-items: center; gap: 6px;
      background: #059669; color: #fff; border: none; border-radius: 8px;
      padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer;
      transition: background .2s;
    }
    .btn-confirm:hover:not(:disabled) { background: #047857; }
    .btn-confirm:disabled { opacity: .6; cursor: not-allowed; }
    .btn-reject {
      display: flex; align-items: center; gap: 6px;
      background: transparent; color: #dc2626; border: 2px solid #dc2626; border-radius: 8px;
      padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .btn-reject:hover:not(:disabled) { background: #fee2e2; }

    .confirmed-footer, .rejected-footer {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 24px; font-size: 13px;
    }
    .confirmed-footer { background: #f0fdf4; color: #059669; border-top: 1px solid #d1fae5; }
    .rejected-footer { background: #fff5f5; color: #dc2626; border-top: 1px solid #fee2e2; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-box {
      background: #fff; border-radius: 16px; padding: 32px; width: 440px;
      max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,.2);
    }
    .modal-box h3 { margin: 0 0 16px; font-size: 18px; color: #1e293b; }
    .modal-box label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin: 12px 0 6px; }
    .modal-box textarea {
      width: 100%; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
      font-size: 14px; resize: vertical; outline: none; box-sizing: border-box;
    }
    .modal-box textarea:focus { border-color: #2563eb; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel {
      background: #f1f5f9; border: none; border-radius: 8px; padding: 10px 20px;
      font-weight: 600; cursor: pointer; color: #475569;
    }
    .btn-reject-confirm {
      display: flex; align-items: center; gap: 6px;
      background: #dc2626; color: #fff; border: none; border-radius: 8px;
      padding: 10px 24px; font-weight: 700; cursor: pointer;
    }
    .btn-reject-confirm:disabled { opacity: .6; cursor: not-allowed; }

    .loading-box, .error-box, .empty-box {
      text-align: center; padding: 60px 20px; background: #fff; border-radius: 14px;
    }
    .loading-box mat-spinner, .error-box mat-icon, .empty-box mat-icon {
      margin: 0 auto 12px;
    }
    .error-box mat-icon { font-size: 40px; color: #dc2626; }
    .empty-box mat-icon { font-size: 48px; color: #cbd5e1; }
  </style>
  `,
})
export class AdminPaymentsComponent implements OnInit {

  allPayments = signal<(PaymentResponse & { orgName?: string; orgType?: string; billingCycle?: string; phone?: string; numUsers?: number; address?: string })[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  filter = signal<string>('all');
  actionLoading = signal<string | null>(null);

  rejectTarget = signal<PaymentResponse | null>(null);
  rejectReason = '';

  constructor(private billing: BillingService) {}

  ngOnInit() { this.loadPayments(); }

  loadPayments() {
    this.loading.set(true);
    this.error.set(null);
    this.billing.getAllPayments().subscribe({
      next: (payments) => { this.allPayments.set(payments as any); this.loading.set(false); },
      error: (err) => {
        this.error.set('Failed to load payments. Is the backend running on port 8084?');
        this.loading.set(false);
      }
    });
  }

  filteredPayments() {
    const f = this.filter();
    if (f === 'all') return this.allPayments();
    return this.allPayments().filter(p => p.status === f);
  }

  countByStatus(status: string) {
    return this.allPayments().filter(p => p.status === status).length;
  }

  totalRevenue() {
    return this.allPayments()
      .filter(p => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  setFilter(f: string) { this.filter.set(f); }

  confirmPayment(p: any) {
    this.actionLoading.set(p.paymentId + '-confirm');
    this.billing.confirmPayment(p.paymentId).subscribe({
      next: (updated) => {
        this.allPayments.update(list =>
          list.map(item => item.paymentId === p.paymentId ? { ...item, status: 'CONFIRMED' } : item)
        );
        this.actionLoading.set(null);
      },
      error: (err) => {
        alert('Error: ' + (err.error?.error || 'Could not confirm payment'));
        this.actionLoading.set(null);
      }
    });
  }

  openRejectDialog(p: any) {
    this.rejectTarget.set(p);
    this.rejectReason = '';
  }

  closeRejectDialog() { this.rejectTarget.set(null); }

  confirmReject() {
    const target = this.rejectTarget();
    if (!target || !this.rejectReason.trim()) return;
    this.actionLoading.set(target.paymentId);
    this.billing.rejectPayment(target.paymentId, this.rejectReason).subscribe({
      next: () => {
        this.allPayments.update(list =>
          list.map(item => item.paymentId === target.paymentId ? { ...item, status: 'REJECTED' } : item)
        );
        this.actionLoading.set(null);
        this.closeRejectDialog();
      },
      error: (err) => {
        alert('Error: ' + (err.error?.error || 'Could not reject payment'));
        this.actionLoading.set(null);
      }
    });
  }
}
