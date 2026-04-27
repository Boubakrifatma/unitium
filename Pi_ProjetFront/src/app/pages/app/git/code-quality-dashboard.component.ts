import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit,
  ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import {
  Chart, ChartConfiguration,
  ArcElement, BarController, BarElement, CategoryScale,
  DoughnutController, Legend, LinearScale, Tooltip,
} from 'chart.js';

import {
  CodeQualityService, QualitySummary, PmdViolation,
  CheckstyleIssue, SpotbugsIssue, RepoAnalysisResult,
} from '../../../services/code-quality.service';
import { GitService, GithubRepo, ManagerBranch } from '../../../services/git.service';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale,
  DoughnutController, Legend, LinearScale, Tooltip,
);

@Component({
  selector: 'app-code-quality-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatTabsModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTooltipModule, MatChipsModule, MatDividerModule, MatTableModule,
    MatSelectModule, MatFormFieldModule,
  ],
  template: `
<div class="cq-page">

  <!-- ── Header ────────────────────────────────────────────────────────── -->
  <div class="cq-hero">
    <div class="cq-hero-left">
      <div class="cq-hero-icon"><mat-icon>analytics</mat-icon></div>
      <div>
        <h1 class="cq-hero-title">Code Quality Dashboard</h1>
        <p class="cq-hero-sub">PMD · Checkstyle · SpotBugs — analyse statique via GitHub API</p>
      </div>
    </div>
  </div>

  <!-- ── Repo / Branch Selector ───────────────────────────────────────── -->
  <mat-card class="cq-selector-card">
    <mat-card-content>
      <div class="cq-selector-row">

        <!-- Repo -->
        <mat-form-field appearance="outline" class="cq-field">
          <mat-label>Repository</mat-label>
          <mat-select [(ngModel)]="selectedRepo" (ngModelChange)="onRepoChange($event)">
            <mat-option *ngIf="loadingRepos()" disabled>Chargement…</mat-option>
            <mat-option *ngFor="let r of repos()" [value]="r">
              <mat-icon style="font-size:14px;vertical-align:middle">
                {{ r.private ? 'lock' : 'lock_open' }}
              </mat-icon>
              {{ r.full_name }}
              <span *ngIf="r.language" class="cq-lang">{{ r.language }}</span>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Branch -->
        <mat-form-field appearance="outline" class="cq-field">
          <mat-label>Branche</mat-label>
          <mat-select [(ngModel)]="selectedBranch" [disabled]="!selectedRepo">
            <mat-option *ngIf="loadingBranches()" disabled>Chargement…</mat-option>
            <mat-option *ngFor="let b of branches()" [value]="b.name">
              <mat-icon style="font-size:14px;vertical-align:middle">
                {{ b.protected ? 'shield' : 'call_split' }}
              </mat-icon>
              {{ b.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Analyze button -->
        <button mat-flat-button color="primary"
                class="cq-analyze-btn"
                [disabled]="!selectedRepo || !selectedBranch || analyzing()"
                (click)="runAnalysis()">
          <mat-icon>{{ analyzing() ? 'hourglass_empty' : 'search' }}</mat-icon>
          {{ analyzing() ? 'Analyse en cours…' : 'Analyser' }}
        </button>

      </div>

      <!-- Progress bar -->
      <mat-progress-bar *ngIf="analyzing()" mode="indeterminate" class="cq-progress"></mat-progress-bar>
      <p *ngIf="analyzing()" class="cq-progress-label">
        Récupération des fichiers Java et analyse statique…
      </p>
    </mat-card-content>
  </mat-card>

  <!-- Spinner global -->
  <div *ngIf="loading()" class="cq-center">
    <mat-spinner diameter="48"></mat-spinner>
    <p>Chargement…</p>
  </div>

  <!-- Empty state -->
  <div *ngIf="!loading() && !analyzing() && !summary()" class="cq-empty-state">
    <mat-icon class="cq-empty-icon">manage_search</mat-icon>
    <h3>Sélectionnez un repository et une branche</h3>
    <p>L'analyse vérifie tout le code Java : violations PMD, style Checkstyle, bugs SpotBugs.</p>
    <p class="cq-note">Aucun clone local requis — 100% via GitHub API</p>
  </div>

  <ng-container *ngIf="!loading() && summary()">

    <!-- ── Meta bar ────────────────────────────────────────────────────── -->
    <div class="cq-meta-bar">
      <mat-icon>folder</mat-icon>
      <strong>{{ summary()!.repo }}</strong>
      <mat-icon style="margin-left:12px">call_split</mat-icon>
      <strong>{{ summary()!.branch }}</strong>
      <span class="cq-meta-sep">·</span>
      <mat-icon>insert_drive_file</mat-icon>
      {{ summary()!.filesAnalyzed }} fichiers analysés
      <span *ngIf="summary()!.filesSkipped > 0" class="cq-meta-skip">
        ({{ summary()!.filesSkipped }} ignorés)
      </span>
    </div>

    <!-- ── KPI Cards ──────────────────────────────────────────────────── -->
    <div class="cq-kpis">

      <!-- Note globale -->
      <mat-card class="cq-kpi-card cq-grade-card" [class]="'grade-' + summary()!.grade">
        <mat-card-content>
          <div class="cq-kpi-label">Note globale</div>
          <div class="cq-grade-big">{{ summary()!.grade }}</div>
          <div class="cq-kpi-sub">{{ gradeLabel(summary()!.grade) }}</div>
        </mat-card-content>
      </mat-card>

      <!-- Total Issues -->
      <mat-card class="cq-kpi-card">
        <mat-card-content>
          <div class="cq-kpi-icon-row">
            <mat-icon class="cq-icon-warn">warning</mat-icon>
            <div class="cq-kpi-label">Total problèmes</div>
          </div>
          <div class="cq-kpi-value">{{ summary()!.totalIssues }}</div>
          <div class="cq-kpi-sub">PMD + Checkstyle + SpotBugs</div>
        </mat-card-content>
      </mat-card>

      <!-- PMD -->
      <mat-card class="cq-kpi-card">
        <mat-card-content>
          <div class="cq-kpi-icon-row">
            <mat-icon class="cq-icon-orange">code</mat-icon>
            <div class="cq-kpi-label">PMD violations</div>
          </div>
          <div class="cq-kpi-value">{{ summary()!.pmd.violations }}</div>
          <div class="cq-kpi-sub">
            <span class="cq-badge red">P1: {{ summary()!.pmd.priority1 }}</span>
            <span class="cq-badge orange">P2: {{ summary()!.pmd.priority2 }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Checkstyle -->
      <mat-card class="cq-kpi-card">
        <mat-card-content>
          <div class="cq-kpi-icon-row">
            <mat-icon class="cq-icon-blue">spellcheck</mat-icon>
            <div class="cq-kpi-label">Checkstyle</div>
          </div>
          <div class="cq-kpi-value">{{ summary()!.checkstyle.total }}</div>
          <div class="cq-kpi-sub">
            <span class="cq-badge red">Errors: {{ summary()!.checkstyle.errors }}</span>
            <span class="cq-badge blue">Warn: {{ summary()!.checkstyle.warnings }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- SpotBugs -->
      <mat-card class="cq-kpi-card">
        <mat-card-content>
          <div class="cq-kpi-icon-row">
            <mat-icon class="cq-icon-red">bug_report</mat-icon>
            <div class="cq-kpi-label">SpotBugs</div>
          </div>
          <div class="cq-kpi-value">{{ summary()!.spotbugs.bugs }}</div>
          <div class="cq-kpi-sub">
            <span class="cq-badge red">Critique: {{ summary()!.spotbugs.high }}</span>
            <span class="cq-badge purple">Sécu: {{ summary()!.spotbugs.security }}</span>
          </div>
        </mat-card-content>
      </mat-card>

    </div>

    <!-- ── Charts Row ─────────────────────────────────────────────────── -->
    <div class="cq-charts-row">

      <!-- Doughnut: Issues par outil -->
      <mat-card class="cq-chart-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>donut_large</mat-icon>
          <mat-card-title>Répartition des problèmes</mat-card-title>
          <mat-card-subtitle>par outil d'analyse</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="cq-chart-body">
          <canvas #doughnutCanvas></canvas>
        </mat-card-content>
      </mat-card>

      <!-- Bar: PMD par priorité -->
      <mat-card class="cq-chart-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>priority_high</mat-icon>
          <mat-card-title>PMD par priorité</mat-card-title>
          <mat-card-subtitle>P1 = critique · P5 = info</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="cq-chart-body">
          <canvas #pmdCanvas></canvas>
        </mat-card-content>
      </mat-card>

      <!-- Bar: Top 5 règles -->
      <mat-card class="cq-chart-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>bar_chart</mat-icon>
          <mat-card-title>Top règles violées</mat-card-title>
          <mat-card-subtitle>toutes catégories</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="cq-chart-body">
          <canvas #rulesCanvas></canvas>
        </mat-card-content>
      </mat-card>

    </div>

    <!-- ── Tabs: Détail des issues ────────────────────────────────────── -->
    <mat-card class="cq-detail-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>list_alt</mat-icon>
        <mat-card-title>Détail des problèmes</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-tab-group animationDuration="200ms">

          <!-- Tab PMD -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">code</mat-icon>
              PMD <span class="cq-tab-count">{{ pmdList().length }}</span>
            </ng-template>
            <div class="cq-table-wrap">
              <table mat-table [dataSource]="pmdList().slice(0, 100)" class="cq-table">
                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>P</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-priority" [class]="'p' + r.priority">{{ r.priority }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="rule">
                  <th mat-header-cell *matHeaderCellDef>Règle</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-rule-name">{{ r.rule }}</span>
                    <small class="cq-ruleset">{{ r.ruleset }}</small>
                  </td>
                </ng-container>
                <ng-container matColumnDef="file">
                  <th mat-header-cell *matHeaderCellDef>Fichier</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-file">{{ r.file }}</span>
                    <small>ligne {{ r.line }}</small>
                  </td>
                </ng-container>
                <ng-container matColumnDef="message">
                  <th mat-header-cell *matHeaderCellDef>Message</th>
                  <td mat-cell *matCellDef="let r" class="cq-msg">{{ r.message }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['priority','rule','file','message']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['priority','rule','file','message']"></tr>
              </table>
              <p *ngIf="pmdList().length === 0" class="cq-empty">
                <mat-icon>check_circle</mat-icon> Aucune violation PMD détectée
              </p>
              <p *ngIf="pmdList().length > 100" class="cq-more">
                … et {{ pmdList().length - 100 }} autres violations
              </p>
            </div>
          </mat-tab>

          <!-- Tab Checkstyle -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">spellcheck</mat-icon>
              Checkstyle <span class="cq-tab-count">{{ checkstyleList().length }}</span>
            </ng-template>
            <div class="cq-table-wrap">
              <table mat-table [dataSource]="checkstyleList().slice(0, 100)" class="cq-table">
                <ng-container matColumnDef="severity">
                  <th mat-header-cell *matHeaderCellDef>Sév.</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-sev" [class]="r.severity">{{ r.severity }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="rule">
                  <th mat-header-cell *matHeaderCellDef>Règle</th>
                  <td mat-cell *matCellDef="let r">{{ r.rule }}</td>
                </ng-container>
                <ng-container matColumnDef="file">
                  <th mat-header-cell *matHeaderCellDef>Fichier</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-file">{{ r.file }}</span>
                    <small>ligne {{ r.line }}</small>
                  </td>
                </ng-container>
                <ng-container matColumnDef="message">
                  <th mat-header-cell *matHeaderCellDef>Message</th>
                  <td mat-cell *matCellDef="let r" class="cq-msg">{{ r.message }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['severity','rule','file','message']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['severity','rule','file','message']"></tr>
              </table>
              <p *ngIf="checkstyleList().length === 0" class="cq-empty">
                <mat-icon>check_circle</mat-icon> Aucune erreur Checkstyle
              </p>
            </div>
          </mat-tab>

          <!-- Tab SpotBugs -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">bug_report</mat-icon>
              SpotBugs <span class="cq-tab-count">{{ spotbugsList().length }}</span>
            </ng-template>
            <div class="cq-table-wrap">
              <table mat-table [dataSource]="spotbugsList()" class="cq-table">
                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>Priorité</th>
                  <td mat-cell *matCellDef="let r">
                    <span class="cq-priority" [class]="'p' + r.priority">
                      {{ r.priority === '1' ? 'Haute' : r.priority === '2' ? 'Moy.' : 'Basse' }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="category">
                  <th mat-header-cell *matHeaderCellDef>Catégorie</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="r.category === 'SECURITY' ? 'cq-badge red' : 'cq-badge blue'">
                      {{ r.category }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="file">
                  <th mat-header-cell *matHeaderCellDef>Fichier</th>
                  <td mat-cell *matCellDef="let r" class="cq-file">{{ r.file }}</td>
                </ng-container>
                <ng-container matColumnDef="message">
                  <th mat-header-cell *matHeaderCellDef>Message</th>
                  <td mat-cell *matCellDef="let r" class="cq-msg">{{ r.message }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="['priority','category','file','message']"></tr>
                <tr mat-row *matRowDef="let r; columns: ['priority','category','file','message']"></tr>
              </table>
              <p *ngIf="spotbugsList().length === 0" class="cq-empty">
                <mat-icon>check_circle</mat-icon> Aucun bug SpotBugs détecté
              </p>
            </div>
          </mat-tab>

        </mat-tab-group>
      </mat-card-content>
    </mat-card>

  </ng-container>
</div>
  `,
  styles: [`
    .cq-page { padding: 24px; max-width: 1400px; margin: 0 auto; }

    /* Hero */
    .cq-hero {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    .cq-hero-left { display: flex; align-items: center; gap: 16px; }
    .cq-hero-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .cq-hero-title { margin: 0; font-size: 1.6rem; font-weight: 700; color: #1e293b; }
    .cq-hero-sub { margin: 2px 0 0; color: #64748b; font-size: .85rem; }

    /* Selector card */
    .cq-selector-card { border-radius: 16px !important; margin-bottom: 24px; }
    .cq-selector-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .cq-field { flex: 1; min-width: 220px; }
    .cq-analyze-btn { height: 56px; padding: 0 24px; font-size: .95rem; }
    .cq-progress { margin-top: 8px; border-radius: 4px; }
    .cq-progress-label { margin: 6px 0 0; color: #6366f1; font-size: .82rem; text-align: center; }
    .cq-lang { margin-left: 8px; color: #94a3b8; font-size: .78rem; }

    /* Empty state */
    .cq-empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 80px 24px; color: #94a3b8; text-align: center;
    }
    .cq-empty-icon { font-size: 72px; width: 72px; height: 72px; color: #e2e8f0; margin-bottom: 16px; }
    .cq-empty-state h3 { color: #475569; margin: 0 0 8px; font-size: 1.2rem; }
    .cq-empty-state p { margin: 4px 0; }
    .cq-note { font-size: .8rem; background: #f0fdf4; color: #16a34a; padding: 4px 14px; border-radius: 20px; margin-top: 12px !important; }

    /* Meta bar */
    .cq-meta-bar {
      display: flex; align-items: center; gap: 8px;
      background: #f8fafc; border-radius: 10px;
      padding: 10px 16px; margin-bottom: 20px;
      font-size: .88rem; color: #475569;
    }
    .cq-meta-sep { color: #cbd5e1; }
    .cq-meta-skip { color: #f59e0b; font-size: .8rem; }

    /* Spinner */
    .cq-center { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: #64748b; }

    /* KPI Cards */
    .cq-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .cq-kpi-card { border-radius: 16px !important; }
    .cq-kpi-icon-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .cq-kpi-label { font-size: .78rem; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; font-weight: 600; }
    .cq-kpi-value { font-size: 2rem; font-weight: 800; color: #1e293b; line-height: 1.1; margin: 4px 0; }
    .cq-kpi-sub { font-size: .75rem; color: #94a3b8; margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }

    /* Grade card */
    .cq-grade-card { background: linear-gradient(135deg, #1e293b, #334155) !important; color: #fff !important; }
    .cq-grade-card .cq-kpi-label { color: #94a3b8; }
    .cq-grade-card .cq-kpi-sub { color: #cbd5e1; }
    .cq-grade-big { font-size: 4rem; font-weight: 900; line-height: 1; }
    .grade-A .cq-grade-big { color: #22c55e; }
    .grade-B .cq-grade-big { color: #84cc16; }
    .grade-C .cq-grade-big { color: #f59e0b; }
    .grade-D .cq-grade-big { color: #f97316; }
    .grade-E .cq-grade-big { color: #ef4444; }

    /* Icon colors */
    .cq-icon-warn { color: #f59e0b; }
    .cq-icon-orange { color: #f97316; }
    .cq-icon-blue { color: #0ea5e9; }
    .cq-icon-red { color: #ef4444; }
    .cq-icon-green { color: #22c55e; }

    /* Badges */
    .cq-badge {
      display: inline-block; padding: 1px 7px; border-radius: 99px;
      font-size: .7rem; font-weight: 600;
    }
    .cq-badge.red    { background: #fee2e2; color: #dc2626; }
    .cq-badge.orange { background: #ffedd5; color: #ea580c; }
    .cq-badge.blue   { background: #dbeafe; color: #2563eb; }
    .cq-badge.purple { background: #ede9fe; color: #7c3aed; }

    /* Charts */
    .cq-charts-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px; margin-bottom: 24px;
    }
    .cq-chart-card { border-radius: 16px !important; }
    .cq-chart-body { height: 240px; display: flex; align-items: center; justify-content: center; }
    .cq-chart-body canvas { max-height: 220px; }

    /* Detail card */
    .cq-detail-card { border-radius: 16px !important; margin-bottom: 24px; }
    .tab-icon { font-size: 18px; margin-right: 6px; vertical-align: middle; }
    .cq-tab-count {
      background: #e0e7ff; color: #4338ca; border-radius: 99px;
      padding: 1px 7px; font-size: .72rem; margin-left: 6px; font-weight: 700;
    }

    /* Tables */
    .cq-table-wrap { overflow-x: auto; margin-top: 8px; }
    .cq-table { width: 100%; }
    .cq-file { font-family: monospace; font-size: .8rem; color: #4338ca; display: block; }
    .cq-msg { color: #475569; font-size: .82rem; max-width: 400px; }
    .cq-rule-name { font-weight: 600; display: block; }
    .cq-ruleset { color: #94a3b8; font-size: .72rem; }

    /* Priority badges */
    .cq-priority {
      display: inline-block; padding: 2px 8px; border-radius: 6px;
      font-weight: 700; font-size: .72rem;
    }
    .cq-priority.p1 { background: #fee2e2; color: #b91c1c; }
    .cq-priority.p2 { background: #ffedd5; color: #c2410c; }
    .cq-priority.p3 { background: #fef9c3; color: #a16207; }
    .cq-priority.p4 { background: #dbeafe; color: #1e40af; }
    .cq-priority.p5 { background: #f0fdf4; color: #15803d; }

    /* Severity badges */
    .cq-sev { padding: 2px 8px; border-radius: 6px; font-size: .72rem; font-weight: 600; }
    .cq-sev.error   { background: #fee2e2; color: #b91c1c; }
    .cq-sev.warning { background: #fef9c3; color: #a16207; }
    .cq-sev.info    { background: #dbeafe; color: #1e40af; }

    /* Empty state inline */
    .cq-empty {
      display: flex; align-items: center; gap: 8px; justify-content: center;
      padding: 40px; color: #22c55e; font-weight: 500;
    }
    .cq-more { text-align: center; color: #94a3b8; font-size: .82rem; padding: 8px; }

    @media (max-width: 768px) {
      .cq-kpis { grid-template-columns: 1fr 1fr; }
      .cq-charts-row { grid-template-columns: 1fr; }
      .cq-selector-row { flex-direction: column; }
      .cq-analyze-btn { width: 100%; }
    }
  `],
})
export class CodeQualityDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('doughnutCanvas') doughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pmdCanvas')      pmdRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rulesCanvas')    rulesRef!: ElementRef<HTMLCanvasElement>;

  private svc    = inject(CodeQualityService);
  private git    = inject(GitService);
  private snack  = inject(MatSnackBar);

  // State
  loading         = signal(false);
  analyzing       = signal(false);
  loadingRepos    = signal(false);
  loadingBranches = signal(false);

  repos    = signal<GithubRepo[]>([]);
  branches = signal<ManagerBranch[]>([]);
  summary  = signal<(QualitySummary & { filesAnalyzed: number; filesSkipped: number; repo: string; branch: string }) | null>(null);
  pmdList  = signal<PmdViolation[]>([]);
  checkstyleList = signal<CheckstyleIssue[]>([]);
  spotbugsList   = signal<SpotbugsIssue[]>([]);

  selectedRepo:   GithubRepo | null = null;
  selectedBranch: string = '';

  private charts: Chart[] = [];

  ngOnInit(): void {
    this.loadRepos();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadRepos(): void {
    this.loadingRepos.set(true);
    this.git.managerListRepos().subscribe({
      next: rs => { this.repos.set(rs); this.loadingRepos.set(false); },
      error: () => {
        this.snack.open('Impossible de charger les repositories. Vérifiez votre token GitHub.', 'OK', { duration: 4000 });
        this.loadingRepos.set(false);
      },
    });
  }

  onRepoChange(repo: GithubRepo): void {
    this.selectedBranch = '';
    this.branches.set([]);
    if (!repo) return;

    this.loadingBranches.set(true);
    this.git.managerListBranches(repo.owner!.login, repo.name).subscribe({
      next: bs => {
        this.branches.set(bs);
        // Pre-select default branch
        const def = bs.find(b => b.name === repo.default_branch) ?? bs[0];
        if (def) this.selectedBranch = def.name;
        this.loadingBranches.set(false);
      },
      error: () => {
        this.snack.open('Impossible de charger les branches.', 'OK', { duration: 3000 });
        this.loadingBranches.set(false);
      },
    });
  }

  runAnalysis(): void {
    if (!this.selectedRepo || !this.selectedBranch) return;

    const owner = this.selectedRepo.owner!.login;
    const repo  = this.selectedRepo.name;

    this.analyzing.set(true);
    this.summary.set(null);
    this.pmdList.set([]);
    this.checkstyleList.set([]);
    this.spotbugsList.set([]);
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.svc.analyzeRepo(owner, repo, this.selectedBranch).subscribe({
      next: (result: RepoAnalysisResult) => {
        this.analyzing.set(false);
        this.summary.set(result.summary as any);
        this.pmdList.set(result.pmd);
        this.checkstyleList.set(result.checkstyle);
        this.spotbugsList.set(result.spotbugs);
        setTimeout(() => this.buildCharts(result.summary as any), 50);
        this.snack.open(
          `Analyse terminée — ${result.summary.totalIssues} problèmes trouvés sur ${result.summary.filesAnalyzed} fichiers`,
          'OK', { duration: 4000 }
        );
      },
      error: (err) => {
        this.analyzing.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de l\'analyse.';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
    });
  }

  private buildCharts(s: any): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // 1. Doughnut — répartition
    if (this.doughnutRef?.nativeElement) {
      const d = new Chart(this.doughnutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['PMD', 'Checkstyle', 'SpotBugs'],
          datasets: [{
            data: [s.pmd.violations, s.checkstyle.total, s.spotbugs.bugs],
            backgroundColor: ['#f97316', '#0ea5e9', '#ef4444'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          cutout: '65%',
        },
      } as ChartConfiguration);
      this.charts.push(d);
    }

    // 2. Bar — PMD par priorité
    if (this.pmdRef?.nativeElement) {
      const others = Math.max(0, s.pmd.violations - s.pmd.priority1 - s.pmd.priority2);
      const p = new Chart(this.pmdRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['P1 Critique', 'P2 Haute', 'P3-P5 Autres'],
          datasets: [{
            label: 'Violations',
            data: [s.pmd.priority1, s.pmd.priority2, others],
            backgroundColor: ['#ef4444', '#f97316', '#94a3b8'],
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: { legend: { display: false } },
        },
      } as ChartConfiguration);
      this.charts.push(p);
    }

    // 3. Bar — Top rules
    if (this.rulesRef?.nativeElement) {
      const allViolations = [...this.pmdList(), ...this.checkstyleList(), ...this.spotbugsList()];
      const ruleCounts: Record<string, number> = {};
      allViolations.forEach((v: any) => {
        const rule = v.rule ?? v.type ?? 'Unknown';
        ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
      });
      const top5 = Object.entries(ruleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const r = new Chart(this.rulesRef.nativeElement, {
        type: 'bar',
        data: {
          labels: top5.map(([k]) => k),
          datasets: [{
            label: 'Occurrences',
            data: top5.map(([, v]) => v),
            backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y' as const,
          plugins: { legend: { display: false } },
        },
      } as ChartConfiguration);
      this.charts.push(r);
    }
  }

  gradeLabel(g: string): string {
    return { A: 'Excellent', B: 'Bien', C: 'Correct', D: 'Médiocre', E: 'Critique' }[g] ?? '';
  }
}
