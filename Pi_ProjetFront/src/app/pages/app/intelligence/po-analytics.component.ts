import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  DeliverableIntelligenceService,
  PoDecisionAnalytics,
} from '../../../services/deliverable-intelligence.service';
import { ProjectService, Project } from '../../../services/project-service';

/**
 * PO decision history dashboard.
 *
 * Uses lightweight CSS-only charts so no chart library is required for the
 * student project. A real project would swap these for Chart.js / ngx-charts.
 */
@Component({
  selector: 'app-po-analytics',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule,
    MatFormFieldModule, MatSelectModule,
  ],
  template: `
    <div class="analytics">
      <header>
        <div class="title">
          <mat-icon>insights</mat-icon>
          <div>
            <h1>PO Analytics</h1>
            <p>Historique et tendances des décisions Product Owner</p>
          </div>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Projet</mat-label>
          <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="load()">
            <mat-option [value]="null">Tous</mat-option>
            @for (p of projects(); track p.id) {
              <mat-option [value]="p.id">{{ p.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </header>

      @if (data()) {
        <!-- KPIs -->
        <div class="kpis">
          <div class="kpi">
            <span class="label">Décisions</span>
            <span class="value">{{ data()!.totalDecisions }}</span>
          </div>
          <div class="kpi good">
            <span class="label">Taux d'acceptation</span>
            <span class="value">{{ (data()!.acceptanceRate * 100) | number:'1.0-0' }}%</span>
          </div>
          <div class="kpi bad">
            <span class="label">Taux de rejet</span>
            <span class="value">{{ (data()!.rejectionRate * 100) | number:'1.0-0' }}%</span>
          </div>
        </div>

        <!-- Breakdown bars -->
        <section class="card">
          <h3>Répartition des décisions</h3>
          @for (row of breakdownRows(); track row.label) {
            <div class="bar-row">
              <span class="bar-label">{{ row.label }}</span>
              <div class="bar-track">
                <div class="bar-fill" [class]="row.cssClass"
                     [style.width.%]="row.pct"></div>
              </div>
              <span class="bar-value">{{ row.count }} ({{ row.pct | number:'1.0-0' }}%)</span>
            </div>
          }
          @if (breakdownRows().length === 0) {
            <p class="muted">Aucune donnée.</p>
          }
        </section>

        <!-- Top rejection reasons -->
        <section class="card">
          <h3>Motifs de rejet fréquents</h3>
          @if (data()!.topRejectionReasons.length === 0) {
            <p class="muted">Pas encore de données.</p>
          } @else {
            <ul class="reasons">
              @for (r of data()!.topRejectionReasons; track r.reason) {
                <li>
                  <span class="reason">{{ r.reason }}</span>
                  <span class="count">× {{ r.count }}</span>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Insights -->
        @if (data()!.insights.length > 0) {
          <section class="card insights">
            <h3><mat-icon>lightbulb</mat-icon> Insights</h3>
            <ul>
              @for (i of data()!.insights; track i) { <li>{{ i }}</li> }
            </ul>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .analytics { padding: 24px; max-width: 1100px; margin: 0 auto;
      font-family: 'Inter', sans-serif; }

    header { display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 16px; margin-bottom: 20px;
      .title { display: flex; gap: 12px; align-items: center;
        mat-icon { font-size: 32px; width: 32px; height: 32px; color: #7c3aed; }
        h1 { margin: 0; font-size: 1.4rem; color: #111827; }
        p  { margin: 2px 0 0; color: #6b7280; font-size: 0.85rem; }
      }
    }

    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px; margin-bottom: 20px;
      .kpi { background: white; border: 1px solid #e5e7eb; border-radius: 12px;
        padding: 16px; display: flex; flex-direction: column; gap: 4px;
        .label { font-size: 0.78rem; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
        .value { font-size: 1.6rem; font-weight: 700; color: #111827; }
        &.good .value { color: #047857; }
        &.bad  .value { color: #b91c1c; }
      }
    }

    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 16px 20px; margin-bottom: 16px;
      h3 { margin: 0 0 12px; font-size: 1rem; color: #1f2937;
           display: flex; align-items: center; gap: 6px;
           mat-icon { color: #d97706; }
      }
    }
    .muted { color: #9ca3af; margin: 0; }

    .bar-row { display: grid; grid-template-columns: 160px 1fr 120px;
      gap: 10px; align-items: center; padding: 4px 0;
      .bar-label { font-size: 0.85rem; color: #374151; }
      .bar-track { background: #f3f4f6; border-radius: 6px; height: 10px; overflow: hidden; }
      .bar-fill  { height: 100%; border-radius: 6px; transition: width .3s; }
      .bar-fill.validated     { background: #10b981; }
      .bar-fill.minor_changes { background: #60a5fa; }
      .bar-fill.major_rework  { background: #f59e0b; }
      .bar-fill.rejected      { background: #ef4444; }
      .bar-value { font-size: 0.8rem; color: #6b7280; text-align: right; }
    }

    .reasons { list-style: none; padding: 0; margin: 0;
      li { display: flex; justify-content: space-between;
        padding: 6px 0; border-bottom: 1px dashed #e5e7eb;
        .reason { color: #374151; }
        .count  { color: #7c3aed; font-weight: 600; }
      }
    }

    .insights ul { margin: 0; padding-left: 18px; color: #374151; }
    .insights li { padding: 3px 0; }
  `]
})
export class PoAnalyticsComponent implements OnInit {
  private service = inject(DeliverableIntelligenceService);
  private projectService = inject(ProjectService);

  projects = signal<Project[]>([]);
  selectedProjectId: string | null = null;
  data = signal<PoDecisionAnalytics | null>(null);

  breakdownRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.totalDecisions || 1;
    return Object.entries(d.decisionBreakdown).map(([label, count]) => ({
      label,
      count,
      pct: (count / total) * 100,
      cssClass: label, // maps to .validated/.minor_changes/.major_rework/.rejected
    }));
  });

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({
      next: (p) => this.projects.set(p),
    });
    this.load();
  }

  load(): void {
    this.service.analytics(this.selectedProjectId || undefined).subscribe({
      next: (d) => this.data.set(d),
    });
  }
}
