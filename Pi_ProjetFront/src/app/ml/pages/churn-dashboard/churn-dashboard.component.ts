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
    <div class="container-fluid fade-in mb-4 mb-lg-5">
      <mat-card style="background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%); border: 1px solid rgba(0,0,0,0.05)">
        <mat-card-content class="p-4 p-lg-5">
          <div class="row gx-4 align-items-center">
            <div class="col mb-3 mb-xl-0">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #7c3aed, #6d28d9); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; margin-right: 16px;">
                  <mat-icon class="material-icons-outlined">psychology</mat-icon>
                </div>
                <div>
                  <h2 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Churn Prediction</h2>
                  <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.65;">Machine Learning Dashboard</p>
                </div>
              </div>
              <p style="margin: 8px 0 0 72px; font-size: 13px; opacity: 0.6; letter-spacing: 0.3px;">
                <strong>Prédictions XGBoost</strong> en temps réel · <strong>Dataset Telco</strong> · <strong>AUC = 0.83</strong>
              </p>
            </div>
            <div class="col-auto d-flex gap-3 align-items-center" style="flex-wrap: wrap; justify-content: flex-end;">
              <!-- ML service status badge -->
              <div style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; background: white; border: 1px solid rgba(0,0,0,0.08);">
                <span style="width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite;"
                  [style.background-color]="mlHealth?.status === 'ok' ? '#10b981' : '#ef4444'"></span>
                <span style="font-weight: 600; font-size: 13px;">
                  {{ mlHealth ? (mlHealth.status === 'ok' ? 'ML Service Actif' : 'Service Hors Ligne') : 'Vérification...' }}
                </span>
              </div>
              <button mat-flat-button
                [style.background]="training ? 'rgba(124, 58, 237, 0.1)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)'"
                [style.color]="training ? '#7c3aed' : 'white'"
                (click)="triggerTraining()"
                [disabled]="training"
                style="border-radius: 8px; font-weight: 600; text-transform: none; font-size: 13px;">
                <mat-spinner *ngIf="training" diameter="16" class="me-2"></mat-spinner>
                <mat-icon *ngIf="!training" style="font-size: 18px; margin-right: 6px;">model_training</mat-icon>
                {{ training ? 'Entraînement...' : 'Réentraîner' }}
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
    </style>

    <div class="container fade-in">

      <!-- KPI Cards -->
      <div class="row gx-4 gx-lg-4 mb-5">
        <div class="col-6 col-lg-3 mb-3">
          <mat-card class="stat-card" style="background: linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(217, 119, 6, 0.03));">
            <mat-card-content>
              <div class="stat-icon" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);">
                <mat-icon class="material-icons-outlined">warning_amber</mat-icon>
              </div>
              <p class="stat-label">Risque élevé</p>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <h3 class="stat-val">{{ highRisk.length }}</h3>
                <span style="font-size: 12px; opacity: 0.5;">orgs</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3 mb-3">
          <mat-card class="stat-card" style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(220, 38, 38, 0.03));">
            <mat-card-content>
              <div class="stat-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);">
                <mat-icon class="material-icons-outlined">local_offer</mat-icon>
              </div>
              <p class="stat-label">Coupons</p>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <h3 class="stat-val">{{ countAction('DISCOUNT_OFFER') }}</h3>
                <span style="font-size: 12px; opacity: 0.5;">envoyés</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3 mb-3">
          <mat-card class="stat-card" style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.03));">
            <mat-card-content>
              <div class="stat-icon" style="background: linear-gradient(135deg, #60a5fa, #3b82f6); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                <mat-icon class="material-icons-outlined">mark_email_unread</mat-icon>
              </div>
              <p class="stat-label">Emails</p>
              <div style="display: flex; align-items: baseline; gap: 8px;">
                <h3 class="stat-val">{{ countAction('EMAIL') }}</h3>
                <span style="font-size: 12px; opacity: 0.5;">envoyés</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="col-6 col-lg-3 mb-3">
          <mat-card class="stat-card" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(124, 58, 237, 0.03));">
            <mat-card-content>
              <div class="stat-icon" style="background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
                <mat-icon class="material-icons-outlined">model_training</mat-icon>
              </div>
              <p class="stat-label">Modèle</p>
              <h3 class="stat-val" style="font-size: 18px; margin-top: 4px;">{{ mlHealth?.model_version ?? '—' }}</h3>
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
                    <h4 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.3px;">Tester une prédiction</h4>
                    <p style="font-size: 14px; opacity: 0.6; margin-bottom: 24px;">Entrez les features d'une organisation pour obtenir un score instantané</p>

                    <div class="row gx-3">
                      <div class="col-6 mb-4">
                        <label class="form-label">WAU Ratio</label>
                        <input type="number" class="form-control" [(ngModel)]="sim.wauRatio"
                          min="0" max="1" step="0.01" placeholder="0.5">
                        <div style="font-size: 12px; opacity: 0.5; margin-top: 4px;">Activité / membres</div>
                      </div>
                      <div class="col-6 mb-4">
                        <label class="form-label">Paiements échoués</label>
                        <input type="number" class="form-control" [(ngModel)]="sim.paymentFailuresCount"
                          min="0" max="10" placeholder="0">
                      </div>
                      <div class="col-6 mb-4">
                        <label class="form-label">Inactivité (jours)</label>
                        <input type="number" class="form-control" [(ngModel)]="sim.lastLoginDeltaDays"
                          min="0" placeholder="7">
                      </div>
                      <div class="col-6 mb-4">
                        <label class="form-label">Utilisation plan</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <input type="number" class="form-control" [(ngModel)]="sim.planUtilizationPct"
                            min="0" max="100" placeholder="50" style="flex: 1;">
                          <span style="font-size: 13px; opacity: 0.6; min-width: 20px;">%</span>
                        </div>
                      </div>
                      <div class="col-6 mb-4">
                        <label class="form-label">Ancienneté</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <input type="number" class="form-control" [(ngModel)]="sim.tenureMonths"
                            min="1" placeholder="12" style="flex: 1;">
                          <span style="font-size: 13px; opacity: 0.6; min-width: 35px;">mois</span>
                        </div>
                      </div>
                      <div class="col-6 mb-4">
                        <label class="form-label">ML Usage Rate</label>
                        <input type="number" class="form-control" [(ngModel)]="sim.mlUsageRate"
                          min="0" max="1" step="0.01" placeholder="0.5">
                      </div>
                    </div>

                    <button mat-flat-button
                      style="width: 100%; margin-top: 16px; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border-radius: 8px; font-weight: 600; text-transform: none; font-size: 14px; padding: 12px;"
                      (click)="runSimulation()"
                      [disabled]="simLoading">
                      <mat-spinner *ngIf="simLoading" diameter="16" class="me-2"></mat-spinner>
                      <mat-icon *ngIf="!simLoading">play_arrow</mat-icon>
                      {{ simLoading ? 'Calcul en cours...' : 'Calculer le score' }}
                    </button>
                  </div>

                  <!-- Result -->
                  <div class="col-lg-6 mt-4 mt-lg-0">
                    <h4 style="font-size: 20px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.3px;">Résultat</h4>

                    <div *ngIf="!simResult && !simError" style="text-align: center; padding: 40px 20px; opacity: 0.4;">
                      <mat-icon style="font-size: 72px; opacity: 0.3;">psychology</mat-icon>
                      <p style="margin-top: 16px; font-size: 14px;">Lance une simulation pour voir le résultat</p>
                    </div>

                    <div *ngIf="simError" style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start;">
                      <mat-icon style="color: #dc2626; margin-top: 2px;">error</mat-icon>
                      <span style="font-size: 14px; color: #7f1d1d;">{{ simError }}</span>
                    </div>

                    <div *ngIf="simResult" class="sim-result-card p-5"
                      [style.border-left]="'6px solid ' + scoreColor(simResult.churn_score)">

                      <!-- Big score -->
                      <div style="text-align: center; margin-bottom: 32px;">
                        <div class="sim-score-circle" style="margin-left: auto; margin-right: auto;" [style.border-color]="scoreColor(simResult.churn_score)">
                          <span class="sim-score-val" [style.color]="scoreColor(simResult.churn_score)">
                            {{ (simResult.churn_score * 100) | number:'1.0-0' }}%
                          </span>
                          <small style="display: block; opacity: 0.5; font-size: 12px; margin-top: 4px;">churn score</small>
                        </div>
                      </div>

                      <!-- Risk badge -->
                      <div style="text-align: center; margin-bottom: 24px;">
                        <span class="badge"
                          [class.bg-danger]="simResult.risk_level === 'CRITICAL' || simResult.risk_level === 'HIGH'"
                          [class.bg-warning]="simResult.risk_level === 'MEDIUM'"
                          [class.bg-success]="simResult.risk_level === 'LOW'"
                          [class.text-dark]="simResult.risk_level === 'MEDIUM'"
                          style="font-size: 14px; padding: 10px 20px;">
                          {{ simResult.risk_level }}
                        </span>
                      </div>

                      <!-- Action -->
                      <div style="display: flex; gap: 12px; padding: 16px; border-radius: 12px; background: rgba(124, 58, 237, 0.05); border: 1px solid rgba(124, 58, 237, 0.1);">
                        <mat-icon class="material-icons-outlined" style="margin-top: 2px; color: " [style.color]="actionColor(simResult.action)">
                          {{ actionIconSim(simResult.action) }}
                        </mat-icon>
                        <div>
                          <strong style="display: block; font-size: 14px; margin-bottom: 4px;">{{ simResult.action }}</strong>
                          <p style="font-size: 13px; opacity: 0.7; margin: 0;">{{ simResult.message }}</p>
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
                    <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; letter-spacing: -0.3px;">Informations du modèle</h4>
                    <div style="display: grid; gap: 16px;">
                      <div style="padding: 16px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(124, 58, 237, 0.02)); border: 1px solid rgba(124, 58, 237, 0.1); border-radius: 12px;">
                        <p style="font-size: 12px; opacity: 0.6; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.3px;">Algorithme</p>
                        <p style="font-size: 16px; font-weight: 700; margin: 0;">XGBoost</p>
                      </div>
                      <div style="padding: 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02)); border: 1px solid rgba(59, 130, 246, 0.1); border-radius: 12px;">
                        <p style="font-size: 12px; opacity: 0.6; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.3px;">Dataset</p>
                        <p style="font-size: 14px; font-weight: 600; margin: 0;">Telco Customer Churn</p>
                        <p style="font-size: 12px; opacity: 0.5; margin: 4px 0 0 0;">7 043 clients</p>
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div style="padding: 16px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02)); border: 1px solid rgba(34, 197, 94, 0.1); border-radius: 12px;">
                          <p style="font-size: 12px; opacity: 0.6; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.3px;">ROC-AUC</p>
                          <p style="font-size: 20px; font-weight: 700; margin: 0;">0.83</p>
                        </div>
                        <div style="padding: 16px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(168, 85, 247, 0.02)); border: 1px solid rgba(168, 85, 247, 0.1); border-radius: 12px;">
                          <p style="font-size: 12px; opacity: 0.6; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.3px;">Statut</p>
                          <span class="badge"
                            [class.bg-success]="mlHealth?.model_loaded"
                            [class.bg-secondary]="!mlHealth?.model_loaded"
                            style="display: inline-block;">
                            {{ mlHealth?.model_loaded ? '✓ Chargé' : 'Non chargé' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <h4 style="font-size: 18px; font-weight: 700; margin-bottom: 20px; letter-spacing: -0.3px;">Features utilisées</h4>
                    <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                      <span class="badge" style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #111827; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; width: fit-content; border-radius: 8px;" *ngFor="let f of features">
                        <mat-icon class="material-icons-outlined" style="font-size: 16px;">data_object</mat-icon>
                        <span style="font-size: 13px; font-weight: 500;">{{ f }}</span>
                      </span>
                    </div>
                    <h5 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Seuils de décision</h5>
                    <div style="display: grid; gap: 12px;">
                      <div *ngFor="let t of thresholds" style="padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; gap: 12px;">
                        <span class="badge" [class]="t.badgeClass" style="min-width: fit-content;">{{ t.label }}</span>
                        <small style="opacity: 0.65; font-size: 12px; flex: 1;">{{ t.condition }}</small>
                        <mat-icon class="material-icons-outlined" [style.color]="t.iconColor" style="font-size: 18px;">{{ t.icon }}</mat-icon>
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
    .stat-card {
      border-radius: 16px;
      border: 1px solid rgba(0,0,0,0.05);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .stat-card:hover {
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .stat-card mat-card-content { padding: 20px; }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display:flex;
      align-items:center;
      justify-content:center;
      margin-bottom:12px;
      font-size: 24px;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.65;
      margin-bottom: 8px;
      font-weight: 500;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }

    mat-card {
      border-radius: 16px;
      border: 1px solid rgba(0,0,0,0.05);
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }

    .tab-icon { margin-right: 8px; font-size: 20px; }
    .tab-badge {
      background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .tab-content { padding: 24px; }
    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .tab-header h4 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.3px;
    }

    table {
      border-collapse: separate;
      border-spacing: 0 8px;
    }

    th {
      background: transparent !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      color: rgba(0,0,0,0.7) !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 8px !important;
      border: none !important;
    }

    td {
      padding: 14px 8px !important;
      border: none !important;
      vertical-align: middle;
    }

    tr {
      border-radius: 8px;
    }

    .table-row-hover {
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .table-row-hover:hover {
      background: linear-gradient(90deg, rgba(124, 58, 237, 0.05), rgba(124, 58, 237, 0.02)) !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      cursor: pointer;
    }

    .badge {
      font-weight: 600;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .sim-result-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .sim-score-circle {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 4px solid;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
    }
    .sim-score-circle:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    }
    .sim-score-val {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .fade-in {
      animation: fadeIn .4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    .form-label {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: rgba(0,0,0,0.7);
      margin-bottom: 6px;
    }

    .form-control {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .form-control:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }
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
