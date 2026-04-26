import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';

import { AuthService } from '../../../auth/auth.service';
import { StudentDeliverableService, StudentDeliverable } from '../../../services/student-deliverable.service';
import {
  TutorEvaluationService,
  DetailedComparisonResult,
  DiffSection,
  DetailedDiffLine,
} from '../../../services/tutor-evaluation.service';

interface DeliverableOption {
  id: number;
  title: string;
  studentName: string;
  fileType: string;
  fileUrl: string | null;
}

interface PlagiarismVerdict {
  level: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  icon: string;
  color: string;
  interpretation: string;
  recommendation: string;
}

interface PaginatedLine {
  sectionIndex: number;
  section: DiffSection;
  line: DetailedDiffLine;
  lineIndex: number;
}

@Component({
  selector: 'app-tutor-compare-deliverables',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTooltipModule, MatDividerModule, MatMenuModule, MatExpansionModule,
  ],
  template: `
    <div class="tutor-compare">

      <!-- ── En-tête ─────────────────────────────────────── -->
      <header class="header">
        <div class="title">
          <div class="icon-wrap"><mat-icon>compare_arrows</mat-icon></div>
          <div>
            <h1>Comparer les livrables de mes étudiants</h1>
            <p class="subtitle">
              Analyse de similarité entre deux livrables d'étudiants assignés à votre tutorat.
            </p>
          </div>
        </div>
      </header>

      <!-- ── Chargement / erreur ─────────────────────────── -->
      @if (loadingList()) {
        <div class="state-banner">
          <mat-progress-spinner diameter="24" mode="indeterminate" />
          <span>Chargement de vos livrables…</span>
        </div>
      } @else if (loadError()) {
        <div class="state-banner error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ loadError() }}</span>
        </div>
      } @else {

        <!-- ── Sélection ────────────────────────────────── -->
        <mat-card class="picker-card">
          <div class="picker-header">
            <mat-icon>manage_search</mat-icon>
            <span>Sélection des livrables à comparer</span>
            <span class="count-badge">{{ options().length }} livrable(s) disponible(s)</span>
          </div>

          <div class="picker-grid">
            <!-- Livrable A -->
            <div class="picker-side">
              <div class="side-label"><span class="badge-a">A</span> Étudiant 1</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Livrable A</mat-label>
                <mat-select [ngModel]="leftId()" (ngModelChange)="leftId.set($event)">
                  @for (d of options(); track d.id) {
                    <mat-option [value]="d.id" [disabled]="d.id === rightId()">
                      <div class="opt-row">
                        <span class="opt-title">{{ d.title }}</span>
                        <span class="opt-chip">{{ d.fileType }}</span>
                      </div>
                      <div class="opt-student">{{ d.studentName }}</div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (leftOption()) {
                <div class="selected-info">
                  <mat-icon>person</mat-icon>
                  <span>{{ leftOption()!.studentName }}</span>
                  <span class="chip">{{ leftOption()!.fileType }}</span>
                </div>
              }
            </div>

            <!-- Séparateur -->
            <div class="vs-divider">
              <div class="vs-line"></div>
              <div class="vs-icon"><mat-icon>sync_alt</mat-icon></div>
              <div class="vs-line"></div>
            </div>

            <!-- Livrable B -->
            <div class="picker-side">
              <div class="side-label"><span class="badge-b">B</span> Étudiant 2</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Livrable B</mat-label>
                <mat-select [ngModel]="rightId()" (ngModelChange)="rightId.set($event)">
                  @for (d of options(); track d.id) {
                    <mat-option [value]="d.id" [disabled]="d.id === leftId()">
                      <div class="opt-row">
                        <span class="opt-title">{{ d.title }}</span>
                        <span class="opt-chip">{{ d.fileType }}</span>
                      </div>
                      <div class="opt-student">{{ d.studentName }}</div>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (rightOption()) {
                <div class="selected-info">
                  <mat-icon>person</mat-icon>
                  <span>{{ rightOption()!.studentName }}</span>
                  <span class="chip">{{ rightOption()!.fileType }}</span>
                </div>
              }
            </div>
          </div>

          <div class="actions-bar">
            <button mat-flat-button class="btn-compare"
                    [disabled]="!canCompare() || comparing()"
                    (click)="runComparison()">
              @if (comparing()) {
                <mat-progress-spinner diameter="18" mode="indeterminate" />
                <span>Analyse en cours…</span>
              } @else {
                <mat-icon>analytics</mat-icon>
                <span>Lancer la comparaison</span>
              }
            </button>

            @if (result()) {
              <button mat-stroked-button [matMenuTriggerFor]="reportMenu" class="btn-report">
                <mat-icon>summarize</mat-icon>
                <span>Générer un rapport</span>
                <mat-icon>arrow_drop_down</mat-icon>
              </button>
              <mat-menu #reportMenu="matMenu">
                <button mat-menu-item (click)="downloadReportHtml()">
                  <mat-icon>html</mat-icon>
                  <span>Rapport HTML (imprimable / PDF)</span>
                </button>
                <button mat-menu-item (click)="downloadReportTxt()">
                  <mat-icon>description</mat-icon>
                  <span>Rapport texte (.txt)</span>
                </button>
              </mat-menu>
            }
          </div>
        </mat-card>
      }

      @if (compareError()) {
        <div class="state-banner error">
          <mat-icon>warning</mat-icon>
          <span>{{ compareError() }}</span>
        </div>
      }

      <!-- ══════════════════ RÉSULTATS ══════════════════ -->
      @if (result(); as r) {
        <div class="results-grid">

          <!-- ── Jauge de similarité ──────────────────────── -->
          <mat-card class="sim-card"
                    [class.level-low]="verdict().level === 'low'"
                    [class.level-medium]="verdict().level === 'medium'"
                    [class.level-high]="verdict().level === 'high'"
                    [class.level-critical]="verdict().level === 'critical'">
            <div class="sim-score-row">
              <div class="score-circle">
                <svg viewBox="0 0 36 36" class="donut">
                  <circle class="donut-bg" cx="18" cy="18" r="15.9" />
                  <circle class="donut-fill" cx="18" cy="18" r="15.9"
                          [style.stroke-dasharray]="(r.similarityScore * 100) + ' 100'"
                          [attr.stroke]="verdict().color" />
                </svg>
                <span class="score-num">{{ r.similarityPct }}</span>
              </div>
              <div class="score-info">
                <div class="verdict-label" [style.color]="verdict().color">
                  <mat-icon>{{ verdict().icon }}</mat-icon>
                  {{ verdict().label }}
                </div>
                <div class="verdict-interp">{{ verdict().interpretation }}</div>
              </div>
            </div>

            <!-- Barre graduée -->
            <div class="sim-bar-wrap">
              <div class="sim-bar-track">
                <div class="sim-marker" [style.left.%]="r.similarityScore * 100"></div>
              </div>
              <div class="sim-zones">
                <span class="zone green">Indépendant (0–35%)</span>
                <span class="zone yellow">Similaire (35–60%)</span>
                <span class="zone orange">Suspect (60–80%)</span>
                <span class="zone red">Plagiat (80–100%)</span>
              </div>
            </div>

            <div class="recommendation">
              <mat-icon>tips_and_updates</mat-icon>
              <span>{{ verdict().recommendation }}</span>
            </div>

            @if (r.possiblePlagiarism) {
              <div class="plagiat-banner">
                <mat-icon>gpp_bad</mat-icon>
                <strong>PLAGIAT PROBABLE</strong> — Score suggéré : {{ r.suggestedScore }}/100
              </div>
            }
          </mat-card>

          <!-- ── Métadonnées des livrables ─────────────── -->
          <mat-card class="meta-card">
            <div class="meta-header">
              <mat-icon>info_outline</mat-icon>
              <span>Livrables comparés</span>
            </div>

            <div class="meta-sides">
              <div class="meta-side">
                <div class="meta-badge-a">A</div>
                <div>
                  <div class="meta-title">{{ r.leftTitle }}</div>
                  <div class="meta-student">
                    <mat-icon>person</mat-icon> {{ r.leftStudentName ?? '—' }}
                  </div>
                </div>
              </div>
              <mat-divider vertical></mat-divider>
              <div class="meta-side">
                <div class="meta-badge-b">B</div>
                <div>
                  <div class="meta-title">{{ r.rightTitle }}</div>
                  <div class="meta-student">
                    <mat-icon>person</mat-icon> {{ r.rightStudentName ?? '—' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Statistiques diff -->
            <div class="diff-stats">
              <div class="diff-stat add">
                <mat-icon>add_circle_outline</mat-icon>
                <div>
                  <span class="dsval">{{ r.totalAdded }}</span>
                  <span class="dslbl">ajoutées</span>
                </div>
              </div>
              <div class="diff-stat rem">
                <mat-icon>remove_circle_outline</mat-icon>
                <div>
                  <span class="dsval">{{ r.totalRemoved }}</span>
                  <span class="dslbl">supprimées</span>
                </div>
              </div>
              <div class="diff-stat mod">
                <mat-icon>edit_note</mat-icon>
                <div>
                  <span class="dsval">{{ r.totalModified }}</span>
                  <span class="dslbl">modifiées</span>
                </div>
              </div>
              <div class="diff-stat unch">
                <mat-icon>remove</mat-icon>
                <div>
                  <span class="dsval">{{ r.totalUnchanged }}</span>
                  <span class="dslbl">identiques</span>
                </div>
              </div>
            </div>

            <div class="impact-row">
              <span class="impact-lbl">Impact :</span>
              <span class="impact-badge"
                    [class.minor]="r.impactLevel === 'MINOR'"
                    [class.medium]="r.impactLevel === 'MEDIUM'"
                    [class.major]="r.impactLevel === 'MAJOR'">
                <mat-icon>flag</mat-icon> {{ r.impactLevel }}
              </span>
              <span class="impact-lbl" style="margin-left:8px">Sections :</span>
              <span class="sections-count">{{ r.totalSections }}</span>
            </div>
          </mat-card>
        </div>

        <!-- ── Diff par sections ──────────────────────── -->
        <mat-card class="diff-card">

          <!-- Entête + contrôles -->
          <div class="diff-card-header">
            <mat-icon>difference</mat-icon>
            <span>Analyse différentielle</span>
            <span class="total-badge">{{ allLines().length }} ligne(s) au total</span>

            <!-- Taille de page -->
            <div class="page-size-wrap">
              <span class="page-size-lbl">Par page :</span>
              @for (n of pageSizeOptions; track n) {
                <button class="ps-btn" [class.ps-active]="pageSize() === n"
                        (click)="setPageSize(n)">{{ n }}</button>
              }
            </div>
          </div>

          @if (!r.sections || r.sections.length === 0) {
            <div class="state-banner" style="margin-top:12px">
              <mat-icon>check_circle</mat-icon>
              <span>Aucune différence détectée — les fichiers sont identiques.</span>
            </div>
          }

          <!-- Barre de pagination — haut -->
          @if (totalPages() > 1) {
            <div class="pagination-bar">
              <button mat-icon-button [disabled]="currentPage() === 0" (click)="goToPage(0)"
                      matTooltip="Première page">
                <mat-icon>first_page</mat-icon>
              </button>
              <button mat-icon-button [disabled]="currentPage() === 0" (click)="prevPage()"
                      matTooltip="Page précédente">
                <mat-icon>chevron_left</mat-icon>
              </button>

              <div class="page-numbers">
                @for (item of pageItems(); track $index) {
                  @if (item.dot) {
                    <span class="page-ellipsis">…</span>
                  } @else {
                    <button class="page-num" [class.page-num-active]="item.page === currentPage()"
                            (click)="goToPage(item.page)">{{ item.page + 1 }}</button>
                  }
                }
              </div>

              <button mat-icon-button [disabled]="currentPage() === totalPages() - 1" (click)="nextPage()"
                      matTooltip="Page suivante">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <button mat-icon-button [disabled]="currentPage() === totalPages() - 1"
                      (click)="goToPage(totalPages() - 1)" matTooltip="Dernière page">
                <mat-icon>last_page</mat-icon>
              </button>

              <span class="page-info">
                Lignes {{ currentPage() * pageSize() + 1 }}–{{ pageEnd() }}
                sur {{ allLines().length }}
              </span>
            </div>
          }

          <!-- Lignes paginées -->
          <div class="diff-container">
            @for (paginatedLine of pagedLines(); track $index) {
              @if ($index === 0 || paginatedLine.sectionIndex !== pagedLines()[$index - 1].sectionIndex) {
                <div class="section-header">
                  <span class="section-title">Section {{ paginatedLine.sectionIndex + 1 }}</span>
                  <span class="section-range">
                    lignes {{ paginatedLine.section.oldStartLine }}–{{ paginatedLine.section.oldStartLine + sectionOldLines(paginatedLine.section) }}
                    → {{ paginatedLine.section.newStartLine }}–{{ paginatedLine.section.newStartLine + sectionNewLines(paginatedLine.section) }}
                  </span>
                  <div class="section-badges">
                    @if (paginatedLine.section.addedInSection > 0) {
                      <span class="sect-badge add">+{{ paginatedLine.section.addedInSection }}</span>
                    }
                    @if (paginatedLine.section.removedInSection > 0) {
                      <span class="sect-badge rem">−{{ paginatedLine.section.removedInSection }}</span>
                    }
                    @if (paginatedLine.section.modifiedInSection > 0) {
                      <span class="sect-badge mod">~{{ paginatedLine.section.modifiedInSection }}</span>
                    }
                  </div>
                </div>
              }
              @if (paginatedLine.line.type === 'MODIFIED') {
                <div class="diff-row rem">
                  <span class="ln">{{ paginatedLine.line.oldLineNumber ?? '' }}</span>
                  <span class="ln new-ln"></span>
                  <span class="marker">−</span>
                  <span class="text">{{ paginatedLine.line.oldContent ?? '' }}</span>
                </div>
                <div class="diff-row add">
                  <span class="ln"></span>
                  <span class="ln new-ln">{{ paginatedLine.line.newLineNumber ?? '' }}</span>
                  <span class="marker">+</span>
                  <span class="text">{{ paginatedLine.line.content }}</span>
                </div>
              } @else if (paginatedLine.line.type === 'ADDED') {
                <div class="diff-row add">
                  <span class="ln"></span>
                  <span class="ln new-ln">{{ paginatedLine.line.newLineNumber ?? '' }}</span>
                  <span class="marker">+</span>
                  <span class="text">{{ paginatedLine.line.content }}</span>
                </div>
              } @else if (paginatedLine.line.type === 'REMOVED') {
                <div class="diff-row rem">
                  <span class="ln">{{ paginatedLine.line.oldLineNumber ?? '' }}</span>
                  <span class="ln new-ln"></span>
                  <span class="marker">−</span>
                  <span class="text">{{ paginatedLine.line.content }}</span>
                </div>
              } @else {
                <div class="diff-row unch">
                  <span class="ln">{{ paginatedLine.line.oldLineNumber ?? '' }}</span>
                  <span class="ln new-ln">{{ paginatedLine.line.newLineNumber ?? '' }}</span>
                  <span class="marker"> </span>
                  <span class="text">{{ paginatedLine.line.content }}</span>
                </div>
              }
            }
          </div>

          <!-- Barre de pagination — bas -->
          @if (totalPages() > 1) {
            <div class="pagination-bar pagination-bar-bottom">
              <button mat-icon-button [disabled]="currentPage() === 0" (click)="prevPage()">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="page-info">Page {{ currentPage() + 1 }} / {{ totalPages() }}</span>
              <button mat-icon-button [disabled]="currentPage() === totalPages() - 1" (click)="nextPage()">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          }

        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .tutor-compare { padding: 28px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    /* ── Header ─────────────────────────────────── */
    .header { margin-bottom: 24px; }
    .title { display: flex; align-items: flex-start; gap: 14px; }
    .icon-wrap {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
    }
    .icon-wrap mat-icon { color: white; font-size: 26px; width: 26px; height: 26px; }
    .title h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
    .subtitle { margin: 4px 0 0; color: #64748b; font-size: 0.88rem; }

    /* ── State banner ───────────────────────────── */
    .state-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px; border-radius: 10px; margin-bottom: 16px;
      background: #f1f5f9; color: #475569;
      &.error { background: #fef2f2; color: #b91c1c; }
    }

    /* ── Picker card ────────────────────────────── */
    .picker-card { padding: 20px; margin-bottom: 20px; border-radius: 16px !important; }
    .picker-header {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; color: #334155; margin-bottom: 18px; font-size: 0.95rem;
      mat-icon { color: #6366f1; }
    }
    .count-badge {
      margin-left: auto; background: #ede9fe; color: #5b21b6;
      padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
    }

    .picker-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: start; }
    .side-label {
      display: flex; align-items: center; gap: 8px;
      font-weight: 600; color: #334155; margin-bottom: 8px; font-size: 0.9rem;
    }
    .badge-a, .badge-b {
      width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.78rem; font-weight: 800; color: white;
    }
    .badge-a { background: #6366f1; }
    .badge-b { background: #0ea5e9; }
    .full-width { width: 100%; }

    .selected-info {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.82rem; color: #64748b; margin-top: 4px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .chip {
      background: #e0e7ff; color: #3730a3;
      padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
    }

    .vs-divider { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 40px; }
    .vs-line { width: 1px; height: 30px; background: #e2e8f0; }
    .vs-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: #f1f5f9; border: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: center; color: #94a3b8;
    }
    .vs-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .opt-row { display: flex; align-items: center; gap: 6px; }
    .opt-title { font-weight: 600; font-size: 0.9rem; }
    .opt-chip { background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; }
    .opt-student { font-size: 0.78rem; color: #94a3b8; }

    .actions-bar {
      display: flex; gap: 12px; justify-content: flex-end;
      margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;
    }
    .btn-compare {
      background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
      color: white !important; border-radius: 10px !important;
      height: 42px; display: flex; align-items: center; gap: 8px;
      &[disabled] { opacity: 0.5; }
    }
    .btn-report { border-radius: 10px !important; height: 42px; display: flex; align-items: center; gap: 6px; }

    /* ── Results grid ───────────────────────────── */
    .results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

    /* ── Similarity card ────────────────────────── */
    .sim-card {
      padding: 20px; border-radius: 16px !important; border-top: 4px solid #e2e8f0;
      &.level-low    { border-top-color: #10b981; }
      &.level-medium { border-top-color: #f59e0b; }
      &.level-high   { border-top-color: #f97316; }
      &.level-critical { border-top-color: #ef4444; }
    }

    .sim-score-row { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    .score-circle { position: relative; width: 90px; height: 90px; flex-shrink: 0; }
    .donut { transform: rotate(-90deg); width: 100%; height: 100%; }
    .donut-bg { fill: none; stroke: #f1f5f9; stroke-width: 3; }
    .donut-fill { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray .6s ease; }
    .score-num {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 1rem; font-weight: 800; color: #1e293b;
    }

    .score-info { flex: 1; }
    .verdict-label {
      display: flex; align-items: center; gap: 6px;
      font-weight: 700; font-size: 1rem; margin-bottom: 6px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .verdict-interp { font-size: 0.83rem; color: #64748b; line-height: 1.4; }

    .sim-bar-wrap { margin-bottom: 14px; }
    .sim-bar-track {
      position: relative; height: 10px; border-radius: 999px; margin-bottom: 6px;
      background: linear-gradient(90deg, #10b981 0%, #f59e0b 35%, #f97316 60%, #ef4444 80%);
    }
    .sim-marker {
      position: absolute; top: -4px; width: 4px; height: 18px;
      background: #1e293b; border-radius: 2px; transform: translateX(-50%);
    }
    .sim-zones { display: grid; grid-template-columns: 35fr 25fr 20fr 20fr; gap: 2px; }
    .zone {
      font-size: 0.63rem; text-align: center; padding: 2px 4px;
      border-radius: 4px; font-weight: 600;
      &.green  { background: #d1fae5; color: #065f46; }
      &.yellow { background: #fef3c7; color: #92400e; }
      &.orange { background: #ffedd5; color: #9a3412; }
      &.red    { background: #fee2e2; color: #991b1b; }
    }

    .recommendation {
      display: flex; align-items: flex-start; gap: 8px;
      background: #f8fafc; border-radius: 8px; padding: 10px 12px;
      font-size: 0.83rem; color: #475569; line-height: 1.4; margin-bottom: 10px;
      mat-icon { color: #6366f1; flex-shrink: 0; font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    }

    .plagiat-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
      padding: 10px 14px; color: #b91c1c; font-size: 0.85rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ── Meta card ──────────────────────────────── */
    .meta-card { padding: 20px; border-radius: 16px !important; }
    .meta-header {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; color: #334155; margin-bottom: 16px; font-size: 0.95rem;
      mat-icon { color: #6366f1; }
    }
    .meta-sides { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: start; margin-bottom: 16px; }
    .meta-side { display: flex; gap: 10px; align-items: flex-start; }
    .meta-badge-a, .meta-badge-b {
      width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 800; color: white; margin-top: 2px;
    }
    .meta-badge-a { background: #6366f1; }
    .meta-badge-b { background: #0ea5e9; }
    .meta-title { font-weight: 600; font-size: 0.9rem; color: #1e293b; margin-bottom: 4px; }
    .meta-student {
      display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #64748b;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .diff-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px;
    }
    .diff-stat {
      display: flex; align-items: center; gap: 6px; padding: 8px 10px;
      border-radius: 10px; border: 1px solid #e2e8f0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      .dsval { font-size: 1.1rem; font-weight: 800; display: block; }
      .dslbl { font-size: 0.7rem; color: #94a3b8; }
      &.add { background: #ecfdf5; mat-icon { color: #059669; } .dsval { color: #059669; } }
      &.rem { background: #fef2f2; mat-icon { color: #dc2626; } .dsval { color: #dc2626; } }
      &.mod { background: #fffbeb; mat-icon { color: #d97706; } .dsval { color: #d97706; } }
      &.unch { background: #f8fafc; mat-icon { color: #94a3b8; } .dsval { color: #475569; } }
    }

    .impact-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .impact-lbl { font-size: 0.85rem; color: #64748b; font-weight: 600; }
    .impact-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &.minor  { background: #ecfdf5; color: #065f46; }
      &.medium { background: #fef3c7; color: #92400e; }
      &.major  { background: #fee2e2; color: #991b1b; }
    }
    .sections-count {
      background: #ede9fe; color: #5b21b6;
      padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700;
    }

    /* ── Diff card ──────────────────────────────── */
    .diff-card { padding: 20px; border-radius: 16px !important; }
    .diff-card-header {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; color: #334155; margin-bottom: 16px; font-size: 0.95rem;
      mat-icon { color: #6366f1; }
    }
    .expand-btn { margin-left: auto; font-size: 0.8rem; }

    /* ── Section panels ─────────────────────────── */
    .section-panel { margin-bottom: 6px; border-radius: 10px !important; }
    .section-title { font-weight: 600; font-size: 0.88rem; margin-right: 10px; }
    .section-range { font-size: 0.75rem; color: #94a3b8; font-family: 'Fira Code', monospace; }
    .sect-badge {
      display: inline-flex; align-items: center;
      padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-left: 4px;
      &.add { background: #ecfdf5; color: #059669; }
      &.rem { background: #fef2f2; color: #dc2626; }
      &.mod { background: #fffbeb; color: #d97706; }
    }

    /* ── Diff container ─────────────────────────── */
    .diff-container {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.78rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
    }
    .section-header {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;
      font-weight: 600; font-size: 0.85rem; color: #334155;
    }
    .section-badges { margin-left: auto; display: flex; gap: 4px; }
    .diff-block {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 0.78rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
    }
    .diff-row {
      display: flex; align-items: stretch; min-height: 22px;
      border-left: 3px solid transparent;
    }
    .ln {
      width: 40px; min-width: 40px; text-align: right; padding: 2px 6px;
      font-size: 0.72rem; color: #94a3b8; background: #f8fafc;
      border-right: 1px solid #e5e7eb; user-select: none;
    }
    .new-ln { border-right: none; border-left: 1px solid #e5e7eb; }
    .marker { width: 18px; min-width: 18px; text-align: center; padding: 2px 0; font-weight: 700; }
    .text { flex: 1; padding: 2px 6px; white-space: pre-wrap; word-break: break-all; }

    .diff-row.add { background: #ecfdf5; color: #065f46; border-left-color: #10b981; }
    .diff-row.rem { background: #fef2f2; color: #991b1b; border-left-color: #ef4444; }
    .diff-row.mod { background: #fffbeb; color: #92400e; border-left-color: #f59e0b; }
    .diff-row.unch { background: white; color: #475569; }

    /* ── Pagination ─────────────────────────────── */
    .total-badge {
      background: #ede9fe; color: #5b21b6;
      padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
    }
    .page-size-wrap {
      display: flex; align-items: center; gap: 4px;
      margin-left: 12px; font-size: 0.78rem;
    }
    .page-size-lbl { color: #94a3b8; margin-right: 4px; }
    .ps-btn {
      width: 30px; height: 26px; border: 1px solid #e2e8f0; border-radius: 6px;
      background: white; cursor: pointer; font-size: 0.78rem; font-weight: 600;
      color: #475569; transition: all .15s;
      &:hover { border-color: #6366f1; color: #6366f1; }
      &.ps-active { background: #6366f1; color: white; border-color: #6366f1; }
    }

    .pagination-bar {
      display: flex; align-items: center; gap: 4px;
      padding: 8px 4px; margin-bottom: 10px; flex-wrap: wrap;
      border-bottom: 1px solid #f1f5f9;
    }
    .pagination-bar-bottom {
      margin-top: 12px; margin-bottom: 0; border-top: 1px solid #f1f5f9; border-bottom: none;
      padding-top: 10px; padding-bottom: 0; justify-content: center;
    }

    .page-numbers { display: flex; align-items: center; gap: 2px; }
    .page-num {
      min-width: 32px; height: 32px; border: 1px solid #e2e8f0; border-radius: 8px;
      background: white; cursor: pointer; font-size: 0.82rem; font-weight: 600;
      color: #475569; transition: all .15s; padding: 0 8px;
      &:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }
      &.page-num-active { background: #6366f1; color: white; border-color: #6366f1; }
    }
    .page-ellipsis { color: #94a3b8; padding: 0 4px; font-size: 0.85rem; }
    .page-info {
      font-size: 0.8rem; color: #64748b; margin-left: 8px; white-space: nowrap;
    }
  `],
})
export class TutorCompareDeliverablesComponent implements OnInit {

