import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:   '#6366f1',
  ADMIN:         '#3b82f6',
  MANAGER:       '#10b981',
  EMPLOYEE:      '#f59e0b',
  TUTOR:         '#8b5cf6',
  PRODUCT_OWNER: '#ec4899',
  STUDENT:       '#06b6d4',
  VIEWER:        '#94a3b8',
};

const ACTION_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#06b6d4',
];

const ACTION_BADGE: Record<string, string> = {
  LOGIN:               '#10b981', LOGOUT:             '#64748b',
  ROLE_CHANGE:         '#f59e0b', DATA_EXPORT:        '#3b82f6',
  PASSWORD_RESET:      '#f97316', ACCOUNT_CREATED:    '#6366f1',
  ACCOUNT_DELETED:     '#ef4444', MFA_ENABLED:        '#8b5cf6',
  MFA_DISABLED:        '#f59e0b', FACE_LOGIN:         '#06b6d4',
  FACE_REGISTERED:     '#06b6d4', ORG_CREATED:        '#3b82f6',
  ORG_UPDATED:         '#f59e0b', ORG_DELETED:        '#ef4444',
  MEMBER_ADDED:        '#10b981', MEMBER_REMOVED:     '#ef4444',
  MEMBER_ROLE_CHANGED: '#f97316',
};

