import {
  Component, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { StudentDeliverable, StudentDeliverableService } from '../../../services/student-deliverable.service';
import {
  TutorEvaluationService, PaginatedDiffResult, DetailedDiffLine
} from '../../../services/tutor-evaluation.service';
import { AuthService } from '../../../auth/auth.service';

export interface TutorEvaluationDialogData {
  deliverable: StudentDeliverable;
  allDeliverables: StudentDeliverable[];
}

@Component({
  selector: 'app-tutor-evaluation-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatProgressSpinnerModule, MatDividerModule,
    MatTabsModule, MatTooltipModule, MatSnackBarModule, MatChipsModule,
  ],
  template: `
    <div class="dialog-wrapper">
      <!-- ── Header ── -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="avatar">{{ initials(deliverable.studentName) }}</div>
          <div>
            <div class="header-title">{{ deliverable.title }}</div>
            <div class="header-sub">
              {{ deliverable.studentName }} &nbsp;·&nbsp; v{{ deliverable.versionNumber }}
              &nbsp;·&nbsp; {{ deliverable.submittedAt | date:'mediumDate' }}
            </div>
          </div>
        </div>
        <span [class]="'status-chip ' + chipClass(deliverable.status)">{{ deliverable.status }}</span>
      </div>

      <mat-dialog-content class="dialog-body">
        <mat-tab-group animationDuration="150ms">

          <!-- ── Tab 1: Info ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">info</mat-icon> Info
            </ng-template>
            <div class="tab-pad info-tab">

              <!-- Profile card -->
              <div class="profile-card">
                <div class="profile-avatar">{{ initials(deliverable.studentName) }}</div>
                <div class="profile-body">
                  <div class="profile-name">{{ deliverable.studentName }}</div>
                  <div class="profile-email">
                    <mat-icon class="meta-icon">mail</mat-icon>
                    {{ deliverable.studentEmail ?? '—' }}
                  </div>
                  <div class="profile-tutor">
                    <mat-icon class="meta-icon">person_pin</mat-icon>
                    Tuteur : {{ deliverable.tutorName }}
                  </div>
                </div>
                <div class="profile-badges">
                  <span [class]="'status-pill ' + chipClass(deliverable.status)">{{ deliverable.status }}</span>
                  <span class="version-pill">v{{ deliverable.versionNumber }}</span>
                </div>
              </div>

              <!-- Meta rows -->
              <div class="meta-section">
                <div class="meta-row">
                  <mat-icon class="meta-icon">folder</mat-icon>
                  <span class="meta-key">Projet</span>
                  <span class="meta-val">{{ deliverable.projectName ?? '—' }}</span>
                </div>
                <div class="meta-row">
                  <mat-icon class="meta-icon">insert_drive_file</mat-icon>
                  <span class="meta-key">Fichier</span>
                  <span class="meta-val">{{ deliverable.fileType ?? '—' }} &nbsp;·&nbsp; {{ deliverable.fileSizeKb ? (deliverable.fileSizeKb + ' KB') : '—' }}</span>
                </div>
                <div class="meta-row">
                  <mat-icon class="meta-icon">schedule</mat-icon>
                  <span class="meta-key">Soumis le</span>
                  <span class="meta-val">{{ deliverable.submittedAt | date:'d MMM yyyy, HH:mm' }}</span>
                </div>
                @if (deliverable.evaluatedAt) {
                  <div class="meta-row">
                    <mat-icon class="meta-icon">event_available</mat-icon>
                    <span class="meta-key">Évalué le</span>
                    <span class="meta-val">{{ deliverable.evaluatedAt | date:'d MMM yyyy, HH:mm' }}</span>
                  </div>
                }
              </div>

              <!-- Description -->
              @if (deliverable.description) {
                <div class="section-card">
                  <div class="section-card-title">
                    <mat-icon>description</mat-icon> Description
                  </div>
                  <p class="section-card-body">{{ deliverable.description }}</p>
                </div>
              }

              <!-- Scan status -->
              @if (deliverable.virusScanStatus) {
                <div [class]="'scan-row ' + (deliverable.virusScanStatus === 'clean' ? 'scan-ok' : 'scan-warn')">
                  <mat-icon>{{ deliverable.virusScanStatus === 'clean' ? 'verified_user' : 'gpp_bad' }}</mat-icon>
                  <span>Virus scan — <strong>{{ deliverable.virusScanStatus | uppercase }}</strong></span>
                  @if (deliverable.virusName) { <span class="virus-name">{{ deliverable.virusName }}</span> }
                </div>
              }

              <!-- Decision + score banner -->
              @if (deliverable.tutorDecision) {
                <div [class]="'decision-banner ' + (deliverable.tutorDecision === 'ACCEPTED' ? 'dec-banner-ok' : 'dec-banner-ko')">
                  <div class="dec-banner-left">
                    <mat-icon>{{ deliverable.tutorDecision === 'ACCEPTED' ? 'check_circle' : 'cancel' }}</mat-icon>
                    <div>
                      <div class="dec-banner-label">{{ deliverable.tutorDecision === 'ACCEPTED' ? 'Livrable accepté' : 'Livrable rejeté' }}</div>
                      @if (deliverable.evaluatedByName) {
                        <div class="dec-banner-sub">par {{ deliverable.evaluatedByName }}</div>
                      }
                    </div>
                  </div>
                  @if (deliverable.score !== null) {
                    <div [class]="'dec-score ' + scoreClass(deliverable.score!)">
                      {{ deliverable.score }}<span class="dec-score-max">/100</span>
                    </div>
                  }
                </div>
              }

              <!-- Feedback -->
              @if (deliverable.tutorFeedback) {
                <div class="section-card feedback-card">
                  <div class="section-card-title">
                    <mat-icon>chat</mat-icon> Feedback du tuteur
                  </div>
                  <p class="section-card-body">{{ deliverable.tutorFeedback }}</p>
                </div>
              }

              <!-- Actions -->
              <div class="action-strip">
                @if (deliverable.fileUrl) {
                  <a [href]="'http://localhost:8084' + deliverable.fileUrl"
                     target="_blank" mat-flat-button class="dl-btn">
                    <mat-icon>download</mat-icon> Télécharger le fichier
                  </a>
                }
                <button mat-stroked-button
                        [disabled]="!deliverable.tutorDecision || downloading()"
                        (click)="downloadReport()"
                        matTooltip="Télécharger le rapport PDF">
                  @if (downloading()) {
                    <mat-progress-spinner diameter="16" mode="indeterminate"/>
                  } @else {
                    <mat-icon>picture_as_pdf</mat-icon>
                  }
                  Rapport PDF
                </button>
              </div>

            </div>
          </mat-tab>

          @if (!deliverable.tutorDecision) {
          <!-- ── Tab 2: Compare ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">compare_arrows</mat-icon> Compare
            </ng-template>
            <div class="tab-pad">
              <div class="compare-bar">
                <mat-form-field appearance="outline" class="compare-select">
                  <mat-label>Compare with another deliverable</mat-label>
                  <mat-select [(ngModel)]="compareTargetId">
                    @for (d of otherDeliverables; track d.id) {
                      <mat-option [value]="d.id">
                        {{ d.studentName }} — {{ d.title }} (v{{ d.versionNumber }})
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="accent"
                        [disabled]="!compareTargetId || comparing()"
                        (click)="runComparison()">
                  @if (comparing()) {
                    <mat-progress-spinner diameter="16" mode="indeterminate"/>
                  } @else {
                    <mat-icon>compare_arrows</mat-icon>
                  }
                  Run
                </button>
              </div>

              @if (comparing()) {
                <div class="loading-state">
                  <mat-progress-spinner mode="indeterminate" diameter="40"/>
                  <span>Running comparison…</span>
                </div>
              }

              @if (compResult()) {
                <!-- Summary cards -->
                <div class="summary-panel">
                  <div class="stat-card" [class.danger]="compResult()!.possiblePlagiarism">
                    <span class="stat-val">{{ compResult()!.similarityPct }}</span>
                    <span class="stat-lbl">Similarity</span>
                  </div>
                  <div class="stat-card added">
                    <span class="stat-val">+{{ compResult()!.totalAdded }}</span>
                    <span class="stat-lbl">Added</span>
                  </div>
                  <div class="stat-card removed">
                    <span class="stat-val">-{{ compResult()!.totalRemoved }}</span>
                    <span class="stat-lbl">Removed</span>
                  </div>
                  <div class="stat-card modified">
                    <span class="stat-val">~{{ compResult()!.totalModified }}</span>
                    <span class="stat-lbl">Modified</span>
                  </div>
                  <div class="stat-card score-sug" (click)="useSuggestedScore()" style="cursor:pointer" matTooltip="Click to apply">
                    <span class="stat-val">{{ compResult()!.suggestedScore }}</span>
                    <span class="stat-lbl">Suggested ✓</span>
                  </div>
                </div>

                <div class="badges-row">
                  @if (compResult()!.possiblePlagiarism) {
                    <div class="plagiarism-alert">
                      <mat-icon>warning</mat-icon>
                      Possible plagiarism — similarity ≥ 80%
                    </div>
                  }
                  <span [class]="'impact-badge impact-' + compResult()!.impactLevel.toLowerCase()">
                    {{ compResult()!.impactLevel }} Impact
                  </span>
                </div>

                <!-- Diff viewer -->
                <div class="diff-viewer">
                  <div class="diff-toolbar">
                    <span class="diff-title">
                      <mat-icon style="font-size:16px;vertical-align:middle">difference</mat-icon>
                      Differences — page {{ compResult()!.page + 1 }} / {{ compResult()!.totalPages }}
                    </span>
                    <div class="page-nav">
                      <button mat-icon-button [disabled]="compResult()!.page === 0" (click)="prevPage()">
                        <mat-icon>chevron_left</mat-icon>
                      </button>
                      <button mat-icon-button [disabled]="compResult()!.page >= compResult()!.totalPages - 1" (click)="nextPage()">
                        <mat-icon>chevron_right</mat-icon>
                      </button>
                    </div>
                  </div>

                  @for (section of compResult()!.sections; track section.sectionIndex) {
                    <div class="section-block">
                      <div class="section-hdr">
                        <span class="hunk-label">@@ section {{ section.sectionIndex + 1 }} @@</span>
                        <span class="hunk-range">lines {{ section.oldStartLine }}→{{ section.newStartLine }}</span>
                        <span class="added-lbl">+{{ section.addedInSection }}</span>
                        <span class="removed-lbl">-{{ section.removedInSection }}</span>
                        <span class="modified-lbl">~{{ section.modifiedInSection }}</span>
                      </div>
                      @for (line of filterChanged(section.lines); track $index) {
                        @if (line.type === 'MODIFIED' && line.oldContent) {
                          <div class="diff-row removed">
                            <span class="ln old">{{ line.oldLineNumber ?? '' }}</span>
                            <span class="ln new"></span>
                            <span class="sym">-</span>
                            <code class="lc">{{ line.oldContent }}</code>
                          </div>
                          <div class="diff-row added">
                            <span class="ln old"></span>
                            <span class="ln new">{{ line.newLineNumber ?? '' }}</span>
                            <span class="sym">+</span>
                            <code class="lc">{{ line.content }}</code>
                          </div>
                        } @else {
                          <div [class]="'diff-row ' + line.type.toLowerCase()">
                            <span class="ln old">{{ line.type === 'ADDED' ? '' : (line.oldLineNumber ?? '') }}</span>
                            <span class="ln new">{{ line.type === 'REMOVED' ? '' : (line.newLineNumber ?? '') }}</span>
                            <span class="sym">{{ linePrefix(line.type) }}</span>
                            <code class="lc">{{ line.content }}</code>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              }

              @if (!compResult() && !comparing()) {
                <div class="empty-compare">
                  <mat-icon>compare</mat-icon>
                  <p>Select a deliverable above and click Run to compare</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- ── Tab 3: Evaluate ── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">grading</mat-icon> Évaluer
            </ng-template>
            <div class="tab-pad eval-tab">

              <!-- Step 1 — Decision -->
              <div class="eval-section">
                <div class="eval-section-label">
                  <span class="step-num">1</span> Décision
                </div>
                <div class="decision-row">
                  <button class="decision-btn accept-btn"
                          [class.active]="evalForm.decision === 'ACCEPTED'"
                          (click)="evalForm.decision = 'ACCEPTED'">
                    <div class="dec-icon-wrap accept-icon">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                    <div class="dec-text">
                      <span class="dec-title">Accepter</span>
                      <span class="dec-sub">Le livrable est validé</span>
                    </div>
                    @if (evalForm.decision === 'ACCEPTED') {
                      <mat-icon class="dec-check">task_alt</mat-icon>
                    }
                  </button>
                  <button class="decision-btn reject-btn"
                          [class.active]="evalForm.decision === 'REJECTED'"
                          (click)="evalForm.decision = 'REJECTED'">
                    <div class="dec-icon-wrap reject-icon">
                      <mat-icon>cancel</mat-icon>
                    </div>
                    <div class="dec-text">
                      <span class="dec-title">Rejeter</span>
                      <span class="dec-sub">Des corrections sont nécessaires</span>
                    </div>
                    @if (evalForm.decision === 'REJECTED') {
                      <mat-icon class="dec-check">task_alt</mat-icon>
                    }
                  </button>
                </div>
              </div>

              <!-- Step 2 — Score -->
              <div class="eval-section">
                <div class="eval-section-label">
                  <span class="step-num">2</span> Note
                </div>
                <div class="score-panel">
                  <div class="score-circle-wrap">
                    <svg viewBox="0 0 100 100" class="score-ring">
                      <circle cx="50" cy="50" r="42" class="ring-bg"/>
                      <circle cx="50" cy="50" r="42" class="ring-fill"
                              [style.stroke-dasharray]="264"
                              [style.stroke-dashoffset]="264 - (264 * evalForm.score / 100)"
                              [class]="'ring-' + scoreClass(evalForm.score)"/>
                    </svg>
                    <div class="score-inner">
                      <span [class]="'score-num ' + scoreClass(evalForm.score)">{{ evalForm.score }}</span>
                      <span class="score-denom">/100</span>
                    </div>
                  </div>
                  <div class="score-controls">
                    <div class="score-range-row">
                      <span class="score-zone low-zone">Insuffisant</span>
                      <span class="score-zone mid-zone">Moyen</span>
                      <span class="score-zone high-zone">Excellent</span>
                    </div>
                    <input type="range" min="0" max="100" step="1"
                           [(ngModel)]="evalForm.score" class="score-slider"
                           [class]="'slider-' + scoreClass(evalForm.score)"/>
                    <div class="score-marks">
                      <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                    </div>
                    <div class="score-presets">
                      @for (p of [0,25,50,75,100]; track p) {
                        <button class="preset-btn" [class.active]="evalForm.score === p"
                                (click)="evalForm.score = p">{{ p }}</button>
                      }
                      @if (compResult()) {
                        <button class="preset-btn suggested-btn" (click)="useSuggestedScore()"
                                matTooltip="Score suggéré par la comparaison">
                          <mat-icon style="font-size:13px;width:13px;height:13px">auto_fix_high</mat-icon>
                          {{ compResult()!.suggestedScore }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 3 — Feedback -->
              <div class="eval-section">
                <div class="eval-section-label">
                  <span class="step-num">3</span> Commentaire
                </div>
                <div class="feedback-wrapper">
                  <textarea class="feedback-area"
                            [(ngModel)]="evalForm.feedback"
                            rows="5"
                            placeholder="Expliquez votre décision, proposez des améliorations…"></textarea>
                  <div class="feedback-meta">
                    <span class="char-count" [class.char-warn]="evalForm.feedback.length > 800">
                      {{ evalForm.feedback.length }} caractères
                    </span>
                  </div>
                </div>
              </div>

              <!-- Submit -->
              <button class="submit-eval-btn"
                      [class.btn-accept]="evalForm.decision === 'ACCEPTED'"
                      [class.btn-reject]="evalForm.decision === 'REJECTED'"
                      [class.btn-neutral]="!evalForm.decision"
                      [disabled]="!evalForm.decision || submitting()"
                      (click)="submitEvaluation()">
                @if (submitting()) {
                  <mat-progress-spinner diameter="20" mode="indeterminate" class="btn-spinner"/>
                } @else {
                  <mat-icon>{{ evalForm.decision === 'ACCEPTED' ? 'check_circle' : evalForm.decision === 'REJECTED' ? 'cancel' : 'send' }}</mat-icon>
                }
                <span>
                  @if (!evalForm.decision) { Choisissez une décision }
                  @else if (evalForm.decision === 'ACCEPTED') { Confirmer — Accepté }
                  @else { Confirmer — Rejeté }
                </span>
              </button>

              @if (submitted()) {
                <div [class]="'submitted-banner ' + (submitted()!.tutorDecision === 'ACCEPTED' ? 'sbanner-ok' : 'sbanner-ko')">
                  <mat-icon>{{ submitted()!.tutorDecision === 'ACCEPTED' ? 'verified' : 'unpublished' }}</mat-icon>
                  <div>
                    <div class="sbanner-title">
                      Livrable {{ submitted()!.tutorDecision === 'ACCEPTED' ? 'accepté' : 'rejeté' }}
                    </div>
                    <div class="sbanner-sub">Note finale : {{ submitted()!.score }}/100</div>
                  </div>
                </div>
              }

            </div>
          </mat-tab>
          } <!-- end @if (!deliverable.tutorDecision) -->

        </mat-tab-group>
      </mat-dialog-content>

      <div class="dialog-footer">
        <button mat-button mat-dialog-close>
          <mat-icon>close</mat-icon> Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .dialog-wrapper {
      display: flex; flex-direction: column; height: 100%;
      background: #fff; border-radius: 12px; overflow: hidden;
    }

    /* Header */
    .dialog-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; background: #1e40af; color: #fff;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: rgba(255,255,255,0.25); display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0;
    }
    .header-title { font-size: 16px; font-weight: 600; }
    .header-sub { font-size: 12px; opacity: .75; margin-top: 2px; }
    .status-chip {
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
      letter-spacing: .5px; white-space: nowrap;
    }
    .chip-sub { background: #dbeafe; color: #1e40af; }
    .chip-rev { background: #fef3c7; color: #92400e; }
    .chip-acc { background: #d1fae5; color: #065f46; }
    .chip-rej { background: #fee2e2; color: #991b1b; }

    /* Body */
    .dialog-body { flex: 1; overflow: auto; padding: 0 16px; }
    .tab-pad { padding: 20px 8px; }
    .tab-icon { font-size: 16px; margin-right: 4px; vertical-align: middle; }

    /* Info tab */
    .info-tab { display: flex; flex-direction: column; gap: 14px; }

    .profile-card {
      display: flex; align-items: flex-start; gap: 14px;
      background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
      border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;
    }
    .profile-avatar {
      width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
      background: #1e40af; color: #fff; display: flex; align-items: center;
      justify-content: center; font-weight: 800; font-size: 18px; letter-spacing: -1px;
    }
    .profile-body { flex: 1; min-width: 0; }
    .profile-name { font-size: 17px; font-weight: 700; color: #1e293b; }
    .profile-email { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #64748b; margin-top: 3px; }
    .profile-tutor { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #64748b; margin-top: 2px; }
    .profile-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
    .status-pill {
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
      letter-spacing: .4px; white-space: nowrap;
    }
    .version-pill {
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
      background: #e0e7ff; color: #3730a3;
    }

    .meta-section {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .meta-row {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      font-size: 13px; border-bottom: 1px solid #f1f5f9;
    }
    .meta-row:last-child { border-bottom: none; }
    .meta-key { color: #64748b; width: 90px; flex-shrink: 0; font-weight: 500; }
    .meta-val { color: #1e293b; font-weight: 500; }
    .meta-icon { font-size: 16px; width: 18px; height: 18px; color: #94a3b8; flex-shrink: 0; }

    .section-card {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .section-card-title {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; background: #f8fafc; font-size: 12px; font-weight: 700;
      color: #64748b; text-transform: uppercase; letter-spacing: .4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-card-title mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .section-card-body { margin: 0; padding: 12px 14px; font-size: 14px; color: #374151; line-height: 1.6; }
    .feedback-card .section-card-title { background: #fefce8; border-color: #fde68a; color: #92400e; }
    .feedback-card { border-color: #fde68a; }

    .scan-row {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; font-size: 13px; font-weight: 600;
    }
    .scan-ok { background: #d1fae5; color: #065f46; }
    .scan-warn { background: #fee2e2; color: #991b1b; }
    .virus-name { font-size: 11px; opacity: .75; margin-left: 4px; }

    .decision-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-radius: 10px;
    }
    .dec-banner-ok { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; }
    .dec-banner-ko { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
    .dec-banner-left { display: flex; align-items: center; gap: 10px; }
    .dec-banner-label { font-size: 15px; font-weight: 700; }
    .dec-banner-sub { font-size: 12px; opacity: .75; margin-top: 2px; }
    .dec-score { font-size: 28px; font-weight: 900; line-height: 1; }
    .dec-score-max { font-size: 14px; font-weight: 400; opacity: .65; }
    .score-high { color: #16a34a; }
    .score-mid  { color: #d97706; }
    .score-low  { color: #dc2626; }

    .action-strip { display: flex; gap: 10px; flex-wrap: wrap; padding-top: 4px; }
    .dl-btn { background: #1e40af; color: #fff; }
    .dl-btn:hover { background: #1e3a8a; }

    /* Compare tab */
    .compare-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .compare-select { flex: 1; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #888; }
    .empty-compare { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px; color: #94a3b8; }
    .empty-compare mat-icon { font-size: 48px; height: 48px; width: 48px; }

    .summary-panel { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .stat-card {
      display: flex; flex-direction: column; align-items: center;
      padding: 10px 16px; border-radius: 10px; background: #f8fafc;
      border: 1px solid #e2e8f0; min-width: 80px;
    }
    .stat-val { font-size: 22px; font-weight: 800; line-height: 1.1; }
    .stat-lbl { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .stat-card.danger  { border-color: #dc2626; background: #fff1f2; }
    .stat-card.danger .stat-val { color: #dc2626; }
    .stat-card.added .stat-val   { color: #16a34a; }
    .stat-card.removed .stat-val { color: #dc2626; }
    .stat-card.modified .stat-val { color: #d97706; }
    .stat-card.score-sug { border-color: #1e40af; }
    .stat-card.score-sug .stat-val { color: #1e40af; }

    .badges-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .plagiarism-alert { display: flex; align-items: center; gap: 6px; color: #dc2626;
                        font-weight: 700; font-size: 13px; }
    .impact-badge { padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .impact-minor  { background: #d1fae5; color: #065f46; }
    .impact-medium { background: #fef3c7; color: #92400e; }
    .impact-major  { background: #fee2e2; color: #991b1b; }

    /* Diff viewer */
    .diff-viewer { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-family: monospace; }
    .diff-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
    }
    .diff-title { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .page-nav { display: flex; }
    .section-block { border-top: 1px solid #e2e8f0; }
    .section-hdr {
      position: sticky; top: 0; display: flex; gap: 10px; align-items: center;
      padding: 4px 12px; background: #eff6ff; border-bottom: 1px solid #bfdbfe;
      font-size: 11px; font-weight: 600; z-index: 1;
    }
    .hunk-label { color: #1e40af; }
    .hunk-range { color: #64748b; }
    .added-lbl    { color: #16a34a; }
    .removed-lbl  { color: #dc2626; }
    .modified-lbl { color: #d97706; }

    .diff-row { display: flex; font-size: 12px; line-height: 1.6; }
    .diff-row.added    { background: #f0fdf4; }
    .diff-row.removed  { background: #fff1f2; }
    .diff-row.modified { background: #fffbeb; }
    .diff-row.unchanged { background: #fff; }
    .ln {
      width: 36px; text-align: right; padding: 0 6px; color: #94a3b8;
      border-right: 1px solid #e2e8f0; user-select: none; flex-shrink: 0; font-size: 11px;
      background: rgba(0,0,0,.02);
    }
    .ln.old { border-right: none; }
    .sym {
      width: 18px; text-align: center; flex-shrink: 0; font-weight: 700;
      color: #64748b; padding: 0 2px;
    }
    .diff-row.added   .sym { color: #16a34a; }
    .diff-row.removed .sym { color: #dc2626; }
    .diff-row.modified .sym { color: #d97706; }
    .lc { padding: 0 6px; white-space: pre-wrap; word-break: break-all; flex: 1; }

    /* Eval tab */
    .eval-tab { display: flex; flex-direction: column; gap: 20px; max-width: 680px; }

    .eval-section { display: flex; flex-direction: column; gap: 12px; }
    .eval-section-label {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .6px; color: #64748b;
    }
    .step-num {
      width: 22px; height: 22px; border-radius: 50%; background: #1e40af; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; flex-shrink: 0;
    }

    /* Decision */
    .decision-row { display: flex; gap: 12px; }
    .decision-btn {
      flex: 1; padding: 14px 16px; border-radius: 12px; border: 2px solid #e2e8f0;
      background: #f8fafc; cursor: pointer; display: flex; align-items: center;
      gap: 12px; font-family: inherit; transition: all .18s; text-align: left;
    }
    .decision-btn:hover { border-color: #cbd5e1; background: #f1f5f9; }
    .dec-icon-wrap {
      width: 40px; height: 40px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .accept-icon { background: #d1fae5; color: #16a34a; }
    .reject-icon { background: #fee2e2; color: #dc2626; }
    .dec-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .dec-title { font-size: 14px; font-weight: 700; color: #1e293b; }
    .dec-sub { font-size: 11px; color: #94a3b8; }
    .dec-check { color: #1e40af; margin-left: auto; flex-shrink: 0; }
    .accept-btn.active { border-color: #16a34a; background: #f0fdf4; }
    .accept-btn.active .dec-title { color: #15803d; }
    .reject-btn.active { border-color: #dc2626; background: #fff1f2; }
    .reject-btn.active .dec-title { color: #b91c1c; }

    /* Score */
    .score-panel {
      display: flex; gap: 20px; align-items: center;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;
    }
    .score-circle-wrap { position: relative; width: 90px; height: 90px; flex-shrink: 0; }
    .score-ring { width: 90px; height: 90px; transform: rotate(-90deg); }
    .ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 10; }
    .ring-fill {
      fill: none; stroke-width: 10; stroke-linecap: round;
      transition: stroke-dashoffset .35s ease, stroke .35s ease;
    }
    .ring-fill.score-high { stroke: #16a34a; }
    .ring-fill.score-mid  { stroke: #d97706; }
    .ring-fill.score-low  { stroke: #dc2626; }
    .score-inner {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; line-height: 1;
    }
    .score-num { font-size: 24px; font-weight: 900; }
    .score-num.score-high { color: #16a34a; }
    .score-num.score-mid  { color: #d97706; }
    .score-num.score-low  { color: #dc2626; }
    .score-denom { font-size: 11px; color: #94a3b8; }

    .score-controls { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .score-range-row { display: flex; justify-content: space-between; }
    .score-zone { font-size: 10px; font-weight: 600; }
    .low-zone  { color: #dc2626; }
    .mid-zone  { color: #d97706; }
    .high-zone { color: #16a34a; }
    .score-slider {
      width: 100%; height: 6px; border-radius: 3px; cursor: pointer;
      -webkit-appearance: none; appearance: none; outline: none;
      background: linear-gradient(to right, #dc2626 0%, #d97706 50%, #16a34a 100%);
    }
    .score-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
      background: #fff; border: 3px solid #1e40af; cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }
    .score-marks { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
    .score-presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .preset-btn {
      padding: 3px 10px; border-radius: 20px; border: 1px solid #e2e8f0;
      background: #fff; font-size: 12px; font-weight: 600; color: #64748b;
      cursor: pointer; transition: all .12s; font-family: inherit;
    }
    .preset-btn:hover { border-color: #1e40af; color: #1e40af; }
    .preset-btn.active { background: #1e40af; color: #fff; border-color: #1e40af; }
    .suggested-btn {
      background: #eff6ff; border-color: #bfdbfe; color: #1e40af;
      display: flex; align-items: center; gap: 3px;
    }

    /* Feedback */
    .feedback-wrapper {
      border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
      transition: border-color .15s;
    }
    .feedback-wrapper:focus-within { border-color: #1e40af; box-shadow: 0 0 0 3px rgba(30,64,175,.08); }
    .feedback-area {
      width: 100%; border: none; outline: none; resize: none;
      padding: 12px 14px; font-size: 14px; font-family: inherit; color: #1e293b;
      background: #fff; box-sizing: border-box; line-height: 1.6;
    }
    .feedback-meta {
      padding: 6px 14px; background: #f8fafc; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: flex-end;
    }
    .char-count { font-size: 11px; color: #94a3b8; }
    .char-warn { color: #dc2626; }

    /* Submit button */
    .submit-eval-btn {
      width: 100%; padding: 14px; border-radius: 12px; border: none;
      font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: all .18s; letter-spacing: .2px;
    }
    .submit-eval-btn:disabled { opacity: .45; cursor: not-allowed; }
    .btn-neutral { background: #e2e8f0; color: #94a3b8; }
    .btn-accept  { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 14px rgba(22,163,74,.35); }
    .btn-accept:hover:not(:disabled)  { background: linear-gradient(135deg, #15803d, #166534); }
    .btn-reject  { background: linear-gradient(135deg, #dc2626, #b91c1c); color: #fff; box-shadow: 0 4px 14px rgba(220,38,38,.35); }
    .btn-reject:hover:not(:disabled)  { background: linear-gradient(135deg, #b91c1c, #991b1b); }
    .btn-spinner { display: inline-block; }

    /* Submitted banner */
    .submitted-banner {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border-radius: 10px; font-weight: 600; animation: fadeIn .3s ease;
    }
    .sbanner-ok { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; }
    .sbanner-ko { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
    .sbanner-title { font-size: 14px; font-weight: 700; }
    .sbanner-sub { font-size: 12px; opacity: .75; margin-top: 2px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    .full-width { width: 100%; }

    /* Footer */
    .dialog-footer {
      padding: 10px 20px; border-top: 1px solid #e2e8f0; display: flex;
      justify-content: flex-end;
    }
  `],
})
export class TutorEvaluationDialogComponent implements OnInit {

