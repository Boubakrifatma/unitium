import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { forkJoin, of, switchMap, map } from 'rxjs';
import {
  OrgBillingService, SubscriptionDTO, InvoiceDTO, PlanDTO,
  MyPaymentDTO, PaymentAttemptDTO, UsageQuotaDTO
} from '../../../billing/services/org-billing.service';

@Component({
  selector: 'app-org-billing',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatTooltipModule, RouterModule
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
                      <div class="sub-row"><span>Monthly Price</span><strong>\${{ subscription.planPriceMonthly | number:'1.2-2' }}</strong></div>
                      <div class="sub-row"><span>Annual/mo</span><strong>\${{ subscription.planPriceYearly | number:'1.2-2' }}</strong></div>
                      <div class="sub-row"><span>Period Start</span><strong>{{ subscription.currentPeriodStart | date:'dd MMM yyyy' }}</strong></div>
                      <div class="sub-row"><span>Period End</span><strong>{{ subscription.currentPeriodEnd | date:'dd MMM yyyy' }}</strong></div>
                      <div class="sub-row"><span>Subscribed On</span><strong>{{ subscription.createdAt | date:'dd MMM yyyy' }}</strong></div>
                    </div>
                    <div class="sub-footer">
                      <button mat-flat-button color="primary" routerLink="/billing/pricing">
                        <mat-icon class="material-icons-outlined">upgrade</mat-icon> Upgrade Plan
                      </button>
                      <button mat-stroked-button class="ms-2" style="color:#ef4444;border-color:#ef4444" (click)="cancelSub()">
                        <mat-icon class="material-icons-outlined">cancel</mat-icon> Cancel
                      </button>
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
                      <div class="sub-row"><span>Amount Paid</span><strong>\${{ myPayment.amount | number:'1.2-2' }} {{ myPayment.currency }}</strong></div>
                      <div class="sub-row"><span>Users</span><strong>{{ myPayment.numUsers }}</strong></div>
                      <div class="sub-row"><span>Payment ID</span><code>{{ myPayment.paymentId }}</code></div>
                      <div class="sub-row"><span>Subscribed On</span><strong>{{ myPayment.createdAt | date:'dd MMM yyyy' }}</strong></div>
                    </div>
                    <div class="sub-footer">
                      <button mat-flat-button color="primary" routerLink="/billing/pricing">
                        <mat-icon class="material-icons-outlined">upgrade</mat-icon> Upgrade Plan
                      </button>
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
                          <strong>\${{ inv.total | number:'1.2-2' }} {{ inv.currency }}</strong>
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
                              <td class="text-end">\${{ li.unitPrice | number:'1.2-2' }}</td>
                              <td class="text-end">{{ li.taxRate }}%</td>
                              <td class="text-end"><strong>\${{ li.totalPrice | number:'1.2-2' }}</strong></td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr class="total-row">
                              <td colspan="4">Subtotal</td>
                              <td class="text-end">\${{ inv.subtotal | number:'1.2-2' }}</td>
                            </tr>
                            <tr class="total-row">
                              <td colspan="4">Tax (19%)</td>
                              <td class="text-end">\${{ inv.taxAmount | number:'1.2-2' }}</td>
                            </tr>
                            <tr class="grand-total">
                              <td colspan="4"><strong>Total</strong></td>
                              <td class="text-end"><strong>\${{ inv.total | number:'1.2-2' }}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div class="d-flex justify-content-between align-items-center mt-2">
                        <p class="text-secondary small mb-0">
                          Period: {{ inv.billingPeriodStart | date:'dd/MM/yy' }} → {{ inv.billingPeriodEnd | date:'dd/MM/yy' }}
                          <span *ngIf="inv.paidAt"> · Paid: {{ inv.paidAt | date:'dd MMM yyyy' }}</span>
                        </p>
                        <button mat-icon-button matTooltip="Download PDF" [disabled]="!inv.pdfUrl" (click)="dl(inv)">
                          <mat-icon class="material-icons-outlined">download</mat-icon>
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
                          <strong>\${{ myPayment.amount | number:'1.2-2' }} {{ myPayment.currency }}</strong>
                        </div>
                      </div>
                      <div class="line-items mt-2">
                        <table class="li-table">
                          <tbody>
                            <tr>
                              <td>{{ myPayment.planName }} Plan – {{ myPayment.billingCycle }} Subscription</td>
                              <td class="text-end">1</td>
                              <td class="text-end">\${{ myPayment.amount | number:'1.2-2' }}</td>
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
                      <td mat-cell *matCellDef="let a"><strong>\${{ a.amount | number:'1.2-2' }}</strong></td>
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

            <!-- TAB 4 : PLANS (READ) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">inventory_2</mat-icon>Plans
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div><h4 class="mb-1">Available Plans</h4><p class="text-secondary small mb-0">Compare and upgrade</p></div>
                </div>
                <div class="row gx-3 gx-lg-4 mt-3">
                  <div class="col-12 col-md-6 col-xl-4" *ngFor="let p of availablePlans">
                    <mat-card class="plan-card mb-3" [class.current-plan]="isCurrentPlan(p)">
                      <mat-card-content>
                        <div class="plan-head">
                          <div><h4 class="mb-0">{{ p.displayName }}</h4><code class="text-secondary" style="font-size:11px">{{ p.name }}</code></div>
                          <span class="pill pill-green" *ngIf="isCurrentPlan(p)">Current</span>
                        </div>
                        <div class="price-row">
                          <div class="price-box"><span class="price-lbl">Monthly</span><span class="price-val">\${{ p.priceMonthly }}</span></div>
                          <div class="price-box"><span class="price-lbl">Annual/mo</span><span class="price-val">\${{ p.priceYearly }}</span></div>
                        </div>
                        <div class="plan-meta">
                          <div class="meta-row"><mat-icon class="material-icons-outlined">storage</mat-icon>{{ (p.storageMb/1024)|number:'1.0-0' }} GB</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">psychology</mat-icon>ML: {{ p.mlTier }}</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">support_agent</mat-icon>{{ p.supportTier }}</div>
                          <div class="meta-row"><mat-icon class="material-icons-outlined">lock_open</mat-icon>API: {{ p.apiAccess?'Yes':'No' }} · SSO: {{ p.ssoEnabled?'Yes':'No' }}</div>
                        </div>
                        <button mat-flat-button color="primary" class="w-100" *ngIf="!isCurrentPlan(p)" routerLink="/billing/pricing">
                          Upgrade to {{ p.displayName }}
                        </button>
                        <button mat-stroked-button class="w-100" *ngIf="isCurrentPlan(p)" disabled>✓ Your Current Plan</button>
                      </mat-card-content>
                    </mat-card>
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

    /* Plan cards */
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

    .empty-state { text-align:center; padding:40px 20px; color:#94a3b8; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; }
    .empty-state p { font-size:13px; }
    .empty-state a { color:#6366f1; }
  `]
})
export class OrgBillingComponent implements OnInit {
  private orgBilling = inject(OrgBillingService);

  subscription: SubscriptionDTO | null = null;
  myPayment: MyPaymentDTO | null = null;
  usageQuota: UsageQuotaDTO | null = null;
  invoices: InvoiceDTO[] = [];
  paymentAttempts: PaymentAttemptDTO[] = [];
  attemptsDS = new MatTableDataSource<PaymentAttemptDTO>([]);
  attemptCols = ['attempt', 'invoice', 'amount', 'status', 'error', 'date'];
  availablePlans: PlanDTO[] = [];
  loading = true;

  get planLabel() { return this.subscription?.planDisplayName ?? this.myPayment?.planName ?? '—'; }
  get statusLabel() { return this.subscription?.status ?? (this.myPayment ? 'ACTIVE' : '—'); }
  get renewalDate() {
    if (this.subscription?.currentPeriodEnd)
      return new Date(this.subscription.currentPeriodEnd).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    return '—';
  }

  isCurrentPlan(p: PlanDTO): boolean {
    const cur = this.subscription?.planName ?? this.myPayment?.planName ?? '';
    return p.name === cur || p.displayName === cur;
  }

  ngOnInit() {
    forkJoin({
      sub:      this.orgBilling.getMySubscription(),
      invoices: this.orgBilling.getMyInvoices(),
      payment:  this.orgBilling.getMyPayment(),
      plans:    this.orgBilling.getActivePlans(),
      usage:    this.orgBilling.getMyUsage(),
      attempts: this.orgBilling.getMyPaymentAttempts(),
    }).pipe(
      switchMap(({ sub, invoices, payment, plans, usage, attempts }) => {
        if (invoices.length === 0) {
          return of({ sub, invoices, payment, plans, usage, attempts });
        }
        const lineItemsRequests = invoices.map(inv =>
          this.orgBilling.getLineItemsByInvoice(inv.id).pipe(
            map(items => ({ ...inv, lineItems: items }))
          )
        );
        return forkJoin(lineItemsRequests).pipe(
          map(invoicesWithItems => ({
            sub, invoices: invoicesWithItems, payment, plans, usage, attempts
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
      },
      error: () => { this.loading = false; }
    });
  }

  cancelSub() {
    if (confirm('Are you sure you want to cancel your subscription?'))
      console.log('Cancel → PATCH /api/billing/my-subscription');
  }

  dl(i: InvoiceDTO) { if (i.pdfUrl) window.open(i.pdfUrl, '_blank'); }

  getSubStatusClass(s?: string) { return ({ACTIVE:'pill-green',TRIALING:'pill-blue',PAST_DUE:'pill-yellow',CANCELED:'pill-red'})[s??'']??'pill-blue'; }
  getInvClass(s: string) { return ({PAID:'pill-green',OPEN:'pill-yellow',DRAFT:'pill-blue',VOID:'pill-red'})[s]??'pill-blue'; }
  getAttemptClass(s: string) { return ({SUCCEEDED:'pill-green',FAILED:'pill-red',PENDING:'pill-yellow',REQUIRES_ACTION:'pill-blue'})[s]??'pill-blue'; }
}
