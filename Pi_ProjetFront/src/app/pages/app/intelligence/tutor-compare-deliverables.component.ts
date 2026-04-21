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

import { DeliverableService } from '../../../services/Deliverable.service';
import {
  DeliverableComparison,
  DeliverableIntelligenceService,
} from '../../../services/deliverable-intelligence.service';
import { VersionDiffComponent } from './version-diff.component';

interface DeliverableOption {
  id: number;
  title: string;
  studentName: string;
  fileType: string;
  fileUrl: string | null;
}

/**
 * Tutor-only screen.
 * Picks two deliverables (PDF / DOCX), asks the backend to extract the
 * file content of each one and run the intelligence diff + similarity
 * pipeline. Renders the result with the existing <app-version-diff>.
 */
@Component({
  selector: 'app-tutor-compare-deliverables',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
    VersionDiffComponent,
  ],
  template: `
    <div class="tutor-compare">

      <header class="header">
        <div class="title">
          <mat-icon>compare_arrows</mat-icon>
          <h1>Comparer deux livrables d'étudiants</h1>
        </div>
        <p class="subtitle">
          Sélectionnez deux livrables (PDF ou DOCX). L'analyse compare le
          contenu réel des fichiers — pas seulement les descriptions —
          et signale une similarité élevée comme un risque de plagiat.
        </p>
      </header>

      @if (loadingList()) {
        <div class="state"><mat-progress-spinner diameter="32" mode="indeterminate" /> Chargement des livrables...</div>
      } @else if (loadError()) {
        <div class="state error"><mat-icon>error</mat-icon> {{ loadError() }}</div>
      } @else {
        <mat-card class="picker">
          <div class="picker-grid">

            <mat-form-field appearance="outline">
              <mat-label>Livrable A (étudiant 1)</mat-label>
              <mat-select [ngModel]="leftId()" (ngModelChange)="leftId.set($event)">
                @for (d of options(); track d.id) {
                  <mat-option [value]="d.id" [disabled]="d.id === rightId()">
                    <span class="opt-title">{{ d.title }}</span>
                    <span class="opt-meta">— {{ d.studentName }} ({{ d.fileType }})</span>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="vs"><mat-icon>swap_horiz</mat-icon></div>

            <mat-form-field appearance="outline">
              <mat-label>Livrable B (étudiant 2)</mat-label>
              <mat-select [ngModel]="rightId()" (ngModelChange)="rightId.set($event)">
                @for (d of options(); track d.id) {
                  <mat-option [value]="d.id" [disabled]="d.id === leftId()">
                    <span class="opt-title">{{ d.title }}</span>
                    <span class="opt-meta">— {{ d.studentName }} ({{ d.fileType }})</span>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="actions">
            <button mat-flat-button color="primary"
                    [disabled]="!canCompare() || comparing()"
                    (click)="runComparison()">
              @if (comparing()) {
                <mat-progress-spinner diameter="18" mode="indeterminate" />
                Analyse en cours...
              } @else {
                <mat-icon>analytics</mat-icon> Comparer
              }
            </button>
          </div>
        </mat-card>
      }

      @if (compareError()) {
        <div class="state error"><mat-icon>error</mat-icon> {{ compareError() }}</div>
      }

      @if (result(); as r) {
        <mat-card class="result">

          <!-- Similarity gauge -->
          <div class="similarity"
               [class.high]="r.possiblePlagiarism"
               [class.medium]="!r.possiblePlagiarism && r.similarity >= 0.5"
               [class.low]="r.similarity < 0.5">
            <div class="sim-head">
              <mat-icon>{{ r.possiblePlagiarism ? 'warning' : 'verified' }}</mat-icon>
              <span class="sim-label">
                Similarité du contenu :
                <b>{{ (r.similarity * 100) | number:'1.0-0' }}%</b>
              </span>
              @if (r.possiblePlagiarism) {
                <span class="badge plag">Plagiat probable</span>
              }
            </div>
            <div class="sim-bar"><div class="sim-fill" [style.width.%]="r.similarity * 100"></div></div>
          </div>

          <!-- Sides meta -->
          <div class="sides">
            <div class="side">
              <div class="side-head"><mat-icon>person</mat-icon> {{ r.left.submittedByName ?? '—' }}</div>
              <div class="side-body">
                <div class="t">{{ r.left.title }}</div>
                <div class="m">
                  {{ r.left.fileType ?? 'fichier' }} · {{ r.left.textLength }} caractères
                  @if (!r.left.extracted) { <span class="warn">— extraction impossible</span> }
                </div>
              </div>
            </div>
            <div class="side">
              <div class="side-head"><mat-icon>person</mat-icon> {{ r.right.submittedByName ?? '—' }}</div>
              <div class="side-body">
                <div class="t">{{ r.right.title }}</div>
                <div class="m">
                  {{ r.right.fileType ?? 'fichier' }} · {{ r.right.textLength }} caractères
                  @if (!r.right.extracted) { <span class="warn">— extraction impossible</span> }
                </div>
              </div>
            </div>
          </div>

          <!-- Diff (re-uses existing version-diff component) -->
          <h3 class="diff-title"><mat-icon>difference</mat-icon> Différences détectées</h3>
          <app-version-diff [diff]="r.diff"></app-version-diff>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .tutor-compare { padding: 24px; max-width: 1100px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    .header .title { display: flex; align-items: center; gap: 10px; }
    .header .title mat-icon { color: #6366f1; font-size: 28px; width: 28px; height: 28px; }
    .header h1 { font-size: 1.4rem; font-weight: 700; margin: 0; color: #1e293b; }
    .header .subtitle { color: #64748b; margin: 6px 0 18px 38px; font-size: 0.9rem; }

    .picker { padding: 18px; margin-bottom: 18px; }
    .picker-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
    }
    .vs { color: #94a3b8; }
    .vs mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .actions { margin-top: 12px; display: flex; justify-content: flex-end; }
    .opt-title { font-weight: 600; }
    .opt-meta { color: #64748b; font-size: 0.85rem; }

    .state {
      display: flex; align-items: center; gap: 10px;
      padding: 16px; color: #475569; justify-content: center;
      &.error { color: #b91c1c; }
    }

    .result { padding: 18px; }
    .similarity {
      padding: 14px 16px; border-radius: 12px; margin-bottom: 16px;
      &.low    { background: #ecfdf5; }
      &.medium { background: #fffbeb; }
      &.high   { background: #fef2f2; }
    }
    .sim-head { display: flex; align-items: center; gap: 10px; }
    .sim-head mat-icon { color: inherit; }
    .similarity.high mat-icon  { color: #b91c1c; }
    .similarity.medium mat-icon{ color: #b45309; }
    .similarity.low mat-icon   { color: #047857; }
    .sim-label b { font-size: 1.05rem; }
    .badge.plag {
      margin-left: auto;
      background: #b91c1c; color: white; padding: 3px 10px;
      border-radius: 999px; font-size: 0.78rem; font-weight: 700;
    }
    .sim-bar { margin-top: 8px; height: 8px; border-radius: 999px; background: rgba(0,0,0,0.07); overflow: hidden; }
    .sim-fill {
      height: 100%; transition: width .3s ease;
      background: linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #ef4444 100%);
    }

    .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .side { padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
    .side-head { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #334155; }
    .side-body .t { font-size: 0.95rem; margin-top: 4px; }
    .side-body .m { color: #64748b; font-size: 0.82rem; }
    .side-body .warn { color: #b91c1c; font-weight: 600; }

    .diff-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 1rem; color: #334155; margin: 18px 0 8px;
    }
  `],
})
export class TutorCompareDeliverablesComponent implements OnInit {

