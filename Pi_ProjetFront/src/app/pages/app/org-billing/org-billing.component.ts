import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { RouterModule, Router } from '@angular/router';
import { Component, OnInit, inject, ChangeDetectorRef, signal } from '@angular/core';
import { forkJoin, of, switchMap, map, catchError } from 'rxjs';
import {
  OrgBillingService, SubscriptionDTO, InvoiceDTO, PlanDTO,
  MyPaymentDTO, PaymentAttemptDTO, UsageQuotaDTO
} from '../../../billing/services/org-billing.service';
import { CheckoutStateService } from '../../../billing/services/checkout-state.service';
import { BillingService } from '../../../billing/services/billing.service';
import { Plan } from '../../../billing/models/billing.models';

interface FePlan {
  name: string;
  subtitle: string;
  icon: string;
  recommended?: boolean;
  onRequest?: boolean;
  academic?: boolean;
  limits: { users: string; workspaces: string; projects: string; storage: string; };
  features: string[];
  priceMonthly: number;
  priceYearly: number;
}

@Component({
  selector: 'app-org-billing',
  standalone: true,
    imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatTooltipModule, MatRippleModule, RouterModule
  ],
  template: `
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">My Billing</h3>
            <p class="small opacity-50">Subscription, invoices, usage and payment history</p>
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
              <div class="stat-icon theme-green"><mat-icon class="material-icons-outlined">workspace_premium</mat-icon></div>
              <p class="stat-label">Current Plan</p>
              <h4 class="stat-plan">{{ planLabel }}</h4>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-blue"><mat-icon class="material-icons-outlined">autorenew</mat-icon></div>
              <p class="stat-label">Status</p>
              <span class="pill" [class]="getSubStatusClass(statusLabel)">{{ statusLabel }}</span>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-yellow"><mat-icon class="material-icons-outlined">receipt_long</mat-icon></div>
              <p class="stat-label">Total Invoices</p>
              <h3 class="stat-val">{{ invoices.length }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon theme-purple"><mat-icon class="material-icons-outlined">calendar_today</mat-icon></div>
              <p class="stat-label">Renewal</p>
              <p class="stat-date">{{ renewalDate }}</p>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <mat-card>
        <mat-card-content class="p-0">
          <mat-tab-group animationDuration="200ms" [dynamicHeight]="true">

            <!-- TAB 1 : SUBSCRIPTION + USAGE QUOTA (réel depuis BD) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">workspace_premium</mat-icon>My Subscription
              </ng-template>
              <div class="tab-content">

                <!-- Subscription depuis BD (subscriptions table) -->
                <ng-container *ngIf="subscription">
                  <div class="sub-card mb-4">
                    <div class="sub-banner">
                      <div class="sub-badge"><mat-icon class="material-icons-outlined">workspace_premium</mat-icon></div>
                      <div>
                        <h3 class="mb-1">{{ subscription.planDisplayName }}</h3>
                        <p class="mb-0 opacity-75">{{ subscription.billingCycle }} billing</p>
                      </div>
                      <span class="pill ms-auto" [class]="getSubStatusClass(subscription.status)">{{ subscription.status }}</span>
                    </div>
                    <div class="sub-body">
                      <div class="sub-row"><span>Plan</span><strong>{{ subscription.planDisplayName }}</strong></div>
                      <div class="sub-row"><span>Billing Cycle</span><strong>{{ subscription.billingCycle }}</strong></div>
                      <div class="sub-row"><span>Monthly Price</span><strong>{{ subscription.planPriceMonthly | number:'1.0-0' }} DT</strong></div>
                      <div class="sub-row"><span>Annual/mo</span><strong>{{ subscription.planPriceYearly | number:'1.0-0' }} DT</strong></div>
                      <div class="sub-row"><span>Period Start</span><strong>{{ subscription.currentPeriodStart | date:'dd MMM yyyy' }}</strong></div>
                      <div class="sub-row"><span>Period End</span><strong>{{ subscription.currentPeriodEnd | date:'dd MMM yyyy' }}</strong></div>
                      <div class="sub-row"><span>Subscribed On</span><strong>{{ subscription.createdAt | date:'dd MMM yyyy' }}</strong></div>
                    </div>
                    <div class="sub-footer">
                      <button mat-flat-button color="primary" (click)="goUpgrade()">
                        <mat-icon class="material-icons-outlined">upgrade</mat-icon> Upgrade Plan
                      </button>
                      <button *ngIf="(subscription?.status ?? '').toUpperCase() !== 'CANCELED'" mat-stroked-button class="ms-2" style="color:#ef4444;border-color:#ef4444" (click)="cancelSub()">
                        <mat-icon class="material-icons-outlined">cancel</mat-icon> Cancel
                      </button>
                      <span *ngIf="(subscription?.status ?? '').toUpperCase() === 'CANCELED'" class="pill pill-red">Canceled</span>
                    </div>
                  </div>
                </ng-container>

                <!-- Fallback paiement -->
                <ng-container *ngIf="!subscription && myPayment">
                  <div class="sub-card mb-4">
                    <div class="sub-banner" style="background:linear-gradient(135deg,#0f766e,#0d9488)">
                      <div class="sub-badge"><mat-icon class="material-icons-outlined">check_circle</mat-icon></div>
                      <div>
                        <h3 class="mb-1">{{ myPayment.planName }}</h3>
                        <p class="mb-0 opacity-75">{{ myPayment.billingCycle }} · {{ myPayment.orgName }}</p>
                      </div>
                      <span class="pill pill-green ms-auto">{{ myPayment.status }}</span>
                    </div>
                    <div class="sub-body">
                      <div class="sub-row"><span>Organisation</span><strong>{{ myPayment.orgName }}</strong></div>
                      <div class="sub-row"><span>Plan</span><strong>{{ myPayment.planName }}</strong></div>
                      <div class="sub-row"><span>Billing Cycle</span><strong>{{ myPayment.billingCycle }}</strong></div>
                      <div class="sub-row"><span>Amount Paid</span><strong>{{ myPayment.amount | number:'1.0-0' }} DT</strong></div>
                      <div class="sub-row"><span>Users</span><strong>{{ myPayment.numUsers }}</strong></div>
                      <div class="sub-row"><span>Payment ID</span><code>{{ myPayment.paymentId }}</code></div>
                      <div class="sub-row"><span>Subscribed On</span><strong>{{ myPayment.createdAt | date:'dd MMM yyyy' }}</strong></div>
                    </div>
                    <div class="sub-footer">
                      <button mat-flat-button color="primary" (click)="goUpgrade()">
                        <mat-icon class="material-icons-outlined">upgrade</mat-icon> Upgrade Plan
                      </button>
                      <button *ngIf="(myPayment?.status ?? '').toUpperCase() !== 'CANCELED'" mat-stroked-button class="ms-2" style="color:#ef4444;border-color:#ef4444"
                              [disabled]="unsubscribing" (click)="cancelSub()">
                        <mat-icon class="material-icons-outlined">{{ unsubscribing ? 'hourglass_empty' : 'cancel' }}</mat-icon>
                        {{ unsubscribing ? 'Processing…' : 'Unsubscribe' }}
                      </button>
                      <span *ngIf="(myPayment?.status ?? '').toUpperCase() === 'CANCELED'" class="pill pill-red">Canceled</span>
                    </div>
                  </div>
                </ng-container>

                <div class="empty-state" *ngIf="!subscription && !myPayment && !loading">
                  <mat-icon class="material-icons-outlined">workspace_premium</mat-icon>
                  <p>No subscription found. <a routerLink="/billing/pricing">Choose a plan →</a></p>
                </div>

                <!-- USAGE QUOTA (réel depuis BD - table usage_metrics) -->
                <div *ngIf="usageQuota || subscription || myPayment">
                  <div class="section-title">
                    <h4 class="mb-0">Usage Metrics</h4>
                    <span class="pill pill-blue">LIVE — table: usage_metrics</span>
                  </div>
                  <p class="text-secondary small mb-3" *ngIf="usageQuota">
                    Last updated: {{ usageQuota.updatedAt | date:'dd MMM yyyy HH:mm' }} ·
                    Plan limits from: <strong>{{ usageQuota.planName }}</strong>
                  </p>

                  <div class="row gx-3" *ngIf="usageQuota">
                    <!-- Members -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card" [class.alert-card]="usageQuota.alert80Sent">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">group</mat-icon>
                            <span>Active Members</span>
                            <span class="pill pill-red ms-auto" *ngIf="usageQuota.alert80Sent">⚠ 80%+</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.activeMembersCount }}</h4>
                            <span>/ {{ usageQuota.maxMembers }}</span>
                          </div>
                          <div class="usage-bar">
                            <div class="usage-fill"
                                 [style.width.%]="usageQuota.membersPct"
                                 [style.background]="usageQuota.membersPct>80?'#ef4444':usageQuota.membersPct>60?'#f59e0b':'#22c55e'">
                            </div>
                          </div>
                          <p class="usage-pct">{{ usageQuota.membersPct | number:'1.0-0' }}%</p>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    <!-- Workspaces -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">workspaces</mat-icon>
                            <span>Workspaces</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.workspacesCount }}</h4>
                            <span>/ {{ usageQuota.maxWorkspaces }}</span>
                          </div>
                          <div class="usage-bar">
                            <div class="usage-fill"
                                 [style.width.%]="usageQuota.workspacesPct"
                                 [style.background]="usageQuota.workspacesPct>80?'#ef4444':usageQuota.workspacesPct>60?'#f59e0b':'#22c55e'">
                            </div>
                          </div>
                          <p class="usage-pct">{{ usageQuota.workspacesPct | number:'1.0-0' }}%</p>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    <!-- Projects -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">folder_open</mat-icon>
                            <span>Projects</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.projectsCount }}</h4>
                            <span>/ {{ usageQuota.maxProjects }}</span>
                          </div>
                          <div class="usage-bar">
                            <div class="usage-fill"
                                 [style.width.%]="usageQuota.projectsPct"
                                 [style.background]="usageQuota.projectsPct>80?'#ef4444':usageQuota.projectsPct>60?'#f59e0b':'#22c55e'">
                            </div>
                          </div>
                          <p class="usage-pct">{{ usageQuota.projectsPct | number:'1.0-0' }}%</p>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    <!-- Storage -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">storage</mat-icon>
                            <span>Storage</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.storageUsedGb | number:'1.1-1' }} GB</h4>
                            <span>/ {{ usageQuota.maxStorageGb | number:'1.0-0' }} GB</span>
                          </div>
                          <div class="usage-bar">
                            <div class="usage-fill"
                                 [style.width.%]="usageQuota.storagePct"
                                 [style.background]="usageQuota.storagePct>80?'#ef4444':usageQuota.storagePct>60?'#f59e0b':'#22c55e'">
                            </div>
                          </div>
                          <p class="usage-pct">{{ usageQuota.storagePct | number:'1.0-0' }}%</p>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    <!-- API Calls -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">api</mat-icon>
                            <span>API Calls</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.apiCallsCount | number }}</h4>
                            <span>this month</span>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                    <!-- ML Inferences -->
                    <div class="col-12 col-md-6 col-lg-4">
                      <mat-card class="mb-3 usage-card">
                        <mat-card-content>
                          <div class="usage-head">
                            <mat-icon class="material-icons-outlined">psychology</mat-icon>
                            <span>ML Inferences</span>
                          </div>
                          <div class="usage-nums">
                            <h4>{{ usageQuota.mlInferencesCount | number }}</h4>
                            <span>this month</span>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    </div>
                  </div>

                  <div class="empty-state" *ngIf="!usageQuota">
                    <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                    <p>Usage metrics will appear here once your first daily snapshot is computed.</p>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 2 : INVOICES + LINE ITEMS (réel depuis BD) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">receipt_long</mat-icon>
                Invoices <span class="tab-badge" *ngIf="invoices.length">{{ invoices.length }}</span>
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">My Invoices</h4>
                    <p class="text-secondary small mb-0">
                      Tables: <code>invoices</code> + <code>invoice_line_items</code> — read only
                    </p>
                  </div>
                  <span class="pill pill-blue">READ ONLY</span>
                </div>

                <!-- Invoices depuis BD -->
                <ng-container *ngFor="let inv of invoices">
                  <mat-card class="mb-3 mt-3 invoice-card">
                    <mat-card-content>
                      <div class="inv-header">
                        <div>
                          <h5 class="mb-0">{{ inv.invoiceNumber }}</h5>
                          <p class="text-secondary small mb-0">{{ inv.createdAt | date:'dd MMM yyyy' }}</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <span class="pill" [class]="getInvClass(inv.status)">{{ inv.status }}</span>
                          <strong>{{ inv.total | number:'1.0-0' }} DT</strong>
                        </div>
                      </div>

                      <!-- Line Items (réels depuis BD) -->
                      <div class="line-items" *ngIf="inv.lineItems && inv.lineItems.length > 0">
                        <p class="li-title">Line Items <span class="pill pill-blue">invoice_line_items</span></p>
                        <table class="li-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th class="text-end">Qty</th>
                              <th class="text-end">Unit Price</th>
                              <th class="text-end">Tax</th>
                              <th class="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let li of inv.lineItems">
                              <td>{{ li.description }}</td>
                              <td class="text-end">{{ li.quantity }}</td>
                              <td class="text-end">{{ li.unitPrice | number:'1.0-0' }} DT</td>
                              <td class="text-end">{{ li.taxRate }}%</td>
                              <td class="text-end"><strong>{{ li.totalPrice | number:'1.0-0' }} DT</strong></td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr class="total-row">
                              <td colspan="4">Subtotal</td>
                              <td class="text-end">{{ inv.subtotal | number:'1.0-0' }} DT</td>
                            </tr>
                            <tr class="total-row">
                              <td colspan="4">Tax (19%)</td>
                              <td class="text-end">{{ inv.taxAmount | number:'1.0-0' }} DT</td>
                            </tr>
                            <tr class="grand-total">
                              <td colspan="4"><strong>Total</strong></td>
                              <td class="text-end"><strong>{{ inv.total | number:'1.0-0' }} DT</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div class="d-flex justify-content-between align-items-center mt-2">
                        <p class="text-secondary small mb-0">
                          Period: {{ inv.billingPeriodStart | date:'dd/MM/yy' }} → {{ inv.billingPeriodEnd | date:'dd/MM/yy' }}
                          <span *ngIf="inv.paidAt"> · Paid: {{ inv.paidAt | date:'dd MMM yyyy' }}</span>
                        </p>
                        <button mat-icon-button matTooltip="Download invoice PDF" (click)="dl(inv)">
                          <mat-icon class="material-icons-outlined" style="color:#dc2626">picture_as_pdf</mat-icon>
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </ng-container>

                <!-- Fallback -->
                <div *ngIf="invoices.length === 0 && myPayment && !loading" class="mt-3">
                  <mat-card class="invoice-card">
                    <mat-card-content>
                      <div class="inv-header">
                        <div>
                          <h5 class="mb-0">INV-{{ myPayment.paymentId }}</h5>
                          <p class="text-secondary small mb-0">{{ myPayment.createdAt | date:'dd MMM yyyy' }}</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                          <span class="pill pill-green">PAID</span>
                          <strong>{{ myPayment.amount | number:'1.0-0' }} DT</strong>
                        </div>
                      </div>
                      <div class="line-items mt-2">
                        <table class="li-table">
                          <tbody>
                            <tr>
                              <td>{{ myPayment.planName }} Plan – {{ myPayment.billingCycle }} Subscription</td>
                              <td class="text-end">1</td>
                              <td class="text-end">{{ myPayment.amount | number:'1.0-0' }} DT</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="empty-state" *ngIf="invoices.length === 0 && !myPayment && !loading">
                  <mat-icon class="material-icons-outlined">receipt_long</mat-icon>
                  <p>No invoices yet.</p>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 3 : PAYMENT ATTEMPTS (réel depuis BD) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">payments</mat-icon>
                Payment Attempts <span class="tab-badge" *ngIf="paymentAttempts.length">{{ paymentAttempts.length }}</span>
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">Payment Attempts</h4>
                    <p class="text-secondary small mb-0">Table: <code>payment_attempts</code> — read only</p>
                  </div>
                  <span class="pill pill-blue">READ ONLY</span>
                </div>

                <div class="table-responsive mt-3">
                  <table mat-table [dataSource]="attemptsDS" class="bg-none w-100" *ngIf="paymentAttempts.length > 0">
                    <ng-container matColumnDef="attempt">
                      <th mat-header-cell *matHeaderCellDef>#</th>
                      <td mat-cell *matCellDef="let a" class="py-2">
                        <strong>Attempt {{ a.attemptNumber }}</strong>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="invoice">
                      <th mat-header-cell *matHeaderCellDef>Invoice</th>
                      <td mat-cell *matCellDef="let a">
                        <span class="text-secondary small">{{ a.invoiceNumber }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="amount">
                      <th mat-header-cell *matHeaderCellDef>Amount</th>
                      <td mat-cell *matCellDef="let a"><strong>{{ a.amount | number:'1.0-0' }} DT</strong></td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let a">
                        <span class="pill" [class]="getAttemptClass(a.status)">{{ a.status }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="error">
                      <th mat-header-cell *matHeaderCellDef>Error</th>
                      <td mat-cell *matCellDef="let a" class="text-secondary small">
                        {{ a.failureCode ?? '—' }}
                        <span *ngIf="a.failureMessage"> · {{ a.failureMessage }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Date</th>
                      <td mat-cell *matCellDef="let a" class="text-secondary small">
                        {{ a.attemptedAt | date:'dd MMM yyyy HH:mm' }}
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="attemptCols"></tr>
                    <tr mat-row *matRowDef="let r; columns: attemptCols"></tr>
                  </table>
                </div>

                <div class="empty-state" *ngIf="paymentAttempts.length === 0 && !loading">
                  <mat-icon class="material-icons-outlined">payments</mat-icon>
                  <p>No payment attempts recorded yet.</p>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 4 : PLANS -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">inventory_2</mat-icon>Plans
              </ng-template>
              <div class="tab-content">

                <!-- ── CURRENT PLAN + INVOICES ── -->
                <div class="section-title mb-2">
                  <h4 class="mb-0">Your Current Plan</h4>
                  <span class="pill pill-blue">ACTIVE</span>
                </div>

                <ng-container *ngIf="subscription || myPayment; else noPlan">
                  <div class="plan-invoice-block mb-4">

                    <!-- Plan summary row -->
                    <div class="pi-plan-row">
                      <div class="pi-icon"><mat-icon class="material-icons-outlined">workspace_premium</mat-icon></div>
                      <div class="pi-info">
                        <h5 class="mb-0">{{ subscription?.planDisplayName ?? myPayment?.planName ?? '—' }}</h5>
                        <p class="text-secondary small mb-0">
                          {{ subscription?.billingCycle ?? myPayment?.billingCycle ?? '' }} billing ·
                          <span class="pill" [class]="getSubStatusClass(subscription?.status ?? myPayment?.status)">
                            {{ subscription?.status ?? myPayment?.status ?? '—' }}
                          </span>
                        </p>
                      </div>
                      <div class="pi-price ms-auto text-end">
                        <span class="pi-amount">{{ (subscription?.planPriceMonthly ?? myPayment?.amount ?? 0) | number:'1.0-0' }} DT</span>
                        <span class="pi-period text-secondary small d-block">/ month</span>
                      </div>
                      <button mat-flat-button color="primary" class="ms-3" (click)="goUpgrade()">
                        <mat-icon class="material-icons-outlined">upgrade</mat-icon> Upgrade
                      </button>
                    </div>

                    <!-- Invoices linked to this plan -->
                    <div class="pi-invoices-section" *ngIf="invoices.length > 0">
                      <p class="pi-inv-title">
                        <mat-icon class="material-icons-outlined">receipt_long</mat-icon>
                        Plan Invoices
                        <span class="tab-badge">{{ invoices.length }}</span>
                      </p>
                      <div class="pi-inv-list">
                        <div class="pi-inv-row" *ngFor="let inv of invoices">
                          <div class="pi-inv-left">
                            <span class="pi-inv-num">{{ inv.invoiceNumber }}</span>
                            <span class="text-secondary small ms-2">{{ inv.createdAt | date:'dd MMM yyyy' }}</span>
                            <span class="pill ms-2" [class]="getInvClass(inv.status)">{{ inv.status }}</span>
                          </div>
                          <div class="pi-inv-right">
                            <strong>{{ inv.total | number:'1.0-0' }} DT</strong>
                            <button mat-icon-button matTooltip="Download PDF" (click)="dl(inv)" class="ms-1">
                              <mat-icon class="material-icons-outlined" style="color:#dc2626;font-size:18px">picture_as_pdf</mat-icon>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Fallback invoice from payment -->
                    <div class="pi-invoices-section" *ngIf="invoices.length === 0 && myPayment">
                      <p class="pi-inv-title">
                        <mat-icon class="material-icons-outlined">receipt_long</mat-icon> Plan Invoices
                      </p>
                      <div class="pi-inv-list">
                        <div class="pi-inv-row">
                          <div class="pi-inv-left">
                            <span class="pi-inv-num">INV-{{ myPayment.paymentId }}</span>
                            <span class="text-secondary small ms-2">{{ myPayment.createdAt | date:'dd MMM yyyy' }}</span>
                            <span class="pill pill-green ms-2">PAID</span>
                          </div>
                          <div class="pi-inv-right">
                            <strong>{{ myPayment.amount | number:'1.0-0' }} DT</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="pi-no-inv" *ngIf="invoices.length === 0 && !myPayment && !loading">
                      <mat-icon class="material-icons-outlined">receipt_long</mat-icon>
                      <span>No invoices yet for this plan.</span>
                    </div>
                  </div>
                </ng-container>

                <ng-template #noPlan>
                  <div class="empty-state mb-4" *ngIf="!loading">
                    <mat-icon class="material-icons-outlined">workspace_premium</mat-icon>
                    <p>No active plan. <a routerLink="/billing/pricing">Choose a plan →</a></p>
                  </div>
                </ng-template>

                <!-- ── UPGRADE OPTIONS ── -->
                <div class="section-title mb-3 mt-2">
                  <h4 class="mb-0">Upgrade Your Plan</h4>
                  <div class="d-flex align-items-center gap-2">
                    <span class="small fw-medium" [class.text-secondary]="plansCycle() === 'annual'">Monthly</span>
                    <div class="ptoggle" (click)="togglePlansCycle()">
                      <div class="ptoggle-track" [class.annual]="plansCycle() === 'annual'">
                        <div class="ptoggle-thumb"></div>
                      </div>
                    </div>
                    <span class="small fw-medium" [class.text-secondary]="plansCycle() === 'monthly'">
                      Annual <span class="badge text-bg-success ms-1" style="font-size:10px">-20%</span>
                    </span>
                  </div>
                </div>

                <div class="row gx-3 gx-lg-4 align-items-stretch">
                  <div class="col-12 col-md-6 col-xl-3 mb-4" *ngFor="let p of visiblePlans">
                    <div class="pcard h-100"
                         [class.pcard-recommended]="p.recommended"
                         [class.pcard-current]="isCurrentPlanFe(p)"
                         [class.pcard-on-request]="p.onRequest"
                         matRipple>

                      <div class="pcard-badge-recommended" *ngIf="p.recommended">
                        <mat-icon>star</mat-icon> Recommended
                      </div>
                      <div class="pcard-badge-current" *ngIf="isCurrentPlanFe(p)">
                        <mat-icon>check_circle</mat-icon> Current
                      </div>

                      <div class="pcard-header">
                        <div class="pcard-icon" [class.icon-academic]="isAcademicOrg">
                          <mat-icon>{{ p.icon }}</mat-icon>
                        </div>
                        <div>
                          <h5 class="mb-0">{{ p.name }}</h5>
                          <p class="text-secondary small mb-0">{{ p.subtitle }}</p>
                        </div>
                      </div>

                      <div class="pcard-price">
                        <ng-container *ngIf="p.onRequest; else priceBlock">
                          <span class="pcard-price-amount" style="font-size:1.8rem">On Request</span>
                          <p class="text-secondary small mb-0">Custom pricing</p>
                        </ng-container>
                        <ng-template #priceBlock>
                          <span class="pcard-price-amount">{{ getPlanPrice(p) }}</span>
                          <span class="pcard-price-currency"> DT</span>
                          <span class="pcard-price-period">/ {{ plansCycle() === 'monthly' ? 'mo' : 'mo · billed annually' }}</span>
                        </ng-template>
                      </div>

                      <div class="pcard-limits">
                        <span class="plimit"><mat-icon>people</mat-icon>{{ p.limits.users }} users</span>
                        <span class="plimit"><mat-icon>workspaces</mat-icon>{{ p.limits.workspaces }} ws</span>
                        <span class="plimit"><mat-icon>folder</mat-icon>{{ p.limits.projects }} proj</span>
                        <span class="plimit"><mat-icon>storage</mat-icon>{{ p.limits.storage }}</span>
                      </div>

                      <ul class="pcard-features">
                        <li *ngFor="let f of p.features">
                          <mat-icon class="pfeature-check">check_circle</mat-icon>{{ f }}
                        </li>
                      </ul>

                      <div class="pcard-cta mt-auto pt-3">
                        <ng-container *ngIf="isCurrentPlanFe(p); else upgradeBtn">
                          <button mat-stroked-button class="w-100" disabled>✓ Your Current Plan</button>
                        </ng-container>
                        <ng-template #upgradeBtn>
                          <ng-container *ngIf="p.onRequest; else regularBtn">
                            <button mat-stroked-button class="w-100" (click)="goUpgrade()">
                              <mat-icon>mail</mat-icon> Contact Sales
                            </button>
                          </ng-container>
                          <ng-template #regularBtn>
                            <button mat-flat-button color="primary" class="w-100 pcard-btn" (click)="choosePlanFe(p)">
                              Get Started <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                            </button>
                          </ng-template>
                        </ng-template>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </mat-tab>

          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stat-card mat-card-content { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:16px; }
    .stat-icon { width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
    .stat-icon mat-icon { color:#fff; font-size:20px; }
    .stat-label { font-size:12px; color:#64748b; margin:0; font-weight:600; text-transform:uppercase; }
    .stat-val { font-size:24px; font-weight:800; margin:0; }
    .stat-plan { font-size:15px; font-weight:700; margin:0; }
    .stat-date { font-size:13px; font-weight:700; margin:0; }
    .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .pill-green { background:#dcfce7; color:#15803d; }
    .pill-red { background:#fee2e2; color:#dc2626; }
    .pill-blue { background:#dbeafe; color:#1d4ed8; }
    .pill-yellow { background:#fef9c3; color:#a16207; }
    .tab-icon { font-size:18px; width:18px; height:18px; margin-right:6px; }
    .tab-badge { background:#e0e7ff; color:#4f46e5; border-radius:10px; padding:2px 8px; font-size:11px; font-weight:700; margin-left:6px; }
    .tab-content { padding:24px; }
    .tab-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .section-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }

    /* Plan + Invoice block (TAB 4) */
    .plan-invoice-block { border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; }
    .pi-plan-row { display:flex; align-items:center; gap:16px; background:linear-gradient(135deg,#6366f1,#4f46e5); padding:20px 24px; }
    .pi-icon { width:44px; height:44px; background:rgba(255,255,255,.2); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .pi-icon mat-icon { color:#fff; font-size:22px; }
    .pi-info h5, .pi-info p { color:#fff; }
    .pi-amount { font-size:22px; font-weight:800; color:#fff; }
    .pi-period { color:rgba(255,255,255,.7); font-size:12px; }
    .pi-invoices-section { padding:16px 24px; border-top:1px solid #f1f5f9; }
    .pi-inv-title { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:10px; }
    .pi-inv-title mat-icon { font-size:16px; width:16px; height:16px; color:#6366f1; }
    .pi-inv-list { display:flex; flex-direction:column; gap:8px; }
    .pi-inv-row { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border-radius:8px; border:1px solid #f1f5f9; }
    .pi-inv-left { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
    .pi-inv-right { display:flex; align-items:center; gap:4px; white-space:nowrap; }
    .pi-inv-num { font-size:13px; font-weight:700; color:#1e293b; }
    .pi-no-inv { display:flex; align-items:center; gap:8px; padding:16px 24px; color:#94a3b8; font-size:13px; border-top:1px solid #f1f5f9; }
    .pi-no-inv mat-icon { font-size:18px; width:18px; height:18px; }

    /* Subscription */
    .sub-card { border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; }
    .sub-banner { display:flex; align-items:center; gap:16px; background:linear-gradient(135deg,#6366f1,#4f46e5); padding:24px; color:#fff; }
    .sub-badge { width:50px; height:50px; background:rgba(255,255,255,.2); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sub-badge mat-icon { color:#fff; font-size:24px; }
    .sub-banner h3, .sub-banner p { color:#fff; }
    .sub-body { padding:20px 24px; }
    .sub-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
    .sub-row:last-child { border-bottom:none; }
    .sub-row span { color:#64748b; }
    .sub-footer { padding:16px 24px; background:#f8fafc; }

    /* Usage */
    .usage-card { border:1px solid #e5e7eb; }
    .usage-card.alert-card { border-color:#f59e0b; }
    .usage-head { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:13px; color:#64748b; font-weight:600; }
    .usage-head mat-icon { font-size:18px; width:18px; height:18px; color:#6366f1; }
    .usage-nums { display:flex; align-items:baseline; gap:6px; margin-bottom:8px; }
    .usage-nums h4 { margin:0; font-size:22px; font-weight:800; }
    .usage-nums span { color:#94a3b8; font-size:13px; }
    .usage-bar { height:8px; background:#f1f5f9; border-radius:10px; overflow:hidden; margin-bottom:4px; }
    .usage-fill { height:100%; border-radius:10px; transition:width .4s; }
    .usage-pct { font-size:11px; color:#94a3b8; margin:0; text-align:right; }

    /* Invoices */
    .invoice-card { border:1px solid #e5e7eb; }
    .inv-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .line-items { background:#f8fafc; border-radius:10px; padding:12px 16px; }
    .li-title { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
    .li-table { width:100%; border-collapse:collapse; font-size:13px; }
    .li-table th { color:#94a3b8; font-weight:600; font-size:11px; text-transform:uppercase; padding:6px 8px; border-bottom:1px solid #e2e8f0; }
    .li-table td { padding:8px; border-bottom:1px solid #f1f5f9; color:#1e293b; }
    .li-table tfoot td { color:#64748b; font-size:12px; padding:6px 8px; }
    .li-table .total-row td { border-bottom:1px solid #e2e8f0; }
    .li-table .grand-total td { font-size:14px; padding-top:10px; border-bottom:none; }

    /* Plan cards (legacy kept for fallback) */
    .plan-card { border:1px solid #e5e7eb; }
    .plan-card.current-plan { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.2); }
    .plan-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .price-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
    .price-box { background:#f8fafc; border-radius:8px; padding:8px; text-align:center; }
    .price-lbl { display:block; font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; }
    .price-val { display:block; font-size:20px; font-weight:800; color:#1e293b; }
    .plan-meta { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .meta-row { display:flex; align-items:center; gap:6px; font-size:12px; color:#64748b; }
    .meta-row mat-icon { font-size:15px; width:15px; height:15px; }

    /* New plan cards (Tab 4) */
    .pcard { position:relative; border:1px solid #e5e7eb; border-radius:16px; padding:24px; display:flex; flex-direction:column; background:#fff; transition:box-shadow .2s, border-color .2s; overflow:hidden; }
    .pcard:hover { box-shadow:0 8px 24px rgba(0,0,0,.08); }
    .pcard-recommended { border-color:#6366f1; box-shadow:0 0 0 2px rgba(99,102,241,.15); }
    .pcard-current { border-color:#22c55e; box-shadow:0 0 0 2px rgba(34,197,94,.15); }
    .pcard-on-request { border-color:#f59e0b; }
    .pcard-badge-recommended, .pcard-badge-current { position:absolute; top:12px; right:12px; display:flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
    .pcard-badge-recommended { background:#ede9fe; color:#7c3aed; }
    .pcard-badge-recommended mat-icon, .pcard-badge-current mat-icon { font-size:13px; width:13px; height:13px; }
    .pcard-badge-current { background:#dcfce7; color:#15803d; }
    .pcard-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
    .pcard-icon { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#4f46e5); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .pcard-icon.icon-academic { background:linear-gradient(135deg,#0ea5e9,#0284c7); }
    .pcard-icon mat-icon { color:#fff; font-size:22px; }
    .pcard-header h5 { font-weight:700; }
    .pcard-price { display:flex; align-items:baseline; gap:2px; margin-bottom:16px; }
    .pcard-price-currency { font-size:1rem; font-weight:700; color:#64748b; }
    .pcard-price-amount { font-size:2.4rem; font-weight:800; color:#1e293b; line-height:1; }
    .pcard-price-period { font-size:12px; color:#94a3b8; margin-left:4px; }
    .pcard-limits { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
    .plimit { display:flex; align-items:center; gap:4px; font-size:11px; color:#64748b; background:#f8fafc; border-radius:8px; padding:4px 8px; font-weight:600; }
    .plimit mat-icon { font-size:13px; width:13px; height:13px; color:#6366f1; }
    .pcard-features { list-style:none; padding:0; margin:0 0 8px; display:flex; flex-direction:column; gap:8px; }
    .pcard-features li { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#374151; }
    .pfeature-check { font-size:16px; width:16px; height:16px; color:#22c55e; flex-shrink:0; margin-top:1px; }
    .pcard-cta button { border-radius:10px; }
    .pcard-btn { background:linear-gradient(135deg,#6366f1,#4f46e5) !important; }

    /* Billing cycle toggle */
    .ptoggle { cursor:pointer; }
    .ptoggle-track { width:44px; height:24px; background:#e5e7eb; border-radius:12px; position:relative; transition:background .3s; }
    .ptoggle-track.annual { background:#6366f1; }
    .ptoggle-thumb { position:absolute; top:3px; left:3px; width:18px; height:18px; background:#fff; border-radius:50%; transition:left .3s; box-shadow:0 1px 4px rgba(0,0,0,.2); }
    .ptoggle-track.annual .ptoggle-thumb { left:23px; }

    .empty-state { text-align:center; padding:40px 20px; color:#94a3b8; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; }
    .empty-state p { font-size:13px; }
    .empty-state a { color:#6366f1; }
  `]
})
export class OrgBillingComponent implements OnInit {
  private orgBilling = inject(OrgBillingService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private checkoutState = inject(CheckoutStateService);

  // ── Frontend plan catalogue ──────────────────────────────────────────────
  readonly fePlans: FePlan[] = [
    {
      name: 'Starter', subtitle: 'Small teams', icon: 'rocket_launch',
      limits: { users: '5', workspaces: '3', projects: '10', storage: '5 GB' },
      features: ['5 team members', '3 workspaces', '10 projects', '5 GB storage', 'Basic ML insights'],
      priceMonthly: 49, priceYearly: 39
    },
    {
      name: 'Pro', subtitle: 'Growing orgs', icon: 'workspace_premium', recommended: true,
      limits: { users: '25', workspaces: '10', projects: 'Unlimited', storage: '100 GB' },
      features: ['25 team members', '10 workspaces', 'Unlimited projects', 'Full ML suite', 'Priority support'],
      priceMonthly: 149, priceYearly: 119
    },
    {
      name: 'Business', subtitle: 'Large enterprises', icon: 'business',
      limits: { users: '100', workspaces: 'Unlimited', projects: 'Unlimited', storage: '500 GB' },
      features: ['100 team members', 'Unlimited workspaces', 'Advanced ML models', 'SSO / SAML', 'SLA 99.9%'],
      priceMonthly: 349, priceYearly: 279
    },
    {
      name: 'Enterprise', subtitle: 'Custom scale', icon: 'domain', onRequest: true,
      limits: { users: 'Unlimited', workspaces: 'Unlimited', projects: 'Unlimited', storage: 'Custom' },
      features: ['Unlimited members', 'On-premise deploy', 'Custom ML pipelines', 'White-labeling', 'Custom SLA'],
      priceMonthly: 0, priceYearly: 0
    },
    {
      name: 'Academic', subtitle: 'Universities & research', icon: 'school', academic: true,
      limits: { users: '50', workspaces: '15', projects: '100', storage: '200 GB' },
      features: ['50 team members', '15 workspaces', '100 projects', 'Research ML tools', 'Priority support'],
      priceMonthly: 79, priceYearly: 63
    },
  ];

  plansCycle = signal<'monthly' | 'annual'>('monthly');
  togglePlansCycle() {
    this.plansCycle.update(c => c === 'monthly' ? 'annual' : 'monthly');
  }

  get visiblePlans(): FePlan[] {
    return this.fePlans.filter(p => this.isAcademicOrg ? p.academic : !p.academic);
  }

  isCurrentPlanFe(p: FePlan): boolean {
    const cur = (this.subscription?.planDisplayName ?? this.myPayment?.planName ?? '').toLowerCase();
    return cur !== '' && p.name.toLowerCase() === cur;
  }

  getPlanPrice(p: FePlan): number {
    return this.plansCycle() === 'monthly' ? p.priceMonthly : p.priceYearly;
  }

  choosePlanFe(p: FePlan): void {
    this.checkoutState.setUpgradeMode();
    this.router.navigate(['/billing/checkout'], {
      queryParams: {
        plan: p.name.toLowerCase(),
        type: this.isAcademicOrg ? 'academic' : 'enterprise',
        cycle: this.plansCycle()
      }
    });
  }
  // ────────────────────────────────────────────────────────────────────────

  goUpgrade(plan?: PlanDTO): void {
    this.checkoutState.setUpgradeMode();
    if (plan) {
      this.router.navigate(['/billing/checkout'], {
        queryParams: {
          plan: plan.name,
          type: plan.orgType ?? 'enterprise',
          cycle: 'monthly'
        }
      });
    } else {
      this.router.navigate(['/billing/pricing']);
    }
  }

  subscription: SubscriptionDTO | null = null;
  myPayment: MyPaymentDTO | null = null;
  usageQuota: UsageQuotaDTO | null = null;
  invoices: InvoiceDTO[] = [];
  paymentAttempts: PaymentAttemptDTO[] = [];
  attemptsDS = new MatTableDataSource<PaymentAttemptDTO>([]);
  attemptCols = ['attempt', 'invoice', 'amount', 'status', 'error', 'date'];
  availablePlans: PlanDTO[] = [];
  loading = true;
  unsubscribing = false;

  get planLabel() { return this.subscription?.planDisplayName ?? this.myPayment?.planName ?? '—'; }
  get statusLabel() { return this.subscription?.status ?? this.myPayment?.status ?? '—'; }
  get renewalDate() {
    if (this.subscription?.currentPeriodEnd)
      return new Date(this.subscription.currentPeriodEnd).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    return '—';
  }

  isCurrentPlan(p: PlanDTO): boolean {
    const cur = this.subscription?.planName ?? this.myPayment?.planName ?? '';
    return p.name === cur || p.displayName === cur;
  }

  get isAcademicOrg(): boolean {
    if (this.myPayment?.orgType) {
      return this.myPayment.orgType.toUpperCase() === 'ACADEMIC';
    }
    const planName = (this.subscription?.planName ?? '').toLowerCase();
    return planName.includes('academic');
  }

  get filteredPlans(): PlanDTO[] {
    return this.availablePlans.filter(p =>
      this.isAcademicOrg
        ? p.name.toLowerCase().includes('academic')
        : !p.name.toLowerCase().includes('academic')
    );
  }

  ngOnInit() {
    forkJoin({
      sub:      this.orgBilling.getMySubscription().pipe(catchError(() => of(null))),
      invoices: this.orgBilling.getMyInvoices().pipe(catchError(() => of([]))),
      payment:  this.orgBilling.getMyPayment().pipe(catchError(() => of(null))),
      plans:    this.orgBilling.getActivePlans().pipe(catchError(() => of([]))),
      usage:    this.orgBilling.getMyUsage().pipe(catchError(() => of(null))),
      attempts: this.orgBilling.getMyPaymentAttempts().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ sub, invoices, payment, plans, usage, attempts }) => {
        if (!invoices || (invoices as any[]).length === 0) {
          return of({ sub, invoices: invoices ?? [], payment, plans: plans ?? [], usage, attempts: attempts ?? [] });
        }
        const lineItemsRequests = (invoices as InvoiceDTO[]).map(inv =>
          this.orgBilling.getLineItemsByInvoice(inv.id).pipe(
            catchError(() => of([])),
            map(items => ({ ...inv, lineItems: items }))
          )
        );
        return forkJoin(lineItemsRequests).pipe(
          map(invoicesWithItems => ({
            sub, invoices: invoicesWithItems, payment, plans: plans ?? [], usage, attempts: attempts ?? []
          }))
        );
      })
    ).subscribe({
      next: ({ sub, invoices, payment, plans, usage, attempts }) => {
        this.subscription    = sub;
        this.invoices        = invoices;
        this.myPayment       = payment;
        this.availablePlans  = plans;
        this.usageQuota      = usage;
        this.paymentAttempts = attempts;
        this.attemptsDS.data = attempts;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  cancelSub() {
    if (!confirm('Are you sure you want to unsubscribe? This action cannot be undone.')) return;
    this.unsubscribing = true;
    const cancel$ = this.subscription
      ? this.orgBilling.cancelSubscription()
      : this.orgBilling.cancelPayment();

    cancel$.subscribe({
      next: () => {
        this.unsubscribing = false;
        if (this.subscription) {
          this.subscription = { ...this.subscription, status: 'CANCELED' };
        }
        if (this.myPayment) {
          this.myPayment = { ...this.myPayment, status: 'CANCELED' };
        }
        this.cdr.detectChanges();
        alert('You have been successfully unsubscribed.');
      },
      error: () => {
        this.unsubscribing = false;
        this.cdr.detectChanges();
        alert('Failed to unsubscribe. Please try again or contact support.');
      }
    });
  }

  dl(inv: InvoiceDTO) {
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
        <div class="info-box"><p>Plan</p><h3>${inv.planName ?? '—'}</h3></div>
        <div class="info-box"><p>Currency</p><h3>${inv.currency}</h3></div>
        <div class="info-box"><p>Billing Period</p><h3>${fmt(inv.billingPeriodStart)} → ${fmt(inv.billingPeriodEnd)}</h3></div>
        <div class="info-box"><p>Due Date</p><h3>${fmt(inv.dueDate)}</h3></div>
      </div>
      <table>
        <thead><tr><th>Description</th><th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th><th style="text-align:center">Tax</th>
          <th style="text-align:right">Total</th></tr></thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">${fmtUsd(inv.subtotal)}</td></tr>
        ${inv.couponCode && inv.discountAmount ? `
        <tr style="color:#16a34a">
          <td>Coupon <strong>${inv.couponCode}</strong></td>
          <td style="text-align:right">− ${fmtUsd(inv.discountAmount)}</td>
        </tr>` : ''}
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

  getSubStatusClass(s?: string) { return ({ACTIVE:'pill-green',TRIALING:'pill-blue',PAST_DUE:'pill-yellow',CANCELED:'pill-red'})[s??'']??'pill-blue'; }
  getInvClass(s: string) { return ({PAID:'pill-green',OPEN:'pill-yellow',DRAFT:'pill-blue',VOID:'pill-red'})[s]??'pill-blue'; }
  getAttemptClass(s: string) { return ({SUCCEEDED:'pill-green',FAILED:'pill-red',PENDING:'pill-yellow',REQUIRES_ACTION:'pill-blue'})[s]??'pill-blue'; }
}