@Component({
  selector: 'app-activity-stats',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.9s linear infinite; }
    .period-btn { transition: all .15s; cursor:pointer; border:none; font-weight:600; font-size:12px; padding:6px 16px; border-radius:8px; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 1px 6px rgba(0,0,0,.04); }
    .kpi-val { font-size:30px; font-weight:700; color:#1e293b; line-height:1; margin:10px 0 4px; }
    .kpi-lbl { font-size:12px; color:#64748b; font-weight:500; }
    .kpi-delta { font-size:11px; font-weight:600; margin-top:2px; }
    .prog-bar { height:6px; border-radius:999px; background:#f1f5f9; overflow:hidden; margin-top:6px; }
    .prog-fill { height:100%; border-radius:999px; }
    .badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; color:#fff; }
    .tbl { width:100%; border-collapse:collapse; }
    .tbl th { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:.05em; padding:8px 12px; text-align:left; border-bottom:1px solid #f1f5f9; }
    .tbl td { font-size:12px; color:#374151; padding:10px 12px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
    .tbl tr:last-child td { border-bottom:none; }
    .tbl tr:hover td { background:#fafafa; }
  `],
  template: `
<div style="background:#f8fafc;min-height:100vh;padding:28px;font-family:Inter,system-ui,sans-serif">

  <!-- ── HEADER ─────────────────────────────────────────────────────── -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:38px;height:38px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></svg>
        </div>
        <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin:0">Platform Overview</h1>
        <span style="background:#6366f1;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;letter-spacing:.05em">SUPER ADMIN</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:0">Real-time analytics · {{ period }}-day window</p>
    </div>

    <!-- Period filter -->
    <div style="display:flex;gap:5px;background:#fff;border:1px solid #e2e8f0;padding:4px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.04)">
      <button *ngFor="let p of periods" class="period-btn"
        [style.background]="period === p.value ? '#6366f1' : 'transparent'"
        [style.color]="period === p.value ? '#fff' : '#64748b'"
        (click)="setPeriod(p.value)">
        {{ p.label }}
      </button>
    </div>
  </div>

  <!-- ── LOADING ─────────────────────────────────────────────────────── -->
  <div *ngIf="loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px">
    <div class="spin" style="width:36px;height:36px;border:3px solid #6366f1;border-top-color:transparent;border-radius:50%"></div>
    <p style="color:#94a3b8;font-size:13px;margin:0">Loading platform data…</p>
  </div>

  <!-- ── ERROR ───────────────────────────────────────────────────────── -->
  <div *ngIf="!loading && error" style="background:#fff5f5;border:1px solid #fecaca;border-radius:14px;padding:24px;text-align:center">
    <p style="color:#dc2626;font-size:14px;margin:0">⚠ {{ error }}</p>
  </div>

  <!-- ── DASHBOARD ───────────────────────────────────────────────────── -->
  <ng-container *ngIf="!loading && !error && data">

    <!-- ROW 1 — KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin-bottom:18px">

      <!-- Total Users -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">Total Users</span>
          <div style="width:30px;height:30px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </div>
        </div>
        <div class="kpi-val">{{ data.users.total }}</div>
        <div class="kpi-delta" style="color:#10b981">+{{ data.users.newInPeriod }} new</div>
      </div>

      <!-- Active Sessions -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">Active Sessions</span>
          <div style="width:30px;height:30px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="#10b981"/></svg>
          </div>
        </div>
        <div class="kpi-val">{{ data.sessions.activeNow }}</div>
        <div class="kpi-delta" style="color:#64748b">{{ data.sessions.loginsToday }} logins today</div>
      </div>

      <!-- Organizations -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">Organizations</span>
          <div style="width:30px;height:30px;background:#faf5ff;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
          </div>
        </div>
        <div class="kpi-val">{{ data.organizations.total }}</div>
        <div class="kpi-delta" style="color:#10b981">+{{ data.organizations.newInPeriod }} new</div>
      </div>

      <!-- MRR -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">MRR</span>
          <div style="width:30px;height:30px;background:#fffbeb;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-val" style="font-size:22px">{{ mrrFormatted }}</div>
        <div class="kpi-delta" style="color:#64748b">{{ data.subscriptions.active }} active subs</div>
      </div>

      <!-- Active Subscriptions -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">Active Subs</span>
          <div style="width:30px;height:30px;background:#eef2ff;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>
          </div>
        </div>
        <div class="kpi-val">{{ data.subscriptions.active }}</div>
        <div class="kpi-delta" style="color:#f59e0b">{{ data.subscriptions.pastDue }} past due</div>
      </div>

      <!-- Period Revenue -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="kpi-lbl">Revenue ({{ period }}d)</span>
          <div style="width:30px;height:30px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
        </div>
        <div class="kpi-val" style="font-size:22px">{{ revenueFormatted }}</div>
        <div class="kpi-delta" style="color:#64748b">{{ data.revenue.paidInvoicesInPeriod }} invoices paid</div>
      </div>
    </div>

    <!-- ROW 2 — Login Chart + Role Chart -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:18px">

      <!-- Login Activity -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div>
            <h3 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 2px">Login Activity</h3>
            <p style="font-size:11px;color:#94a3b8;margin:0">Logins per day — last {{ period }} days</p>
          </div>
          <div style="display:flex;gap:16px">
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:700;color:#6366f1">{{ data.sessions.loginsInPeriod }}</div>
              <div style="font-size:10px;color:#94a3b8">total</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:700;color:#10b981">{{ data.sessions.activeUsersInPeriod }}</div>
              <div style="font-size:10px;color:#94a3b8">unique users</div>
            </div>
          </div>
        </div>
        <canvas #loginChart style="max-height:240px"></canvas>
      </div>

      <!-- Users by Role -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 2px">Users by Role</h3>
        <p style="font-size:11px;color:#94a3b8;margin:0 0 12px">Distribution across {{ data.users.total }} users</p>
        <canvas #roleChart style="max-height:240px"></canvas>
      </div>
    </div>

    <!-- ROW 3 — Subscription Doughnut + Audit Actions Bar -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">

      <!-- Subscription Status -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 2px">Subscription Status</h3>
        <p style="font-size:11px;color:#94a3b8;margin:0 0 12px">Breakdown of all subscriptions</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div *ngFor="let s of subStats" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border-radius:8px">
            <div [style.background]="s.color" style="width:8px;height:8px;border-radius:50%"></div>
            <div>
              <div style="font-size:16px;font-weight:700;color:#1e293b">{{ s.value }}</div>
              <div style="font-size:10px;color:#94a3b8">{{ s.label }}</div>
            </div>
          </div>
        </div>
        <canvas #subChart style="max-height:200px"></canvas>
      </div>

      <!-- Top Audit Actions -->
      <div class="card">
        <h3 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 2px">Top Security Events</h3>
        <p style="font-size:11px;color:#94a3b8;margin:0 0 12px">{{ data.security.totalInPeriod }} events in {{ period }} days</p>
        <canvas #auditChart style="max-height:260px"></canvas>
      </div>
    </div>

    <!-- ROW 4 — Security Health + Org Breakdown -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px">

      <!-- MFA Rate -->
      <div class="card" style="padding:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;background:#eef2ff;border-radius:7px;display:flex;align-items:center;justify-content:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 11V7a4 4 0 1 0-8 0v4"/></svg>
          </div>
          <span style="font-size:12px;color:#64748b;font-weight:500">MFA Enabled</span>
        </div>
        <div style="font-size:22px;font-weight:700;color:#1e293b">{{ data.users.withMfa }}</div>
        <div class="prog-bar"><div class="prog-fill" [style.width]="mfaPct+'%'" style="background:#6366f1"></div></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">{{ mfaPct }}% of users</div>
      </div>

      <!-- Face ID Rate -->
      <div class="card" style="padding:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;background:#f0fdf4;border-radius:7px;display:flex;align-items:center;justify-content:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <span style="font-size:12px;color:#64748b;font-weight:500">Face ID</span>
        </div>
        <div style="font-size:22px;font-weight:700;color:#1e293b">{{ data.users.withFaceId }}</div>
        <div class="prog-bar"><div class="prog-fill" [style.width]="faceIdPct+'%'" style="background:#10b981"></div></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">{{ faceIdPct }}% of users</div>
      </div>

      <!-- Active Rate -->
      <div class="card" style="padding:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;background:#fffbeb;border-radius:7px;display:flex;align-items:center;justify-content:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span style="font-size:12px;color:#64748b;font-weight:500">Active Users</span>
        </div>
        <div style="font-size:22px;font-weight:700;color:#1e293b">{{ data.users.active }}</div>
        <div class="prog-bar"><div class="prog-fill" [style.width]="activePct+'%'" style="background:#f59e0b"></div></div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">{{ activePct }}% active</div>
      </div>

      <!-- Org Breakdown -->
      <div class="card" style="padding:18px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;background:#faf5ff;border-radius:7px;display:flex;align-items:center;justify-content:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style="font-size:12px;color:#64748b;font-weight:500">Org Types</span>
        </div>
        <div style="display:flex;gap:10px">
          <div>
            <div style="font-size:20px;font-weight:700;color:#6366f1">{{ data.organizations.enterprise }}</div>
            <div style="font-size:10px;color:#94a3b8">Enterprise</div>
          </div>
          <div style="width:1px;background:#f1f5f9"></div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#8b5cf6">{{ data.organizations.academic }}</div>
            <div style="font-size:10px;color:#94a3b8">Academic</div>
          </div>
        </div>
        <div class="prog-bar" style="margin-top:10px">
          <div class="prog-fill" [style.width]="enterprisePct+'%'" style="background:#6366f1"></div>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">{{ enterprisePct }}% enterprise</div>
      </div>
    </div>

    <!-- ROW 5 — Recent Audit Logs -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">
        <div>
          <h3 style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 2px">Recent Security Events</h3>
          <p style="font-size:11px;color:#94a3b8;margin:0">Last 10 platform events</p>
        </div>
        <span style="font-size:12px;font-weight:600;color:#6366f1">{{ data.security.totalInPeriod }} total in period</span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Action</th>
            <th>User ID</th>
            <th>Entity</th>
            <th>IP Address</th>
            <th>Date / Time</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let log of data.security.recentLogs">
            <td>
              <span class="badge" [style.background]="badgeColor(log.actionType)">
                {{ log.actionType }}
              </span>
            </td>
            <td style="color:#6366f1;font-weight:600">#{{ log.userId }}</td>
            <td style="color:#64748b">{{ log.entityType || '—' }}</td>
            <td style="font-family:monospace;font-size:11px;color:#374151">{{ log.ipAddress || '—' }}</td>
            <td style="color:#94a3b8;font-size:11px">{{ log.createdAt | date:'dd/MM/yy HH:mm' }}</td>
          </tr>
          <tr *ngIf="!data.security.recentLogs?.length">
            <td colspan="5" style="text-align:center;color:#94a3b8;padding:24px">No events recorded.</td>
          </tr>
        </tbody>
      </table>
    </div>

  </ng-container>
</div>
  `
})
export class ActivityStatsComponent implements OnInit, AfterViewInit {

  @ViewChild('loginChart') loginChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('roleChart')  roleChartRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('subChart')   subChartRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('auditChart') auditChartRef!: ElementRef<HTMLCanvasElement>;

  data: any     = null;
  loading       = true;
  error         = '';
  period        = 30;

  readonly periods = [
    { label: '7D',  value: 7  },
    { label: '14D', value: 14 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
  ];

  private charts: Record<string, Chart> = {};
  private viewReady = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.data) this.drawAllCharts();
  }

  ngOnInit(): void {
    this.load();
  }

  setPeriod(p: number): void {
    this.period = p;
    this.load();
  }

  // ── Computed getters ───────────────────────────────────────────────────────

  get mrrFormatted(): string {
    return this.formatCents(this.data?.subscriptions?.mrrCents ?? 0);
  }

  get revenueFormatted(): string {
    return this.formatCents(this.data?.revenue?.totalCentsInPeriod ?? 0);
  }

  get mfaPct(): number {
    const t = this.data?.users?.total || 1;
    return Math.round((this.data?.users?.withMfa / t) * 100);
  }

  get faceIdPct(): number {
    const t = this.data?.users?.total || 1;
    return Math.round((this.data?.users?.withFaceId / t) * 100);
  }

  get activePct(): number {
    const t = this.data?.users?.total || 1;
    return Math.round((this.data?.users?.active / t) * 100);
  }

  get enterprisePct(): number {
    const t = this.data?.organizations?.total || 1;
    return Math.round((this.data?.organizations?.enterprise / t) * 100);
  }

  get subStats(): { label: string; value: number; color: string }[] {
    if (!this.data) return [];
    const s = this.data.subscriptions;
    return [
      { label: 'Active',   value: s.active,   color: '#10b981' },
      { label: 'Trialing', value: s.trialing,  color: '#3b82f6' },
      { label: 'Past Due', value: s.pastDue,   color: '#f59e0b' },
      { label: 'Canceled', value: s.canceled,  color: '#ef4444' },
      { label: 'Paused',   value: s.paused,    color: '#94a3b8' },
    ];
  }

  badgeColor(action: string): string {
    return ACTION_BADGE[action] ?? '#94a3b8';
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  private load(): void {
    this.loading = true;
    this.error   = '';
    this.destroyAllCharts();

    this.http.get<any>(`http://localhost:8084/api/super-admin/dashboard?period=${this.period}`).subscribe({
      next: (d) => {
        this.data    = d;
        this.loading = false;
        this.cdr.detectChanges();        // render *ngIf block → ViewChild refs available
        if (this.viewReady) this.drawAllCharts();
      },
      error: (err) => {
        this.error   = err.error?.message ?? 'Failed to load dashboard data.';
        this.loading = false;
      }
    });
  }

  // ── Chart rendering ────────────────────────────────────────────────────────

  private drawAllCharts(): void {
    this.drawLoginChart();
    this.drawRoleChart();
    this.drawSubChart();
    this.drawAuditChart();
  }

  private drawLoginChart(): void {
    if (!this.loginChartRef) return;
    this.destroyChart('login');
    const perDay: Record<string, number> = this.data.sessions.loginsPerDay ?? {};
    const ctx = this.loginChartRef.nativeElement.getContext('2d')!;
    this.charts['login'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(perDay),
        datasets: [{
          label: 'Logins',
          data: Object.values(perDay),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointRadius: 4,
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.parsed.y} logins` } }
        },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 } }
        }
      }
    });
  }

  private drawRoleChart(): void {
    if (!this.roleChartRef) return;
    this.destroyChart('role');
    const byRole: Record<string, number> = this.data.users.byRole ?? {};
    const labels = Object.keys(byRole).filter(r => byRole[r] > 0);
    const values = labels.map(r => byRole[r]);
    const colors = labels.map(r => ROLE_COLORS[r] ?? '#94a3b8');
    const ctx = this.roleChartRef.nativeElement.getContext('2d')!;
    this.charts['role'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Users',
          data: values,
          backgroundColor: colors.map(c => c + 'cc'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11 } } }
        }
      }
    });
  }

  private drawSubChart(): void {
    if (!this.subChartRef) return;
    this.destroyChart('sub');
    const s = this.data.subscriptions;
    const ctx = this.subChartRef.nativeElement.getContext('2d')!;
    this.charts['sub'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Trialing', 'Past Due', 'Canceled', 'Paused'],
        datasets: [{
          data: [s.active, s.trialing, s.pastDue, s.canceled, s.paused],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'],
          borderWidth: 0,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}` } }
        }
      }
    });
  }

  private drawAuditChart(): void {
    if (!this.auditChartRef) return;
    this.destroyChart('audit');
    const byAction: Record<string, number> = this.data.security.byAction ?? {};
    const entries = Object.entries(byAction).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const ctx = this.auditChartRef.nativeElement.getContext('2d')!;
    this.charts['audit'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(([k]) => k),
        datasets: [{
          label: 'Count',
          data:   entries.map(([, v]) => v),
          backgroundColor: ACTION_COLORS.slice(0, entries.length).map(c => c + 'cc'),
          borderColor:     ACTION_COLORS.slice(0, entries.length),
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 10 } } }
        }
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private formatCents(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  }

  private destroyChart(key: string): void {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  }

  private destroyAllCharts(): void {
    Object.keys(this.charts).forEach(k => this.destroyChart(k));
  }
}
