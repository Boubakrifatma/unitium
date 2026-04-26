import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MlService, ChurnPrediction, MLHealth } from '../../services/ml.service';

@Component({
  selector: 'app-churn-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatTooltipModule, MatProgressBarModule,
    MatChipsModule, MatSnackBarModule, MatProgressSpinnerModule,
    RouterModule, FormsModule, DecimalPipe, DatePipe
  ],
  template: `
    <!-- Header -->
    <div class="container-fluid fade-in mb-3 mb-lg-4">
      <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
        <div class="row gx-3 align-items-center">
          <div class="col mb-3 mb-xl-0 py-1">
            <h3 class="mb-1">
              <mat-icon class="material-icons-outlined align-middle me-2" style="color:#7c3aed">psychology</mat-icon>
              Churn Prediction — ML Dashboard
            </h3>
            <p class="small opacity-50">Prédictions XGBoost en temps réel · Dataset Telco · AUC = 0.83</p>
          </div>
          <div class="col-auto d-flex gap-2 align-items-center">
            <!-- ML service status badge -->
            <span class="badge rounded-pill px-3 py-2"
              [class.bg-success]="mlHealth?.status === 'ok'"
              [class.bg-danger]="mlHealth?.status !== 'ok'"
              [class.bg-secondary]="!mlHealth">
              <mat-icon style="font-size:14px;vertical-align:middle">circle</mat-icon>
              {{ mlHealth ? (mlHealth.status === 'ok' ? 'ML Service actif' : 'ML Service hors ligne') : 'Vérification...' }}
            </span>
            <button mat-stroked-button (click)="triggerTraining()" [disabled]="training">
              <mat-spinner *ngIf="training" diameter="16" class="me-1"></mat-spinner>
              <mat-icon *ngIf="!training">model_training</mat-icon>
              Re-entraîner
            </button>
          </div>
        </div>
      </mat-card>
    </div>

    <div class="container fade-in">

      <!-- KPI Cards -->
      <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon" style="background:#fef3c7;color:#d97706">
                <mat-icon class="material-icons-outlined">warning_amber</mat-icon>
              </div>
              <p class="stat-label">Risque élevé aujourd'hui</p>
              <h3 class="stat-val">{{ highRisk.length }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon" style="background:#fee2e2;color:#dc2626">
                <mat-icon class="material-icons-outlined">local_offer</mat-icon>
              </div>
              <p class="stat-label">Coupons déclenchés</p>
              <h3 class="stat-val">{{ countAction('DISCOUNT_OFFER') }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon" style="background:#dbeafe;color:#2563eb">
                <mat-icon class="material-icons-outlined">mark_email_unread</mat-icon>
              </div>
              <p class="stat-label">Emails envoyés</p>
              <h3 class="stat-val">{{ countAction('EMAIL') }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3">
          <mat-card class="mb-3 stat-card">
            <mat-card-content>
              <div class="stat-icon" style="background:#ede9fe;color:#7c3aed">
                <mat-icon class="material-icons-outlined">model_training</mat-icon>
              </div>
              <p class="stat-label">Version modèle</p>
              <h3 class="stat-val" style="font-size:14px;margin-top:6px">{{ mlHealth?.model_version ?? '—' }}</h3>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Tabs -->
      <mat-card>
        <mat-card-content class="p-0">
          <mat-tab-group animationDuration="200ms" [dynamicHeight]="true">

            <!-- TAB 1 : High Risk Today -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">warning_amber</mat-icon>
                À risque aujourd'hui
                <span class="tab-badge ms-1">{{ highRisk.length }}</span>
              </ng-template>
              <div class="tab-content p-3">

                <div class="tab-header mb-3">
                  <div>
                    <h4 class="mb-1">Organisations en danger</h4>
                    <p class="text-secondary small mb-0">Score XGBoost > 0.50 · triées par risque décroissant</p>
                  </div>
                </div>

                <div *ngIf="loadingHigh" class="text-center py-5">
                  <mat-spinner diameter="36" class="mx-auto"></mat-spinner>
                </div>

                <div *ngIf="!loadingHigh && highRisk.length === 0" class="text-center py-5 opacity-50">
                  <mat-icon style="font-size:48px">check_circle_outline</mat-icon>
                  <p class="mt-2">Aucune organisation à risque élevé aujourd'hui</p>
                </div>

                <div class="table-responsive" *ngIf="!loadingHigh && highRisk.length > 0">
                  <table mat-table [dataSource]="highRiskDS" class="w-100">

                    <ng-container matColumnDef="org">
                      <th mat-header-cell *matHeaderCellDef>Organisation</th>
                      <td mat-cell *matCellDef="let row">
                        <strong>{{ row.organization?.name ?? row.organization?.id ?? '—' }}</strong>
                        <br><small class="opacity-50">{{ row.organization?.slug }}</small>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>Score churn</th>
                      <td mat-cell *matCellDef="let row">
                        <div class="d-flex align-items-center gap-2">
                          <mat-progress-bar mode="determinate"
                            [value]="row.churnProbability * 100"
                            [color]="row.churnProbability > 0.8 ? 'warn' : 'accent'"
                            style="width:80px;border-radius:4px">
                          </mat-progress-bar>
                          <strong [style.color]="scoreColor(row.churnProbability)">
                            {{ (row.churnProbability * 100) | number:'1.0-0' }}%
                          </strong>
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="risk">
                      <th mat-header-cell *matHeaderCellDef>Niveau</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="badge rounded-pill px-3"
                          [class.bg-danger]="row.riskSegment === 'HIGH_RISK'"
                          [class.bg-warning]="row.riskSegment === 'MEDIUM_RISK'"
                          [class.bg-success]="row.riskSegment === 'STABLE'"
                          [class.text-dark]="row.riskSegment === 'MEDIUM_RISK'">
                          {{ riskLabel(row.riskSegment) }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="action">
                      <th mat-header-cell *matHeaderCellDef>Action déclenchée</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="d-flex align-items-center gap-1">
                          <mat-icon class="material-icons-outlined" style="font-size:16px" [style.color]="actionColor(row.actionTriggered)">
                            {{ actionIcon(row.actionTriggered) }}
                          </mat-icon>
                          {{ actionLabel(row.actionTriggered) }}
                        </span>
                        <small class="opacity-50" *ngIf="row.actionTriggeredAt">
                          {{ row.actionTriggeredAt | date:'dd/MM HH:mm' }}
                        </small>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="features">
                      <th mat-header-cell *matHeaderCellDef>Signaux</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="badge bg-secondary me-1" *ngIf="row.paymentFailuresCount > 0"
                          [matTooltip]="row.paymentFailuresCount + ' paiements échoués'">
                          <mat-icon style="font-size:12px">payment</mat-icon> {{ row.paymentFailuresCount }}
                        </span>
                        <span class="badge bg-secondary me-1" *ngIf="row.lastLoginDeltaDays > 14"
                          [matTooltip]="'Inactif depuis ' + row.lastLoginDeltaDays + ' jours'">
                          <mat-icon style="font-size:12px">schedule</mat-icon> {{ row.lastLoginDeltaDays }}j
                        </span>
                        <span class="badge bg-secondary" *ngIf="row.planUtilizationPct > 90"
                          [matTooltip]="'Quota utilisé à ' + (row.planUtilizationPct | number:'1.0-0') + '%'">
                          <mat-icon style="font-size:12px">storage</mat-icon> {{ row.planUtilizationPct | number:'1.0-0' }}%
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Prédit le</th>
                      <td mat-cell *matCellDef="let row">
                        {{ row.predictionDate | date:'dd/MM/yyyy' }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="highRiskCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: highRiskCols;" class="table-row-hover"></tr>
                  </table>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 2 : Simulateur -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">science</mat-icon>
                Simulateur
              </ng-template>
              <div class="tab-content p-4">
                <div class="row gx-4">

                  <!-- Form -->
                  <div class="col-lg-6">
                    <h4 class="mb-1">Tester une prédiction</h4>
                    <p class="text-secondary small mb-3">Entrez les features d'une organisation pour obtenir un score instantané</p>

                    <div class="row gx-3">
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">WAU Ratio (0–1)</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.wauRatio"
                          min="0" max="1" step="0.01" placeholder="0.5">
                        <div class="form-text">Activité hebdo / membres</div>
                      </div>
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">Paiements échoués</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.paymentFailuresCount"
                          min="0" max="10" placeholder="0">
                      </div>
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">Inactivité (jours)</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.lastLoginDeltaDays"
                          min="0" placeholder="7">
                      </div>
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">Utilisation plan (%)</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.planUtilizationPct"
                          min="0" max="100" placeholder="50">
                      </div>
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">Ancienneté (mois)</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.tenureMonths"
                          min="1" placeholder="12">
                      </div>
                      <div class="col-6 mb-3">
                        <label class="form-label small fw-semibold">ML Usage Rate (0–1)</label>
                        <input type="number" class="form-control form-control-sm" [(ngModel)]="sim.mlUsageRate"
                          min="0" max="1" step="0.01" placeholder="0.5">
                      </div>
                    </div>

                    <button mat-flat-button color="primary" class="w-100 mt-2" (click)="runSimulation()" [disabled]="simLoading">
                      <mat-spinner *ngIf="simLoading" diameter="16" class="me-1"></mat-spinner>
                      <mat-icon *ngIf="!simLoading">play_arrow</mat-icon>
                      Calculer le score
                    </button>
                  </div>

                  <!-- Result -->
                  <div class="col-lg-6 mt-4 mt-lg-0">
                    <h4 class="mb-3">Résultat</h4>

                    <div *ngIf="!simResult && !simError" class="text-center opacity-40 py-5">
                      <mat-icon style="font-size:56px">psychology</mat-icon>
                      <p class="mt-2 small">Lance une simulation pour voir le résultat</p>
                    </div>

                    <div *ngIf="simError" class="alert alert-danger">
                      <mat-icon class="align-middle me-1">error</mat-icon> {{ simError }}
                    </div>

                    <div *ngIf="simResult" class="sim-result-card p-4 rounded-3"
                      [style.border-left]="'4px solid ' + scoreColor(simResult.churn_score)">

                      <!-- Big score -->
                      <div class="text-center mb-4">
                        <div class="sim-score-circle mx-auto" [style.border-color]="scoreColor(simResult.churn_score)">
                          <span class="sim-score-val" [style.color]="scoreColor(simResult.churn_score)">
                            {{ (simResult.churn_score * 100) | number:'1.0-0' }}%
                          </span>
                          <small class="d-block opacity-50">churn score</small>
                        </div>
                      </div>

                      <!-- Risk badge -->
                      <div class="text-center mb-3">
                        <span class="badge fs-6 px-4 py-2 rounded-pill"
                          [class.bg-danger]="simResult.risk_level === 'CRITICAL' || simResult.risk_level === 'HIGH'"
                          [class.bg-warning]="simResult.risk_level === 'MEDIUM'"
                          [class.bg-success]="simResult.risk_level === 'LOW'"
                          [class.text-dark]="simResult.risk_level === 'MEDIUM'">
                          {{ simResult.risk_level }}
                        </span>
                      </div>

                      <!-- Action -->
                      <div class="d-flex align-items-start gap-3 p-3 rounded-2 bg-light">
                        <mat-icon class="material-icons-outlined mt-1" [style.color]="actionColor(simResult.action)">
                          {{ actionIconSim(simResult.action) }}
                        </mat-icon>
                        <div>
                          <strong>{{ simResult.action }}</strong>
                          <p class="small mb-0 opacity-70">{{ simResult.message }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- TAB 3 : ML Service Info -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon class="material-icons-outlined tab-icon">info</mat-icon>
                Modèle ML
              </ng-template>
              <div class="tab-content p-4">
                <div class="row gx-4">
                  <div class="col-md-6">
                    <h4 class="mb-3">Informations du modèle</h4>
                    <table class="table table-sm">
                      <tbody>
                        <tr><td class="opacity-50">Algorithme</td><td><strong>XGBoost</strong></td></tr>
                        <tr><td class="opacity-50">Dataset</td><td><strong>Telco Customer Churn (7 043 clients)</strong></td></tr>
                        <tr><td class="opacity-50">ROC-AUC</td><td><strong>0.83</strong></td></tr>
                        <tr><td class="opacity-50">Version</td><td><strong>{{ mlHealth?.model_version ?? '—' }}</strong></td></tr>
                        <tr><td class="opacity-50">Statut</td>
                          <td>
                            <span class="badge rounded-pill"
                              [class.bg-success]="mlHealth?.model_loaded"
                              [class.bg-secondary]="!mlHealth?.model_loaded">
                              {{ mlHealth?.model_loaded ? 'Modèle chargé' : 'Non chargé' }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="col-md-6">
                    <h4 class="mb-3">Features utilisées</h4>
                    <div class="d-flex flex-wrap gap-2">
                      <span class="badge bg-light text-dark border px-3 py-2" *ngFor="let f of features">
                        <mat-icon class="material-icons-outlined" style="font-size:13px;vertical-align:middle">data_object</mat-icon>
                        {{ f }}
                      </span>
                    </div>
                    <div class="mt-4">
                      <h5 class="mb-2">Seuils de décision</h5>
                      <div *ngFor="let t of thresholds" class="d-flex align-items-center gap-2 mb-2">
                        <span class="badge rounded-pill px-3" [class]="t.badgeClass">{{ t.label }}</span>
                        <small class="opacity-60">{{ t.condition }}</small>
                        <mat-icon class="material-icons-outlined ms-auto" [style.color]="t.iconColor" style="font-size:16px">{{ t.icon }}</mat-icon>
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
    .stat-card { border-radius: 12px; }
    .stat-card mat-card-content { padding: 16px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
    .stat-label { font-size: 12px; opacity: 0.6; margin-bottom: 2px; }
    .stat-val { font-size: 26px; font-weight: 700; margin: 0; }
    .tab-icon { margin-right: 6px; font-size: 18px; }
    .tab-badge { background: #e2e8f0; border-radius: 12px; padding: 2px 8px; font-size: 11px; }
    .tab-content { padding: 16px; }
    .tab-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .table-row-hover:hover { background: rgba(0,0,0,0.02); cursor: pointer; }
    .sim-result-card { background: var(--bg-surface, #f8fafc); }
    .sim-score-circle { width: 120px; height: 120px; border-radius: 50%; border: 4px solid; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .sim-score-val { font-size: 32px; font-weight: 700; }
    .fade-in { animation: fadeIn .3s ease; }
    @keyframes fadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: none; } }
  `]
})
export class ChurnDashboardComponent implements OnInit {
  private ml = inject(MlService);
  private snack = inject(MatSnackBar);
  private zone = inject(NgZone);

