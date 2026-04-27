import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterLink }        from '@angular/router';
import { MatIconModule }     from '@angular/material/icon';
import { MatButtonModule }   from '@angular/material/button';
import { MatTooltipModule }  from '@angular/material/tooltip';
import { WorkloadService, WorkloadPressure, DayPlanEntry, UrgentTaskInfo } from '../../../services/workload.service';
import { AuthService }       from '../../../auth/auth.service';
import { TaskService, TaskResponseDto } from '../../../services/TaskService/task.service';

@Component({
  selector: 'app-workload-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
<div class="wld-root">

  <!-- ══ GREETING HERO ════════════════════════════════════════════════════ -->
  <div class="wld-greeting-hero">
    <div class="wld-greeting-left">
      <div class="wld-avatar">
        @if (userAvatar()) {
          <img [src]="userAvatar()" alt="avatar" class="wld-avatar-img"/>
        } @else {
          <mat-icon style="font-size:32px;width:32px;height:32px;color:#fff">person</mat-icon>
        }
      </div>
      <div>
        <h1 class="wld-greeting-title">{{ greeting() }}, {{ firstName() }}!</h1>
        <p class="wld-greeting-sub">
          {{ isStudent() ? 'Academic workload for today' : 'Work summary for today' }}
        </p>
      </div>
    </div>
    <div class="wld-topbar-right">
      <button mat-stroked-button (click)="reload()" [disabled]="ws.loading()">
        <mat-icon>refresh</mat-icon> Refresh
      </button>
      <a mat-stroked-button routerLink="/app/kanban">
        <mat-icon>view_kanban</mat-icon> Kanban
      </a>
    </div>
  </div>

  <!-- ══ QUICK STATS ═══════════════════════════════════════════════════════ -->
  <div class="wld-quick-stats">
    <div class="wld-qs-card wld-qs-total">
      <mat-icon>assignment</mat-icon>
      <div class="wld-qs-info">
        <span class="wld-qs-val">{{ totalTasks() }}</span>
        <span class="wld-qs-lbl">Total Tasks</span>
      </div>
    </div>
    <div class="wld-qs-card wld-qs-progress">
      <mat-icon>pending_actions</mat-icon>
      <div class="wld-qs-info">
        <span class="wld-qs-val">{{ inProgressTasks() }}</span>
        <span class="wld-qs-lbl">In Progress</span>
      </div>
    </div>
    <div class="wld-qs-card wld-qs-done">
      <mat-icon>task_alt</mat-icon>
      <div class="wld-qs-info">
        <span class="wld-qs-val">{{ doneTasks() }}</span>
        <span class="wld-qs-lbl">Completed</span>
      </div>
    </div>
    <div class="wld-qs-card wld-qs-overdue" [class.wld-qs-alert]="overdueTasksCount() > 0">
      <mat-icon>warning_amber</mat-icon>
      <div class="wld-qs-info">
        <span class="wld-qs-val">{{ overdueTasksCount() }}</span>
        <span class="wld-qs-lbl">Overdue</span>
      </div>
    </div>
  </div>

  <!-- ══ QUICK ACTIONS ════════════════════════════════════════════════════ -->
  <div class="wld-quick-actions">
    <a class="wld-qa-btn wld-qa-kanban" routerLink="/app/kanban">
      <mat-icon>view_kanban</mat-icon>
      <span>My Kanban</span>
    </a>
    <a class="wld-qa-btn wld-qa-chat" routerLink="/app/chat">
      <mat-icon>chat</mat-icon>
      <span>Chat</span>
    </a>
    <a class="wld-qa-btn wld-qa-milestones" routerLink="/app/milestones">
      <mat-icon>flag</mat-icon>
      <span>Milestones</span>
    </a>
  </div>

  <!-- ══ TODAY'S TASKS ═════════════════════════════════════════════════════ -->
  @if (todayTasks().length > 0) {
  <section class="wld-section">
    <h2 class="wld-section-title">
      <mat-icon style="color:#6366f1">today</mat-icon>
      Today's Tasks
      <span class="wld-section-hint">{{ todayTasks().length }} task{{ todayTasks().length !== 1 ? 's' : '' }} scheduled</span>
    </h2>
    <div class="wld-today-list">
      @for (t of todayTasks(); track t.id) {
      <div class="wld-today-card" [class.wld-today-done]="t.status === 'done'">
        <div class="wld-today-status-dot" [class]="'dot-' + t.status"></div>
        <div class="wld-today-body">
          <span class="wld-today-title">{{ t.title }}</span>
          <div class="wld-today-meta">
            @if (t.projectName) {
              <span class="wld-project-chip" style="background:#6366f122;color:#6366f1">{{ t.projectName }}</span>
            }
            @if (t.difficulty) {
              <span class="wld-diff-chip" [class]="'diff-' + t.difficulty">{{ t.difficulty }}</span>
            }
            <span class="wld-prio-chip">{{ t.priority }}</span>
          </div>
        </div>
        @if (t.status === 'done') {
          <mat-icon style="color:#22c55e;flex-shrink:0">check_circle</mat-icon>
        }
      </div>
      }
    </div>
  </section>
  }

  <!-- ══ TOP BAR (title for sections below) ════════════════════════════════ -->
  <div class="wld-section-header">
    <mat-icon class="wld-topbar-icon">psychology</mat-icon>
    <div>
      <h2 class="wld-section-main-title">Pressure & Smart Planner</h2>
      <p class="wld-subtitle">{{ isStudent() ? 'Academic pressure & study planner' : 'Project pressure & smart scheduling' }}</p>
    </div>
  </div>

  <!-- ══ LOADING ═══════════════════════════════════════════════════════════ -->
  @if (ws.loading()) {
    <div class="wld-loading">
      <div class="wld-spinner"></div>
      <p>Analysing your workload…</p>
    </div>
  }

  @if (!ws.loading() && ws.pressure(); as p) {

  <!-- ══ PRESSURE GAUGE + STATS ════════════════════════════════════════════ -->
  <div class="wld-hero">

    <!-- Gauge -->
    <div class="wld-gauge-card">
      <p class="wld-gauge-title">Pressure Level</p>
      <div class="wld-gauge-wrap">
        <svg class="wld-gauge-svg" viewBox="0 0 200 120">
          <!-- Background arc -->
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round"/>
          <!-- Colored arc (dynamic) -->
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                [attr.stroke]="p.color"
                stroke-width="18"
                stroke-linecap="round"
                [attr.stroke-dasharray]="gaugeDash(p.score)"
                stroke-dashoffset="0"
                class="wld-gauge-arc"
                style="transition: stroke-dasharray 1s ease"/>
          <!-- Score text -->
          <text x="100" y="92" text-anchor="middle" class="wld-gauge-score" [attr.fill]="p.color">{{ p.score }}</text>
          <text x="100" y="108" text-anchor="middle" class="wld-gauge-pts">pts</text>
        </svg>
        <!-- Level badge -->
        <div class="wld-level-badge" [style.background]="levelBg(p.level)" [style.color]="p.color">
          <mat-icon style="font-size:16px;width:16px;height:16px">{{ levelIcon(p.level) }}</mat-icon>
          {{ p.levelLabel }}
        </div>
      </div>
      <!-- Scale -->
      <div class="wld-gauge-scale">
        <span style="color:#22c55e">0-5 Calm</span>
        <span style="color:#f59e0b">6-10 Medium</span>
        <span style="color:#ef4444">11+ High Stress</span>
      </div>
      <!-- Message -->
      <div class="wld-message" [style.border-left-color]="p.color">
        <mat-icon [style.color]="p.color">info</mat-icon>
        <span>{{ p.message }}</span>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="wld-stats">
      <div class="wld-stat-card wld-stat-red">
        <mat-icon>warning</mat-icon>
        <span class="wld-stat-val">{{ p.overdueCount }}</span>
        <span class="wld-stat-lbl">Overdue</span>
      </div>
      <div class="wld-stat-card wld-stat-orange">
        <mat-icon>schedule</mat-icon>
        <span class="wld-stat-val">{{ p.urgentCount }}</span>
        <span class="wld-stat-lbl">Due &lt; 2 days</span>
      </div>
      <div class="wld-stat-card wld-stat-blue">
        <mat-icon>upcoming</mat-icon>
        <span class="wld-stat-val">{{ p.upcomingCount }}</span>
        <span class="wld-stat-lbl">Due this week</span>
      </div>
      <div class="wld-stat-card wld-stat-purple">
        <mat-icon>assignment</mat-icon>
        <span class="wld-stat-val">{{ p.totalActiveTasks }}</span>
        <span class="wld-stat-lbl">Active tasks</span>
      </div>
    </div>
  </div>

  <!-- ══ URGENT TASKS ══════════════════════════════════════════════════════ -->
  @if (p.urgentTasks.length > 0) {
  <section class="wld-section">
    <h2 class="wld-section-title">
      <mat-icon style="color:#ef4444">local_fire_department</mat-icon>
      Urgent Tasks
    </h2>
    <div class="wld-urgent-list">
      @for (t of p.urgentTasks; track t.taskId) {
      <div class="wld-urgent-card" [class.wld-overdue]="t.daysLeft < 0">
        <div class="wld-urg-color-bar" [style.background]="t.projectColor"></div>
        <div class="wld-urg-body">
          <div class="wld-urg-top">
            <span class="wld-urg-title">{{ t.title }}</span>
            <span class="wld-deadline-badge" [class.overdue]="t.daysLeft < 0" [class.today]="t.daysLeft === 0">
              <mat-icon style="font-size:13px;width:13px;height:13px">schedule</mat-icon>
              {{ t.deadlineLabel }}
            </span>
          </div>
          <div class="wld-urg-meta">
            <span class="wld-project-chip" [style.background]="t.projectColor + '22'" [style.color]="t.projectColor">
              {{ t.projectName || 'No project' }}
            </span>
            <span class="wld-diff-chip" [class]="'diff-' + t.difficulty">{{ t.difficulty }}</span>
            <span class="wld-prio-chip" [class]="'prio-' + t.priority">{{ t.priority }}</span>
          </div>
        </div>
      </div>
      }
    </div>
  </section>
  }

  <!-- ══ WEEKLY PLAN ═══════════════════════════════════════════════════════ -->
  <section class="wld-section">
    <h2 class="wld-section-title">
      <mat-icon style="color:#6366f1">calendar_month</mat-icon>
      Smart Weekly Plan
      <span class="wld-section-hint">Auto-distributed, max 3 tasks/day</span>
    </h2>
    <div class="wld-week-grid">
      @for (day of p.weeklyPlan; track day.date) {
      <div class="wld-day-col" [class.wld-today]="day.isToday" [class.wld-overloaded]="day.isOverloaded">
        <div class="wld-day-head">
          <span class="wld-day-name">{{ day.dayName.slice(0,3) }}</span>
          <span class="wld-day-date">{{ formatDate(day.date) }}</span>
          @if (day.isToday) { <span class="wld-today-badge">TODAY</span> }
          @if (day.isOverloaded) {
            <mat-icon class="wld-overload-icon" matTooltip="High load day">warning</mat-icon>
          }
        </div>
        <div class="wld-day-score-bar">
          <div class="wld-day-score-fill"
               [style.width.%]="Math.min(100, day.dayScore * 10)"
               [style.background]="day.dayScore >= 6 ? '#ef4444' : day.dayScore >= 3 ? '#f59e0b' : '#22c55e'">
          </div>
        </div>
        <div class="wld-day-tasks">
          @if (day.tasks.length === 0) {
            <div class="wld-day-empty">
              <mat-icon style="font-size:20px;opacity:.3">check_circle_outline</mat-icon>
              <span>Free day</span>
            </div>
          }
          @for (task of day.tasks; track task.taskId) {
          <div class="wld-plan-task" [style.border-left-color]="task.projectColor">
            <div class="wld-plan-task-title">{{ task.title }}</div>
            <div class="wld-plan-task-meta">
              <span class="wld-diff-chip" [class]="'diff-' + task.difficulty">{{ task.difficulty }}</span>
              <span class="wld-deadline-badge compact" [class.overdue]="task.daysLeft < 0">
                {{ task.deadlineLabel }}
              </span>
            </div>
            <div class="wld-plan-project">{{ task.projectName }}</div>
          </div>
          }
        </div>
      </div>
      }
    </div>
  </section>

  <!-- ══ DEADLINE TIMELINE ══════════════════════════════════════════════════ -->
  @if (p.urgentTasks.length > 0) {
  <section class="wld-section">
    <h2 class="wld-section-title">
      <mat-icon style="color:#8b5cf6">timeline</mat-icon>
      Deadline Timeline
    </h2>
    <div class="wld-timeline">
      @for (t of p.urgentTasks; track t.taskId; let i = $index) {
      <div class="wld-tl-item">
        <div class="wld-tl-dot" [style.background]="t.projectColor" [class.wld-tl-overdue]="t.daysLeft < 0"></div>
        <div class="wld-tl-line" [class.last]="i === p.urgentTasks.length - 1"></div>
        <div class="wld-tl-content">
          <div class="wld-tl-title">{{ t.title }}</div>
          <div class="wld-tl-meta">
            <span class="wld-project-chip" [style.background]="t.projectColor + '22'" [style.color]="t.projectColor">
              {{ t.projectName || 'No project' }}
            </span>
            <span class="wld-deadline-badge" [class.overdue]="t.daysLeft < 0">{{ t.deadlineLabel }}</span>
            <span class="wld-diff-chip" [class]="'diff-' + t.difficulty">{{ t.difficulty }}</span>
          </div>
        </div>
        <div class="wld-tl-date">{{ t.dueDate ? formatDate(t.dueDate) : '—' }}</div>
      </div>
      }
    </div>
  </section>
  }

  <!-- ══ NOTIFICATIONS REMINDER ════════════════════════════════════════════ -->
  <section class="wld-section wld-notif-section">
    <h2 class="wld-section-title">
      <mat-icon style="color:#0ea5e9">notifications_active</mat-icon>
      Deadline Notifications
    </h2>
    <div class="wld-notif-cards">
      <div class="wld-notif-card">
        <mat-icon style="color:#6366f1;font-size:28px;width:28px;height:28px">notification_important</mat-icon>
        <span class="wld-notif-label">2 days before</span>
        <span class="wld-notif-desc">Early warning — plan your approach</span>
      </div>
      <div class="wld-notif-card">
        <mat-icon style="color:#f59e0b;font-size:28px;width:28px;height:28px">alarm</mat-icon>
        <span class="wld-notif-label">1 day before</span>
        <span class="wld-notif-desc">Final reminder — finish today</span>
      </div>
      <div class="wld-notif-card">
        <mat-icon style="color:#ef4444;font-size:28px;width:28px;height:28px">priority_high</mat-icon>
        <span class="wld-notif-label">Due today</span>
        <span class="wld-notif-desc">Deadline day — submit now</span>
      </div>
    </div>
    <p class="wld-notif-hint">
      <mat-icon style="font-size:14px;width:14px;vertical-align:middle">check_circle</mat-icon>
      Notifications appear in your header bell when tasks are due.
    </p>
  </section>

  } <!-- end @if pressure -->

  <!-- ══ ERROR ══════════════════════════════════════════════════════════════ -->
  @if (!ws.loading() && ws.loadError()) {
    <div class="wld-error">
      <mat-icon>error_outline</mat-icon>
      <p>{{ ws.loadError() }}</p>
      <button mat-stroked-button (click)="reload()">Retry</button>
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Root ─────────────────────────────────────────── */
    .wld-root {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: system-ui, sans-serif;
      color: #1e293b;
    }

    /* ── Greeting hero ────────────────────────────────── */
    .wld-greeting-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 20px;
      padding: 24px 28px;
      margin-bottom: 20px;
      color: #fff;
    }
    .wld-greeting-left { display: flex; align-items: center; gap: 18px; }
    .wld-avatar {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
      border: 2px solid rgba(255,255,255,.4);
    }
    .wld-avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .wld-greeting-title { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
    .wld-greeting-sub { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,.8); }
    .wld-topbar-right { display: flex; gap: 10px; }
    .wld-topbar-right button, .wld-topbar-right a {
      color: #fff !important;
      border-color: rgba(255,255,255,.4) !important;
    }
    .wld-topbar-icon {
      font-size: 36px; width: 36px; height: 36px;
      color: #6366f1;
    }
    .wld-subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }

    /* ── Quick stats row ──────────────────────────────── */
    .wld-quick-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    @media (max-width: 700px) { .wld-quick-stats { grid-template-columns: repeat(2, 1fr); } }

    .wld-qs-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fff;
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
      border-left: 4px solid transparent;
    }
    .wld-qs-card mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .wld-qs-info { display: flex; flex-direction: column; }
    .wld-qs-val { font-size: 26px; font-weight: 800; line-height: 1.1; }
    .wld-qs-lbl { font-size: 11px; font-weight: 600; color: #64748b; }
    .wld-qs-total   { border-left-color: #6366f1; }
    .wld-qs-total   mat-icon, .wld-qs-total   .wld-qs-val { color: #6366f1; }
    .wld-qs-progress { border-left-color: #f59e0b; }
    .wld-qs-progress mat-icon, .wld-qs-progress .wld-qs-val { color: #f59e0b; }
    .wld-qs-done    { border-left-color: #22c55e; }
    .wld-qs-done    mat-icon, .wld-qs-done    .wld-qs-val { color: #22c55e; }
    .wld-qs-overdue { border-left-color: #94a3b8; }
    .wld-qs-overdue mat-icon, .wld-qs-overdue .wld-qs-val { color: #94a3b8; }
    .wld-qs-alert   { border-left-color: #ef4444; }
    .wld-qs-alert   mat-icon, .wld-qs-alert   .wld-qs-val { color: #ef4444; }

    /* ── Quick actions ────────────────────────────────── */
    .wld-quick-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }
    .wld-qa-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 150ms, transform 120ms;
      cursor: pointer;
    }
    .wld-qa-btn:hover { opacity: .88; transform: translateY(-1px); }
    .wld-qa-kanban     { background: #ede9fe; color: #6d28d9; }
    .wld-qa-chat       { background: #dbeafe; color: #1d4ed8; }
    .wld-qa-milestones { background: #fef3c7; color: #b45309; }

    /* ── Today tasks ──────────────────────────────────── */
    .wld-today-list { display: flex; flex-direction: column; gap: 8px; }
    .wld-today-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #fff;
      border-radius: 10px;
      padding: 12px 16px;
      box-shadow: 0 1px 6px rgba(0,0,0,.05);
      transition: transform 120ms;
    }
    .wld-today-card:hover { transform: translateX(3px); }
    .wld-today-done { opacity: .6; }
    .wld-today-status-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-todo        { background: #94a3b8; }
    .dot-in_progress { background: #f59e0b; }
    .dot-done        { background: #22c55e; }
    .dot-review      { background: #6366f1; }
    .dot-blocked     { background: #ef4444; }
    .wld-today-body { flex: 1; min-width: 0; }
    .wld-today-title { font-size: 14px; font-weight: 600; display: block; margin-bottom: 4px; }
    .wld-today-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

    /* ── Section header ───────────────────────────────── */
    .wld-section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding: 14px 18px;
      background: #f8fafc;
      border-radius: 12px;
      border-left: 4px solid #6366f1;
    }
    .wld-section-main-title { margin: 0; font-size: 17px; font-weight: 700; }

    /* ── Top bar (kept for backward compat) ───────────── */
    .wld-title { margin: 0; font-size: 22px; font-weight: 700; }

    /* ── Loading / Error ──────────────────────────────── */
    .wld-loading, .wld-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      gap: 14px;
      color: #64748b;
    }
    .wld-spinner {
      width: 40px; height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Hero: gauge + stats ──────────────────────────── */
    .wld-hero {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    @media (max-width: 860px) {
      .wld-hero { grid-template-columns: 1fr; }
    }

    /* Gauge card */
    .wld-gauge-card {
      background: #fff;
      border-radius: 16px;
      padding: 24px 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,.07);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .wld-gauge-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #64748b;
    }
    .wld-gauge-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .wld-gauge-svg { width: 200px; }
    .wld-gauge-arc { transition: stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1); }
    .wld-gauge-score {
      font-size: 34px;
      font-weight: 800;
      font-family: system-ui;
    }
    .wld-gauge-pts {
      font-size: 13px;
      fill: #94a3b8;
      font-family: system-ui;
    }
    .wld-level-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      margin-top: 4px;
    }
    .wld-gauge-scale {
      display: flex;
      gap: 10px;
      font-size: 10px;
      font-weight: 600;
      flex-wrap: wrap;
      justify-content: center;
    }
    .wld-message {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      border-left: 3px solid;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 0 8px 8px 0;
      font-size: 12.5px;
      color: #334155;
      width: 100%;
      box-sizing: border-box;
    }

    /* Stats */
    .wld-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      align-content: start;
    }
    .wld-stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #fff;
      border-radius: 14px;
      padding: 20px 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,.06);
    }
    .wld-stat-card mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .wld-stat-val { font-size: 28px; font-weight: 800; }
    .wld-stat-lbl { font-size: 11px; font-weight: 600; color: #64748b; text-align: center; }
    .wld-stat-red    { border-top: 3px solid #ef4444; }
    .wld-stat-red    mat-icon, .wld-stat-red    .wld-stat-val { color: #ef4444; }
    .wld-stat-orange { border-top: 3px solid #f97316; }
    .wld-stat-orange mat-icon, .wld-stat-orange .wld-stat-val { color: #f97316; }
    .wld-stat-blue   { border-top: 3px solid #0ea5e9; }
    .wld-stat-blue   mat-icon, .wld-stat-blue   .wld-stat-val { color: #0ea5e9; }
    .wld-stat-purple { border-top: 3px solid #8b5cf6; }
    .wld-stat-purple mat-icon, .wld-stat-purple .wld-stat-val { color: #8b5cf6; }

    /* ── Section ──────────────────────────────────────── */
    .wld-section { margin-bottom: 28px; }
    .wld-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 14px;
    }
    .wld-section-hint {
      font-size: 11px;
      font-weight: 400;
      color: #94a3b8;
      margin-left: 4px;
    }

    /* ── Urgent tasks ────────────────────────────────── */
    .wld-urgent-list { display: flex; flex-direction: column; gap: 10px; }
    .wld-urgent-card {
      display: flex;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 8px rgba(0,0,0,.06);
      transition: transform 150ms;
    }
    .wld-urgent-card:hover { transform: translateX(3px); }
    .wld-urgent-card.wld-overdue { background: #fff5f5; }
    .wld-urg-color-bar { width: 5px; flex-shrink: 0; }
    .wld-urg-body { padding: 12px 16px; flex: 1; min-width: 0; }
    .wld-urg-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .wld-urg-title { font-size: 14px; font-weight: 600; flex: 1; min-width: 0; }
    .wld-urg-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

    /* ── Weekly plan ─────────────────────────────────── */
    .wld-week-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }
    @media (max-width: 900px) { .wld-week-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 600px) { .wld-week-grid { grid-template-columns: repeat(2, 1fr); } }

    .wld-day-col {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0,0,0,.05);
      display: flex;
      flex-direction: column;
      min-height: 160px;
    }
    .wld-today { box-shadow: 0 0 0 2px #6366f1; }
    .wld-overloaded { box-shadow: 0 0 0 2px #ef4444; }

    .wld-day-head {
      padding: 10px 10px 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      position: relative;
    }
    .wld-day-name { font-size: 12px; font-weight: 700; color: #334155; }
    .wld-day-date { font-size: 10px; color: #94a3b8; }
    .wld-today-badge {
      position: absolute;
      top: 6px; right: 6px;
      background: #6366f1;
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      letter-spacing: .5px;
    }
    .wld-overload-icon {
      position: absolute;
      bottom: 4px; right: 4px;
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      color: #ef4444;
    }

    .wld-day-score-bar {
      height: 3px;
      background: #f1f5f9;
      flex-shrink: 0;
    }
    .wld-day-score-fill {
      height: 100%;
      border-radius: 2px;
      transition: width .6s ease;
    }

    .wld-day-tasks { padding: 8px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .wld-day-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #cbd5e1;
      font-size: 11px;
    }
    .wld-plan-task {
      border-left: 3px solid;
      padding: 6px 8px;
      background: #f8fafc;
      border-radius: 0 6px 6px 0;
      font-size: 11px;
    }
    .wld-plan-task-title {
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wld-plan-task-meta { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 2px; }
    .wld-plan-project { font-size: 10px; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* ── Timeline ────────────────────────────────────── */
    .wld-timeline { display: flex; flex-direction: column; }
    .wld-tl-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      position: relative;
      padding-bottom: 16px;
    }
    .wld-tl-dot {
      width: 14px; height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 4px;
      box-shadow: 0 0 0 3px rgba(255,255,255,.8), 0 0 0 4px currentColor;
    }
    .wld-tl-overdue { animation: pulse-red 1.2s ease-in-out infinite; }
    @keyframes pulse-red {
      0%, 100% { box-shadow: 0 0 0 3px #fff, 0 0 0 5px #ef4444; }
      50%       { box-shadow: 0 0 0 3px #fff, 0 0 0 8px rgba(239,68,68,.3); }
    }
    .wld-tl-line {
      position: absolute;
      left: 6px; top: 18px;
      width: 2px;
      height: calc(100% - 18px);
      background: #e2e8f0;
    }
    .wld-tl-line.last { display: none; }
    .wld-tl-content { flex: 1; background: #fff; border-radius: 10px; padding: 10px 14px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .wld-tl-title { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
    .wld-tl-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .wld-tl-date { font-size: 11px; font-weight: 600; color: #64748b; white-space: nowrap; }

    /* ── Notification reminder ───────────────────────── */
    .wld-notif-section { background: #f8fafc; border-radius: 16px; padding: 20px; }
    .wld-notif-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px; }
    .wld-notif-card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      box-shadow: 0 1px 6px rgba(0,0,0,.05);
    }
    .wld-notif-label { font-size: 13px; font-weight: 700; color: #1e293b; }
    .wld-notif-desc  { font-size: 11px; color: #64748b; }
    .wld-notif-hint  { font-size: 11.5px; color: #64748b; margin: 0; display: flex; align-items: center; gap: 4px; }

    /* ── Shared chips ─────────────────────────────────── */
    .wld-deadline-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
      white-space: nowrap;
    }
    .wld-deadline-badge.overdue { background: #fee2e2; color: #991b1b; }
    .wld-deadline-badge.today   { background: #ffedd5; color: #9a3412; }
    .wld-deadline-badge.compact { font-size: 10px; padding: 1px 6px; }

    .wld-project-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wld-diff-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .diff-easy   { background: #dcfce7; color: #15803d; }
    .diff-medium { background: #fef9c3; color: #854d0e; }
    .diff-hard   { background: #fee2e2; color: #991b1b; }

    .wld-prio-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .4px;
      background: #f1f5f9;
      color: #475569;
    }
  `]
})
export class WorkloadDashboardComponent implements OnInit {
  readonly ws        = inject(WorkloadService);
  readonly authSvc   = inject(AuthService);
  readonly taskSvc   = inject(TaskService);
  readonly Math      = Math;

  readonly isStudent = computed(() =>
    ['STUDENT', 'TUTOR'].includes(this.authSvc.currentUser()?.role ?? '')
  );

  // User info computed signals
  readonly firstName = computed(() => {
    const full = this.authSvc.currentUser()?.fullName ?? '';
    return full.split(' ')[0] || 'there';
  });

  readonly userAvatar = computed(() => this.authSvc.currentUser()?.avatarUrl ?? null);

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  });

  // Tasks loaded from API
  readonly myTasks = signal<TaskResponseDto[]>([]);

  // Derived stats
  readonly totalTasks       = computed(() => this.myTasks().length);
  readonly inProgressTasks  = computed(() => this.myTasks().filter(t => t.status === 'in_progress').length);
  readonly doneTasks        = computed(() => this.myTasks().filter(t => t.status === 'done').length);
  readonly overdueTasksCount = computed(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return this.myTasks().filter(t =>
      t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today
    ).length;
  });

  // Today's tasks (due today OR in_progress)
  readonly todayTasks = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.myTasks().filter(t =>
      t.status !== 'done' &&
      (t.dueDate === todayStr || t.status === 'in_progress')
    ).slice(0, 8);
  });

  ngOnInit(): void {
    this.ws.loadPressure().subscribe();
    this.taskSvc.getMyTasks().subscribe({
      next: tasks => this.myTasks.set(tasks),
      error: () => {}
    });
  }

  reload(): void {
    this.ws.loadPressure().subscribe();
    this.taskSvc.getMyTasks().subscribe({
      next: tasks => this.myTasks.set(tasks),
      error: () => {}
    });
  }

  // SVG gauge arc: total arc length is ~251 (half-circle 80px radius * π)
  gaugeDash(score: number): string {
    const maxScore = 15;
    const arcLen   = 251;
    const filled   = Math.min(arcLen, (score / maxScore) * arcLen);
    return `${filled} ${arcLen}`;
  }

  levelIcon(level: string): string {
    return level === 'CALM' ? 'sentiment_satisfied' :
           level === 'MEDIUM' ? 'sentiment_neutral' : 'sentiment_very_dissatisfied';
  }

  levelBg(level: string): string {
    return level === 'CALM' ? '#dcfce7' : level === 'MEDIUM' ? '#fef9c3' : '#fee2e2';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
}
