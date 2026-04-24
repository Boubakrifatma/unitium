import {
  Component, Inject, OnInit, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { ProjectService, Project } from '../../../services/project-service';
import { MilestoneService, Milestone } from '../../../services/mileStoneService/milestone.service';
import { TaskService } from '../../../services/TaskService/task.service';

export interface CreateTaskMatrixDialogData {
  title: string;
  priority: 'low' | 'medium' | 'high';
  quadrant: 'q1' | 'q2' | 'q3' | 'q4';
}

const QUADRANT_META: Record<string, { label: string; color: string; icon: string }> = {
  q1: { label: 'DO NOW — Urgent + Important',      color: '#ef4444', icon: 'flash_on'      },
  q2: { label: 'SCHEDULE — Pas urgent + Important', color: '#3b82f6', icon: 'calendar_month' },
  q3: { label: 'DELEGATE — Urgent + Pas important', color: '#f59e0b', icon: 'people'         },
  q4: { label: 'ELIMINATE — Pas urgent + Pas important', color: '#94a3b8', icon: 'delete_sweep' },
};

@Component({
  selector: 'app-create-task-matrix-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="dialog-header">
      <div class="header-left">
        <div class="header-icon">
          <mat-icon class="material-icons-outlined">add_task</mat-icon>
        </div>
        <div>
          <h2 class="dialog-title">Créer une tâche</h2>
          <p class="dialog-sub">Depuis la matrice Eisenhower</p>
        </div>
      </div>
      <button class="close-btn" mat-icon-button (click)="cancel()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- ── Quadrant badge ──────────────────────────────────────── -->
    <div class="quadrant-badge" [style.border-color]="quadrantMeta.color + '44'"
                                [style.background]="quadrantMeta.color + '11'">
      <mat-icon class="material-icons-outlined" [style.color]="quadrantMeta.color">
        {{ quadrantMeta.icon }}
      </mat-icon>
      <span [style.color]="quadrantMeta.color">{{ quadrantMeta.label }}</span>
    </div>

    <!-- ── Form ───────────────────────────────────────────────── -->
    <mat-dialog-content class="dialog-body">
      <form [formGroup]="form" class="task-form">

        <!-- Title -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>Titre de la tâche *</mat-label>
          <input matInput formControlName="title" placeholder="Ex: Préparer la présentation..." />
          <mat-icon matPrefix class="material-icons-outlined">title</mat-icon>
          <mat-error *ngIf="form.get('title')?.hasError('required')">Titre obligatoire</mat-error>
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"
                    placeholder="Décrivez cette tâche..."></textarea>
          <mat-icon matPrefix class="material-icons-outlined">notes</mat-icon>
        </mat-form-field>

        <!-- Type + Priority -->
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Type</mat-label>
            <mat-select formControlName="taskType">
              <mat-option value="task">✅ Task</mat-option>
              <mat-option value="story">📖 Story</mat-option>
              <mat-option value="bug">🐛 Bug</mat-option>
              <mat-option value="epic">🚀 Epic</mat-option>
              <mat-option value="subtask">↳ Subtask</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Priorité</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="low">🟢 Faible</mat-option>
              <mat-option value="medium">🟡 Moyenne</mat-option>
              <mat-option value="high">🟠 Haute</mat-option>
              <mat-option value="critical">🔴 Critique</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Estimated hours -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>Heures estimées</mat-label>
          <input matInput type="number" formControlName="estimatedHours" min="0" placeholder="8" />
          <mat-icon matPrefix class="material-icons-outlined">schedule</mat-icon>
        </mat-form-field>

        <mat-divider class="divider"></mat-divider>
        <p class="section-label">
          <mat-icon class="material-icons-outlined">folder</mat-icon>
          Projet & Milestone
        </p>

        <!-- Project -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>Projet *</mat-label>
          <mat-select formControlName="projectId" (selectionChange)="onProjectChange($event.value)">
            <mat-option *ngIf="loadingProjects()" disabled>
              <mat-spinner diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
              Chargement...
            </mat-option>
            <mat-option *ngFor="let p of projects()" [value]="p.id">
              {{ p.name }}
            </mat-option>
            <mat-option *ngIf="!loadingProjects() && projects().length === 0" disabled>
              Aucun projet disponible
            </mat-option>
          </mat-select>
          <mat-icon matPrefix class="material-icons-outlined">work_outline</mat-icon>
          <mat-error>Projet obligatoire</mat-error>
        </mat-form-field>

        <!-- Milestone -->
        <mat-form-field appearance="outline" class="full">
          <mat-label>Milestone *</mat-label>
          <mat-select formControlName="milestoneId" [disabled]="!form.get('projectId')?.value">
            <mat-option *ngIf="loadingMilestones()" disabled>
              <mat-spinner diameter="16" style="display:inline-block;margin-right:8px"></mat-spinner>
              Chargement...
            </mat-option>
            <mat-option *ngFor="let m of milestones()" [value]="m.id">
              {{ m.name }}
              <span *ngIf="m.dueDate" class="ms-date">— {{ formatDate(m.dueDate!) }}</span>
            </mat-option>
            <mat-option *ngIf="!loadingMilestones() && form.get('projectId')?.value && milestones().length === 0" disabled>
              Aucun milestone dans ce projet
            </mat-option>
          </mat-select>
          <mat-icon matPrefix class="material-icons-outlined">flag</mat-icon>
          <mat-hint *ngIf="!form.get('projectId')?.value">Sélectionnez d'abord un projet</mat-hint>
          <mat-error>Milestone obligatoire</mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <!-- ── Actions ─────────────────────────────────────────────── -->
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button (click)="cancel()" [disabled]="saving()">
        Annuler
      </button>
      <button mat-flat-button color="primary" (click)="submit()"
              [disabled]="form.invalid || saving()">
        <mat-spinner *ngIf="saving()" diameter="16" class="spinner-inline"></mat-spinner>
        <mat-icon *ngIf="!saving()" class="material-icons-outlined">add_task</mat-icon>
        {{ saving() ? 'Création...' : 'Créer la tâche' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; font-family: 'Inter', sans-serif; }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      flex-shrink: 0;
    }

    .dialog-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .dialog-sub {
      margin: 2px 0 0;
      font-size: 12px;
      color: #64748b;
    }

    .close-btn { color: #94a3b8; }

    .quadrant-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 24px;
      padding: 8px 14px;
      border: 1px solid;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .dialog-body {
      padding: 0 24px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .task-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 0;
    }

    .full { width: 100%; }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .divider { margin: 8px 0 4px; }

    .section-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 4px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .ms-date {
      font-size: 11px;
      color: #94a3b8;
      margin-left: 4px;
    }

    .dialog-actions {
      padding: 12px 24px 16px;
      gap: 10px;
      border-top: 1px solid #e2e8f0;
    }

    .spinner-inline {
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }
  `],
})
export class CreateTaskMatrixDialogComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private milestoneService = inject(MilestoneService);
  private taskService    = inject(TaskService);
  dialogRef = inject(MatDialogRef<CreateTaskMatrixDialogComponent>);
  data: CreateTaskMatrixDialogData = inject(MAT_DIALOG_DATA);

  projects  = signal<Project[]>([]);
  milestones = signal<Milestone[]>([]);
  loadingProjects   = signal(true);
  loadingMilestones = signal(false);
  saving = signal(false);

  get quadrantMeta() { return QUADRANT_META[this.data.quadrant]; }

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      title:          [this.data.title, [Validators.required, Validators.minLength(2)]],
      description:    [''],
      taskType:       ['task', Validators.required],
      priority:       [this.data.priority, Validators.required],
      estimatedHours: [8, [Validators.min(0)]],
      projectId:      ['', Validators.required],
      milestoneId:    ['', Validators.required],
    });

    this.loadProjects();
  }

  private loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectService.getMyProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  onProjectChange(projectId: string): void {
    this.form.patchValue({ milestoneId: '' });
    this.milestones.set([]);
    if (!projectId) return;

    this.loadingMilestones.set(true);
    this.milestoneService.getByProjectId(projectId).subscribe({
      next: (ms) => {
        this.milestones.set(ms);
        this.loadingMilestones.set(false);
      },
      error: () => this.loadingMilestones.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);

    const v = this.form.value;
    const payload = {
      title:          v.title.trim(),
      description:    v.description?.trim() || undefined,
      taskType:       v.taskType,
      status:         'todo',
      priority:       v.priority,
      estimatedHours: v.estimatedHours || undefined,
      projectId:      v.projectId,
      milestoneId:    v.milestoneId,
      isVisibleToAssignees: true,
    };

    this.taskService.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.dialogRef.close({ success: true, task: created });
      },
      error: () => {
        this.saving.set(false);
        this.dialogRef.close({ success: false });
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  formatDate(d: string): string {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }
}