  mlHealth: MLHealth | null = null;
  highRisk: ChurnPrediction[] = [];
  highRiskDS = new MatTableDataSource<ChurnPrediction>([]);
  highRiskCols = ['org', 'score', 'risk', 'action', 'features', 'date'];

  loadingHigh = true;
  training = false;

  // Simulator
  sim = { wauRatio: 0.2, paymentFailuresCount: 2, lastLoginDeltaDays: 20,
          planUtilizationPct: 80, tenureMonths: 3, mlUsageRate: 0.1, supportTicketCount: 3 };
  simResult: any = null;
  simError: string | null = null;
  simLoading = false;

  features = ['wau_ratio', 'ml_usage_rate', 'support_ticket_count',
              'last_login_delta_days', 'plan_utilization_pct',
              'payment_failures_count', 'tenure_months'];

  thresholds = [
    { label: 'CRITIQUE > 80%', condition: 'Coupon 30% envoyé immédiatement', badgeClass: 'bg-danger', icon: 'local_offer', iconColor: '#dc2626' },
    { label: 'ÉLEVÉ > 50%',    condition: 'Email de réengagement',            badgeClass: 'bg-warning text-dark', icon: 'mark_email_unread', iconColor: '#d97706' },
    { label: 'MOYEN > 30%',    condition: 'Alerte manager dans les logs',     badgeClass: 'bg-info text-dark', icon: 'notification_important', iconColor: '#0284c7' },
    { label: 'STABLE ≤ 30%',   condition: 'Aucune action',                   badgeClass: 'bg-success', icon: 'check_circle', iconColor: '#16a34a' },
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.ml.getMLHealth().subscribe({
      next: h => this.mlHealth = h,
      error: () => this.mlHealth = { status: 'offline', model_loaded: false, model_version: '—' }
    });

    this.loadingHigh = true;
    this.ml.getHighRiskToday().subscribe({
      next: list => {
        this.highRisk = list.sort((a, b) => b.churnProbability - a.churnProbability);
        this.highRiskDS.data = this.highRisk;
        this.loadingHigh = false;
      },
      error: () => { this.loadingHigh = false; }
    });
  }

