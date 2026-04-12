import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js/auto';
Chart.register(...registerables);
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrgBillingService, PlanDTO, InvoiceDTO, PaymentAttemptDTO, UsageQuotaDTO } from '../../../billing/services/org-billing.service';
import { BillingService } from '../../../billing/services/billing.service';
import { PaymentResponse } from '../../../billing/models/billing.models';

@Component({
  selector: 'app-super-admin-billing',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatTooltipModule, FormsModule, RouterModule
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">Billing Management</h3>
            <p class="small opacity-50">Platform-wide billing, plans & revenue overview</p>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">

      <!-- Stats -->
      <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-blue"><mat-icon class="material-icons-outlined">inventory_2</mat-icon></div>
              <p class="stat-label">Active Plans</p>
              <h3 class="stat-val">{{ plans.length }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-green"><mat-icon class="material-icons-outlined">receipt_long</mat-icon></div>
              <p class="stat-label">Total Invoices</p>
              <h3 class="stat-val">{{ allInvoices.length }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-yellow"><mat-icon class="material-icons-outlined">payments</mat-icon></div>
              <p class="stat-label">Total Revenue</p>
              <h3 class="stat-val">\${{ totalRevenue | number:'1.0-0' }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-purple"><mat-icon class="material-icons-outlined">business</mat-icon></div>
              <p class="stat-label">Organisations</p>
              <h3 class="stat-val">{{ confirmedPayments }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Tabs -->
      <mat-card>
        <mat-card-content class="p-0">
          <mat-tab-group animationDuration="200ms" [dynamicHeight]="true" (selectedTabChange)="onTabChange($event.index)">

            <!-- TAB 1 : PLANS (CRUD) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">inventory_2</mat-icon>
                Plans <span class="tab-badge">{{ plans.length }}</span>
              </ng-template>
              <div class="tab-content">

                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">Subscription Plans</h4>
                    <p class="text-secondary small mb-0">Create and manage all subscription tiers — read/write</p>
                  </div>
                  <button mat-flat-button color="primary" (click)="openAddPlan()">
                    <mat-icon>add</mat-icon> New Plan
                  </button>
                </div>

                <div class="row gx-3 gx-lg-4 mt-3">
                  <div class="col-12 col-md-6 col-xl-4" *ngFor="let p of plans">
                    <mat-card class="plan-card mb-3">
                      <mat-card-content>
                        <div class="plan-head">
                          <div>
                            <h4 class="mb-0">{{ p.displayName }}</h4>
                            <code class="text-secondary" style="font-size:11px">{{ p.name }}</code>
                          </div>
                          <span class="pill" [class]="p.isActive ? 'pill-green' : 'pill-red'">
                            {{ p.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </div>

                        <div class="price-row">
                          <div class="price-box">
                            <span class="price-lbl">Monthly</span>
                            <span class="price-val">\${{ p.priceMonthly }}</span>
                          </div>
                          <div class="price-box">
                            <span class="price-lbl">Annual/mo</span>
                            <span class="price-val">\${{ p.priceYearly }}</span>
                          </div>
                        </div>

                        <div class="plan-meta">
                          <div class="meta-row"><mat-icon class="material-icons-outlined">storage</mat-icon>{{ (p.storageMb/1024)|number:'1.0-0' }} GB storage</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">psychology</mat-icon>ML: {{ p.mlTier }}</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">support_agent</mat-icon>Support: {{ p.supportTier }}</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">lock_open</mat-icon>API: {{ p.apiAccess ? 'Yes':'No' }} · SSO: {{ p.ssoEnabled ? 'Yes':'No' }}</div>
                        </div>

                        <div class="plan-actions">
                          <button mat-stroked-button class="action-btn" (click)="editPlan(p)">
                            <mat-icon class="material-icons-outlined">edit</mat-icon> Edit
                          </button>
                          <button mat-icon-button
                                  [matTooltip]="p.isActive ? 'Deactivate plan' : 'Activate plan'"
                                  [class]="p.isActive ? 'btn-danger-icon' : 'btn-success-icon'"
                                  (click)="togglePlan(p)">
                            <mat-icon class="material-icons-outlined">{{ p.isActive ? 'block' : 'check_circle' }}</mat-icon>
                          </button>
                        </div>
                      </mat-card-content>
                    </mat-card>
                  </div>

                  <div class="col-12" *ngIf="plans.length === 0">
                    <div class="empty-state">
                      <mat-icon class="material-icons-outlined">inventory_2</mat-icon>
                      <p>No plans yet. They are created automatically when an organisation pays.</p>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 2 : INVOICES (READ ONLY - global) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">receipt_long</mat-icon>
                Invoices <span class="tab-badge">{{ allInvoices.length }}</span>
                @if (securityAlerts.length > 0) {
                  <span class="tab-badge tab-badge-danger">{{ securityAlerts.length }} ⚠</span>
                }
              </ng-template>
              <div class="tab-content">

                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">All Platform Invoices</h4>
                    <p class="text-secondary small mb-0">Global audit — read only (legal documents, cannot be modified)</p>
                  </div>
                  <span class="pill pill-blue">READ ONLY</span>
                </div>

                <div class="table-responsive mt-3">
                  <table mat-table [dataSource]="invoicesDS" class="bg-none w-100">
                    <ng-container matColumnDef="number">
                      <th mat-header-cell *matHeaderCellDef>Invoice #</th>
                      <td mat-cell *matCellDef="let i" class="py-2"><strong>{{ i.invoiceNumber }}</strong></td>
                    </ng-container>
                    <ng-container matColumnDef="plan">
                      <th mat-header-cell *matHeaderCellDef>Plan</th>
                      <td mat-cell *matCellDef="let i">
                        <span class="pill pill-blue">{{ i.planName ?? '—' }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="subtotal">
                      <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                      <td mat-cell *matCellDef="let i">\${{ i.subtotal | number:'1.2-2' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="tax">
                      <th mat-header-cell *matHeaderCellDef>Tax</th>
                      <td mat-cell *matCellDef="let i" class="text-secondary">\${{ i.taxAmount | number:'1.2-2' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef>Total</th>
                      <td mat-cell *matCellDef="let i"><strong>\${{ i.total | number:'1.2-2' }} {{ i.currency }}</strong></td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let i">
                        <span class="pill" [class]="getInvClass(i.status)">{{ i.status }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="period">
                      <th mat-header-cell *matHeaderCellDef>Period</th>
                      <td mat-cell *matCellDef="let i" class="text-secondary small">
                        {{ i.billingPeriodStart | date:'dd/MM/yy' }} → {{ i.billingPeriodEnd | date:'dd/MM/yy' }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="paidAt">
                      <th mat-header-cell *matHeaderCellDef>Paid At</th>
                      <td mat-cell *matCellDef="let i" class="small text-secondary">
                        {{ i.paidAt ? (i.paidAt | date:'dd MMM yyyy') : '—' }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="pdf">
                      <th mat-header-cell *matHeaderCellDef>PDF</th>
                      <td mat-cell *matCellDef="let i">
                        <button mat-icon-button matTooltip="Download invoice PDF"
                                (click)="downloadInvoicePdf(i)">
                          <mat-icon class="material-icons-outlined" style="color:#dc2626">picture_as_pdf</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="invCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: invCols"></tr>
                  </table>
                </div>

                <div class="empty-state" *ngIf="allInvoices.length === 0">
                  <mat-icon class="material-icons-outlined">receipt_long</mat-icon>
                  <p>No invoices yet. They are generated automatically on payment.</p>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 3 : PAYMENT HISTORY (READ ONLY) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">payments</mat-icon>
                Payments <span class="tab-badge">{{ payments.length }}</span>
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">Payment Attempts</h4>
                    <p class="text-secondary small mb-0">All organisation payments — read only for audit</p>
                  </div>
                  <span class="pill pill-blue">READ ONLY</span>
                </div>

                <div class="table-responsive mt-3">
                  <table mat-table [dataSource]="paymentsDS" class="bg-none w-100">
                    <ng-container matColumnDef="org">
                      <th mat-header-cell *matHeaderCellDef>Organisation</th>
                      <td mat-cell *matCellDef="let p" class="py-2">
                        <h5 class="mb-0">{{ p.orgName ?? '—' }}</h5>
                        <p class="text-secondary small mb-0">{{ p.adminEmail }}</p>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="plan">
                      <th mat-header-cell *matHeaderCellDef>Plan</th>
                      <td mat-cell *matCellDef="let p">
                        <span class="pill pill-blue">{{ p.planName }}</span>
                        <p class="text-secondary small mb-0">{{ p.billingCycle }}</p>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="amount">
                      <th mat-header-cell *matHeaderCellDef>Amount</th>
                      <td mat-cell *matCellDef="let p"><strong>\${{ p.amount | number:'1.2-2' }}</strong></td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let p">
                        <span class="pill" [class]="getPayStatus(p.status)">{{ p.status }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="id">
                      <th mat-header-cell *matHeaderCellDef>ID</th>
                      <td mat-cell *matCellDef="let p" class="text-secondary small">{{ p.paymentId }}</td>
                    </ng-container>
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Date</th>
                      <td mat-cell *matCellDef="let p" class="text-secondary small">
                        {{ p.createdAt | date:'dd MMM yyyy' }}
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="payCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: payCols"></tr>
                  </table>
                </div>
                <div class="empty-state" *ngIf="payments.length === 0">
                  <mat-icon class="material-icons-outlined">payments</mat-icon>
                  <p>No payments recorded yet.</p>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 5 : UPSELL (READ ONLY - ML) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">trending_up</mat-icon>Upsell
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">Upsell Recommendations</h4>
                    <p class="text-secondary small mb-0">Table: <code>upsell_recommendations</code> — global view, read only</p>
                  </div>
                  <span class="pill pill-purple">ML GENERATED</span>
                </div>
                <div class="row gx-3 mt-3">
                  <div class="col-12 col-md-6 col-lg-4" *ngFor="let u of upsellMock">
                    <mat-card class="mb-3">
                      <mat-card-content>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <h5 class="mb-0">{{ u.org }}</h5>
                          <span class="pill" [class]="getUpsellClass(u.status)">{{ u.status }}</span>
                        </div>
                        <p class="text-secondary small mb-1">Current: <strong>{{ u.current }}</strong></p>
                        <p class="text-secondary small mb-1">→ Recommended: <strong class="text-theme">{{ u.target }}</strong></p>
                        <p class="text-secondary small mb-0">Revenue impact: <strong style="color:#22c55e">+\${{ u.impact }}/mo</strong></p>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </div>
                <div class="empty-state">
                  <mat-icon class="material-icons-outlined">auto_graph</mat-icon>
                  <p>Triggered when quota utilization > 80% for > 5 days. Inference: daily batch + real-time.</p>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 6 : ANALYTICS DASHBOARD -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">analytics</mat-icon>
                Analytics
              </ng-template>
              <div class="tab-content">

                <!-- KPI Cards -->
                <div class="analytics-kpi-row">
                  <div class="kpi-card kpi-blue">
                    <div class="kpi-icon"><mat-icon>trending_up</mat-icon></div>
                    <div class="kpi-info">
                      <span class="kpi-label">MRR</span>
                      <span class="kpi-value">\${{ mrr | number:'1.0-0' }}</span>
                      <span class="kpi-sub">Monthly Recurring Revenue</span>
                    </div>
                  </div>
                  <div class="kpi-card kpi-green">
                    <div class="kpi-icon"><mat-icon>account_balance</mat-icon></div>
                    <div class="kpi-info">
                      <span class="kpi-label">ARR</span>
                      <span class="kpi-value">\${{ arr | number:'1.0-0' }}</span>
                      <span class="kpi-sub">Annual Recurring Revenue</span>
                    </div>
                  </div>
                  <div class="kpi-card kpi-purple">
                    <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
                    <div class="kpi-info">
                      <span class="kpi-label">Total Revenue</span>
                      <span class="kpi-value">\${{ totalRevenue | number:'1.0-0' }}</span>
                      <span class="kpi-sub">All confirmed invoices</span>
                    </div>
                  </div>
                  <div class="kpi-card kpi-orange">
                    <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
                    <div class="kpi-info">
                      <span class="kpi-label">Success Rate</span>
                      <span class="kpi-value">{{ paymentSuccessRate | number:'1.0-1' }}%</span>
                      <span class="kpi-sub">Payment attempts succeeded</span>
                    </div>
                  </div>
                </div>

                <!-- Charts Row 1 -->
                <div class="analytics-charts-row">
                  <div class="chart-card chart-large">
                    <div class="chart-card-header">
                      <h5>Revenue Over Time (Last 6 Months)</h5>
                      <span class="pill pill-blue">MRR</span>
                    </div>
                    <div class="chart-wrapper">
                      <canvas #mrrCanvas></canvas>
                    </div>
                  </div>
                  <div class="chart-card chart-small">
                    <div class="chart-card-header">
                      <h5>Revenue by Plan</h5>
                      <span class="pill pill-purple">Distribution</span>
                    </div>
                    <div class="chart-wrapper">
                      <canvas #planCanvas></canvas>
                    </div>
                  </div>
                </div>

                <!-- Charts Row 2 -->
                <div class="analytics-charts-row">
                  <div class="chart-card chart-small">
                    <div class="chart-card-header">
                      <h5>Payment Attempts</h5>
                      <span class="pill pill-green">Success vs Failed</span>
                    </div>
                    <div class="chart-wrapper">
                      <canvas #attemptsCanvas></canvas>
                    </div>
                  </div>
                  <div class="chart-card chart-large">
                    <div class="chart-card-header">
                      <h5>Average Usage Overview</h5>
                      <span class="pill pill-yellow">All Orgs</span>
                    </div>
                    <div class="chart-wrapper">
                      <canvas #usageCanvas></canvas>
                    </div>
                  </div>
                </div>

              </div>
            </mat-tab>

            <!-- TAB 7 : COUPONS -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">local_offer</mat-icon>
                Coupons <span class="tab-badge">{{ coupons.length }}</span>
              </ng-template>
              <div class="tab-content">

                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">Promo Codes</h4>
                    <p class="text-secondary small mb-0">Create and manage discount coupons for subscriptions</p>
                  </div>
                  <button mat-flat-button color="primary" (click)="openCouponModal()">
                    <mat-icon>add</mat-icon> New Coupon
                  </button>
                </div>

                <!-- Coupon Table -->
                <div class="table-responsive mt-3">
                  <table mat-table [dataSource]="coupons" class="bg-none w-100">

                    <ng-container matColumnDef="code">
                      <th mat-header-cell *matHeaderCellDef>Code</th>
                      <td mat-cell *matCellDef="let c" class="py-2">
                        <code class="coupon-code-badge">{{ c.code }}</code>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="discount">
                      <th mat-header-cell *matHeaderCellDef>Discount</th>
                      <td mat-cell *matCellDef="let c">
                        @if (c.discountType === 'PERCENTAGE') {
                          <span class="pill pill-purple">{{ c.discountValue }}% OFF</span>
                        } @else {
                          <span class="pill pill-blue">\${{ c.discountValue }} OFF</span>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="uses">
                      <th mat-header-cell *matHeaderCellDef>Uses</th>
                      <td mat-cell *matCellDef="let c">
                        {{ c.usedCount }} / {{ c.maxUses ?? '∞' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="expires">
                      <th mat-header-cell *matHeaderCellDef>Expires</th>
                      <td mat-cell *matCellDef="let c" class="text-secondary small">
                        {{ c.expiresAt ? (c.expiresAt | date:'dd MMM yyyy') : 'Never' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let c">
                        @if (c.isActive) {
                          <span class="pill pill-green">Active</span>
                        } @else {
                          <span class="pill pill-gray">Inactive</span>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let c">
                        <button mat-icon-button matTooltip="Edit" (click)="openEditCoupon(c)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button [matTooltip]="c.isActive ? 'Deactivate' : 'Activate'"
                          [style.color]="c.isActive ? '#22c55e' : '#94a3b8'"
                          (click)="toggleCoupon(c)">
                          <mat-icon>{{ c.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                        </button>
                        <button mat-icon-button matTooltip="Delete" color="warn" (click)="deleteCoupon(c)">
                          <mat-icon>delete_outline</mat-icon>
                        </button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="couponCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: couponCols;"></tr>
                    <tr class="mat-row" *matNoDataRow>
                      <td class="mat-cell text-secondary p-4" colspan="6">No coupons yet. Create your first promo code.</td>
                    </tr>
                  </table>
                </div>
              </div>
            </mat-tab>

          </mat-tab-group>
        </mat-card-content>
      </mat-card>

      <!-- Coupon Modal -->
      @if (showCouponModal) {
        <div class="cm-overlay" (click)="showCouponModal=false">
          <div class="cm-card" (click)="$event.stopPropagation()">

            <!-- Header gradient banner -->
            <div class="cm-banner">
              <div class="cm-banner-icon">
                <mat-icon>{{ couponEditId ? 'edit' : 'local_offer' }}</mat-icon>
              </div>
              <button class="cm-close" mat-icon-button (click)="showCouponModal=false">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Title block -->
            <div class="cm-title-block">
              <h5 class="cm-title">{{ couponEditId ? 'Edit Promo Code' : 'New Promo Code' }}</h5>
              <p class="cm-subtitle">{{ couponEditId ? 'Update the details of this coupon' : 'Create a discount coupon for subscriptions' }}</p>
            </div>

            <!-- Body -->
            <div class="cm-body">

              <!-- Coupon Code -->
              <div class="cm-field">
                <label class="cm-label">Coupon Code <span class="cm-required">*</span></label>
                <div class="cm-input-wrap">
                  <mat-icon class="cm-input-icon">tag</mat-icon>
                  <input class="cm-input cm-input-code" [(ngModel)]="cf.code"
                    placeholder="E.G. UNITUM20"
                    [disabled]="!!couponEditId">
                </div>
                @if (couponEditId) {
                  <span class="cm-hint">Code cannot be changed after creation.</span>
                }
              </div>

              <!-- Description -->
              <div class="cm-field">
                <label class="cm-label">Description <span class="cm-optional">(optional)</span></label>
                <div class="cm-input-wrap">
                  <mat-icon class="cm-input-icon">notes</mat-icon>
                  <input class="cm-input" [(ngModel)]="cf.description" placeholder="e.g. 20% off for partners">
                </div>
              </div>

              <!-- Discount Type + Value -->
              <div class="cm-row">
                <div class="cm-field">
                  <label class="cm-label">Discount Type <span class="cm-required">*</span></label>
                  <div class="cm-input-wrap">
                    <mat-icon class="cm-input-icon">sell</mat-icon>
                    <select class="cm-input cm-select" [(ngModel)]="cf.discountType">
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount ($)</option>
                    </select>
                  </div>
                </div>
                <div class="cm-field">
                  <label class="cm-label">
                    {{ cf.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Amount ($)' }}
                    <span class="cm-required">*</span>
                  </label>
                  <div class="cm-input-wrap">
                    <mat-icon class="cm-input-icon">percent</mat-icon>
                    <input class="cm-input" type="number"
                      [(ngModel)]="cf.discountValue"
                      [placeholder]="cf.discountType === 'PERCENTAGE' ? '1 – 100' : '0.00'"
                      [max]="cf.discountType === 'PERCENTAGE' ? 100 : null" min="0">
                  </div>
                </div>
              </div>

              <!-- Max Uses + Expiry -->
              <div class="cm-row">
                <div class="cm-field">
                  <label class="cm-label">Max Uses <span class="cm-optional">(optional)</span></label>
                  <div class="cm-input-wrap">
                    <mat-icon class="cm-input-icon">people</mat-icon>
                    <input class="cm-input" type="number" [(ngModel)]="cf.maxUses" placeholder="Unlimited" min="1">
                  </div>
                </div>
                <div class="cm-field">
                  <label class="cm-label">Expires At <span class="cm-optional">(optional)</span></label>
                  <div class="cm-input-wrap">
                    <mat-icon class="cm-input-icon">event</mat-icon>
                    <input class="cm-input" type="datetime-local" [(ngModel)]="cf.expiresAt">
                  </div>
                </div>
              </div>

              @if (couponError) {
                <div class="cm-error">
                  <mat-icon>error_outline</mat-icon>
                  {{ couponError }}
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="cm-footer">
              <button class="cm-btn-cancel" mat-button (click)="showCouponModal=false">Cancel</button>
              <button class="cm-btn-save" mat-flat-button (click)="saveCoupon()" [disabled]="couponSaving">
                <mat-icon>{{ couponEditId ? 'save' : 'add_circle' }}</mat-icon>
                {{ couponSaving ? (couponEditId ? 'Saving…' : 'Creating…') : (couponEditId ? 'Save Changes' : 'Create Coupon') }}
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Security Alert Popup (fixed bottom-right) -->
      @if (securityAlerts.length > 0) {
        <div class="security-popup" [class.collapsed]="popupCollapsed">

          <!-- Header -->
          <div class="security-popup-head" (click)="popupCollapsed = !popupCollapsed">
            <div class="security-popup-title">
              <mat-icon>gpp_bad</mat-icon>
              <span>Security Alert</span>
              <span class="security-badge">{{ securityAlerts.length }}</span>
            </div>
            <div class="security-popup-actions">
              <mat-icon class="popup-chevron">{{ popupCollapsed ? 'expand_less' : 'expand_more' }}</mat-icon>
            </div>
          </div>

          <!-- Body (hidden when collapsed) -->
          @if (!popupCollapsed) {
            <div class="security-popup-body">
              <p class="security-popup-desc">
                🚨 {{ securityAlerts.length }} invoice(s) have been tampered with in the database.
              </p>
              <div class="security-alert-items">
                @for (alert of securityAlerts; track alert.invoiceId) {
                  <div class="security-alert-card">
                    <div class="sac-row">
                      <span class="sac-lbl">Invoice</span>
                      <code class="sac-inv">{{ alert.invoiceNumber }}</code>
                    </div>
                    <div class="sac-row">
                      <span class="sac-lbl">Organization</span>
                      <span class="sac-val">{{ alert.orgName }}</span>
                    </div>
                    <div class="sac-row">
                      <span class="sac-lbl">Stored Hash</span>
                      <code class="hash-old">{{ alert.storedHash?.substring(0,16) }}...</code>
                    </div>
                    <div class="sac-row">
                      <span class="sac-lbl">Computed Hash</span>
                      <code class="hash-new">{{ alert.computedHash?.substring(0,16) }}...</code>
                    </div>
                    <div class="sac-row">
                      <span class="sac-lbl">Detected</span>
                      <span class="sac-val small">{{ alert.checkedAt }}</span>
                    </div>
                  </div>
                }
              </div>
              <button class="security-dismiss-btn" (click)="dismissSecurityAlerts()">
                <mat-icon>check_circle</mat-icon> Mark as Reviewed
              </button>
            </div>
          }

        </div>
      }

      <!-- Plan Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="showModal=false">
        <mat-card class="modal-box" (click)="$event.stopPropagation()">
          <mat-card-content>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h4 class="mb-0">{{ editing ? 'Edit Plan' : 'New Plan' }}</h4>
              <button mat-icon-button (click)="showModal=false"><mat-icon>close</mat-icon></button>
            </div>
            <div class="row gx-3">
              <div class="col-12 mb-3">
                <label class="field-lbl">Display Name</label>
                <input class="field-input" [(ngModel)]="pf.displayName" placeholder="e.g. Pro">
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">Monthly Price ($)</label>
                <input class="field-input" type="number" [(ngModel)]="pf.priceMonthly">
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">Annual Price/mo ($)</label>
                <input class="field-input" type="number" [(ngModel)]="pf.priceYearly">
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">Storage (GB)</label>
                <input class="field-input" type="number" [(ngModel)]="pf.storageMb">
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">ML Tier</label>
                <select class="field-input" [(ngModel)]="pf.mlTier">
                  <option>NONE</option><option>BASIC</option><option>FULL</option><option>FULL_API</option>
                </select>
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">Support Tier</label>
                <select class="field-input" [(ngModel)]="pf.supportTier">
                  <option>COMMUNITY</option><option>EMAIL</option><option>PRIORITY</option><option>DEDICATED</option>
                </select>
              </div>
              <div class="col-6 mb-3">
                <label class="field-lbl">Organisation Type</label>
                <select class="field-input" [(ngModel)]="pf.orgType">
                  <option value="enterprise">Enterprise</option>
                  <option value="academic">Academic</option>
                </select>
              </div>
            </div>
            <div class="d-flex gap-2 justify-content-end">
              <button mat-stroked-button (click)="showModal=false">Cancel</button>
              <button mat-flat-button color="primary" (click)="savePlan()">
                {{ editing ? 'Save Changes' : 'Create Plan' }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

    </div>
  `,
  styles: [`
    /* Stats */
    .stat-card mat-card-content { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:16px; }
    .stat-icon { width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
    .stat-icon mat-icon { color:#fff; font-size:20px; }
    .stat-label { font-size:12px; color:#64748b; margin:0; font-weight:600; text-transform:uppercase; letter-spacing:.4px; }
    .stat-val { font-size:24px; font-weight:800; margin:0; }

    /* Tabs */
    .tab-icon { font-size:18px; width:18px; height:18px; margin-right:6px; }
    .tab-badge { background:#e0e7ff; color:#4f46e5; border-radius:10px; padding:2px 8px; font-size:11px; font-weight:700; margin-left:6px; }
    .tab-badge-danger { background:#fee2e2; color:#dc2626; }
    .tab-content { padding:24px; }
    .tab-header { display:flex; justify-content:space-between; align-items:flex-start; }

    /* Pills */
    .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .pill-green  { background:#dcfce7; color:#15803d; }
    .pill-red    { background:#fee2e2; color:#dc2626; }
    .pill-blue   { background:#dbeafe; color:#1d4ed8; }
    .pill-purple { background:#ede9fe; color:#7c3aed; }
    .pill-yellow { background:#fef9c3; color:#a16207; }
    .pill-gray   { background:#f1f5f9; color:#64748b; }

    /* Coupon table badge */
    .coupon-code-badge { background:#1e293b; color:#f8fafc; padding:3px 10px; border-radius:6px; font-size:12px; font-weight:700; letter-spacing:.05em; }

    /* ── Coupon Modal (cm-*) ─────────────────────────────────────── */
    .cm-overlay {
      position:fixed; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(4px);
      display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;
    }
    .cm-card {
      background:#fff; border-radius:20px; width:100%; max-width:480px;
      box-shadow:0 24px 60px rgba(0,0,0,.18); overflow:hidden;
      animation:cmSlideIn .2s ease;
    }
    @keyframes cmSlideIn { from { opacity:0; transform:translateY(-16px) scale(.97); } to { opacity:1; transform:none; } }

    /* Banner */
    .cm-banner {
      background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a78bfa 100%);
      padding:24px 20px 20px; position:relative; display:flex; align-items:flex-start; justify-content:space-between;
    }
    .cm-banner-icon {
      width:52px; height:52px; border-radius:14px;
      background:rgba(255,255,255,.2); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; color:#fff;
    }
    .cm-banner-icon mat-icon { font-size:26px; width:26px; height:26px; }
    .cm-close { color:rgba(255,255,255,.8) !important; }
    .cm-close:hover { color:#fff !important; }

    /* Title block */
    .cm-title-block { padding:16px 24px 0; }
    .cm-title { font-size:18px; font-weight:700; color:#0f172a; margin:0 0 4px; }
    .cm-subtitle { font-size:13px; color:#64748b; margin:0; }

    /* Body */
    .cm-body { padding:16px 24px 8px; }
    .cm-field { margin-bottom:14px; }
    .cm-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .cm-label { display:block; font-size:11.5px; font-weight:600; color:#475569; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }
    .cm-required { color:#ef4444; }
    .cm-optional { color:#94a3b8; font-weight:400; text-transform:none; letter-spacing:0; }
    .cm-hint { font-size:11px; color:#94a3b8; margin-top:4px; display:block; }

    /* Input wrapper */
    .cm-input-wrap {
      display:flex; align-items:center; gap:8px;
      border:1.5px solid #e2e8f0; border-radius:10px;
      padding:0 12px; background:#f8fafc;
      transition:border-color .15s, box-shadow .15s;
    }
    .cm-input-wrap:focus-within {
      border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); background:#fff;
    }
    .cm-input-icon { font-size:17px; width:17px; height:17px; color:#94a3b8; flex-shrink:0; }
    .cm-input {
      flex:1; border:none; outline:none; background:transparent;
      font-size:14px; color:#1e293b; padding:10px 0;
    }
    .cm-input::placeholder { color:#94a3b8; }
    .cm-input:disabled { color:#94a3b8; cursor:not-allowed; }
    .cm-input-code { font-family:monospace; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
    .cm-select { appearance:none; cursor:pointer; }

    /* Error */
    .cm-error {
      display:flex; align-items:center; gap:8px;
      background:#fef2f2; border:1px solid #fecaca; border-radius:8px;
      color:#dc2626; font-size:13px; padding:10px 12px; margin-top:4px;
    }
    .cm-error mat-icon { font-size:16px; width:16px; height:16px; flex-shrink:0; }

    /* Footer */
    .cm-footer {
      display:flex; justify-content:flex-end; align-items:center; gap:10px;
      padding:16px 24px 20px; border-top:1px solid #f1f5f9;
    }
    .cm-btn-cancel { color:#64748b !important; font-size:14px !important; }
    .cm-btn-save {
      background:linear-gradient(135deg,#6366f1,#8b5cf6) !important;
      color:#fff !important; border-radius:10px !important;
      font-size:14px !important; font-weight:600 !important;
      padding:0 20px !important; height:40px !important;
      display:flex; align-items:center; gap:6px;
    }
    .cm-btn-save mat-icon { font-size:18px; width:18px; height:18px; }
    .cm-btn-save:disabled { opacity:.6; cursor:not-allowed; }

    /* Plan cards */
    .plan-card { border:1px solid var(--bs-border-color,#e5e7eb); }
    .plan-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .price-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
    .price-box { background:#f8fafc; border-radius:8px; padding:8px; text-align:center; }
    .price-lbl { display:block; font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; }
    .price-val { display:block; font-size:20px; font-weight:800; color:#1e293b; }
    .plan-meta { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .meta-row { display:flex; align-items:center; gap:6px; font-size:12px; color:#64748b; }
    .meta-row mat-icon { font-size:15px; width:15px; height:15px; }

    /* Plan action buttons - FIXED: edit button full width, toggle icon only */
    .plan-actions { display:flex; gap:8px; align-items:center; }
    .action-btn { flex:1; }
    .btn-danger-icon { color:#ef4444 !important; }
    .btn-success-icon { color:#22c55e !important; }

    /* Churn */
    .churn-bar { height:8px; background:#f1f5f9; border-radius:10px; overflow:hidden; }
    .churn-fill { height:100%; border-radius:10px; }

    /* Security Alert Popup */
    .security-popup {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(220,38,38,.25), 0 2px 8px rgba(0,0,0,.12);
      border: 2px solid #fca5a5;
      z-index: 9998;
      overflow: hidden;
      transition: all .3s ease;
    }
    .security-popup.collapsed { width: 280px; }
    .security-popup-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; background: #dc2626; cursor: pointer;
      user-select: none;
    }
    .security-popup-head:hover { background: #b91c1c; }
    .security-popup-title { display:flex; align-items:center; gap:8px; color:#fff; font-size:14px; font-weight:700; }
    .security-popup-title mat-icon { font-size:20px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .security-badge { background:rgba(255,255,255,.25); color:#fff; border-radius:10px; padding:1px 8px; font-size:12px; font-weight:800; }
    .security-popup-actions { display:flex; align-items:center; gap:4px; }
    .popup-chevron { color:rgba(255,255,255,.9); font-size:20px; }
    .security-popup-body { padding:16px; max-height:400px; overflow-y:auto; }
    .security-popup-desc { font-size:13px; color:#dc2626; font-weight:600; margin:0 0 12px; }
    .security-alert-items { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
    .security-alert-card { background:#fff5f5; border-radius:8px; padding:10px 12px; border-left:3px solid #dc2626; display:flex; flex-direction:column; gap:6px; }
    .sac-row { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .sac-lbl { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; white-space:nowrap; }
    .sac-val { font-size:12px; font-weight:600; color:#1e293b; text-align:right; }
    .sac-val.small { font-size:10px; }
    .sac-inv { font-size:12px; font-weight:700; color:#dc2626; background:#fee2e2; padding:1px 6px; border-radius:4px; }
    .hash-old { font-size:10px; color:#64748b; background:#f1f5f9; padding:1px 5px; border-radius:3px; font-family:monospace; }
    .hash-new { font-size:10px; color:#dc2626; background:#fee2e2; padding:1px 5px; border-radius:3px; font-family:monospace; }
    .security-dismiss-btn {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; background:#dc2626; color:#fff; border:none; border-radius:8px;
      padding:10px; font-size:13px; font-weight:700; cursor:pointer;
    }
    .security-dismiss-btn:hover { background:#b91c1c; }
    .security-dismiss-btn mat-icon { font-size:18px; }

    /* Empty */
    .empty-state { text-align:center; padding:40px 20px; color:#94a3b8; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; }
    .empty-state p { font-size:13px; }

    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
    .modal-box { width:100%; max-width:480px; }
    .field-lbl { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.4px; margin-bottom:5px; }
    .field-input { width:100%; padding:10px 12px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
    .field-input:focus { border-color:#6366f1; }

    /* Analytics KPI */
    .analytics-kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
    .kpi-card { display:flex; align-items:center; gap:14px; background:#fff; border-radius:14px; padding:18px 20px; box-shadow:0 2px 10px rgba(0,0,0,.06); border-left:4px solid transparent; }
    .kpi-blue   { border-left-color:#2563eb; }
    .kpi-green  { border-left-color:#059669; }
    .kpi-purple { border-left-color:#6366f1; }
    .kpi-orange { border-left-color:#f59e0b; }
    .kpi-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
    .kpi-blue   .kpi-icon { background:#eff6ff; } .kpi-blue   .kpi-icon mat-icon { color:#2563eb; }
    .kpi-green  .kpi-icon { background:#f0fdf4; } .kpi-green  .kpi-icon mat-icon { color:#059669; }
    .kpi-purple .kpi-icon { background:#f5f3ff; } .kpi-purple .kpi-icon mat-icon { color:#6366f1; }
    .kpi-orange .kpi-icon { background:#fffbeb; } .kpi-orange .kpi-icon mat-icon { color:#f59e0b; }
    .kpi-info { display:flex; flex-direction:column; gap:2px; }
    .kpi-label { font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; font-weight:600; }
    .kpi-value { font-size:22px; font-weight:800; color:#1e293b; line-height:1.1; }
    .kpi-sub   { font-size:11px; color:#94a3b8; }

    /* Analytics Charts */
    .analytics-charts-row { display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-bottom:16px; }
    .chart-card { background:#fff; border-radius:14px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
    .chart-card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .chart-card-header h5 { margin:0; font-size:14px; font-weight:700; color:#1e293b; }
    .chart-wrapper { position:relative; height:220px; }
    .chart-wrapper canvas { width:100% !important; height:100% !important; }
    @media (max-width:768px) { .analytics-charts-row { grid-template-columns:1fr; } }
  `]
})
export class SuperAdminBillingComponent implements OnInit {
  private orgBilling = inject(OrgBillingService);
  private billingService = inject(BillingService);

  plans: PlanDTO[] = [];
  allInvoices: InvoiceDTO[] = [];
  invoicesDS = new MatTableDataSource<InvoiceDTO>([]);
  invCols = ['number', 'plan', 'subtotal', 'tax', 'total', 'status', 'period', 'paidAt', 'pdf'];
  securityAlerts: any[] = [];
  popupCollapsed = false;

  // Coupons
  coupons:         any[]    = [];
  couponCols       = ['code', 'discount', 'uses', 'expires', 'status', 'actions'];
  showCouponModal  = false;
  couponSaving     = false;
  couponError      = '';
  couponEditId     = '';
  cf = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: 0, maxUses: null as number|null, expiresAt: '' };

  // Analytics chart canvases
  @ViewChild('mrrCanvas')      mrrCanvas!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('planCanvas')     planCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('attemptsCanvas') attemptsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('usageCanvas')    usageCanvas!:    ElementRef<HTMLCanvasElement>;

  private mrrChart!:      Chart;
  private planChart!:     Chart;
  private attemptsChart!: Chart;
  private usageChart!:    Chart;

  // KPI computed values
  mrr = 0;
  arr = 0;
  paymentSuccessRate = 0;

  payments: PaymentResponse[] = [];
  paymentsDS = new MatTableDataSource<PaymentResponse>([]);
  payCols = ['org', 'plan', 'amount', 'status', 'id', 'date'];

  // Mock ML data
  churnMock = [
    { org:'Acme Corp', plan:'Starter', score:.82, risk:'HIGH', wau:'24%' },
    { org:'TechHub Inc', plan:'Pro', score:.45, risk:'MEDIUM', wau:'61%' },
    { org:'EduSchool', plan:'Faculty', score:.12, risk:'LOW', wau:'88%' },
  ];
  upsellMock = [
    { org:'Acme Corp', current:'Starter', target:'Pro', impact:100, status:'PENDING' },
    { org:'TechHub Inc', current:'Pro', target:'Business', impact:200, status:'SHOWN' },
  ];

  paymentAttempts: PaymentAttemptDTO[] = [];
  attemptsGlobalDS = new MatTableDataSource<PaymentAttemptDTO>([]);
  attemptGlobalCols = ['org', 'invoice', 'amount', 'status', 'date'];
  usageQuotas: UsageQuotaDTO[] = [];

  showModal = false;
  editing: PlanDTO | null = null;
  pf = { displayName:'', priceMonthly:0, priceYearly:0, storageMb:10, mlTier:'BASIC', supportTier:'EMAIL', orgType:'enterprise' };

  get totalRevenue() { return this.payments.filter(p=>p.status==='CONFIRMED').reduce((s,p)=>s+p.amount,0); }
  get confirmedPayments() { return this.payments.filter(p=>p.status==='CONFIRMED').length; }

  ngOnInit() {
    this.orgBilling.getActivePlans().subscribe(d => { this.plans = d; });
    this.orgBilling.getAllInvoices().subscribe(d => {
      this.allInvoices = d;
      this.invoicesDS.data = d;
    });
    this.orgBilling.getAllPaymentAttempts().subscribe(d => {
      this.paymentAttempts = d;
      this.attemptsGlobalDS.data = d;
    });
    this.orgBilling.getAllUsageQuotas().subscribe(d => {
      this.usageQuotas = d;
    });
    this.billingService.getAllPayments().subscribe(d => {
      this.payments = d;
      this.paymentsDS.data = d;
    });
    this.billingService.getSecurityAlerts().subscribe(res => {
      this.securityAlerts = res.alerts;
    });
    this.loadCoupons();
  }

  // ── Coupon methods ────────────────────────────────────────────────────────

  loadCoupons() {
    this.billingService.getAllCoupons().subscribe(d => this.coupons = d);
  }

  openCouponModal() {
    this.cf = { code: '', description: '', discountType: 'PERCENTAGE', discountValue: 0, maxUses: null, expiresAt: '' };
    this.couponError  = '';
    this.couponEditId = '';
    this.showCouponModal = true;
  }

  openEditCoupon(c: any) {
    this.couponEditId = c.id;
    this.cf = {
      code:          c.code,
      description:   c.description || '',
      discountType:  c.discountType,
      discountValue: c.discountValue,
      maxUses:       c.maxUses ?? null,
      expiresAt:     c.expiresAt ? c.expiresAt.replace(' ', 'T').substring(0, 16) : ''
    };
    this.couponError     = '';
    this.showCouponModal = true;
  }

  saveCoupon() {
    if (!this.couponEditId && !this.cf.code) {
      this.couponError = 'Code and discount value are required.';
      return;
    }
    if (!this.cf.discountValue) {
      this.couponError = 'Discount value is required.';
      return;
    }
    this.couponSaving = true;
    this.couponError  = '';
    const body: any = {
      code:          this.cf.code.trim().toUpperCase(),
      description:   this.cf.description,
      discountType:  this.cf.discountType,
      discountValue: this.cf.discountValue,
      maxUses:       this.cf.maxUses || null,
      expiresAt:     this.cf.expiresAt ? this.cf.expiresAt.replace('T', 'T') : null,
    };
    if (this.couponEditId) {
      this.billingService.updateCoupon(this.couponEditId, body).subscribe({
        next: (c) => {
          const idx = this.coupons.findIndex(x => x.id === this.couponEditId);
          if (idx !== -1) this.coupons[idx] = c;
          this.coupons = [...this.coupons];
          this.showCouponModal = false;
          this.couponSaving    = false;
        },
        error: (err) => {
          this.couponError  = err?.error?.error ?? 'Failed to update coupon.';
          this.couponSaving = false;
        }
      });
    } else {
      this.billingService.createCoupon(body).subscribe({
        next: (c) => {
          this.coupons = [c, ...this.coupons];
          this.showCouponModal = false;
          this.couponSaving = false;
        },
        error: (err) => {
          this.couponError  = err?.error?.error ?? 'Failed to create coupon.';
          this.couponSaving = false;
        }
      });
    }
  }

  toggleCoupon(c: any) {
    this.billingService.toggleCoupon(c.id).subscribe({
      next: (updated) => {
        const idx = this.coupons.findIndex(x => x.id === c.id);
        if (idx !== -1) this.coupons[idx] = updated;
        this.coupons = [...this.coupons];
      },
      error: () => {
        alert('Failed to toggle coupon status. Please try again.');
      }
    });
  }

  deleteCoupon(c: any) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    this.billingService.deleteCoupon(c.id).subscribe(() => {
      this.coupons = this.coupons.filter(x => x.id !== c.id);
    });
  }

  dismissSecurityAlerts() {
    this.billingService.clearSecurityAlerts().subscribe(() => {
      this.securityAlerts = [];
    });
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  onTabChange(index: number) {
    if (index !== 5) return;
    forkJoin({
      invoices: this.orgBilling.getAllInvoices(),
      quotas:   this.orgBilling.getAllUsageQuotas(),
      payments: this.billingService.getAllPayments()
    }).subscribe(({ invoices, quotas, payments }) => {
      this.allInvoices    = invoices;
      this.invoicesDS.data = invoices;
      this.usageQuotas    = quotas;
      this.payments       = payments;
      this.paymentsDS.data = payments;
      setTimeout(() => this.renderAnalytics(), 100);
    });
  }

  private renderAnalytics() {
    this.computeKpis();
    this.renderMrrChart();
    this.renderPlanChart();
    this.renderAttemptsChart();
    this.renderUsageChart();
  }

  private computeKpis() {
    const currentMonth = new Date().getMonth();
    const currentYear  = new Date().getFullYear();
    this.mrr = this.allInvoices
      .filter(i => { const d = new Date(i.createdAt); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
      .reduce((s, i) => s + i.total, 0);
    this.arr = this.mrr * 12;
    const confirmed = this.payments.filter(p => p.status === 'CONFIRMED').length;
    this.paymentSuccessRate = this.payments.length ? (confirmed / this.payments.length) * 100 : 0;
  }

  private renderMrrChart() {
    if (this.mrrChart) this.mrrChart.destroy();
    const months: string[] = [];
    const revenues: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push(label);
      const rev = this.allInvoices
        .filter(inv => { const id = new Date(inv.createdAt); return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear(); })
        .reduce((s, inv) => s + inv.total, 0);
      revenues.push(rev);
    }
    const ctx = this.mrrCanvas.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(37,99,235,0.35)');
    gradient.addColorStop(1, 'rgba(37,99,235,0)');
    this.mrrChart = new Chart(this.mrrCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{ label: 'Revenue ($)', data: revenues, backgroundColor: gradient, borderColor: '#2563eb', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#2563eb', pointRadius: 4 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: v => '$' + v } }, x: { grid: { display: false } } } }
    });
  }

  private renderPlanChart() {
    if (this.planChart) this.planChart.destroy();
    const planMap: Record<string, number> = {};
    this.allInvoices.forEach(i => { const k = i.planName ?? 'Unknown'; planMap[k] = (planMap[k] ?? 0) + i.total; });
    const colors = ['#6366f1','#2563eb','#059669','#f59e0b','#dc2626','#8b5cf6'];
    this.planChart = new Chart(this.planCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: Object.keys(planMap),
        datasets: [{ data: Object.values(planMap), backgroundColor: colors.slice(0, Object.keys(planMap).length), borderWidth: 2, borderRadius: 6 }]
      },
      options: { maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } } }
    });
  }

  private renderAttemptsChart() {
    if (this.attemptsChart) this.attemptsChart.destroy();
    const confirmed = this.payments.filter(p => p.status === 'CONFIRMED').length;
    const rejected  = this.payments.filter(p => p.status === 'REJECTED').length;
    const pending   = this.payments.filter(p => p.status === 'PENDING').length;
    this.attemptsChart = new Chart(this.attemptsCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Confirmed', 'Failed / Rejected', 'Pending'],
        datasets: [{ label: 'Payments', data: [confirmed, rejected, pending], backgroundColor: ['#059669','#dc2626','#f59e0b'], borderRadius: 8, barThickness: 40 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
    });
  }

  private renderUsageChart() {
    if (this.usageChart) this.usageChart.destroy();
    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const data = [
      avg(this.usageQuotas.map(q => q.membersPct ?? 0)),
      avg(this.usageQuotas.map(q => q.workspacesPct ?? 0)),
      avg(this.usageQuotas.map(q => q.projectsPct ?? 0)),
      avg(this.usageQuotas.map(q => q.storagePct ?? 0)),
    ];
    this.usageChart = new Chart(this.usageCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Members', 'Workspaces', 'Projects', 'Storage'],
        datasets: [{ label: 'Avg Usage %', data: data, backgroundColor: ['#6366f1','#2563eb','#059669','#f59e0b'], borderRadius: 8, barThickness: 50 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } }
    });
  }

  openAddPlan() {
    this.editing=null;
    this.pf={displayName:'',priceMonthly:0,priceYearly:0,storageMb:10,mlTier:'BASIC',supportTier:'EMAIL',orgType:'enterprise'};
    this.showModal=true;
  }

  editPlan(p:PlanDTO) {
    this.editing=p;
    this.pf={displayName:p.displayName,priceMonthly:p.priceMonthly,priceYearly:p.priceYearly,storageMb:Math.round(p.storageMb/1024),mlTier:p.mlTier,supportTier:p.supportTier,orgType:p.orgType??'enterprise'};
    this.showModal=true;
  }

  savePlan() {
    if (!this.pf.displayName || this.pf.priceMonthly <= 0 || this.pf.priceYearly <= 0) {
      alert('Please fill all required fields correctly');
      return;
    }

    const payload = {
      displayName: this.pf.displayName,
      priceMonthly: this.pf.priceMonthly,
      priceYearly: this.pf.priceYearly,
      storageMb: this.pf.storageMb * 1024,
      mlTier: this.pf.mlTier,
      supportTier: this.pf.supportTier,
      orgType: this.pf.orgType
    };

    const isEditing = !!this.editing;
    const request$ = isEditing
      ? this.orgBilling.updatePlan(this.editing!.id, payload)
      : this.orgBilling.createPlan(payload);

    request$.subscribe({
      next: (_) => {
        setTimeout(() => {
          this.showModal = false;
          alert(isEditing ? 'Plan updated successfully!' : 'Plan created successfully!');
        }, 0);
        this.orgBilling.getActivePlans().subscribe(d => { this.plans = d; });
      },
      error: (err) => {
        const errorMsg = err?.error?.error || err?.message || (isEditing ? 'Failed to update plan' : 'Failed to create plan');
        alert('Error: ' + errorMsg);
      }
    });
  }

  togglePlan(p:PlanDTO) {
    if (!p.id) return;
    if (!confirm('Are you sure you want to permanently delete this plan?')) return;

    this.orgBilling.deletePlan(p.id).subscribe({
      next: (res) => {
        console.log('Plan deleted:', res);
        this.plans = this.plans.filter(plan => plan.id !== p.id);
        alert('Plan permanently deleted');
      },
      error: (err) => {
        console.error('Plan deletion error:', err);
        alert('Failed to delete plan');
      }
    });
  }

  downloadInvoicePdf(inv: InvoiceDTO) {
    const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const fmtUsd = (v: number) => '$' + v.toFixed(2);
    const lineItemsHtml = (inv.lineItems ?? []).map(li => `
      <tr>
        <td>${li.description}</td>
        <td style="text-align:center">${li.quantity}</td>
        <td style="text-align:right">${fmtUsd(li.unitPrice)}</td>
        <td style="text-align:center">${li.taxRate > 0 ? li.taxRate + '%' : '0%'}</td>
        <td style="text-align:right"><strong>${fmtUsd(li.totalPrice)}</strong></td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Invoice ${inv.invoiceNumber}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:40px;max-width:800px;margin:0 auto}
        h1{font-size:28px;margin:0} .sub{color:#64748b;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;
               background:${inv.status==='PAID'?'#dcfce7':'#dbeafe'};color:${inv.status==='PAID'?'#15803d':'#1d4ed8'}}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
        .info-box{background:#f8fafc;border-radius:8px;padding:16px}
        .info-box p{margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700}
        .info-box h3{margin:0;font-size:15px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th{background:#f1f5f9;padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase}
        td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .totals{margin-left:auto;width:280px}
        .totals tr td{border:none;padding:6px 12px}
        .totals tr.grand td{font-size:16px;font-weight:800;border-top:2px solid #1e293b;padding-top:12px}
        .footer{margin-top:40px;text-align:center;font-size:11px;color:#94a3b8}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <div><h1>INVOICE</h1><p class="sub">${inv.invoiceNumber}</p></div>
        <div style="text-align:right">
          <span class="badge">${inv.status}</span>
          <p class="sub" style="margin-top:8px">Issued: ${fmt(inv.createdAt)}</p>
          <p class="sub">Paid: ${fmt(inv.paidAt)}</p>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box"><p>Organisation</p><h3>${inv.orgName ?? '—'}</h3></div>
        <div class="info-box"><p>Plan</p><h3>${inv.planName ?? '—'}</h3></div>
        <div class="info-box"><p>Billing Period</p><h3>${fmt(inv.billingPeriodStart)} → ${fmt(inv.billingPeriodEnd)}</h3></div>
        <div class="info-box"><p>Currency</p><h3>${inv.currency}</h3></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th><th style="text-align:center">Tax</th>
          <th style="text-align:right">Total</th></tr></thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">${fmtUsd(inv.subtotal)}</td></tr>
        <tr><td>Tax (19%)</td><td style="text-align:right">${fmtUsd(inv.taxAmount)}</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right">${fmtUsd(inv.total)} ${inv.currency}</td></tr>
      </table>
      <div class="footer">Unitum · unitumgroup1@gmail.com · Generated ${new Date().toLocaleString()}</div>
      <script>window.onload=()=>{window.print()}</script>
      </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  getInvClass(s:string) { return ({PAID:'pill-green',OPEN:'pill-yellow',DRAFT:'pill-blue',VOID:'pill-red'})[s]??'pill-blue'; }
  getPayStatus(s:string) { return ({CONFIRMED:'pill-green',PENDING:'pill-yellow',REJECTED:'pill-red'})[s]??'pill-blue'; }
  getRiskClass(r:string) { return ({HIGH:'pill-red',MEDIUM:'pill-yellow',LOW:'pill-green'})[r]??'pill-blue'; }
  getUpsellClass(s:string) { return ({PENDING:'pill-yellow',SHOWN:'pill-blue',ACCEPTED:'pill-green',DISMISSED:'pill-red'})[s]??'pill-blue'; }
}