  private auth        = inject(AuthService);
  private studentSvc  = inject(StudentDeliverableService);
  private tutorSvc    = inject(TutorEvaluationService);

  options       = signal<DeliverableOption[]>([]);
  loadingList   = signal(true);
  loadError     = signal<string | null>(null);

  leftId  = signal<number | null>(null);
  rightId = signal<number | null>(null);

  comparing    = signal(false);
  compareError = signal<string | null>(null);
  result       = signal<DetailedComparisonResult | null>(null);

  // ── Pagination ────────────────────────────────────────────────────────────
  readonly pageSizeOptions: number[] = [10, 20, 30, 50];
  currentPage = signal(0);
  pageSize    = signal(30);

  pagedSections = computed(() => {
    const r = this.result();
    if (!r?.sections) return [];
    const start = this.currentPage() * this.pageSize();
    return r.sections.slice(start, start + this.pageSize());
  });

  allLines = computed(() => {
    const r = this.result();
    if (!r?.sections) return [];
    const lines: PaginatedLine[] = [];
    r.sections.forEach(section => {
      section.lines.forEach((line, lineIndex) => {
        lines.push({
          sectionIndex: section.sectionIndex,
          section,
          line,
          lineIndex,
        });
      });
    });
    return lines;
  });

  pagedLines = computed(() => {
    const lines = this.allLines();
    const start = this.currentPage() * this.pageSize();
    return lines.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    const lines = this.allLines();
    return Math.ceil(lines.length / this.pageSize());
  });