  private readonly tutorSvc   = inject(TutorEvaluationService);
  private readonly auth       = inject(AuthService);
  private readonly snack      = inject(MatSnackBar);
  readonly dialogRef          = inject(MatDialogRef<TutorEvaluationDialogComponent>);

  private readonly dialogData: TutorEvaluationDialogData = inject(MAT_DIALOG_DATA);
  get deliverable() { return this.dialogData.deliverable; }
  get otherDeliverables() {
    return (this.dialogData.allDeliverables ?? []).filter(d => d.id !== this.deliverable.id);
  }

  comparing   = signal(false);
  submitting  = signal(false);
  downloading = signal(false);
  submitted   = signal<StudentDeliverable | null>(null);
  compResult  = signal<PaginatedDiffResult | null>(null);

  compareTargetId: number | null = null;
  currentPage = 0;
  readonly PAGE_SIZE = 5;

  evalForm = {
    decision: '' as 'ACCEPTED' | 'REJECTED' | '',
    score: 50,
    feedback: '',
  };

  ngOnInit() {
    if (this.deliverable.score !== null) this.evalForm.score = this.deliverable.score ?? 50;
    if (this.deliverable.tutorDecision) this.evalForm.decision = this.deliverable.tutorDecision;
    if (this.deliverable.tutorFeedback) this.evalForm.feedback = this.deliverable.tutorFeedback;
    this.loadStoredComparison();
  }

