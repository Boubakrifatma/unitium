import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TaskRiskResult } from '../../../services/TaskService/risk-prediction.service';

export interface RiskDialogData {
  risk: TaskRiskResult;
  taskTitle: string;
}

@Component({
  selector: 'app-risk-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
<div class="rcd-root">

  <!-- Header -->
  <div class="rcd-header" [class.rcd-header-high]="data.risk.highRisk"
                          [class.rcd-header-low]="!data.risk.highRisk">
    <mat-icon class="rcd-header-icon">{{ data.risk.highRisk ? 'warning' : 'check_circle' }}</mat-icon>
    <div>
      <h2 class="rcd-title">Risk Assessment</h2>
      <p class="rcd-sub">{{ data.taskTitle }}</p>
    </div>
  </div>

  <!-- Score gauge -->
  <div class="rcd-score-row">
    <div class="rcd-score-circle" [style.border-color]="riskColor">
      <span class="rcd-score-pct" [style.color]="riskColor">{{ scorePercent }}%</span>
      <span class="rcd-score-lbl">risk</span>
    </div>
    <div class="rcd-score-info">
      <p class="rcd-verdict" [style.color]="riskColor">
        <mat-icon style="vertical-align:middle;margin-right:4px">{{ data.risk.highRisk ? 'error_outline' : 'task_alt' }}</mat-icon>
        {{ data.risk.highRisk ? 'High Risk Task' : 'Low Risk Task' }}
      </p>
      <p class="rcd-workload">
        Assignee current workload: <strong>{{ data.risk.userWorkload | number:'1.0-1' }} h</strong>
      </p>

      <!-- Progress bar -->
      <div class="rcd-bar-track">
        <div class="rcd-bar-fill"
             [style.width.%]="scorePercent"
             [style.background]="riskColor">
        </div>
        <div class="rcd-bar-threshold"
             [style.left.%]="data.risk.threshold * 100"
             title="Threshold {{ data.risk.threshold | number:'1.0-2' }}">
        </div>
      </div>
      <div class="rcd-bar-labels">
        <span>0%</span>
        <span style="flex:1;text-align:center;font-size:10px;color:#94a3b8">
          threshold {{ data.risk.threshold | number:'1.0-0' | percent }}
        </span>
        <span>100%</span>
      </div>
    </div>
  </div>

  <!-- Fallback notice -->
  @if (data.risk.fallback) {
    <div class="rcd-fallback">
      <mat-icon>info_outline</mat-icon>
      <span>{{ data.risk.fallbackReason }}</span>
    </div>
  }

  <!-- LLM reasoning -->
  @if (data.risk.reasoning) {
    <div class="rcd-reasoning">
      <p class="rcd-reasoning-title">
        <mat-icon style="font-size:15px;width:15px;height:15px">psychology</mat-icon>
        AI Analysis
      </p>
      <p class="rcd-reasoning-body">{{ data.risk.reasoning }}</p>
    </div>
  }

  <!-- High-risk warning message -->
  @if (data.risk.highRisk && !data.risk.fallback) {
    <div class="rcd-warning-box">
      <mat-icon>report_problem</mat-icon>
      <span>This task has a high probability of not being completed on time. Consider reducing scope, extending the deadline, or reassigning to a less loaded employee.</span>
    </div>
  }

  <!-- Actions -->
  <div class="rcd-actions">
    <button mat-stroked-button (click)="cancel()" class="rcd-btn-cancel">
      <mat-icon>close</mat-icon> Cancel
    </button>
    <button mat-flat-button (click)="confirm()"
            [class.rcd-btn-confirm-safe]="!data.risk.highRisk"
            [class.rcd-btn-confirm-risk]="data.risk.highRisk">
      <mat-icon>{{ data.risk.highRisk ? 'warning' : 'add_task' }}</mat-icon>
      {{ data.risk.highRisk ? 'Create anyway' : 'Confirm & Create' }}
    </button>
  </div>
</div>
  `,
  styles: [`
    .rcd-root {
      font-family: system-ui, sans-serif;
      color: #1e293b;
      min-width: 420px;
      max-width: 520px;
    }

    /* ── Header ─────────────────────────── */
    .rcd-header {
      display: flex; align-items: center; gap: 14px;
      padding: 20px 24px;
      border-radius: 4px 4px 0 0;
      color: #fff;
    }
    .rcd-header-high { background: linear-gradient(135deg,#ef4444,#b91c1c); }
    .rcd-header-low  { background: linear-gradient(135deg,#22c55e,#15803d); }
    .rcd-header-icon { font-size: 36px; width: 36px; height: 36px; flex-shrink: 0; }
    .rcd-title { margin: 0; font-size: 18px; font-weight: 700; }
    .rcd-sub   { margin: 2px 0 0; font-size: 12px; opacity: .85;
                 max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* ── Score row ──────────────────────── */
    .rcd-score-row {
      display: flex; gap: 20px; padding: 20px 24px; align-items: center;
    }
    .rcd-score-circle {
      width: 80px; height: 80px; border-radius: 50%;
      border: 4px solid; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .rcd-score-pct { font-size: 22px; font-weight: 800; line-height: 1; }
    .rcd-score-lbl { font-size: 11px; color: #64748b; font-weight: 600; }
    .rcd-score-info { flex: 1; }
    .rcd-verdict  { margin: 0 0 4px; font-size: 15px; font-weight: 700;
                    display: flex; align-items: center; }
    .rcd-method   { margin: 0 0 2px; font-size: 12px; color: #64748b; }
    .rcd-workload { margin: 0 0 10px; font-size: 12px; color: #64748b; }

    /* Progress bar */
    .rcd-bar-track {
      height: 8px; background: #f1f5f9; border-radius: 4px;
      position: relative; overflow: visible; margin-bottom: 4px;
    }
    .rcd-bar-fill {
      height: 100%; border-radius: 4px;
      transition: width .6s cubic-bezier(.4,0,.2,1);
    }
    .rcd-bar-threshold {
      position: absolute; top: -4px; width: 2px; height: 16px;
      background: #64748b; border-radius: 2px;
    }
    .rcd-bar-labels {
      display: flex; font-size: 10px; color: #94a3b8;
    }

    /* ── Fallback / reasoning / warning ─── */
    .rcd-fallback {
      display: flex; gap: 8px; align-items: flex-start;
      margin: 0 24px 12px; padding: 10px 14px;
      background: #f0f9ff; border-left: 3px solid #0ea5e9;
      border-radius: 0 6px 6px 0; font-size: 12.5px; color: #0c4a6e;
    }
    .rcd-reasoning {
      margin: 0 24px 12px; padding: 12px 14px;
      background: #f8fafc; border-radius: 8px;
    }
    .rcd-reasoning-title {
      margin: 0 0 6px; font-size: 12px; font-weight: 700;
      color: #6366f1; display: flex; align-items: center; gap: 4px;
    }
    .rcd-reasoning-body {
      margin: 0; font-size: 12px; color: #334155; line-height: 1.55;
    }
    .rcd-warning-box {
      display: flex; gap: 10px; align-items: flex-start;
      margin: 0 24px 14px; padding: 12px 14px;
      background: #fff7ed; border-left: 3px solid #f97316;
      border-radius: 0 8px 8px 0; font-size: 12.5px; color: #7c2d12;
    }

    /* ── Actions ────────────────────────── */
    .rcd-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 12px 24px 20px;
      border-top: 1px solid #f1f5f9;
    }
    .rcd-btn-cancel      { color: #64748b !important; }
    .rcd-btn-confirm-safe { background: #22c55e !important; color: #fff !important; }
    .rcd-btn-confirm-risk { background: #f97316 !important; color: #fff !important; }
  `]
})
export class RiskConfirmDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<RiskConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RiskDialogData
  ) {}

  get scorePercent(): number {
    return Math.round(this.data.risk.riskScore * 100);
  }

  get riskColor(): string {
    const s = this.scorePercent;
    if (s >= 70) return '#ef4444';
    if (s >= 50) return '#f97316';
    if (s >= 30) return '#f59e0b';
    return '#22c55e';
  }

  confirm(): void { this.dialogRef.close(true); }
  cancel():  void { this.dialogRef.close(false); }
}
