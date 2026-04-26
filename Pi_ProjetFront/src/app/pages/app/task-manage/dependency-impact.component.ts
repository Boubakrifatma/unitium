import {
  Component,
  Input,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AnalyticsService, WhatIfResultDto } from '../../../services/analytics.service';
import { TaskItem } from './all-task.component';

@Component({
  selector: 'app-dependency-impact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="impact-root">

      <!-- ===== LEFT: Task selector ===== -->
      <div class="impact-left">
        <div class="panel-title">
          <mat-icon>hub</mat-icon>
          Impact Analysis
        </div>

        <!-- Task dropdown -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Select a task</mat-label>
          <mat-select [(ngModel)]="selectedTaskIdValue" (ngModelChange)="onTaskSelect($event)">
            <mat-option [value]="null">-- Choisir une tâche --</mat-option>
            <mat-option *ngFor="let t of tasks" [value]="t.taskId">
              <span class="task-opt-id">#{{ t.taskId }}</span>
              {{ t.title }}
              <span class="task-opt-status" [class]="'opt-s-' + t.status">{{ t.status }}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Selected task info card -->
        <div class="selected-task-card" *ngIf="selectedTask() as task">
          <div class="stc-header">
            <span class="stc-id">#{{ task.taskId }}</span>
            <span class="stc-status" [class]="'stc-s-' + task.status">{{ task.status }}</span>
          </div>
          <div class="stc-title">{{ task.title }}</div>
          <div class="stc-meta">
            <mat-icon>event</mat-icon>
            <span>Due: {{ task.dueDate && task.dueDate !== '-' ? (task.dueDate | date:'dd MMM yyyy') : 'N/A' }}</span>
          </div>
          <div class="stc-delay" *ngIf="actualDelay() > 0">
            <mat-icon>warning</mat-icon>
            En retard de <strong>{{ actualDelay() }} jour(s)</strong>
          </div>
          <div class="stc-ontime" *ngIf="actualDelay() <= 0">
            <mat-icon>check_circle</mat-icon>
            Dans les délais
          </div>
        </div>

        <!-- Delay input -->
        <mat-form-field appearance="outline" class="w-full" *ngIf="selectedTask()">
          <mat-label>Délai hypothétique (jours)</mat-label>
          <input matInput type="number" [(ngModel)]="delayDaysValue" min="1" max="365"
            (ngModelChange)="delayDays.set($event)" />
          <mat-icon matSuffix>timer</mat-icon>
        </mat-form-field>

        <!-- Analyse button -->
        <button mat-raised-button color="primary" class="analyse-btn"
          [disabled]="!selectedTask() || loading()"
          (click)="analyse()">
          <mat-icon>search</mat-icon>
          Analyser l'impact
        </button>

        <!-- Error -->
        <div class="error-box" *ngIf="error()">
          <mat-icon>error_outline</mat-icon>
          {{ error() }}
        </div>
      </div>

      <!-- ===== RIGHT: Impact visualization ===== -->
      <div class="impact-right">

        <!-- Loading state -->
        <div class="loading-center" *ngIf="loading()">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Analyse en cours...</p>
        </div>

        <!-- Empty / initial state -->
        <div class="empty-impact" *ngIf="!loading() && !result()">
          <mat-icon class="empty-icon">account_tree</mat-icon>
          <p>Sélectionnez une tâche et cliquez sur<br><strong>Analyser l'impact</strong></p>
        </div>

        <!-- No cascade -->
        <div class="no-cascade" *ngIf="!loading() && result() && result()!.totalCascadedTasks === 0">
          <mat-icon>check_circle</mat-icon>
          <p>Aucun impact en cascade</p>
          <small>Cette tâche n'a pas de dépendants affectés.</small>
        </div>

        <!-- Results -->
        <div class="impact-result" *ngIf="!loading() && result() && result()!.totalCascadedTasks > 0">

          <!-- Summary strip -->
          <div class="impact-summary">
            <div class="is-box is-tasks">
              <span class="is-num">{{ result()!.totalCascadedTasks }}</span>
              <span class="is-label">Tâches impactées</span>
            </div>
            <div class="is-box is-milestones">
              <span class="is-num">{{ result()!.affectedMilestones.length }}</span>
              <span class="is-label">Milestones affectées</span>
            </div>
            <div class="is-box is-delay">
              <span class="is-num">+{{ result()!.hypotheticalDelayDays }}j</span>
              <span class="is-label">Délai hypothétique</span>
            </div>
          </div>

          <!-- Cascade tree: root task -->
          <div class="cascade-tree">
            <div class="cascade-root cascade-card">
              <mat-icon class="cr-icon">crisis_alert</mat-icon>
              <div class="cr-content">
                <div class="cr-title">{{ result()!.triggeredByTaskTitle }}</div>
                <div class="cr-sub">Tâche déclencheur · +{{ result()!.hypotheticalDelayDays }} jours</div>
              </div>
            </div>

            <!-- Connector line -->
            <div class="cascade-connector" *ngIf="result()!.affectedTasks.length > 0"></div>

            <!-- Affected tasks -->
            <div class="affected-tasks-grid">
              <div class="affected-task-card cascade-card"
                *ngFor="let at of result()!.affectedTasks; let i = index"
                [style.animation-delay]="(i * 80) + 'ms'">
                <div class="atc-top">
                  <mat-icon class="atc-icon">arrow_forward</mat-icon>
                  <span class="atc-title">{{ at.taskTitle }}</span>
                  <span class="atc-shift-badge">+{{ at.shiftDays }}j</span>
                </div>
                <div class="atc-dates" *ngIf="at.originalDueDate || at.newDueDate">
                  <span class="atc-orig">{{ at.originalDueDate | date:'dd MMM' }}</span>
                  <mat-icon style="font-size:14px;width:14px;height:14px">arrow_right_alt</mat-icon>
                  <span class="atc-new">{{ at.newDueDate | date:'dd MMM' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Affected milestones section -->
          <div class="affected-milestones" *ngIf="result()!.affectedMilestones.length > 0">
            <div class="am-title">
              <mat-icon>flag</mat-icon>
              Milestones affectées
            </div>
            <div class="am-grid">
              <div class="am-card cascade-card"
                *ngFor="let am of result()!.affectedMilestones; let i = index"
                [style.animation-delay]="(i * 100 + 200) + 'ms'">
                <div class="am-header">
                  <span class="am-name">{{ am.milestoneName }}</span>
                  <span class="am-risk-badge" [class]="'risk-' + am.newRiskLevel">
                    {{ am.newRiskLevel }}
                  </span>
                </div>
                <div class="am-risk-score">
                  <div class="am-risk-bar-track">
                    <div class="am-risk-bar"
                      [style.width.%]="am.newRiskScore"
                      [class]="'risk-bar-' + am.newRiskLevel">
                    </div>
                  </div>
                  <span class="am-risk-num">{{ am.newRiskScore | number:'1.0-0' }}%</span>
                </div>
                <div class="am-dates" *ngIf="am.originalDueDate || am.newPredictedDate">
                  <span class="am-orig-label">Planifiée:</span>
                  <span class="am-orig">{{ am.originalDueDate | date:'dd MMM yyyy' }}</span>
                  <span class="am-new-label">Prédite:</span>
                  <span class="am-new">{{ am.newPredictedDate | date:'dd MMM yyyy' }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .impact-root {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      min-height: 420px;
    }

    @media (max-width: 768px) {
      .impact-root { grid-template-columns: 1fr; }
    }

    /* ===== Left panel ===== */
    .impact-left {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .panel-title mat-icon { color: #6366f1; }

    .w-full { width: 100%; }

    /* Task select option styling */
    .task-opt-id {
      font-size: 0.75rem;
      font-weight: 700;
      color: #6366f1;
      margin-right: 4px;
    }

    .task-opt-status {
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 8px;
      margin-left: 6px;
      background: #f3f4f6;
      color: #374151;
    }

    /* Selected task card */
    .selected-task-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stc-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stc-id {
      font-size: 0.8rem;
      font-weight: 700;
      color: #6366f1;
    }

    .stc-status {
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    .stc-s-done      { background: #d1fae5; color: #065f46; }
    .stc-s-in_progress { background: #fef3c7; color: #92400e; }
    .stc-s-todo      { background: #ede9fe; color: #4c1d95; }
    .stc-s-blocked   { background: #fee2e2; color: #991b1b; }
    .stc-s-review    { background: #e0f2fe; color: #0c4a6e; }

    .stc-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1f2937;
      line-height: 1.4;
    }

    .stc-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: #6b7280;
    }

    .stc-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .stc-delay {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: #dc2626;
      background: #fee2e2;
      border-radius: 6px;
      padding: 6px 10px;
    }

    .stc-delay mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .stc-ontime {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: #059669;
      background: #d1fae5;
      border-radius: 6px;
      padding: 6px 10px;
    }

    .stc-ontime mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .analyse-btn {
      width: 100%;
      font-weight: 600;
    }

    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 0.85rem;
    }

    /* ===== Right panel ===== */
    .impact-right {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
    }

    .loading-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #6b7280;
    }

    .empty-impact {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #9ca3af;
      text-align: center;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #d1d5db;
    }

    .no-cascade {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #059669;
      text-align: center;
    }

    .no-cascade mat-icon { font-size: 48px; width: 48px; height: 48px; }

    /* ===== Summary strip ===== */
    .impact-summary {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .is-box {
      flex: 1;
      min-width: 90px;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .is-num {
      font-size: 1.8rem;
      font-weight: 800;
      line-height: 1;
    }

    .is-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.85;
    }

    .is-tasks     { background: #fee2e2; color: #991b1b; }
    .is-milestones { background: #fef3c7; color: #92400e; }
    .is-delay     { background: #ede9fe; color: #5b21b6; }

    /* ===== Cascade tree ===== */
    .cascade-tree {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
      margin-bottom: 24px;
    }

    /* Shared card animation */
    .cascade-card {
      animation: cascadeIn 0.4s ease-out both;
    }

    @keyframes cascadeIn {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Root task */
    .cascade-root {
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      border-radius: 12px;
      padding: 14px 20px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(239,68,68,0.3);
    }

    .cr-icon { font-size: 24px; width: 24px; height: 24px; }

    .cr-content { flex: 1; }

    .cr-title {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .cr-sub {
      font-size: 0.8rem;
      opacity: 0.85;
      margin-top: 2px;
    }

    /* Connector */
    .cascade-connector {
      width: 2px;
      height: 24px;
      background: #e5e7eb;
      margin-left: 28px;
      position: relative;
    }

    .cascade-connector::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: -4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #9ca3af;
    }

    /* Affected tasks grid */
    .affected-tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      width: 100%;
    }

    .affected-task-card {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .atc-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .atc-icon { font-size: 16px; width: 16px; height: 16px; color: #f97316; }

    .atc-title {
      flex: 1;
      font-size: 0.85rem;
      font-weight: 600;
      color: #1f2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .atc-shift-badge {
      background: #ef4444;
      color: white;
      border-radius: 8px;
      padding: 2px 8px;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .atc-dates {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .atc-orig { color: #9ca3af; text-decoration: line-through; }
    .atc-new  { color: #dc2626; font-weight: 600; }

    /* ===== Affected milestones ===== */
    .affected-milestones { margin-top: 8px; }

    .am-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
    }

    .am-title mat-icon { color: #f59e0b; }

    .am-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
    }

    .am-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .am-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .am-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .am-risk-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .risk-low    { background: #d1fae5; color: #065f46; }
    .risk-medium { background: #fef3c7; color: #92400e; }
    .risk-high   { background: #fee2e2; color: #991b1b; }

    .am-risk-score {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .am-risk-bar-track {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .am-risk-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    .risk-bar-low    { background: #10b981; }
    .risk-bar-medium { background: #f59e0b; }
    .risk-bar-high   { background: #ef4444; }

    .am-risk-num {
      font-size: 0.82rem;
      font-weight: 700;
      color: #374151;
      white-space: nowrap;
    }

    .am-dates {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 8px;
      font-size: 0.75rem;
    }

    .am-orig-label, .am-new-label {
      color: #9ca3af;
      font-weight: 600;
    }

    .am-orig { color: #6b7280; text-decoration: line-through; }
    .am-new  { color: #dc2626; font-weight: 600; }

    /* Option status classes in select */
    .opt-s-done      { color: #059669; }
    .opt-s-in_progress { color: #d97706; }
    .opt-s-todo      { color: #6366f1; }
    .opt-s-blocked   { color: #dc2626; }
    .opt-s-review    { color: #0284c7; }
  `],
})
export class DependencyImpactComponent {
  @Input() tasks: TaskItem[] = [];
  @Input() milestoneId: number | null = null;

  selectedTaskId = signal<number | null>(null);
  delayDays = signal<number>(5);
  result = signal<WhatIfResultDto | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Two-way binding helpers for ngModel
  selectedTaskIdValue: number | null = null;
  delayDaysValue: number = 5;

  constructor(private analyticsService: AnalyticsService) {}

  selectedTask = computed(() => {
    const id = this.selectedTaskId();
    if (id === null) return null;
    return this.tasks.find(t => t.taskId === id) ?? null;
  });

  actualDelay = computed(() => {
    const task = this.selectedTask();
    if (!task || !task.dueDate || task.dueDate === '-') return 0;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((today.getTime() - due.getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  });

  onTaskSelect(id: number | null) {
    this.selectedTaskId.set(id);
    this.result.set(null);
    this.error.set(null);
    // Auto-populate delay with actual delay
    const delay = this.actualDelay();
    const d = delay > 0 ? delay : 5;
    this.delayDays.set(d);
    this.delayDaysValue = d;
  }

  analyse() {
    const taskId = this.selectedTaskId();
    if (!taskId) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.analyticsService.simulateWhatIf(taskId, this.delayDays()).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('WhatIf error', err);
        this.error.set("Erreur lors de l'analyse. Veuillez réessayer.");
        this.loading.set(false);
      },
    });
  }
}
