import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';

import { StudentDeliverableService } from '../../../services/student-deliverable.service';
import { DeliverableService } from '../../../services/Deliverable.service';
import { AuthService } from '../../../auth/auth.service';

// ── Scan Result Dialog ────────────────────────────────────────────────────────
@Component({
  selector: 'app-student-scan-result-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div style="padding:8px 0 0">
      <h2 mat-dialog-title style="display:flex;align-items:center;gap:10px;margin:0 0 4px"
          [style.color]="titleColor">
        <mat-icon style="font-size:28px;height:28px;width:28px" [style.color]="titleColor">{{ icon }}</mat-icon>
        {{ title }}
      </h2>
      <mat-dialog-content style="padding-top:12px">
        <div style="display:flex;gap:14px;align-items:flex-start;border-radius:8px;padding:16px"
             [style.background]="bgColor" [style.border-left]="'4px solid ' + borderColor">
          <mat-icon style="margin-top:2px;flex-shrink:0" [style.color]="borderColor">{{ bodyIcon }}</mat-icon>
          <div>
            <p style="margin:0 0 6px;font-weight:600" [style.color]="titleColor">{{ headline }}</p>
            <p style="margin:0;color:#555;font-size:13.5px">{{ body }}</p>
            @if (data.virusName) {
              <p style="margin:8px 0 0;font-size:12px;color:#991b1b;font-weight:600">
                Threat detected: {{ data.virusName }}
              </p>
            }
          </div>
        </div>
        @if (isInfected()) {
          <p style="margin:14px 0 0;font-size:12.5px;color:#888">
            Do not attempt to submit this file. If you believe this is a false positive, contact your administrator.
          </p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end" style="padding:8px 0 0">
        <button mat-raised-button mat-dialog-close [style.background]="borderColor" style="color:#fff;min-width:100px">
          <mat-icon>{{ isInfected() ? 'close' : 'check' }}</mat-icon>
          {{ isInfected() ? 'Close' : 'OK' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
})
export class StudentScanResultDialogComponent {
  readonly data: { status: string; virusName?: string | null } = inject(MAT_DIALOG_DATA);

  isInfected()   { return this.data.status === 'infected'; }
  isUnverified() { return this.data.status === 'unverified' || this.data.status === 'pending'; }

  get titleColor()  { return this.isInfected() ? '#b71c1c' : this.isUnverified() ? '#e65100' : '#1b5e20'; }
  get bgColor()     { return this.isInfected() ? '#fff3f3' : this.isUnverified() ? '#fff8e1' : '#f1f8e9'; }
  get borderColor() { return this.isInfected() ? '#e53935' : this.isUnverified() ? '#fb8c00' : '#43a047'; }
  get icon()        { return this.isInfected() ? 'gpp_bad' : this.isUnverified() ? 'help_outline' : 'verified_user'; }
  get bodyIcon()    { return this.isInfected() ? 'warning_amber' : this.isUnverified() ? 'warning_amber' : 'check_circle'; }
  get title()       { return this.isInfected() ? 'Dangerous file detected' : this.isUnverified() ? 'Antivirus unavailable' : 'File is safe'; }
  get headline() {
    return this.isInfected()
      ? 'This file was rejected by the antivirus scanner.'
      : this.isUnverified()
        ? 'The file could not be scanned right now.'
        : 'No threats detected.';
  }
  get body() {
    return this.isInfected()
      ? 'This file cannot be submitted. Please select a different file.'
      : this.isUnverified()
        ? 'The antivirus scanner is unavailable. The file will be marked as "unverified". You may still submit your deliverable.'
        : 'The file has been scanned and no threats were found. You can safely submit your deliverable.';
  }
}

// ── Submit Dialog Data ────────────────────────────────────────────────────────
export interface StudentSubmitDialogData {
  mode?: 'create' | 'add-version';
  title?: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  parentId?: number;
  parentTitle?: string;
  parentVersion?: number;
}

interface TutorInfo { id: number; fullName: string; email: string; }

interface UploadResult {
  fileUrl: string;
  fileType: string;
  fileSizeKb: number;
  scanStatus: string;
  virusName: string | null;
}

@Component({
  selector: 'app-student-submit-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule, MatIconModule, MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:6px">
        {{ isVersionMode() ? 'add_circle' : 'upload_file' }}
      </mat-icon>
      {{ isVersionMode() ? 'Add New Version' : 'Submit Deliverable' }}
    </h2>

    <mat-dialog-content>

      <!-- Version mode: parent info banner -->
      @if (isVersionMode()) {
        <div class="version-banner">
          <mat-icon>folder_open</mat-icon>
          <div>
            <strong>{{ data?.parentTitle }}</strong>
            <span class="version-label">
              Current: v{{ data?.parentVersion ?? 1 }} → New: v{{ (data?.parentVersion ?? 1) + 1 }}
            </span>
          </div>
        </div>
        <mat-divider style="margin-bottom:12px"/>
      }

      <!-- Title (create mode only) -->
      @if (!isVersionMode()) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="form.title" placeholder="e.g. Lab Report – Week 3" required />
        </mat-form-field>
      }

      <!-- Description -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ isVersionMode() ? 'What changed in this version?' : 'Description' }}</mat-label>
        <textarea matInput [(ngModel)]="form.description" rows="3"
                  [placeholder]="isVersionMode() ? 'Describe the changes made…' : 'Briefly describe the work'">
        </textarea>
      </mat-form-field>

      <!-- Auto-assigned tutor (create mode) -->
      @if (!isVersionMode()) {
        @if (loadingTutor()) {
          <div class="tutor-loading">
            <mat-progress-spinner diameter="16" mode="indeterminate"/>
            <span>Resolving tutor…</span>
          </div>
        } @else if (assignedTutor()) {
          <div class="tutor-info">
            <mat-icon>school</mat-icon>
            <div>
              <span class="tutor-label">Assigned tutor</span>
              <strong>{{ assignedTutor()!.fullName }}</strong>
              <span class="tutor-email">{{ assignedTutor()!.email }}</span>
            </div>
          </div>
        } @else {
          <p class="warn-no-tutor">
            <mat-icon style="vertical-align:middle;font-size:16px">warning</mat-icon>
            No tutor (PROFESSOR) found in this project. Cannot submit.
          </p>
        }
      }

      <!-- File upload zone -->
      <div class="upload-zone"
           [class.has-file]="selectedFile() && scanStatus() === 'clean'"
           [class.has-file-warn]="selectedFile() && (scanStatus() === 'unverified' || scanStatus() === 'pending')"
           [class.has-file-error]="selectedFile() && scanStatus() === 'infected'"
           [class.scanning]="scanning()"
           (click)="!scanning() && fileInput.click()">
        @if (scanning()) {
          <mat-progress-spinner diameter="22" mode="indeterminate"/>
          <span>Scanning for viruses…</span>
        } @else if (selectedFile()) {
          <mat-icon>{{ scanIcon() }}</mat-icon>
          <div class="file-info">
            <span class="file-name">{{ selectedFile()!.name }}</span>
            <span class="file-size">{{ (selectedFile()!.size / 1024) | number:'1.0-0' }} KB</span>
            @if (scanStatus()) {
              <span class="scan-chip" [style.background]="scanBg()" [style.color]="scanColor()">
                {{ scanLabel() }}
              </span>
            }
          </div>
        } @else {
          <mat-icon>cloud_upload</mat-icon>
          <span>Click to upload (PDF, DOCX, TXT, code file)</span>
        }
      </div>
      <input #fileInput type="file" hidden
             accept=".pdf,.docx,.txt,.js,.ts,.java,.py,.go,.json,.yaml,.xml,.md"
             (change)="onFileChange($event)" />

      <!-- Infected block message -->
      @if (scanStatus() === 'infected') {
        <p class="alert alert-error">
          <mat-icon>gpp_bad</mat-icon>
          File rejected — virus detected. Please select a different file.
        </p>
      }

      @if (error()) {
        <p class="alert alert-error">
          <mat-icon>error_outline</mat-icon> {{ error() }}
        </p>
      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="!canSubmit() || submitting()"
              (click)="submit()">
        @if (submitting()) {
          <mat-progress-spinner diameter="18" mode="indeterminate"/>
        } @else {
          <mat-icon>send</mat-icon>
          {{ isVersionMode() ? 'Submit Version' : 'Create' }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      display: flex; flex-direction: column; gap: 10px;
      min-width: 440px; max-width: 560px;
    }
    .full-width { width: 100%; }

    .version-banner {
      display: flex; align-items: flex-start; gap: 10px;
      background: #eff6ff; border-left: 4px solid #3b82f6;
      border-radius: 6px; padding: 10px 14px; margin-bottom: 4px;
    }
    .version-banner mat-icon { color: #3b82f6; margin-top: 2px; }
    .version-banner strong { display: block; font-size: 14px; }
    .version-label { font-size: 12px; color: #64748b; }

    .tutor-info {
      display: flex; align-items: flex-start; gap: 10px;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 8px; padding: 10px 14px;
    }
    .tutor-info mat-icon { color: #16a34a; margin-top: 2px; }
    .tutor-label { display: block; font-size: 11px; color: #64748b; }
    .tutor-info strong { display: block; font-size: 14px; }
    .tutor-email { font-size: 12px; color: #64748b; }
    .tutor-loading { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; }
    .warn-no-tutor { color: #92400e; font-size: 13px; margin: 0; }

    .upload-zone {
      border: 2px dashed #93c5fd; border-radius: 10px; padding: 18px;
      text-align: center; cursor: pointer; color: #1e40af;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      transition: all .2s; min-height: 72px;
    }
    .upload-zone:hover:not(.scanning) { background: #eff6ff; border-color: #3b82f6; }
    .upload-zone.scanning { cursor: default; background: #f8fafc; border-color: #94a3b8; color: #64748b; }
    .upload-zone.has-file      { border-color: #16a34a; color: #16a34a; background: #f0fdf4; }
    .upload-zone.has-file-warn { border-color: #fb8c00; color: #e65100; background: #fff8e1; }
    .upload-zone.has-file-error{ border-color: #e53935; color: #b71c1c; background: #fff3f3; }

    .file-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .file-name  { font-size: 13px; font-weight: 600; }
    .file-size  { font-size: 11px; color: #64748b; }
    .scan-chip  { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 8px; }

    .alert { display: flex; align-items: center; gap: 6px;
             border-radius: 6px; padding: 8px 12px; font-size: 13px; margin: 0; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class StudentSubmitDialogComponent implements OnInit {

  private readonly svc        = inject(StudentDeliverableService);
  private readonly auth       = inject(AuthService);
  private readonly dialogRef  = inject(MatDialogRef<StudentSubmitDialogComponent>);
  private readonly http       = inject(HttpClient);
  private readonly deliverSvc = inject(DeliverableService);
  private readonly matDialog  = inject(MatDialog);
  readonly data               = inject<StudentSubmitDialogData>(MAT_DIALOG_DATA, { optional: true });

  // ── signals ──────────────────────────────────────────────────
  assignedTutor  = signal<TutorInfo | null>(null);
  loadingTutor   = signal(false);
  submitting     = signal(false);
  scanning       = signal(false);
  error          = signal<string | null>(null);
  selectedFile   = signal<File | null>(null);
  scanStatus     = signal<string | null>(null);
  uploadResult   = signal<UploadResult | null>(null);

  form = {
    title:       this.data?.title       ?? '',
    description: this.data?.description ?? '',
  };

  isVersionMode = computed(() => this.data?.mode === 'add-version');

  canSubmit = computed(() => {
    if (!this.selectedFile()) return false;
    if (this.scanning()) return false;
    if (this.scanStatus() === 'infected') return false;
    if (!this.uploadResult()) return false;
    if (this.isVersionMode()) return true;
    return !!(this.form.title.trim() && this.assignedTutor());
  });

  // ── lifecycle ─────────────────────────────────────────────────
  ngOnInit() {
    if (!this.isVersionMode()) this.resolveTutor();
  }

  private resolveTutor() {
    const pid = this.data?.projectId;
    if (!pid) return;
    this.loadingTutor.set(true);
    const url = `http://localhost:8084/api/student-deliverables/project/${pid}/tutors`;
    this.http.get<TutorInfo[]>(url).subscribe({
      next: list => { this.loadingTutor.set(false); this.assignedTutor.set(list[0] ?? null); },
      error: () => this.loadingTutor.set(false),
    });
  }

  // ── File selection + immediate virus scan ─────────────────────
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile.set(file);
    this.scanStatus.set(null);
    this.uploadResult.set(null);
    this.error.set(null);
    this.scanning.set(true);

    this.deliverSvc.uploadFile(file).subscribe({
      next: upload => {
        this.scanning.set(false);
        this.scanStatus.set(upload.scanStatus ?? 'pending');
        this.uploadResult.set({
          fileUrl:    upload.fileUrl,
          fileType:   upload.fileType,
          fileSizeKb: upload.fileSizeKb,
          scanStatus: upload.scanStatus ?? 'unverified',
          virusName:  upload.virusName ?? null,
        });

        // Show scan result dialog
        this.matDialog.open(StudentScanResultDialogComponent, {
          data: { status: upload.scanStatus ?? 'pending', virusName: upload.virusName },
          width: '460px',
          disableClose: false,
        });

        // If infected, clear the file so the user must pick another
        if (upload.scanStatus === 'infected') {
          this.selectedFile.set(null);
          this.uploadResult.set(null);
          input.value = '';
        }
      },
      error: e => {
        this.scanning.set(false);
        const msg: string = e?.error?.message ?? '';
        const isVirus = e?.status === 422 || msg.toLowerCase().includes('virus');

        if (isVirus) {
          this.scanStatus.set('infected');
          this.selectedFile.set(null);
          input.value = '';
          this.matDialog.open(StudentScanResultDialogComponent, {
            data: { status: 'infected', virusName: msg },
            width: '460px',
          });
        } else {
          this.scanStatus.set(null);
          this.selectedFile.set(null);
          input.value = '';
          this.error.set(msg || 'File upload failed. Please try again.');
        }
      },
    });
  }

  // ── Submit (no re-upload — uses stored scan result) ──────────
  submit() {
    if (!this.canSubmit()) return;
    const user = this.auth.currentUser();
    if (!user?.id) { this.error.set('Not authenticated'); return; }
    const upload = this.uploadResult()!;

    this.submitting.set(true);
    this.error.set(null);

    if (this.isVersionMode()) {
      this.svc.addVersion(this.data!.parentId!, {
        description:     this.form.description.trim(),
        fileUrl:         upload.fileUrl,
        fileType:        upload.fileType,
        fileSizeKb:      upload.fileSizeKb,
        virusScanStatus: upload.scanStatus,
        virusName:       upload.virusName,
      }).subscribe({
        next: () => { this.submitting.set(false); this.dialogRef.close(true); },
        error: e => { this.submitting.set(false); this.error.set(e?.error?.message ?? 'Version submission failed'); },
      });
    } else {
      this.svc.submit({
        studentId:       user.id,
        tutorId:         this.assignedTutor()!.id,
        title:           this.form.title.trim(),
        description:     this.form.description.trim(),
        fileUrl:         upload.fileUrl,
        fileType:        upload.fileType,
        fileSizeKb:      upload.fileSizeKb,
        virusScanStatus: upload.scanStatus,
        virusName:       upload.virusName,
        projectId:       this.data?.projectId ?? null,
        projectName:     this.data?.projectName ?? null,
      }).subscribe({
        next: () => { this.submitting.set(false); this.dialogRef.close(true); },
        error: e => { this.submitting.set(false); this.error.set(e?.error?.message ?? 'Submission failed'); },
      });
    }
  }

  // ── Scan display helpers ──────────────────────────────────────
  scanIcon(): string {
    return ({ clean: 'verified_user', unverified: 'help_outline',
              infected: 'gpp_bad', pending: 'hourglass_empty' } as Record<string, string>)[this.scanStatus() ?? ''] ?? 'check_circle';
  }
  scanLabel(): string {
    return ({ clean: 'Clean', unverified: 'Unverified',
              infected: 'Infected — rejected', pending: 'Pending' } as Record<string, string>)[this.scanStatus() ?? ''] ?? '';
  }
  scanBg(): string {
    return ({ clean: '#d1fae5', unverified: '#fef3c7', infected: '#fee2e2', pending: '#e2e8f0' } as Record<string, string>)[this.scanStatus() ?? ''] ?? '';
  }
  scanColor(): string {
    return ({ clean: '#065f46', unverified: '#92400e', infected: '#991b1b', pending: '#475569' } as Record<string, string>)[this.scanStatus() ?? ''] ?? '';
  }
}
