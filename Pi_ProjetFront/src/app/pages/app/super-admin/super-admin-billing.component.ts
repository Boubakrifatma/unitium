import { Component, OnInit, inject } from '@angular/core';
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
          <mat-tab-group animationDuration="200ms" [dynamicHeight]="true">

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

            <!-- TAB 4 : CHURN (READ ONLY - ML) -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">trending_down</mat-icon>Churn Risk
              </ng-template>
              <div class="tab-content">
                <div class="tab-header">
                  <div>
                    <h4 class="mb-1">ML Churn Predictions</h4>
                    <p class="text-secondary small mb-0">Table: <code>ml_churn_predictions</code> — generated by ML pipeline, read only</p>
                  </div>
                  <span class="pill pill-purple">ML GENERATED</span>
                </div>
                <div class="row gx-3 mt-3">
                  <div class="col-12 col-md-6 col-lg-4" *ngFor="let c of churnMock">
                    <mat-card class="mb-3">
                      <mat-card-content>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <h5 class="mb-0">{{ c.org }}</h5>
                          <span class="pill" [class]="getRiskClass(c.risk)">{{ c.risk }}</span>
                        </div>
                        <div class="churn-bar mb-2">
                          <div class="churn-fill" [style.width.%]="c.score*100"
                               [style.background]="c.risk==='HIGH'?'#ef4444':c.risk==='MEDIUM'?'#f59e0b':'#22c55e'"></div>
                        </div>
                        <div class="d-flex justify-content-between">
                          <span class="text-secondary small">Churn probability</span>
                          <strong>{{ (c.score*100)|number:'1.0-0' }}%</strong>
                        </div>
                        <p class="text-secondary small mt-1 mb-0">Plan: {{ c.plan }} · WAU ratio: {{ c.wau }}</p>
                      </mat-card-content>
                    </mat-card>
                  </div>
                </div>
                <div class="empty-state">
                  <mat-icon class="material-icons-outlined">psychology</mat-icon>
                  <p>Real predictions generated by the ML pipeline (Logistic Regression + Random Forest) will appear here. Inference: weekly batch.</p>
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

          </mat-tab-group>
        </mat-card-content>
      </mat-card>

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
              <div class="col-12 mb-3">
                <label class="field-lbl">Support Tier</label>
                <select class="field-input" [(ngModel)]="pf.supportTier">
                  <option>COMMUNITY</option><option>EMAIL</option><option>PRIORITY</option><option>DEDICATED</option>
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
    .tab-content { padding:24px; }
    .tab-header { display:flex; justify-content:space-between; align-items:flex-start; }

    /* Pills */
    .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
    .pill-green  { background:#dcfce7; color:#15803d; }
    .pill-red    { background:#fee2e2; color:#dc2626; }
    .pill-blue   { background:#dbeafe; color:#1d4ed8; }
    .pill-purple { background:#ede9fe; color:#7c3aed; }
    .pill-yellow { background:#fef9c3; color:#a16207; }

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
  `]
})
export class SuperAdminBillingComponent implements OnInit {
  private orgBilling = inject(OrgBillingService);
  private billingService = inject(BillingService);

  plans: PlanDTO[] = [];
  allInvoices: InvoiceDTO[] = [];
  invoicesDS = new MatTableDataSource<InvoiceDTO>([]);
  invCols = ['number', 'plan', 'subtotal', 'tax', 'total', 'status', 'period', 'paidAt'];

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
  pf = { displayName:'', priceMonthly:0, priceYearly:0, storageMb:10, mlTier:'BASIC', supportTier:'EMAIL' };

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
  }

  openAddPlan() {
    this.editing=null;
    this.pf={displayName:'',priceMonthly:0,priceYearly:0,storageMb:10,mlTier:'BASIC',supportTier:'EMAIL'};
    this.showModal=true;
  }

  editPlan(p:PlanDTO) {
    this.editing=p;
    this.pf={displayName:p.displayName,priceMonthly:p.priceMonthly,priceYearly:p.priceYearly,storageMb:Math.round(p.storageMb/1024),mlTier:p.mlTier,supportTier:p.supportTier};
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
      storageMb: this.pf.storageMb * 1024, // Convert GB to MB
      mlTier: this.pf.mlTier,
      supportTier: this.pf.supportTier
    };

    console.log('Creating plan with payload:', payload);

    this.orgBilling.createPlan(payload).subscribe({
      next: (newPlan) => {
        console.log('Plan created successfully:', newPlan);
        // Close modal in next event loop to avoid change detection error
        setTimeout(() => {
          this.showModal = false;
          alert('Plan created successfully!');
        }, 0);
        // Refresh plans list
        this.orgBilling.getActivePlans().subscribe(d => {
          this.plans = d;
          console.log('Plans refreshed');
        });
      },
      error: (err) => {
        console.error('Plan creation error:', err);
        const errorMsg = err?.error?.error || err?.message || 'Failed to create plan';
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

  getInvClass(s:string) { return ({PAID:'pill-green',OPEN:'pill-yellow',DRAFT:'pill-blue',VOID:'pill-red'})[s]??'pill-blue'; }
  getPayStatus(s:string) { return ({CONFIRMED:'pill-green',PENDING:'pill-yellow',REJECTED:'pill-red'})[s]??'pill-blue'; }
  getRiskClass(r:string) { return ({HIGH:'pill-red',MEDIUM:'pill-yellow',LOW:'pill-green'})[r]??'pill-blue'; }
  getUpsellClass(s:string) { return ({PENDING:'pill-yellow',SHOWN:'pill-blue',ACCEPTED:'pill-green',DISMISSED:'pill-red'})[s]??'pill-blue'; }
}
