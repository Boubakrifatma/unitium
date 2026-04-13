import {
  Component, OnInit, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DeliverableService, CreateDeliverableVersionRequest } from '../../../services/Deliverable.service';
import { MatBadgeModule } from '@angular/material/badge';

const VAGUE_PHRASES = [
  'work done', 'done', 'finished', 'completed', 'ok', 'good',
  'travail fait', 'fait', 'terminé', 'fini', 'nothing', 'n/a', 'rien'
];

function noVagueDescriptionValidator(control: AbstractControl): ValidationErrors | null {
  const val = (control.value || '').toLowerCase().trim();
  if (!val) return null;
  const isVague = VAGUE_PHRASES.some(p => val === p || val === p + '.' || val === p + '!');
  return isVague ? { vagueDescription: true } : null;
}

export interface DeliverableFormData {
  mode: 'create' | 'edit' | 'add-version';
  deliverable: any;
  tasks: any[];
  users: any[];
  projects: any[];
  currentUserId: number;
  currentProjectId: string;
  deliverableId?: number;
  hasExistingDeliverable?: boolean;
}

@Component({
  selector: 'app-deliverable-dialog',
  standalone: true,
  templateUrl: './deliverable-dialog.component.html',
  styleUrls: ['./deliverable-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCardModule,
    MatBadgeModule,
    MatChipsModule,
    MatTooltipModule,
  ],
})
export class DeliverableDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private deliverableService = inject(DeliverableService);
  readonly dialogRef = inject(MatDialogRef<DeliverableDialogComponent>);
  readonly data: DeliverableFormData = inject(MAT_DIALOG_DATA);

  form!: FormGroup;
  loading = false;
  uploading = false;
  error = '';
  submitted = false;

  // ── Drag & Drop (same pattern as editfile.component.ts) ──────────────────
  isDragging = signal(false);
  selectedFile = signal<File | null>(null);

  // ── Smart Description Analyzer ──────────────────────────────────────────
  descriptionScore = signal(0);
  missingKeywords = signal<string[]>([]);
  descriptionSuggestion = signal('');

  constructor() {
    const isVersionMode = this.data.mode === 'add-version';

    this.form = this.fb.group({
      title: [{ value: '', disabled: isVersionMode }, [Validators.required, Validators.minLength(3)]],
      description: [{ value: '', disabled: isVersionMode }, [Validators.required, Validators.minLength(10), noVagueDescriptionValidator]],
      taskId: [{ value: '', disabled: isVersionMode }, Validators.required],
      projectId: [{ value: '', disabled: isVersionMode }, Validators.required],
      submittedById: [{ value: '', disabled: isVersionMode }, Validators.required],
      fileUrl: ['', Validators.required],
      fileType: [''],
      fileSizeKb: [''],
      status: [{ value: 'under_review', disabled: isVersionMode }, Validators.required],
      changeSummary: ['', isVersionMode ? [Validators.required, Validators.minLength(5)] : []],
    });
  }

  ngOnInit() {
    if (this.data.mode === 'add-version') {
      this.form.patchValue({ fileUrl: '', fileType: '', fileSizeKb: '', changeSummary: '' });
    } else {
      const firstTask = this.data.tasks && this.data.tasks.length > 0 ? this.data.tasks[0].id : null;
      this.form.patchValue({
        taskId: firstTask,
        projectId: this.data.currentProjectId,
        submittedById: this.data.currentUserId,
        status: 'under_review',
      });

      // Build initial suggestion and analyze on every description change
      this.buildSuggestion();
      this.form.get('description')!.valueChanges.subscribe(() => this.analyzeDescription());
      this.form.get('taskId')!.valueChanges.subscribe(() => {
        this.buildSuggestion();
        this.analyzeDescription();
      });
    }
  }

  // ── Smart Description Analyzer ──────────────────────────────────────────

  private getTaskKeywords(): string[] {
    const taskId = this.form.get('taskId')?.value?.toString();
    const task = this.data.tasks.find(t => t.id.toString() === taskId);
    if (!task) return [];
    const words = (task.title || '').toLowerCase().split(/\W+/).filter((w: string) => w.length > 3);
    return [...new Set(words)] as string[];
  }

  private buildSuggestion(): void {
    const taskId = this.form.get('taskId')?.value?.toString();
    const task = this.data.tasks.find(t => t.id.toString() === taskId);
    if (!task) { this.descriptionSuggestion.set(''); return; }
    const title = task.title || '';
    const suggestion = `Livrable réalisé dans le cadre de la tâche "${title}". Ce livrable présente les résultats obtenus et les décisions prises lors de l'exécution de cette tâche.`;
    this.descriptionSuggestion.set(suggestion);
  }

  analyzeDescription(): void {
    const val = (this.form.get('description')?.value || '').trim();
    const lower = val.toLowerCase();

    // Vague check → score 0
    if (VAGUE_PHRASES.some(p => lower === p || lower === p + '.' || lower === p + '!')) {
      this.descriptionScore.set(0);
      this.missingKeywords.set(this.getTaskKeywords());
      return;
    }

    const keywords = this.getTaskKeywords();
    const matched = keywords.filter(k => lower.includes(k));
    const missing = keywords.filter(k => !lower.includes(k));
    this.missingKeywords.set(missing);

    // Score: length (40) + keywords (40) + bonus (20)
    const lengthScore = Math.min(40, Math.floor(val.length / 2));
    const keywordScore = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 40) : 20;
    const bonus = val.length > 60 && matched.length > 0 ? 20 : 0;
    this.descriptionScore.set(Math.min(100, lengthScore + keywordScore + bonus));
  }

  applySuggestion(): void {
    this.form.get('description')!.setValue(this.descriptionSuggestion());
    this.analyzeDescription();
  }

  getScoreColor(): string {
    const s = this.descriptionScore();
    if (s >= 70) return '#27ae60';
    if (s >= 40) return '#f39c12';
    return '#e74c3c';
  }

  getScoreLabel(): string {
    const s = this.descriptionScore();
    if (s >= 70) return 'Bonne description';
    if (s >= 40) return 'Description correcte';
    if (s > 0)   return 'Description faible';
    return 'Description vague — rejetée';
  }

  // ── Drag & Drop handlers ─────────────────────────────────────────────────

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(_event: DragEvent) {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files?.length) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFile(input.files[0]);
  }

  processFile(file: File): void {
    this.selectedFile.set(file);

    const mimeType = file.type;
    const extension = file.name.split('.').pop()?.toUpperCase() || '';
    const fileType = mimeType || extension;
    const fileSizeKb = Math.round((file.size / 1024) * 100) / 100;

    this.form.patchValue({ fileType, fileSizeKb });

    // Upload vers le serveur
    this.uploading = true;
    this.error = '';
    this.deliverableService.uploadFile(file).subscribe({
      next: (res) => {
        this.uploading = false;
        this.form.patchValue({ fileUrl: res.fileUrl });
      },
      error: (err) => {
        this.uploading = false;
        this.selectedFile.set(null);
        // Handle virus detection error
        if (err.message?.includes('Virus détecté')) {
          this.error = err.message;
        } else {
          this.error = 'Erreur lors de l\'upload du fichier. Veuillez réessayer.';
        }
        console.error('Upload error:', err);
      }
    });
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.uploading) {
      this.error = 'Veuillez attendre la fin de l\'upload du fichier.';
      return;
    }

    if (this.form.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.loading = true;

    if (this.data.mode === 'add-version' && this.data.deliverableId) {
      const versionRequest: CreateDeliverableVersionRequest = {
        deliverableId: this.data.deliverableId,
        fileUrl: this.form.get('fileUrl')?.value,
        fileSizeKb: this.form.get('fileSizeKb')?.value ? Number(this.form.get('fileSizeKb')?.value) : undefined,
        changeSummary: this.form.get('changeSummary')?.value,
      };

      this.deliverableService.createVersion(
        this.data.deliverableId,
        this.data.currentUserId,
        versionRequest
      ).subscribe({
        next: () => { this.loading = false; this.dialogRef.close(true); },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Erreur lors de la création de la version.';
        },
      });
    } else {
      const formData = {
        ...this.form.getRawValue(),
        taskId: Number(this.form.get('taskId')?.value),
        submittedById: Number(this.form.get('submittedById')?.value),
        fileSizeKb: this.form.get('fileSizeKb')?.value ? Number(this.form.get('fileSizeKb')?.value) : null,
      };

      this.deliverableService.createDeliverable(formData).subscribe({
        next: () => { this.loading = false; this.dialogRef.close(true); },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        },
      });
    }
  }

  onCancel() {
    this.dialogRef.close(false);
  }

  getTaskTitle(taskId: string): string {
    const task = this.data.tasks.find(t => t.id.toString() === taskId);
    return task ? task.title : '';
  }

  getUserName(userId: number): string {
    const user = this.data.users.find(u => u.id === userId);
    return user ? user.fullName || user.name : '';
  }
}