  pageEnd = computed(() => {
    const lines = this.allLines();
    return Math.min((this.currentPage() + 1) * this.pageSize(), lines.length);
  });

  // Chaque item a un type unique : pas de -1 dupliqués — on track par $index
  pageItems = computed((): { dot: boolean; page: number }[] => {
    const total = this.totalPages();
    const cur   = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => ({ dot: false, page: i }));

    const result: { dot: boolean; page: number }[] = [];
    result.push({ dot: false, page: 0 });
    if (cur > 2)         result.push({ dot: true,  page: -1 });
    for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) {
      result.push({ dot: false, page: i });
    }
    if (cur < total - 3) result.push({ dot: true,  page: -2 }); // page négatif différent pour unicité
    result.push({ dot: false, page: total - 1 });
    return result;
  });

  canCompare = computed(() => {
    const l = this.leftId(), r = this.rightId();
    return l != null && r != null && l !== r;
  });

  leftOption  = computed(() => this.options().find(o => o.id === this.leftId())  ?? null);
  rightOption = computed(() => this.options().find(o => o.id === this.rightId()) ?? null);

  verdict = computed<PlagiarismVerdict>(() => {
    const r = this.result();
    return this.verdictFor(r?.similarityScore ?? 0);
  });

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      this.loadingList.set(false);
      this.loadError.set('Impossible de récupérer votre identifiant. Veuillez vous reconnecter.');
      return;
    }

    this.studentSvc.getByTutor(userId).subscribe({
      next: (list: StudentDeliverable[]) => {
        const opts: DeliverableOption[] = list
          .filter(d => d.fileUrl && this.isSupportedFile(d.fileUrl, d.fileType))
          .map(d => ({
            id: d.id,
            title: d.title ?? `Livrable #${d.id}`,
            studentName: d.studentName ?? '—',
            fileType: this.shortType(d.fileUrl ?? '', d.fileType),
            fileUrl: d.fileUrl,
          }));
        this.options.set(opts);
        this.loadingList.set(false);
        if (opts.length < 2) {
          this.loadError.set('Pas assez de livrables compatibles disponibles pour comparer. Vérifiez que vos étudiants ont soumis des fichiers PDF, DOCX, TXT ou de code.');
        }
      },
      error: () => {
        this.loadingList.set(false);
        this.loadError.set('Erreur lors du chargement de vos livrables.');
      },
    });
  }

  runComparison(): void {
    if (!this.canCompare()) return;
    this.comparing.set(true);
    this.compareError.set(null);
    this.result.set(null);
    this.currentPage.set(0);

    this.tutorSvc.compare(this.leftId()!, this.rightId()!).subscribe({
      next: (r) => {
        this.result.set(r);
        this.comparing.set(false);
        this.currentPage.set(0);
      },
      error: (err) => {
        this.comparing.set(false);
        this.compareError.set(err?.error?.message || 'Erreur lors de la comparaison. Vérifiez que les livrables ont un fichier valide.');
      },
    });
  }

  // ── Sections helpers ──────────────────────────────────────────────────────

  sectionOldLines(s: DiffSection): number {
    return s.lines.filter(l => l.oldLineNumber != null).length;
  }

  sectionNewLines(s: DiffSection): number {
    return s.lines.filter(l => l.newLineNumber != null).length;
  }

  // ── Pagination navigation ─────────────────────────────────────────────────

  goToPage(page: number): void {
    const p = Math.max(0, Math.min(page, this.totalPages() - 1));
    this.currentPage.set(p);
  }

  prevPage(): void { this.goToPage(this.currentPage() - 1); }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }

  setPageSize(n: number): void {
    this.pageSize.set(n);
    this.currentPage.set(0);
  }

  // ── Rapport HTML ──────────────────────────────────────────────────────────

  downloadReportHtml(): void {
    const r = this.result();
    if (!r) return;
    const v = this.verdictFor(r.similarityScore);
    const now = new Date().toLocaleString('fr-FR');

    const sectionsHtml = (r.sections ?? []).map(s => {
      const linesHtml = s.lines.map(l => {
        if (l.type === 'MODIFIED') {
          return `<div class="line rem">− ${this.esc(l.oldContent ?? '')}</div><div class="line add">+ ${this.esc(l.content)}</div>`;
        } else if (l.type === 'ADDED') {
          return `<div class="line add">+ ${this.esc(l.content)}</div>`;
        } else if (l.type === 'REMOVED') {
          return `<div class="line rem">− ${this.esc(l.content)}</div>`;
        } else {
          return `<div class="line unch">  ${this.esc(l.content)}</div>`;
        }
      }).join('');
      return `
        <div class="section">
          <div class="section-title">Section ${s.sectionIndex + 1}
            <span style="font-weight:400;font-size:.8em;color:#94a3b8;margin-left:12px">
              lignes ${s.oldStartLine} → ${s.newStartLine} &nbsp;|
              +${s.addedInSection} −${s.removedInSection} ~${s.modifiedInSection}
            </span>
          </div>
          <div class="diff-block">${linesHtml}</div>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport de comparaison — ${this.esc(r.leftTitle)} vs ${this.esc(r.rightTitle)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #f8fafc; color: #1e293b; }
  .page { max-width: 900px; margin: 0 auto; background: white; padding: 48px; }
  @media print { body { background: white; } .page { padding: 24px; } .no-print { display: none; } }

  .report-header { border-bottom: 3px solid #6366f1; padding-bottom: 24px; margin-bottom: 32px; }
  .report-title { font-size: 1.6rem; font-weight: 800; margin: 0 0 6px; }
  .report-meta { color: #64748b; font-size: .85rem; }

  .verdict-banner { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
  .verdict-banner.low      { background: #ecfdf5; border: 1px solid #6ee7b7; }
  .verdict-banner.medium   { background: #fffbeb; border: 1px solid #fde68a; }
  .verdict-banner.high     { background: #fff7ed; border: 1px solid #fed7aa; }
  .verdict-banner.critical { background: #fef2f2; border: 1px solid #fecaca; }
  .verdict-score { font-size: 2.5rem; font-weight: 900; }
  .verdict-banner.low      .verdict-score { color: #059669; }
  .verdict-banner.medium   .verdict-score { color: #d97706; }
  .verdict-banner.high     .verdict-score { color: #ea580c; }
  .verdict-banner.critical .verdict-score { color: #dc2626; }
  .verdict-label { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
  .verdict-reco  { margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(0,0,0,.04); font-size: .83rem; }

  .section-title-main { font-size: 1rem; font-weight: 700; color: #334155; border-left: 4px solid #6366f1; padding-left: 10px; margin: 24px 0 12px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .meta-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .meta-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: .8rem; font-weight: 800; color: white; margin-bottom: 8px; }
  .badge-a { background: #6366f1; } .badge-b { background: #0ea5e9; }
  .meta-box h3 { margin: 0 0 4px; font-size: .95rem; }
  .meta-box .student { color: #64748b; font-size: .83rem; }

  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat-box { text-align: center; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; }
  .stat-box .sval { font-size: 1.8rem; font-weight: 800; }
  .stat-box .slbl { font-size: .75rem; color: #94a3b8; }
  .stat-box.add .sval { color: #059669; }
  .stat-box.rem .sval { color: #dc2626; }
  .stat-box.mod .sval { color: #d97706; }
  .stat-box.unch .sval { color: #475569; }

  .impact-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: .78rem; font-weight: 700; }
  .impact-badge.minor  { background: #ecfdf5; color: #065f46; }
  .impact-badge.medium { background: #fef3c7; color: #92400e; }
  .impact-badge.major  { background: #fee2e2; color: #991b1b; }

  .section { margin-bottom: 16px; }
  .section-title { font-weight: 700; font-size: .85rem; color: #334155; padding: 6px 10px; background: #f8fafc; border-radius: 6px 6px 0 0; border: 1px solid #e5e7eb; border-bottom: none; }
  .diff-block { font-family: 'Courier New', monospace; font-size: .78rem; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; overflow: hidden; }
  .line { padding: 2px 8px; white-space: pre-wrap; word-break: break-all; }
  .line.add  { background: #ecfdf5; color: #065f46; }
  .line.rem  { background: #fef2f2; color: #991b1b; }
  .line.unch { background: white; color: #475569; }

  .no-print { text-align: right; margin-bottom: 20px; }
  .print-btn { padding: 8px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: .9rem; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: .75rem; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="page">
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>
  </div>

  <div class="report-header">
    <div class="report-title">Rapport de comparaison de livrables</div>
    <div class="report-meta">📅 Généré le : ${now} &nbsp;|&nbsp; IDs : #${r.leftDeliverableId ?? '?'} vs #${r.rightDeliverableId ?? '?'}</div>
  </div>

  <div class="verdict-banner ${v.level}">
    <div class="verdict-score">${r.similarityPct}</div>
    <div>
      <div class="verdict-label">${v.label}</div>
      <div>${v.interpretation}</div>
      <div class="verdict-reco">💡 ${v.recommendation}</div>
    </div>
  </div>

  <div class="section-title-main">Livrables comparés</div>
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-badge badge-a">A</div>
      <h3>${this.esc(r.leftTitle)}</h3>
      <div class="student">👤 ${this.esc(r.leftStudentName ?? '—')}</div>
    </div>
    <div class="meta-box">
      <div class="meta-badge badge-b">B</div>
      <h3>${this.esc(r.rightTitle)}</h3>
      <div class="student">👤 ${this.esc(r.rightStudentName ?? '—')}</div>
    </div>
  </div>

  <div class="section-title-main">Statistiques</div>
  <div class="stats-row">
    <div class="stat-box add"><div class="sval">${r.totalAdded}</div><div class="slbl">Ajoutées</div></div>
    <div class="stat-box rem"><div class="sval">${r.totalRemoved}</div><div class="slbl">Supprimées</div></div>
    <div class="stat-box mod"><div class="sval">${r.totalModified}</div><div class="slbl">Modifiées</div></div>
    <div class="stat-box unch"><div class="sval">${r.totalUnchanged}</div><div class="slbl">Identiques</div></div>
  </div>
  <p>Impact : <span class="impact-badge ${r.impactLevel.toLowerCase()}">${r.impactLevel}</span>
     &nbsp; Sections : <strong>${r.totalSections}</strong>
     &nbsp; Score suggéré : <strong>${r.suggestedScore}/100</strong>
  </p>

  <div class="section-title-main">Différences par section</div>
  ${sectionsHtml || '<p style="color:#94a3b8">Aucune différence détectée.</p>'}

  <div class="footer">Rapport généré le ${now} — Outil de comparaison de livrables étudiants</div>
</div>
</body>
</html>`;

    this.triggerDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `rapport-${r.leftDeliverableId ?? 'A'}-vs-${r.rightDeliverableId ?? 'B'}.html`
    );
  }

  // ── Rapport TXT ───────────────────────────────────────────────────────────

  downloadReportTxt(): void {
    const r = this.result();
    if (!r) return;
    const v = this.verdictFor(r.similarityScore);
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      '  RAPPORT DE COMPARAISON DE LIVRABLES ÉTUDIANTS',
      `  Généré le : ${new Date().toLocaleString('fr-FR')}`,
      '═══════════════════════════════════════════════════════════',
      '',
      `VERDICT : ${v.label}`,
      `  Similarité    : ${r.similarityPct}`,
      `  Plagiat probab.: ${r.possiblePlagiarism ? 'OUI' : 'Non'}`,
      `  Score suggéré  : ${r.suggestedScore}/100`,
      `  Analyse        : ${v.interpretation}`,
      `  Recommandation : ${v.recommendation}`,
      '',
      `LIVRABLE A : ${r.leftTitle}`,
      `  Étudiant : ${r.leftStudentName ?? '—'}  |  ID : #${r.leftDeliverableId ?? '?'}`,
      '',
      `LIVRABLE B : ${r.rightTitle}`,
      `  Étudiant : ${r.rightStudentName ?? '—'}  |  ID : #${r.rightDeliverableId ?? '?'}`,
      '',
      '───────────────────────────────────────────────────────────',
      `  Lignes ajoutées   : ${r.totalAdded}`,
      `  Lignes supprimées : ${r.totalRemoved}`,
      `  Lignes modifiées  : ${r.totalModified}`,
      `  Lignes identiques : ${r.totalUnchanged}`,
      `  Niveau d'impact   : ${r.impactLevel}`,
      `  Sections          : ${r.totalSections}`,
      '───────────────────────────────────────────────────────────',
    ];

    (r.sections ?? []).forEach(s => {
      lines.push('', `── Section ${s.sectionIndex + 1} (ligne ${s.oldStartLine} → ${s.newStartLine}) : +${s.addedInSection} −${s.removedInSection} ~${s.modifiedInSection} ──`);
      s.lines.forEach(l => {
        if (l.type === 'ADDED')    lines.push(`  + ${l.content}`);
        if (l.type === 'REMOVED')  lines.push(`  - ${l.content}`);
        if (l.type === 'MODIFIED') { lines.push(`  - ${l.oldContent ?? ''}`); lines.push(`  + ${l.content}`); }
      });
    });

    lines.push('', '═══════════════════════════════════════════════════════════');
    this.triggerDownload(
      new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
      `rapport-${r.leftDeliverableId ?? 'A'}-vs-${r.rightDeliverableId ?? 'B'}.txt`
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private verdictFor(sim: number): PlagiarismVerdict {
    const pct = Math.round(sim * 100);
    if (sim >= 0.80) return {
      level: 'critical', label: 'Plagiat très probable', icon: 'gpp_bad', color: '#dc2626',
      interpretation: `Similarité de ${pct}% — Les deux livrables partagent la grande majorité de leur contenu.`,
      recommendation: `Convoquer les deux étudiants pour un entretien d'explication. Envisager une sanction disciplinaire.`,
    };
    if (sim >= 0.60) return {
      level: 'high', label: 'Similarité suspecte', icon: 'warning', color: '#ea580c',
      interpretation: `Similarité de ${pct}% — Niveau de ressemblance inhabituellement élevé.`,
      recommendation: 'Examiner les sections similaires. Demander aux étudiants de justifier les passages identiques.',
    };
    if (sim >= 0.35) return {
      level: 'medium', label: 'Similarité modérée', icon: 'info', color: '#d97706',
      interpretation: `Similarité de ${pct}% — Ressemblance notable, potentiellement due à une même source ou des consignes communes.`,
      recommendation: 'Analyser les différences pour évaluer si le travail est bien indépendant.',
    };
    return {
      level: 'low', label: 'Travaux indépendants', icon: 'verified', color: '#059669',
      interpretation: `Similarité de ${pct}% — Contenus suffisamment différents pour être des travaux indépendants.`,
      recommendation: 'Aucune action requise. Les travaux semblent avoir été réalisés de manière indépendante.',
    };
  }

  private esc(s: string): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  private isSupportedFile(fileUrl: string, fileType: string | null): boolean {
    const u = (fileUrl || '').toLowerCase();
    if (['.pdf','.docx','.txt','.md'].some(e => u.endsWith(e))) return true;
    const codeExts = ['.js','.ts','.jsx','.tsx','.java','.py','.c','.cpp',
                      '.h','.cs','.go','.rb','.php','.kt','.swift','.rs',
                      '.html','.css','.json','.xml','.yaml','.yml','.sql','.sh'];
    if (codeExts.some(e => u.endsWith(e))) return true;
    const t = (fileType || '').toLowerCase();
    return ['pdf','word','officedocument','text','javascript','typescript','python','json','xml']
      .some(k => t.includes(k));
  }

  private shortType(fileUrl: string, fileType: string | null): string {
    const u = (fileUrl || '').toLowerCase();
    const extMap: Record<string, string> = {
      '.pdf':'PDF', '.docx':'DOCX', '.txt':'TXT', '.md':'Markdown',
      '.js':'JS', '.ts':'TS', '.java':'Java', '.py':'Python',
      '.c':'C', '.cpp':'C++', '.cs':'C#', '.go':'Go', '.rb':'Ruby',
      '.php':'PHP', '.kt':'Kotlin', '.swift':'Swift', '.rs':'Rust',
      '.html':'HTML', '.css':'CSS', '.json':'JSON', '.xml':'XML',
      '.yaml':'YAML', '.yml':'YAML', '.sql':'SQL',
    };
    for (const [ext, label] of Object.entries(extMap)) {
      if (u.endsWith(ext)) return label;
    }
    const t = (fileType || '').toLowerCase();
    if (t.includes('pdf')) return 'PDF';
    if (t.includes('word') || t.includes('officedocument')) return 'DOCX';
    return fileType ?? 'fichier';
  }
}