  private loadStoredComparison() {
    this.tutorSvc.getStoredComparison(this.deliverable.id, 0, this.PAGE_SIZE).subscribe({
      next: r => this.compResult.set(r),
      error: () => {},
    });
  }

  runComparison() {
    if (!this.compareTargetId) return;
    this.comparing.set(true);
    this.currentPage = 0;
    this.tutorSvc.comparePaged(this.deliverable.id, this.compareTargetId, 0, this.PAGE_SIZE).subscribe({
      next: r => { this.compResult.set(r); this.comparing.set(false); },
      error: () => {
        this.comparing.set(false);
        this.snack.open('Comparison failed', 'OK', { duration: 3000 });
      },
    });
  }

  prevPage() {
    if (!this.compResult() || this.currentPage === 0) return;
    this.currentPage--;
    this.fetchPage();
  }

  nextPage() {
    const r = this.compResult();
    if (!r || this.currentPage >= r.totalPages - 1) return;
    this.currentPage++;
    this.fetchPage();
  }

  private fetchPage() {
    const r = this.compResult();
    if (!r || !r.leftDeliverableId || !r.rightDeliverableId) return;
    this.tutorSvc.comparePaged(
      r.leftDeliverableId, r.rightDeliverableId, this.currentPage, this.PAGE_SIZE
    ).subscribe({
      next: p => this.compResult.set(p),
      error: () => this.snack.open('Failed to load page', 'OK', { duration: 2000 }),
    });
  }