  countAction(action: string): number {
    return this.highRisk.filter(p => p.actionTriggered === action).length;
  }

  runSimulation() {
    this.simLoading = true;
    this.simError = null;
    this.simResult = null;

    const body = {
      org_id: 'simulator',
      wau_ratio: this.sim.wauRatio,
      ml_usage_rate: this.sim.mlUsageRate,
      support_ticket_count: this.sim.supportTicketCount,
      last_login_delta_days: this.sim.lastLoginDeltaDays,
      plan_utilization_pct: this.sim.planUtilizationPct,
      payment_failures_count: this.sim.paymentFailuresCount,
      tenure_months: this.sim.tenureMonths
    };

    fetch('http://localhost:8000/predict/churn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      this.zone.run(() => {
        this.simResult = data;
        this.simLoading = false;
      });
    })
    .catch(err => {
      this.zone.run(() => {
        this.simError = 'ML service inaccessible. Vérifiez que FastAPI tourne sur le port 8000. (' + err.message + ')';
        this.simLoading = false;
      });
    });
  }

  triggerTraining() {
    this.training = true;
    this.ml.triggerTraining().subscribe({
      next: () => {
        this.snack.open('Modèle re-entraîné avec succès', 'OK', { duration: 4000 });
        this.training = false;
        this.loadData();
      },
      error: () => {
        this.snack.open('Erreur lors du re-entraînement', 'OK', { duration: 4000 });
        this.training = false;
      }
    });
  }

  scoreColor(score: number): string {
    if (score > 0.8) return '#dc2626';
    if (score > 0.5) return '#d97706';
    if (score > 0.3) return '#0284c7';
    return '#16a34a';
  }

  riskLabel(r: string): string {
    return ({ HIGH_RISK: 'Élevé', MEDIUM_RISK: 'Moyen', STABLE: 'Stable' } as any)[r] ?? r;
  }

  actionLabel(a: string): string {
    return ({ DISCOUNT_OFFER: 'Coupon 30%', EMAIL: 'Email envoyé', CS_CALL: 'Alerte manager', NONE: 'Aucune' } as any)[a] ?? a;
  }

  actionIcon(a: string): string {
    return ({ DISCOUNT_OFFER: 'local_offer', EMAIL: 'mark_email_unread', CS_CALL: 'support_agent', NONE: 'check_circle_outline' } as any)[a] ?? 'help';
  }

  actionIconSim(a: string): string {
    return ({ URGENT_COUPON_30: 'local_offer', RETENTION_EMAIL: 'mark_email_unread', MANAGER_ALERT: 'support_agent', NONE: 'check_circle_outline' } as any)[a] ?? 'help';
  }

  actionColor(a: string): string {
    return ({ DISCOUNT_OFFER: '#dc2626', URGENT_COUPON_30: '#dc2626', EMAIL: '#2563eb', RETENTION_EMAIL: '#2563eb', CS_CALL: '#d97706', MANAGER_ALERT: '#d97706', NONE: '#16a34a' } as any)[a] ?? '#888';
  }
}