  private deliverableService = inject(DeliverableService);
  private intelligence       = inject(DeliverableIntelligenceService);

  options       = signal<DeliverableOption[]>([]);
  loadingList   = signal(true);
  loadError     = signal<string | null>(null);

  leftId  = signal<number | null>(null);
  rightId = signal<number | null>(null);

  comparing     = signal(false);
  compareError  = signal<string | null>(null);
  result        = signal<DeliverableComparison | null>(null);

  canCompare = computed(() => {
    const l = this.leftId();
    const r = this.rightId();
    return l != null && r != null && l !== r;
  });

  ngOnInit(): void {
    this.deliverableService.getAll().subscribe({
      next: (list: any[]) => {
        const filtered: DeliverableOption[] = list
          .filter(d => d.fileUrl && this.isPdfOrDocx(d.fileUrl, d.fileType))
          .map(d => ({
            id: d.id,
            title: d.title ?? `Livrable #${d.id}`,
            studentName: d.submittedByName ?? '—',
            fileType: this.shortType(d.fileUrl, d.fileType),
            fileUrl: d.fileUrl,
          }));
        this.options.set(filtered);
        this.loadingList.set(false);
        if (filtered.length < 2) {
          this.loadError.set('Pas assez de livrables PDF/DOCX disponibles pour comparer.');
        }
      },
      error: () => {
        this.loadingList.set(false);
        this.loadError.set('Erreur lors du chargement des livrables.');
      },
    });
  }

  runComparison(): void {
    if (!this.canCompare()) return;
    this.comparing.set(true);
    this.compareError.set(null);
    this.result.set(null);

    this.intelligence.compareDeliverables(this.leftId()!, this.rightId()!).subscribe({
      next: (r) => {
        this.result.set(r);
        this.comparing.set(false);
        if (!r.left.extracted || !r.right.extracted) {
          this.compareError.set(
            "L'extraction de texte a échoué pour au moins un fichier. Vérifiez que les deux livrables sont bien des PDF/DOCX valides."
          );
        }
      },
      error: (err) => {
        this.comparing.set(false);
        this.compareError.set(err?.error?.message || 'Erreur lors de la comparaison.');
      },
    });
  }

  private isPdfOrDocx(fileUrl: string, fileType: string | null): boolean {
    const u = (fileUrl || '').toLowerCase();
    if (u.endsWith('.pdf') || u.endsWith('.docx')) return true;
    const t = (fileType || '').toLowerCase();
    return t.includes('pdf') || t.includes('word') || t.includes('officedocument');
  }

  private shortType(fileUrl: string, fileType: string | null): string {
    const u = (fileUrl || '').toLowerCase();
    if (u.endsWith('.pdf'))  return 'PDF';
    if (u.endsWith('.docx')) return 'DOCX';
    return (fileType || '').includes('pdf') ? 'PDF' : 'DOCX';
  }
}
