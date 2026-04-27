import {
  Component, OnInit, OnDestroy, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import {
  AnalyticsService,
  ProjectAnalyticsDto,
  MilestoneRiskDto,
  WhatIfResultDto
} from '../../../services/analytics.service';
import { ProjectService, Project } from '../../../services/project-service';
import { M2WorkspaceService } from '../m2-workspaces/m2-workspace.service';
import { TaskService, TaskResponseDto } from '../../../services/TaskService/task.service';

Chart.register(...registerables);

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatSelectModule,
    MatProgressBarModule, MatChipsModule, MatTabsModule, MatTooltipModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
<div class="container-fluid fade-in mb-4">

  <!-- Header -->
  <mat-card class="header-card shadow-none pt-3 pb-3 px-3 mb-3">
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h2 class="mb-1">Executive Dashboard</h2>
        <p class="text-muted mb-0 small">Risk analysis, velocity and delivery forecasts</p>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <mat-form-field appearance="outline" class="mb-0" style="min-width:220px">
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="loadProject($event)">
            <mat-option *ngFor="let p of projects()" [value]="p.id">{{ p.name }}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="recalculate()" [disabled]="!selectedProjectId || recalculating()">
          <mat-icon>refresh</mat-icon>
          Recalculate
        </button>
      </div>
    </div>
  </mat-card>

  @if (loading()) {
    <div class="text-center py-5">
      <mat-icon class="spin" style="font-size:48px;color:#6366f1">autorenew</mat-icon>
      <p class="text-muted mt-2">Loading analytics...</p>
    </div>
  }

  @if (!loading() && !analytics()) {
    <div class="text-center py-5 text-muted">
      <mat-icon style="font-size:64px;opacity:.3">analytics</mat-icon>
      <p class="mt-2">Select a project to view analytics.</p>
    </div>
  }

  @if (analytics(); as a) {
    <!-- KPI Cards -->
    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3">
        <mat-card class="kpi-card h-100 p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="text-muted small mb-1">Actual Progress</p>
              <h3 class="mb-0 fw-bold">{{ a.actualProgressPct | number:'1.0-0' }}%</h3>
              <span [class]="varianceClass(a.scheduleVariance)" class="small">
                {{ a.scheduleVariance >= 0 ? '+' : '' }}{{ a.scheduleVariance | number:'1.0-0' }}% vs plan
              </span>
            </div>
            <mat-icon class="kpi-icon text-primary">trending_up</mat-icon>
          </div>
          <mat-progress-bar mode="determinate" [value]="a.actualProgressPct" class="mt-2"></mat-progress-bar>
        </mat-card>
      </div>
      <div class="col-6 col-lg-3">
        <mat-card class="kpi-card h-100 p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="text-muted small mb-1">Overall Risk</p>
              <h3 class="mb-0 fw-bold">{{ a.overallRiskScore | number:'1.0-0' }}/100</h3>
              <span [class]="riskClass(a.overallRisk)" class="badge">{{ a.overallRisk | uppercase }}</span>
            </div>
            <mat-icon [class]="'kpi-icon ' + riskClass(a.overallRisk)">warning</mat-icon>
          </div>
        </mat-card>
      </div>
      <div class="col-6 col-lg-3">
        <mat-card class="kpi-card h-100 p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="text-muted small mb-1">Milestones</p>
              <h3 class="mb-0 fw-bold">{{ a.completedMilestones }}/{{ a.totalMilestones }}</h3>
              <span class="small text-muted">{{ a.atRiskMilestones }} at risk · {{ a.missedMilestones }} missed</span>
            </div>
            <mat-icon class="kpi-icon text-warning">flag</mat-icon>
          </div>
        </mat-card>
      </div>
      <div class="col-6 col-lg-3">
        <mat-card class="kpi-card h-100 p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="text-muted small mb-1">Tasks</p>
              <h3 class="mb-0 fw-bold">{{ a.doneTasks }}/{{ a.totalTasks }}</h3>
              <span class="small text-muted">{{ a.blockedTasks }} blocked · {{ a.overdueTasks }} overdue</span>
            </div>
            <mat-icon class="kpi-icon text-success">task_alt</mat-icon>
          </div>
        </mat-card>
      </div>
    </div>

    <div class="row g-3">
      <!-- Burn-down Chart -->
      <div class="col-12 col-lg-7">
        <mat-card class="p-3 h-100">
          <h6 class="fw-semibold mb-3">
            <mat-icon class="small me-1">show_chart</mat-icon>
            Burn-down Chart
          </h6>
          <div style="position:relative;height:280px">
            <canvas #burndownCanvas></canvas>
          </div>
        </mat-card>
      </div>

      <!-- Critical Milestones -->
      <div class="col-12 col-lg-5">
        <mat-card class="p-3 h-100">
          <h6 class="fw-semibold mb-3">
            <mat-icon class="small me-1 text-danger">priority_high</mat-icon>
            Critical Milestones
          </h6>
          @if (a.criticalMilestones.length === 0) {
            <div class="text-center py-4 text-muted">
              <mat-icon>check_circle</mat-icon>
              <p class="small mb-0">No high-risk milestones</p>
            </div>
          }
          @for (m of a.criticalMilestones; track m.milestoneId) {
            <div class="milestone-risk-item mb-2 p-2 rounded" [class]="'risk-bg-' + m.riskLevel">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <strong class="small">{{ m.milestoneName }}</strong>
                  <div class="d-flex flex-wrap gap-1 mt-1">
                    <span class="badge" [class]="riskBadge(m.riskLevel)">{{ m.riskLevel | uppercase }}</span>
                    <span class="badge bg-secondary">{{ m.riskScore | number:'1.0-0' }}/100</span>
                    @if (m.delayDays > 0) {
                      <span class="badge bg-danger">+{{ m.delayDays }} days delay</span>
                    }
                  </div>
                  <mat-progress-bar [value]="m.completionPct" mode="determinate" class="mt-1" style="height:4px"></mat-progress-bar>
                  <span class="small text-muted">{{ m.completionPct | number:'1.0-0' }}% · {{ m.doneTasks }}/{{ m.totalTasks }} tasks</span>
                </div>
                <button mat-icon-button (click)="openWhatIf(m)" matTooltip="What-If Simulation">
                  <mat-icon class="small">science</mat-icon>
                </button>
              </div>
              @if (m.alerts.length > 0) {
                <div class="mt-1">
                  <p class="small mb-0 text-muted">{{ m.alerts[0] }}</p>
                </div>
              }
            </div>
          }
        </mat-card>
      </div>
    </div>

    <!-- What-If Panel -->
    @if (whatIfResult()) {
      <div class="row g-3 mt-0">
        <div class="col-12">
          <mat-card class="p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-semibold mb-0">
                <mat-icon class="small me-1 text-primary">science</mat-icon>
                What-If Simulation — "{{ whatIfResult()!.triggeredByTaskTitle }}" (+{{ whatIfResult()!.hypotheticalDelayDays }} days)
              </h6>
              <button mat-icon-button (click)="whatIfResult.set(null)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <h6 class="small text-muted">Affected Tasks ({{ whatIfResult()!.totalCascadedTasks }})</h6>
                @for (t of whatIfResult()!.affectedTasks; track t.taskId) {
                  <div class="d-flex justify-content-between border-bottom py-1 small">
                    <span>{{ t.taskTitle }}</span>
                    <span class="text-danger">+{{ t.shiftDays }} days → {{ t.newDueDate }}</span>
                  </div>
                }
                @if (whatIfResult()!.affectedTasks.length === 0) {
                  <p class="text-muted small">No cascading tasks.</p>
                }
              </div>
              <div class="col-12 col-md-6">
                <h6 class="small text-muted">Affected Milestones</h6>
                @for (m of whatIfResult()!.affectedMilestones; track m.milestoneId) {
                  <div class="mb-2 p-2 rounded" [class]="'risk-bg-' + m.newRiskLevel">
                    <strong class="small">{{ m.milestoneName }}</strong>
                    <div class="d-flex gap-1 mt-1">
                      <span class="badge" [class]="riskBadge(m.newRiskLevel)">{{ m.newRiskLevel | uppercase }}</span>
                      <span class="badge bg-danger small">{{ m.newPredictedDate }}</span>
                    </div>
                  </div>
                }
                @if (whatIfResult()!.affectedMilestones.length === 0) {
                  <p class="text-muted small">No affected milestones.</p>
                }
              </div>
            </div>
          </mat-card>
        </div>
      </div>
    }

    <!-- What-If Input -->
    <div class="row g-3 mt-0">
      <div class="col-12">
        <mat-card class="p-3">
          <h6 class="fw-semibold mb-3">
            <mat-icon class="small me-1">science</mat-icon>
            What-If Simulation
          </h6>
          <div class="d-flex gap-2 align-items-end flex-wrap">
            <mat-form-field appearance="outline" style="min-width:200px" class="mb-0">
              <mat-label>Task Name</mat-label>
              <mat-select [(ngModel)]="whatIfTaskId">
                <mat-option *ngFor="let task of tasks()" [value]="task.id">
                  #{{ task.id }} - {{ task.title }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="min-width:140px" class="mb-0">
              <mat-label>Delay (days)</mat-label>
              <input matInput type="number" [(ngModel)]="whatIfDelayDays" placeholder="e.g. 5">
            </mat-form-field>
            <button mat-raised-button color="accent" (click)="runWhatIf()" [disabled]="!whatIfTaskId || !whatIfDelayDays || simulating()">
              <mat-icon>play_arrow</mat-icon>
              Simulate
            </button>
          </div>
          @if (simError()) {
            <p class="text-danger small mt-2">{{ simError() }}</p>
          }
        </mat-card>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .kpi-card { border-radius: 12px; transition: transform .15s; }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-icon { font-size: 32px; opacity: .7; }
    .milestone-risk-item { border-left: 4px solid #ccc; }
    .risk-bg-high { background: #fef2f2; border-left-color: #ef4444 !important; }
    .risk-bg-medium { background: #fffbeb; border-left-color: #f59e0b !important; }
    .risk-bg-low { background: #f0fdf4; border-left-color: #22c55e !important; }
    .text-danger { color: #ef4444 !important; }
    .text-warning { color: #f59e0b !important; }
    .text-success { color: #22c55e !important; }
    .text-primary { color: #6366f1 !important; }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .spin { animation: spin 1s linear infinite; }
  `]
})
export class ExecutiveDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('burndownCanvas') burndownCanvas!: ElementRef<HTMLCanvasElement>;

  projects = signal<Project[]>([]);
  analytics = signal<ProjectAnalyticsDto | null>(null);
  tasks = signal<TaskResponseDto[]>([]);
  loading = signal(false);
  recalculating = signal(false);
  simulating = signal(false);
  whatIfResult = signal<WhatIfResultDto | null>(null);
  simError = signal<string | null>(null);

  selectedProjectId = '';
  whatIfTaskId: number | null = null;
  whatIfDelayDays: number | null = null;

  private burndownChart: Chart | null = null;

  constructor(
    private analyticsService: AnalyticsService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private ws: M2WorkspaceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.projectService.getMyProjects().subscribe(ps => {
      this.projects.set(ps);
      if (ps.length > 0) {
        this.selectedProjectId = ps[0].id;
        this.loadProject(ps[0].id);
      }
      this.cdr.markForCheck();
    });

    // Load user tasks for What-If simulation
    this.taskService.getMyTasks().subscribe(tasks => {
      this.tasks.set(tasks);
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {}

  loadProject(projectId: string) {
    if (!projectId) return;
    this.loading.set(true);
    this.analytics.set(null);
    this.whatIfResult.set(null);
    this.analyticsService.getProjectAnalytics(projectId).subscribe({
      next: dto => {
        this.analytics.set(dto);
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => this.renderBurndown(dto), 100);
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); }
    });
  }

  recalculate() {
    if (!this.selectedProjectId) return;
    this.recalculating.set(true);
    this.analyticsService.recalculateProject(this.selectedProjectId).subscribe({
      next: () => {
        this.recalculating.set(false);
        this.loadProject(this.selectedProjectId);
      },
      error: () => { this.recalculating.set(false); this.cdr.markForCheck(); }
    });
  }

  runWhatIf() {
    if (!this.whatIfTaskId || !this.whatIfDelayDays) return;
    this.simulating.set(true);
    this.simError.set(null);
    this.analyticsService.simulateWhatIf(this.whatIfTaskId, this.whatIfDelayDays).subscribe({
      next: result => {
        this.whatIfResult.set(result);
        this.simulating.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.simError.set('Simulation error. Please check the task ID.');
        this.simulating.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  openWhatIf(m: MilestoneRiskDto) {
    // Pre-populate whatif with first blocked/overdue task of the milestone if known
    // Just scroll to the what-if section
    this.whatIfDelayDays = Math.max(m.delayDays, 1);
    this.cdr.markForCheck();
  }

  private renderBurndown(dto: ProjectAnalyticsDto) {
    if (!this.burndownCanvas) return;
    if (this.burndownChart) {
      this.burndownChart.destroy();
      this.burndownChart = null;
    }
    if (!dto.burndownLabels || dto.burndownLabels.length === 0) return;

    const ctx = this.burndownCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.burndownChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dto.burndownLabels,
        datasets: [
          {
            label: 'Idéal',
            data: dto.burndownIdeal,
            borderColor: '#94a3b8',
            borderDash: [6, 3],
            fill: false,
            tension: 0,
            pointRadius: 2,
          },
          {
            label: 'Réel',
            data: dto.burndownActual,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,.08)',
            fill: true,
            tension: 0.2,
            pointRadius: 3,
            spanGaps: false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: {
            title: { display: true, text: 'Tâches restantes' },
            beginAtZero: true
          },
          x: { ticks: { maxTicksLimit: 8 } }
        }
      }
    });
  }

  varianceClass(v: number) {
    return v >= 0 ? 'text-success' : 'text-danger';
  }

  riskClass(level: string) {
    return level === 'high' ? 'text-danger' : level === 'medium' ? 'text-warning' : 'text-success';
  }

  riskBadge(level: string) {
    return level === 'high' ? 'bg-danger' : level === 'medium' ? 'bg-warning text-dark' : 'bg-success';
  }
}