  useSuggestedScore() {
    const r = this.compResult();
    if (r) this.evalForm.score = r.suggestedScore;
  }

  submitEvaluation() {
    if (!this.evalForm.decision) return;
    const user = this.auth.currentUser();
    if (!user?.id) return;

    this.submitting.set(true);
    this.tutorSvc.evaluate(this.deliverable.id, user.id, {
      decision: this.evalForm.decision,
      score: this.evalForm.score,
      feedback: this.evalForm.feedback,
    }).subscribe({
      next: updated => {
        this.submitted.set(updated);
        this.submitting.set(false);
        this.snack.open('Evaluation submitted successfully', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting.set(false);
        this.snack.open('Failed to submit evaluation', 'OK', { duration: 3000 });
      },
    });
  }

  downloadReport() {
    this.downloading.set(true);
    this.tutorSvc.downloadReport(this.deliverable.id).subscribe({
      next: blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `evaluation-${this.deliverable.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
        this.snack.open('Failed to generate report', 'OK', { duration: 3000 });
      },
    });
  }

  filterChanged(lines: DetailedDiffLine[]) {
    return lines.filter(l => l.type !== 'UNCHANGED');
  }

  linePrefix(type: string): string {
    return ({ ADDED: '+', REMOVED: '-', MODIFIED: '~', UNCHANGED: ' ' } as Record<string, string>)[type] ?? ' ';
  }

  chipClass(s: string) {
    return ({ SUBMITTED: 'chip-sub', UNDER_REVIEW: 'chip-rev',
              ACCEPTED: 'chip-acc', REJECTED: 'chip-rej' } as Record<string, string>)[s] ?? '';
  }

  scoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-mid';
    return 'score-low';
  }

  initials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
}
