import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  DeliverableIntelligenceService,
  VersionDiff,
  KeywordChange,
  HighlightedLine,
} from '../../../services/deliverable-intelligence.service';

/**
 * GitHub-like diff viewer for two deliverable versions.
 * Call with [oldVersionId]/[newVersionId] OR [diff] if already loaded.
 *
 * Renders the *intelligent* layer of the response:
 *   - keyword change badges (HIGH, FEATURE_UPDATE, MEDIUM)
 *   - regression reason banner
 *   - highlighted lines only (trivial edits filtered out by the backend)
 *     coloured RED / GREEN / YELLOW with a "critical" star when a keyword matches.
 */
@Component({
  selector: 'app-version-diff',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="version-diff">
      @if (loading()) {
        <div class="state"><mat-icon class="spin">sync</mat-icon> Comparaison en cours...</div>
      } @else if (error()) {
        <div class="state error">
          <mat-icon>error_outline</mat-icon> {{ error() }}
        </div>
      } @else if (diffData(); as d) {

        <!-- Impact + critical badges -->
        <div class="badges">
          <span class="impact"
                [class.minor]="d.impactLevel === 'MINOR'"
                [class.medium]="d.impactLevel === 'MEDIUM'"
                [class.major]="d.impactLevel === 'MAJOR'">
            <mat-icon>flag</mat-icon> Impact: {{ d.impactLevel }}
          </span>

          @if (d.criticalChangesOnly) {
            <span class="critical-flag" matTooltip="Au moins une modification touche un mot-clé critique">
              <mat-icon>star</mat-icon> Changement critique
            </span>
          }

          @if (d.regressionDetected) {
            <span class="regression"
                  [matTooltip]="d.regressionReason ?? 'Régression détectée'">
              <mat-icon>warning</mat-icon>
              Régression
              @if (d.regressionReason) { — {{ d.regressionReason }} }
            </span>
          }

          @for (kw of d.importantKeywords; track kw) {
            <span class="keyword"><mat-icon>vpn_key</mat-icon> {{ kw }}</span>
          }
        </div>

        <!-- Keyword change report -->
        @if (d.keywordChanges?.length) {
          <div class="kw-changes">
            <div class="kw-title">
              <mat-icon>auto_awesome</mat-icon> Détection intelligente de mots-clés
            </div>
            <div class="kw-grid">
              @for (k of d.keywordChanges; track k.keyword + k.type) {
                <div class="kw-card"
                     [class.high]="k.riskLevel === 'HIGH'"
                     [class.medium]="k.riskLevel === 'MEDIUM'"
                     [class.feature]="k.riskLevel === 'FEATURE_UPDATE'">
                  <div class="kw-head">
                    <mat-icon>{{ kwIcon(k) }}</mat-icon>
                    <b>{{ k.keyword }}</b>
                  </div>
                  <div class="kw-meta">
                    {{ kwTypeLabel(k.type) }} · <span class="risk">{{ kwRiskLabel(k.riskLevel) }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="counts">
          <span class="add"><mat-icon>add</mat-icon> {{ d.addedCount }} ajoutées</span>
          <span class="rem"><mat-icon>remove</mat-icon> {{ d.removedCount }} supprimées</span>
          <span class="chg"><mat-icon>edit</mat-icon> {{ d.changedCount }} modifiées</span>
        </div>

        <!-- Intelligent highlighting (trivial edits already filtered backend-side) -->
        @if (d.highlightedLines?.length) {
          <div class="rows highlighted">
            @for (line of d.highlightedLines; track $index) {
              <div class="row"
                   [class.add]="line.color === 'GREEN'"
                   [class.del]="line.color === 'RED'"
                   [class.chg]="line.color === 'YELLOW'"
                   [class.critical]="line.critical">
                <span class="marker">{{ markerFor(line) }}</span>
                <span class="text">{{ line.text }}</span>
                @if (line.critical) {
                  <span class="star"
                        [matTooltip]="'Mots-clés: ' + line.matchedKeywords.join(', ')">
                    <mat-icon>star</mat-icon>
                  </span>
                }
              </div>
            }
          </div>
        } @else if (isEmpty(d)) {
          <div class="state"><mat-icon>check_circle</mat-icon> Aucun changement détecté.</div>
        } @else {
          <div class="state">
            <mat-icon>filter_alt</mat-icon>
            Modifications mineures uniquement (ponctuation / espaces).
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .version-diff { font-family: 'Inter', sans-serif; }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .badges span {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .impact.minor  { background: #ecfdf5; color: #065f46; }
    .impact.medium { background: #fef3c7; color: #92400e; }
    .impact.major  { background: #fee2e2; color: #991b1b; }
    .critical-flag { background: #fff7ed; color: #c2410c; }
    .regression    { background: #fee2e2; color: #991b1b; }
    .keyword       { background: #ede9fe; color: #5b21b6; }

    .kw-changes {
      margin: 10px 0 14px; padding: 10px 12px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
    }
    .kw-title {
      display: flex; align-items: center; gap: 6px;
      color: #334155; font-size: 0.85rem; font-weight: 700; margin-bottom: 8px;
      mat-icon { color: #7c3aed; font-size: 18px; width: 18px; height: 18px; }
    }
    .kw-grid {
      display: grid; gap: 8px;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
    .kw-card {
      padding: 8px 10px; border-radius: 8px; border: 1px solid #e5e7eb;
      background: white;
      .kw-head { display: flex; align-items: center; gap: 6px; font-size: 0.88rem;
        mat-icon { font-size: 16px; width: 16px; height: 16px; } }
      .kw-meta { font-size: 0.72rem; color: #6b7280; margin-top: 2px;
        .risk { font-weight: 700; } }
      &.high   { border-color: #fca5a5; background: #fef2f2;
                  .kw-head mat-icon { color: #dc2626; } .risk { color: #b91c1c; } }
      &.medium { border-color: #fcd34d; background: #fffbeb;
                  .kw-head mat-icon { color: #d97706; } .risk { color: #92400e; } }
      &.feature{ border-color: #86efac; background: #ecfdf5;
                  .kw-head mat-icon { color: #16a34a; } .risk { color: #065f46; } }
    }

    .counts { display: flex; gap: 16px; font-size: 0.85rem; color: #374151; margin: 8px 0 12px; }
    .counts span { display: inline-flex; align-items: center; gap: 4px; }
    .counts .add mat-icon { color: #059669; }
    .counts .rem mat-icon { color: #dc2626; }
    .counts .chg mat-icon { color: #2563eb; }

    .rows {
      border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;
      font-family: 'Fira Code', monospace; font-size: 0.82rem;
    }
    .row {
      display: flex; align-items: flex-start; padding: 4px 8px;
      border-left: 3px solid transparent;
    }
    .row .marker { width: 20px; font-weight: bold; }
    .row .text   { white-space: pre-wrap; flex: 1; }
    .row .star { color: #f59e0b; margin-left: 6px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; } }
    .row.add { background: #ecfdf5; color: #065f46; }
    .row.del { background: #fef2f2; color: #991b1b; }
    .row.chg { background: #fffbeb; color: #92400e; }
    .row.critical { border-left-color: #f59e0b; font-weight: 600; }

    .state {
      display: flex; align-items: center; gap: 8px; padding: 12px; color: #6b7280;
      .spin { animation: spin 1s linear infinite; }
      &.error { color: #b91c1c; }
    }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `]
})
export class VersionDiffComponent implements OnChanges {
  @Input() oldVersionId?: number;
  @Input() newVersionId?: number;
  @Input() diff?: VersionDiff; // pre-loaded

  private service = inject(DeliverableIntelligenceService);

  diffData = signal<VersionDiff | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnChanges(): void {
    if (this.diff) { this.diffData.set(this.diff); return; }
    if (!this.oldVersionId || !this.newVersionId) return;
    this.loading.set(true);
    this.error.set(null);
    this.service.compareVersions(this.oldVersionId, this.newVersionId).subscribe({
      next: (d) => { this.diffData.set(d); this.loading.set(false); },
      error: () => { this.error.set('Erreur de comparaison.'); this.loading.set(false); },
    });
  }

  isEmpty(d: VersionDiff): boolean {
    return d.addedCount === 0 && d.removedCount === 0 && d.changedCount === 0;
  }

  markerFor(line: HighlightedLine): string {
    switch (line.kind) {
      case 'ADDED':   return '+';
      case 'REMOVED': return '−';
      case 'CHANGED': return '~';
    }
  }

  kwIcon(k: KeywordChange): string {
    switch (k.type) {
      case 'ADDED':    return 'add_circle';
      case 'REMOVED':  return 'remove_circle';
      case 'MODIFIED': return 'edit';
    }
  }

  kwTypeLabel(t: KeywordChange['type']): string {
    return { ADDED: 'Ajouté', REMOVED: 'Supprimé', MODIFIED: 'Modifié' }[t];
  }

  kwRiskLabel(r: KeywordChange['riskLevel']): string {
    return { HIGH: 'HAUT RISQUE', MEDIUM: 'Risque moyen',
             FEATURE_UPDATE: 'Nouvelle fonctionnalité', LOW: 'Faible' }[r];
  }
}
