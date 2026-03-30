import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-activity-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:32px;background:#f9fafb;min-height:100vh">

      <!-- Header -->
      <div style="margin-bottom:28px">
        <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 6px">Activity Statistics</h1>
        <p style="color:#6b7280;font-size:14px;margin:0">Login activity over the last 30 days</p>
      </div>

      <!-- Stat Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px" *ngIf="stats">
        <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,0.04)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:42px;height:42px;background:#eff6ff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">📅</div>
            <span style="font-size:13px;color:#6b7280;font-weight:500">Today's Logins</span>
          </div>
          <div style="font-size:32px;font-weight:700;color:#111827">{{ stats.todayLogins }}</div>
        </div>

        <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,0.04)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:42px;height:42px;background:#f0fdf4;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">👥</div>
            <span style="font-size:13px;color:#6b7280;font-weight:500">Active Users (7d)</span>
          </div>
          <div style="font-size:32px;font-weight:700;color:#111827">{{ stats.activeUsersLast7Days }}</div>
        </div>

        <div style="background:#fff;border-radius:14px;padding:24px;border:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,0.04)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:42px;height:42px;background:#fef3c7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px">📊</div>
            <span style="font-size:13px;color:#6b7280;font-weight:500">Total Logins (30d)</span>
          </div>
          <div style="font-size:32px;font-weight:700;color:#111827">{{ stats.totalLogins30Days }}</div>
        </div>
      </div>

      <!-- Chart -->
      <div style="background:#fff;border-radius:14px;padding:28px;border:1px solid #e5e7eb;box-shadow:0 1px 8px rgba(0,0,0,0.04)">
        <h2 style="font-size:16px;font-weight:600;color:#111827;margin:0 0 24px">Logins per Day — Last 30 Days</h2>
        <div *ngIf="loading" style="text-align:center;padding:40px;color:#9ca3af;font-size:14px">Loading data…</div>
        <div *ngIf="error" style="text-align:center;padding:40px;color:#dc2626;font-size:14px">{{ error }}</div>
        <canvas #chartCanvas *ngIf="!loading && !error" style="max-height:340px"></canvas>
      </div>

    </div>
  `
})
export class ActivityStatsComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  stats: any = null;
  loading = true;
  error = '';
  private chartData: { labels: string[], values: number[] } | null = null;
  private chart: Chart | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8084/api/auth/stats/activity').subscribe({
      next: (data) => {
        this.stats = data;
        const labels = Object.keys(data.loginsPerDay);
        const values = Object.values(data.loginsPerDay) as number[];
        this.chartData = { labels, values };
        this.loading = false;
        // Wait one tick for *ngIf to render the canvas before drawing
        setTimeout(() => this.drawChart(), 0);
      },
      error: (err) => {
        this.error = err.error?.message ?? 'Failed to load activity data.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.chartData) {
      this.drawChart();
    }
  }

  private drawChart(): void {
    if (!this.chartData || !this.chartCanvas) return;
    if (this.chart) {
      this.chart.destroy();
    }
    const ctx = this.chartCanvas.nativeElement.getContext('2d')!;
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.labels,
        datasets: [{
          label: 'Logins',
          data: this.chartData.values,
          fill: true,
          backgroundColor: 'rgba(99,102,241,0.08)',
          borderColor: '#6366f1',
          borderWidth: 2.5,
          pointBackgroundColor: '#6366f1',
          pointRadius: 4,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} login${ctx.parsed.y !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#f3f4f6' },
            ticks: {
              color: '#9ca3af',
              maxTicksLimit: 10,
              font: { size: 12 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: {
              color: '#9ca3af',
              stepSize: 1,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }
}
