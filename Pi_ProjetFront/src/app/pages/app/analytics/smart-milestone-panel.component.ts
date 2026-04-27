import {
  Component, Input, OnChanges, signal,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';

import { AnalyticsService, MilestoneRiskDto, WhatIfResultDto } from '../../../services/analytics.service';

@Component({
  selector: 'app-smart-milestone-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    MatChipsModule, MatTooltipModule, MatFormFieldModule, MatInputModule, MatExpansionModule
  ],
  template: `
<mat-expansion-panel class="smart-panel mt-2" [expanded]="expanded">
  <mat-expansion-panel-header>
    <mat-panel-title class="d-flex align-items-center gap-2">
      <mat-icon class="small">insights</mat-icon>
      <span>Analyse Smart</span>
      @if (risk()) {
        <span class="badge ms-1" [class]="riskBadge(risk()!.riskLevel)">
          {{ risk()!.riskLevel | uppercase }} — {{ risk()!.riskScore | number:'1.0-0' }}/100
        </span>
      }
    </mat-panel-title>
    <mat-panel-description>
      <button mat-icon-button (click)="load(); $event.stopPropagation()" [disabled]="loading()"
              matTooltip="Recalculer" class="small-btn">
        <mat-icon class="small" [class.spin]="loading()">refresh</mat-icon>
      </button>
    </mat-panel-description>
  </mat-expansion-panel-header>

  @if (loading() && !risk()) {
    <div class="text-center py-3">
      <mat-icon class="spin" style="color:#6366f1">autorenew</mat-icon>
    </div>
  }

  @if (risk(); as r) {
    <!-- KPIs Row -->
    <div class="row g-2 mb-2">
      <div class="col-6 col-sm-3">
        <div class="mini-kpi text-center p-2 rounded">
          <div class="fw-bold">{{ r.completionPct | number:'1.0-0' }}%</div>
          <div class="text-muted" style="font-size:11px">Avancement</div>
        </div>
      </div>
      <div class="col-6 col-sm-3">
        <div class="mini-kpi text-center p-2 rounded">
          <div class="fw-bold" [class]="r.delayDays > 0 ? 'text-danger' : 'text-success'">
            {{ r.delayDays > 0 ? '+' + r.delayDays + 'j' : 'Dans les temps' }}
          </div>
          <div class="text-muted" style="font-size:11px">Retard estimé</div>
        </div>
      </div>
      <div class="col-6 col-sm-3">
        <div class="mini-kpi text-center p-2 rounded">
          <div class="fw-bold">{{ r.velocity | number:'1.2-2' }}</div>
          <div class="text-muted" style="font-size:11px">Vélocité (t/j)</div>
        </div>
      </div>
      <div class="col-6 col-sm-3">
        <div class="mini-kpi text-center p-2 rounded">
          <div class="fw-bold text-primary">{{ r.predictedDueDate ?? '—' }}</div>
          <div class="text-muted" style="font-size:11px">Date prévue</div>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <mat-progress-bar [value]="r.completionPct" mode="determinate" class="mb-2"
      [color]="r.riskLevel === 'high' ? 'warn' : r.riskLevel === 'medium' ? 'accent' : 'primary'">
    </mat-progress-bar>
    <div class="d-flex justify-content-between small text-muted mb-3">
      <span>{{ r.doneTasks }}/{{ r.totalTasks }} tâches · {{ r.blockedTasks }} bloquées · {{ r.overdueTasks }} en retard</span>
      <span>Planifié : {{ r.plannedDueDate ?? '—' }}</span>
    </div>

    <!-- Alerts -->
    @if (r.alerts.length > 0) {
      <div class="alerts-box mb-3">
        @for (alert of r.alerts; track $index) {
          <p class="mb-1 small">{{ alert }}</p>
        }
      </div>
    }

    <!-- What-If -->
    <div class="border-top pt-2">
      <p class="small fw-semibold mb-2">
        <mat-icon class="small me-1">science</mat-icon>
        Simulation What-If
      </p>
      <div class="d-flex gap-2 align-items-end flex-wrap">
        <mat-form-field appearance="outline" class="mb-0" style="max-width:140px">
          <mat-label>ID Tâche</mat-label>
          <input matInput type="number" [(ngModel)]="whatIfTaskId" placeholder="42">
        </mat-form-field>
        <mat-form-field appearance="outline" class="mb-0" style="max-width:130px">
          <mat-label>Retard (j)</mat-label>
          <input matInput type="number" [(ngModel)]="whatIfDelayDays" placeholder="5">
        </mat-form-field>
        <button mat-stroked-button color="primary" (click)="runWhatIf()" [disabled]="!whatIfTaskId || !whatIfDelayDays || simulating()">
          <mat-icon class="small">play_arrow</mat-icon>
          Simuler
        </button>
      </div>

      @if (whatIfResult()) {
        <div class="whatif-result mt-2 p-2 rounded">
          <p class="small fw-semibold mb-1">Impact : {{ whatIfResult()!.totalCascadedTasks }} tâche(s) en cascade</p>
          @for (t of whatIfResult()!.affectedTasks.slice(0, 3); track t.taskId) {
            <div class="d-flex justify-content-between small border-bottom py-1">
              <span>{{ t.taskTitle }}</span>
              <span class="text-danger">+{{ t.shiftDays }}j</span>
            </div>
          }
          @if (whatIfResult()!.affectedTasks.length > 3) {
            <p class="text-muted small mt-1">... et {{ whatIfResult()!.affectedTasks.length - 3 }} autre(s)</p>
          }
          @for (m of whatIfResult()!.affectedMilestones; track m.milestoneId) {
            <div class="mt-1 small">
              <span class="badge" [class]="riskBadge(m.newRiskLevel)">{{ m.newRiskLevel | uppercase }}</span>
              {{ m.milestoneName }} → {{ m.newPredictedDate }}
            </div>
          }
        </div>
      }
    </div>
  }
</mat-expansion-panel>
  `,
  styles: [`
    .smart-panel { border: 1px solid #e2e8f0; border-radius: 8px; }
    .mini-kpi { background: #f8fafc; border: 1px solid #e2e8f0; }
    .alerts-box { background: #fefce8; border-left: 4px solid #f59e0b; padding: 8px 12px; border-radius: 4px; }
    .whatif-result { background: #f0f9ff; border: 1px solid #bae6fd; }
    .small-btn { width: 28px; height: 28px; line-height: 28px; }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
  `]
})
export class SmartMilestonePanelComponent implements OnChanges {
  @Input() milestoneId!: number;
  @Input() expanded = false;

  risk = signal<MilestoneRiskDto | null>(null);
  loading = signal(false);
  simulating = signal(false);
  whatIfResult = signal<WhatIfResultDto | null>(null);

  whatIfTaskId: number | null = null;
  whatIfDelayDays: number | null = null;

  constructor(private analyticsService: AnalyticsService, private cdr: ChangeDetectorRef) {}

  ngOnChanges() {
    if (this.milestoneId) this.load();
  }

  load() {
    this.loading.set(true);
    this.analyticsService.recalculateMilestone(this.milestoneId).subscribe({
      next: dto => { this.risk.set(dto); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  runWhatIf() {
    if (!this.whatIfTaskId || !this.whatIfDelayDays) return;
    this.simulating.set(true);
    this.analyticsService.simulateWhatIf(this.whatIfTaskId, this.whatIfDelayDays).subscribe({
      next: r => { this.whatIfResult.set(r); this.simulating.set(false); this.cdr.markForCheck(); },
      error: () => { this.simulating.set(false); this.cdr.markForCheck(); }
    });
  }

  riskBadge(level: string) {
    return level === 'high' ? 'bg-danger' : level === 'medium' ? 'bg-warning text-dark' : 'bg-success';
  }
}
