import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { StudentDeliverable, StudentDeliverableService } from '../../../services/student-deliverable.service';
import { AuthService } from '../../../auth/auth.service';
import { TutorEvaluationDialogComponent } from './tutor-evaluation-dialog.component';

type FilterStatus = 'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatBadgeModule,
    MatProgressSpinnerModule, MatDialogModule, MatTooltipModule,
    MatChipsModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page">

      <!-- ── Header ────────────────────────────────────────────────── -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>manage_accounts</mat-icon>
          </div>
          <div>
            <h1>Tableau de bord — Tuteur</h1>
            <p class="subtitle">{{ filtered().length }} livrable(s) affiché(s)</p>
          </div>
        </div>
        <button mat-icon-button (click)="load()" matTooltip="Actualiser" class="refresh-btn">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- ── Stats cards ────────────────────────────────────────────── -->
      <div class="stats-row">
        <div class="stat-card stat-total">
          <div class="stat-icon"><mat-icon>description</mat-icon></div>
          <div class="stat-body">
            <span class="stat-num">{{ all().length }}</span>
            <span class="stat-lbl">Total</span>
          </div>
        </div>
        <div class="stat-card stat-pending">
          <div class="stat-icon"><mat-icon>pending_actions</mat-icon></div>
          <div class="stat-body">
            <span class="stat-num">{{ count('SUBMITTED') }}</span>
            <span class="stat-lbl">En attente</span>
          </div>
        </div>
        <div class="stat-card stat-review">
          <div class="stat-icon"><mat-icon>hourglass_empty</mat-icon></div>
          <div class="stat-body">
            <span class="stat-num">{{ count('UNDER_REVIEW') }}</span>
            <span class="stat-lbl">En révision</span>
          </div>
        </div>
        <div class="stat-card stat-accepted">
          <div class="stat-icon"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-body">
            <span class="stat-num">{{ count('ACCEPTED') }}</span>
            <span class="stat-lbl">Acceptés</span>
          </div>
        </div>
        <div class="stat-card stat-rejected">
          <div class="stat-icon"><mat-icon>cancel</mat-icon></div>
          <div class="stat-body">
            <span class="stat-num">{{ count('REJECTED') }}</span>
            <span class="stat-lbl">Rejetés</span>
          </div>
        </div>
      </div>

      <!-- ── Filter pills ───────────────────────────────────────────── -->
      <div class="filter-bar">
        <mat-icon class="filter-icon">filter_list</mat-icon>
        <div class="filter-pills">
          @for (f of filters; track f.value) {
            <button class="pill" [class.active]="activeFilter() === f.value"
                    (click)="activeFilter.set(f.value)">
              <mat-icon>{{ f.icon }}</mat-icon>
              {{ f.label }}
              @if (f.value !== 'ALL') {
                <span class="pill-count">{{ count(f.value) }}</span>
              }
            </button>
          }
        </div>

        <!-- Search -->
        <div class="search-wrap">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [ngModel]="searchText()"
                 (ngModelChange)="searchText.set($event)"
                 placeholder="Rechercher un étudiant ou livrable…" />
          @if (searchText()) {
            <button class="search-clear" (click)="searchText.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="state-center">
          <mat-progress-spinner diameter="40" mode="indeterminate"/>
          <span>Chargement des livrables…</span>
        </div>
      }

      <!-- ── Empty ──────────────────────────────────────────────────── -->
      @else if (filtered().length === 0) {
        <div class="empty-state">
          <mat-icon>inbox</mat-icon>
          <p>Aucun livrable{{ activeFilter() !== 'ALL' ? ' avec ce statut' : '' }}.</p>
          @if (activeFilter() !== 'ALL') {
            <button mat-stroked-button (click)="activeFilter.set('ALL')">Voir tous</button>
          }
        </div>
      }

      <!-- ── Grid ───────────────────────────────────────────────────── -->
      @else {
        <div class="grid">
          @for (d of filtered(); track d.id) {
            <div class="d-card" [class.card-accepted]="d.tutorDecision === 'ACCEPTED'"
                 [class.card-rejected]="d.tutorDecision === 'REJECTED'"
                 [class.card-pending]="!d.tutorDecision">

              <!-- Card top -->
              <div class="card-top">
                <div class="avatar" [style.background]="avatarColor(d.studentName ?? '')">
                  {{ initials(d.studentName ?? '') }}
                </div>
                <div class="card-meta">
                  <span class="student-name">{{ d.studentName ?? '—' }}</span>
                  <span class="submitted-date">
                    <mat-icon class="icon-xs">schedule</mat-icon>
                    {{ d.submittedAt | date:'dd/MM/yyyy' }}
                  </span>
                </div>
                <span [class]="'status-chip ' + statusChip(d.status)">
                  <mat-icon class="icon-xs">{{ statusIcon(d.status) }}</mat-icon>
                  {{ statusLabel(d.status) }}
                </span>
              </div>

              <!-- Title + version -->
              <div class="card-title-row">
                <h3 class="card-title">{{ d.title }}</h3>
                <span class="version-badge">v{{ d.versionNumber }}</span>
              </div>

              <!-- Description -->
              @if (d.description) {
                <p class="card-desc">{{ d.description | slice:0:120 }}{{ d.description.length > 120 ? '…' : '' }}</p>
              }

              <!-- Badges row -->
              <div class="badges-row">
                <span [class]="'scan-badge scan-' + (d.virusScanStatus ?? 'pending')"
                      [matTooltip]="d.virusName ? 'Menace : ' + d.virusName : scanLabel(d.virusScanStatus)">
                  <mat-icon class="icon-xs">{{ scanIcon(d.virusScanStatus) }}</mat-icon>
                  {{ scanLabel(d.virusScanStatus) }}
                </span>

                @if (d.score !== null && d.score !== undefined) {
                  <span class="score-badge">
                    <mat-icon class="icon-xs">grade</mat-icon>
                    {{ d.score }}/100
                  </span>
                }

                @if (d.tutorDecision) {
                  <span [class]="'decision-badge ' + (d.tutorDecision === 'ACCEPTED' ? 'dec-ok' : 'dec-ko')">
                    <mat-icon class="icon-xs">{{ d.tutorDecision === 'ACCEPTED' ? 'check_circle' : 'cancel' }}</mat-icon>
                    {{ d.tutorDecision === 'ACCEPTED' ? 'Accepté' : 'Rejeté' }}
                  </span>
                }
              </div>

              <!-- Action -->
              <div class="card-action">
                <button mat-raised-button [color]="d.tutorDecision ? 'accent' : 'primary'"
                        (click)="openEvaluation(d)">
                  <mat-icon>{{ d.tutorDecision ? 'visibility' : 'rate_review' }}</mat-icon>
                  {{ d.tutorDecision ? "Voir l'évaluation" : 'Évaluer' }}
                </button>
              </div>

            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────────────────── */
    .page { padding: 28px; max-width: 1280px; margin: 0 auto; font-family: 'Inter', sans-serif; }

    /* ── Header ──────────────────────────────────────────────────────── */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .header-icon {
      width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(102,126,234,.4);
    }
    .header-icon mat-icon { color: #fff; font-size: 28px; width: 28px; height: 28px; }
    h1 { margin: 0; font-size: 22px; font-weight: 800; color: #1e293b; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }
    .refresh-btn { color: #64748b; }

    /* ── Stats ───────────────────────────────────────────────────────── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 14px; margin-bottom: 24px;
    }
    .stat-card {
      border-radius: 14px; padding: 16px; display: flex;
      align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .stat-body { display: flex; flex-direction: column; }
    .stat-num { font-size: 26px; font-weight: 800; line-height: 1; }
    .stat-lbl { font-size: 12px; font-weight: 500; margin-top: 2px; opacity: .7; }

    .stat-total    { background: #f1f5f9; color: #334155;
      .stat-icon { background: #e2e8f0; mat-icon { color: #475569; } } }
    .stat-pending  { background: #fef3c7; color: #92400e;
      .stat-icon { background: #fde68a; mat-icon { color: #b45309; } } }
    .stat-review   { background: #ede9fe; color: #4c1d95;
      .stat-icon { background: #ddd6fe; mat-icon { color: #7c3aed; } } }
    .stat-accepted { background: #d1fae5; color: #065f46;
      .stat-icon { background: #a7f3d0; mat-icon { color: #059669; } } }
    .stat-rejected { background: #fee2e2; color: #991b1b;
      .stat-icon { background: #fecaca; mat-icon { color: #dc2626; } } }

    /* ── Filter bar ──────────────────────────────────────────────────── */
    .filter-bar {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .filter-icon { color: #94a3b8; flex-shrink: 0; }
    .filter-pills { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
    .pill {
      display: inline-flex; align-items: center; gap: 5px;
      border: 1.5px solid #e2e8f0; border-radius: 20px;
      padding: 6px 14px; font-size: 13px; cursor: pointer;
      background: #fff; color: #475569; transition: all .18s;
      font-family: inherit; font-weight: 500;
    }
    .pill mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .pill:hover { border-color: #667eea; color: #667eea; background: #f0f0ff; }
    .pill.active { background: #667eea; color: #fff; border-color: #667eea; font-weight: 600; }
    .pill-count {
      background: rgba(255,255,255,.3); border-radius: 10px;
      padding: 0 7px; font-size: 11px; font-weight: 700;
    }
    .pill:not(.active) .pill-count { background: #f1f5f9; color: #64748b; }

    .search-wrap {
      display: flex; align-items: center; gap: 6px;
      border: 1.5px solid #e2e8f0; border-radius: 20px;
      padding: 6px 14px; background: #fff; min-width: 220px;
    }
    .search-icon { color: #94a3b8; font-size: 18px; width: 18px; height: 18px; }
    .search-input {
      border: none; outline: none; font-size: 13px; color: #334155;
      background: transparent; flex: 1;
    }
    .search-clear {
      background: none; border: none; cursor: pointer; padding: 0;
      display: flex; align-items: center; color: #94a3b8;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ── Grid ────────────────────────────────────────────────────────── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 18px;
    }

    /* ── Card ────────────────────────────────────────────────────────── */
    .d-card {
      border-radius: 16px; padding: 20px; background: #fff;
      border: 1.5px solid #e2e8f0; display: flex; flex-direction: column; gap: 12px;
      transition: box-shadow .2s, transform .15s;
    }
    .d-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,.10); transform: translateY(-2px); }
    .card-accepted { border-left: 4px solid #16a34a; }
    .card-rejected { border-left: 4px solid #dc2626; }
    .card-pending  { border-left: 4px solid #f59e0b; }

    .card-top { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; font-weight: 700;
    }
    .card-meta { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .student-name { font-size: 14px; font-weight: 600; color: #1e293b; }
    .submitted-date {
      font-size: 11px; color: #94a3b8;
      display: flex; align-items: center; gap: 3px;
    }

    .card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .card-title { margin: 0; font-size: 15px; font-weight: 700; color: #1e293b; }
    .version-badge {
      background: #e0e7ff; color: #3730a3;
      border-radius: 8px; padding: 2px 8px; font-size: 11px; font-weight: 700;
      white-space: nowrap; flex-shrink: 0;
    }
    .card-desc { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }

    /* ── Badges ──────────────────────────────────────────────────────── */
    .badges-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .icon-xs { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; }

    .status-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .chip-sub { background: #dbeafe; color: #1e40af; }
    .chip-rev { background: #ede9fe; color: #5b21b6; }
    .chip-acc { background: #d1fae5; color: #065f46; }
    .chip-rej { background: #fee2e2; color: #991b1b; }

    .scan-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
    }
    .scan-clean      { background: #d1fae5; color: #065f46; }
    .scan-unverified { background: #fef3c7; color: #92400e; }
    .scan-infected   { background: #fee2e2; color: #991b1b; }
    .scan-pending    { background: #e2e8f0; color: #475569; }

    .score-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;
      background: #dbeafe; color: #1e40af;
    }
    .decision-badge {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700;
    }
    .dec-ok { background: #d1fae5; color: #065f46; }
    .dec-ko { background: #fee2e2; color: #991b1b; }

    .card-action { margin-top: auto; padding-top: 4px; border-top: 1px solid #f1f5f9; }
    .card-action button { width: 100%; }

    /* ── States ──────────────────────────────────────────────────────── */
    .state-center {
      display: flex; flex-direction: column; align-items: center;
      gap: 14px; padding: 64px 16px; color: #64748b;
    }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 64px 16px; gap: 14px; color: #94a3b8;
    }
    .empty-state mat-icon { font-size: 60px; width: 60px; height: 60px; }
    .empty-state p { margin: 0; font-size: 15px; }
  `],
})
export class TutorDashboardComponent implements OnInit {

  private readonly svc    = inject(StudentDeliverableService);
  private readonly auth   = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  all     = signal<StudentDeliverable[]>([]);
  loading = signal(true);

  activeFilter = signal<FilterStatus>('ALL');
  searchText = signal('');

  filters: { value: FilterStatus; label: string; icon: string }[] = [
    { value: 'ALL',          label: 'Tous',         icon: 'grid_view'       },
    { value: 'SUBMITTED',    label: 'En attente',   icon: 'pending_actions' },
    { value: 'UNDER_REVIEW', label: 'En révision',  icon: 'hourglass_empty' },
    { value: 'ACCEPTED',     label: 'Acceptés',     icon: 'check_circle'    },
    { value: 'REJECTED',     label: 'Rejetés',      icon: 'cancel'          },
  ];

  filtered = computed(() => {
    const f = this.activeFilter();
    const q = this.searchText().toLowerCase().trim();
    return this.all().filter(d => {
      if (f !== 'ALL' && d.status !== f) return false;
      if (q) {
        const hay = `${d.title} ${d.studentName} ${d.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  count(status: string): number {
    return this.all().filter(d => d.status === status).length;
  }

  ngOnInit() { this.load(); }

  load() {
    const user = this.auth.currentUser();
    if (!user?.id) { this.loading.set(false); return; }
    this.loading.set(true);
    this.svc.getByTutor(user.id).subscribe({
      next: data => { this.all.set(data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  openEvaluation(d: StudentDeliverable) {
    const ref = this.dialog.open(TutorEvaluationDialogComponent, {
      width: '95vw', maxWidth: '1140px',
      data: { deliverable: d, allDeliverables: this.all() },
      panelClass: 'eval-dialog-panel',
    });
    ref.afterClosed().subscribe(updated => { if (updated) this.load(); });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
  }

  avatarColor(name: string): string {
    const palette = ['#6366f1','#0ea5e9','#14b8a6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#10b981'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  statusChip(s: string): string {
    return ({ SUBMITTED:'chip-sub', UNDER_REVIEW:'chip-rev', ACCEPTED:'chip-acc', REJECTED:'chip-rej' } as Record<string,string>)[s] ?? 'chip-sub';
  }

  statusLabel(s: string): string {
    return ({ SUBMITTED:'Soumis', UNDER_REVIEW:'En révision', ACCEPTED:'Accepté', REJECTED:'Rejeté' } as Record<string,string>)[s] ?? s;
  }

  statusIcon(s: string): string {
    return ({ SUBMITTED:'send', UNDER_REVIEW:'hourglass_empty', ACCEPTED:'check_circle', REJECTED:'cancel' } as Record<string,string>)[s] ?? 'help';
  }

  scanIcon(status: string | null): string {
    return ({ clean:'verified_user', unverified:'help_outline', infected:'gpp_bad', pending:'hourglass_empty' } as Record<string,string>)[status ?? 'pending'] ?? 'hourglass_empty';
  }

  scanLabel(status: string | null): string {
    return ({ clean:'Sain', unverified:'Non vérifié', infected:'Infecté', pending:'En attente' } as Record<string,string>)[status ?? 'pending'] ?? 'En attente';
  }
}
