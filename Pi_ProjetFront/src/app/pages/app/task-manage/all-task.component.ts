// all-task.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatOptionModule } from "@angular/material/core";
import { TaskService, TaskResponseDto, TaskWritePayload } from "../../../services/TaskService/task.service";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { UserDTO, UserService } from "../../../users/user.service";

export interface TaskItem {
  taskId: number;
  title: string;
  status: string;
  type: string;
  assignedTo: string;
  assignedToId: number | null;
  assignHours: number;
  loggedHours: number;
  priority: string;
  dueDate: string;
  description: string;
  startDate: string;
  projectId: string | null;
}

export interface TaskManageDialogData {
  mode: "create" | "edit" | "view";
  task: TaskItem | null;
  milestoneId: number;
  projectId: string;
  users: UserDTO[];
}

const TASK_TYPES     = ["epic", "story", "task", "bug", "subtask"] as const;
const TASK_STATUSES  = ["todo", "in_progress", "review", "done", "blocked"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    todo: "À faire", in_progress: "En cours",
    review: "Révision", done: "Terminé", blocked: "Bloqué",
  };
  return map[s] ?? s;
}

export function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    low: "Basse", medium: "Moyenne", high: "Haute", critical: "Critique",
  };
  return map[p] ?? p;
}

export function typeLabel(t: string): string {
  return t.replace(/_/g, " ");
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Dialog Composant ───────────────────────────────────────────────────────────
@Component({
  selector: "app-task-manage-dialog",
  standalone: true,
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">{{ getTitleIcon() }}</mat-icon>
        {{ title }}
      </h2>
      <mat-dialog-content class="dialog-content">
        <form [formGroup]="taskForm" class="task-form">
          <div class="row g-3">
            <!-- Titre -->
            <div class="col-12">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Titre de la tâche</mat-label>
                <input matInput formControlName="title" placeholder="Saisissez le titre" />
                <mat-error *ngIf="taskForm.get('title')?.hasError('required')">
                  Le titre est requis
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Description -->
            <div class="col-12">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" placeholder="Description détaillée..."></textarea>
              </mat-form-field>
            </div>

            <!-- Type et Statut -->
            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Type</mat-label>
                <mat-select formControlName="taskType">
                  <mat-option *ngFor="let type of taskTypes" [value]="type">
                    <mat-icon class="type-icon">{{ getTypeIcon(type) }}</mat-icon>
                    {{ typeLabel(type) }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Statut</mat-label>
                <mat-select formControlName="status">
                  <mat-option *ngFor="let status of taskStatuses" [value]="status">
                    <span [class]="'status-dot status-' + status"></span>
                    {{ statusLabel(status) }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Priorité et Assignation -->
            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Priorité</mat-label>
                <mat-select formControlName="priority">
                  <mat-option *ngFor="let priority of taskPriorities" [value]="priority">
                    <span [class]="'priority-dot priority-' + priority"></span>
                    {{ priorityLabel(priority) }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Assigné à</mat-label>
                <mat-select formControlName="assignedToId">
                  <mat-option [value]="null">Non assigné</mat-option>
                  <mat-option *ngFor="let user of data.users" [value]="user.id">
                    <div class="user-option">
                      <div class="user-avatar-small" [style.backgroundColor]="getUserColor(user.fullName)">
                        {{ getInitials(user.fullName) }}
                      </div>
                      {{ user.fullName }}
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Heures -->
            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Heures estimées</mat-label>
                <input matInput type="number" formControlName="estimatedHours" step="0.5" />
                <span matSuffix>h</span>
                <mat-error *ngIf="taskForm.get('estimatedHours')?.hasError('min')">
                  Les heures doivent être positives
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Heures effectuées</mat-label>
                <input matInput type="number" formControlName="actualHours" step="0.5" />
                <span matSuffix>h</span>
              </mat-form-field>
            </div>

            <!-- Dates -->
            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Date de début</mat-label>
                <input matInput type="date" formControlName="startDate" [min]="minDate" />
                <mat-error *ngIf="taskForm.hasError('startDatePast')">
                  La date ne peut pas être dans le passé
                </mat-error>
              </mat-form-field>
            </div>

            <div class="col-md-6">
              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Date d'échéance</mat-label>
                <input matInput type="date" formControlName="dueDate" [min]="minDate" />
                <mat-error *ngIf="taskForm.hasError('dueDatePast')">
                  La date ne peut pas être dans le passé
                </mat-error>
                <mat-error *ngIf="taskForm.hasError('dateRangeInvalid')">
                  La date d'échéance doit être après la date de début
                </mat-error>
              </mat-form-field>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button [mat-dialog-close]="false" [disabled]="saving">
          <mat-icon>close</mat-icon>
          Annuler
        </button>
        <button *ngIf="data.mode !== 'view'"
                mat-flat-button
                color="primary"
                (click)="save()"
                [disabled]="saving || taskForm.invalid">
          <mat-icon *ngIf="!saving">save</mat-icon>
          <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container { padding: 8px 0; }
    .dialog-title { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .title-icon { color: #1976d2; }
    .dialog-content { max-height: 70vh; overflow-y: auto; }
    .task-form { margin-top: 8px; }
    .type-icon { font-size: 18px; margin-right: 8px; vertical-align: middle; }
    .status-dot, .priority-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
    .status-todo { background: #9e9e9e; }
    .status-in_progress { background: #1976d2; }
    .status-review { background: #ed6c02; }
    .status-done { background: #2e7d32; }
    .status-blocked { background: #d32f2f; }
    .priority-low { background: #2e7d32; }
    .priority-medium { background: #ed6c02; }
    .priority-high { background: #d32f2f; }
    .priority-critical { background: #c2185b; }
    .user-option { display: flex; align-items: center; gap: 8px; }
    .user-avatar-small { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 500; }
    .dialog-actions { padding: 16px 24px; border-top: 1px solid #e0e0e0; margin-top: 16px; }
  `],
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatIconModule, FormsModule
  ],
})
export class TaskManageDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<TaskManageDialogComponent, boolean>);
  data      = inject<TaskManageDialogData>(MAT_DIALOG_DATA);
  private fb          = inject(FormBuilder);
  private taskService = inject(TaskService);
  private snack       = inject(MatSnackBar);

  taskTypes      = TASK_TYPES;
  taskStatuses   = TASK_STATUSES;
  taskPriorities = TASK_PRIORITIES;
  typeLabel      = typeLabel;
  statusLabel    = statusLabel;
  priorityLabel  = priorityLabel;

  saving  = false;
  minDate = toLocalISODate(new Date());

  taskForm = this.fb.group(
    {
      title:          ["", Validators.required],
      description:    [""],
      taskType:       ["task", Validators.required],
      status:         ["todo", Validators.required],
      priority:       ["medium"],
      estimatedHours: [0, [Validators.required, Validators.min(0)]],
      actualHours:    [0 as number | null, Validators.min(0)],
      assignedToId:   [null as number | null],
      startDate:      [""],
      dueDate:        [""],
    },
    { validators: [this.dateRangeValidator()] },
  );

  getTitleIcon(): string {
    const icons = { create: "add_task", edit: "edit", view: "visibility" };
    return icons[this.data.mode] || "task";
  }

  getTypeIcon(type: string): string {
    const icons: any = {
      bug: "bug_report",
      epic: "stars",
      story: "auto_stories",
      task: "checklist",
      subtask: "subdirectory_arrow_right"
    };
    return icons[type] || "task";
  }

  getUserColor(name: string): string {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1', '#7b1fa2', '#388e3c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    if (!name || name === 'Non assigné') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get title(): string {
    if (this.data.mode === "create") return "Nouvelle tâche";
    if (this.data.mode === "edit")   return "Modifier la tâche";
    return "Détails de la tâche";
  }

  ngOnInit(): void {
    if (this.data.mode === "view") { this.taskForm.disable(); return; }
    const t = this.data.task;
    if (t && this.data.mode === "edit") {
      this.taskForm.patchValue({
        title:          t.title,
        description:    t.description || "",
        taskType:       t.type,
        status:         t.status,
        priority:       t.priority || "medium",
        estimatedHours: Number(t.assignHours) || 0,
        actualHours:    Number(t.loggedHours) || 0,
        assignedToId:   t.assignedToId,
        startDate:      this.normDate(t.startDate),
        dueDate:        this.normDate(t.dueDate === "-" ? "" : t.dueDate),
      });
    }
  }

  private dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = control.get("startDate")?.value as string | null;
      const due   = control.get("dueDate")?.value   as string | null;
      const errors: ValidationErrors = {};
      if (start && String(start) < this.minDate) errors["startDatePast"]    = true;
      if (due   && String(due)   < this.minDate) errors["dueDatePast"]      = true;
      if (start && due && String(due) < String(start)) errors["dateRangeInvalid"] = true;
      return Object.keys(errors).length ? errors : null;
    };
  }

  private normDate(d: string): string {
    if (!d || d === "-") return "";
    return d.length >= 10 ? d.slice(0, 10) : d;
  }

  save(): void {
    if (this.data.mode === "view") return;
    if (this.taskForm.invalid) { this.taskForm.markAllAsTouched(); return; }

    const v = this.taskForm.getRawValue();
    const payload: TaskWritePayload = {
      title:          v.title!,
      description:    v.description?.trim() || undefined,
      taskType:       v.taskType!,
      status:         v.status!,
      priority:       v.priority || undefined,
      estimatedHours: v.estimatedHours != null ? Number(v.estimatedHours) : undefined,
      actualHours:    v.actualHours    != null && v.actualHours !== ("" as any)
                        ? Number(v.actualHours) : undefined,
      projectId:      this.data.projectId,
      milestoneId:    this.data.milestoneId,
      assignedToId:   v.assignedToId ?? undefined,
      startDate:      v.startDate || undefined,
      dueDate:        v.dueDate   || undefined,
    };

    this.saving = true;
    const req$ = this.data.mode === "create"
      ? this.taskService.create(payload)
      : this.taskService.update(this.data.task!.taskId, payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.open(
          this.data.mode === "create" ? "Tâche créée avec succès." : "Tâche mise à jour avec succès.",
          "OK", { duration: 3200 }
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || "Erreur réseau ou serveur.";
        this.snack.open(msg, "Fermer", { duration: 5000 });
      },
    });
  }
}

// ── Dialog Suppression ─────────────────────────────────────────────────────────
@Component({
  selector: "app-confirm-task-delete-dialog",
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="delete-dialog">
      <h2 mat-dialog-title class="delete-title">
        <mat-icon color="warn">warning</mat-icon>
        Supprimer cette tâche ?
      </h2>
      <mat-dialog-content class="delete-content">
        <p class="task-title-preview"><strong>{{ data.title }}</strong></p>
        <p class="text-secondary">Cette action est irréversible. Toutes les données associées seront perdues.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="delete-actions">
        <button mat-button [mat-dialog-close]="false">
          <mat-icon>cancel</mat-icon>
          Annuler
        </button>
        <button mat-flat-button color="warn" [mat-dialog-close]="true">
          <mat-icon>delete_forever</mat-icon>
          Supprimer définitivement
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .delete-dialog { padding: 8px; }
    .delete-title { display: flex; align-items: center; gap: 12px; color: #d32f2f; }
    .delete-content { margin: 16px 0; }
    .task-title-preview { background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 16px 0; }
    .delete-actions { padding: 16px 0 8px; border-top: 1px solid #e0e0e0; }
  `],
})
export class ConfirmTaskDeleteDialogComponent {
  data = inject<{ title: string }>(MAT_DIALOG_DATA);
}

// ── Composant Principal ────────────────────────────────────────────────────────
@Component({
  selector: "app-all-task",
  standalone: true,
  templateUrl: "./all-task.component.html",
  styleUrls: ["./all-task.component.scss"],
  imports: [
    CommonModule, MatCardModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule,
    MatDialogModule, MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule,
    MatButtonToggleModule, MatAutocompleteModule, MatOptionModule, FormsModule
  ],
})
export class AllTaskComponent implements OnInit, AfterViewInit {
  private route            = inject(ActivatedRoute);
  private taskService      = inject(TaskService);
  private milestoneService = inject(MilestoneService);
  private userService      = inject(UserService);
  private dialog           = inject(MatDialog);
  private snack            = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource   = new MatTableDataSource<TaskItem>([]);
  milestoneId: number | null = null;
  projectId:   string | null = null;
  loading      = false;
  loadingUsers = true;
  users: UserDTO[] = [];

  statusLabel   = statusLabel;
  priorityLabel = priorityLabel;
  typeLabel     = typeLabel;

  // Nouvelles propriétés pour l'UI améliorée
  viewMode: 'grid' | 'list' = 'grid';
  currentPage = 0;
  pageSize = 12;
  searchSuggestions: string[] = [];
  activeFiltersCount = 0;
  hasActiveFilters = false;
  filterValue = '';
  constructor() {
    this.dataSource.filterPredicate = (data: TaskItem, filter: string) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        String(data.taskId).includes(q) ||
        data.title.toLowerCase().includes(q) ||
        data.status.toLowerCase().includes(q) ||
        data.type.toLowerCase().includes(q) ||
        data.assignedTo.toLowerCase().includes(q) ||
        data.priority.toLowerCase().includes(q) ||
        !!data.description?.toLowerCase().includes(q)
      );
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next:  (users) => { this.users = users.filter(u => u.isActive !== false); this.loadingUsers = false; },
      error: ()      => { this.users = []; this.loadingUsers = false; },
    });

    this.route.queryParamMap.subscribe((params) => {
      const mid = params.get("milestoneId");
      const pid = params.get("projectId");
      if (!mid) { this.milestoneId = null; this.projectId = pid; this.dataSource.data = []; return; }

      this.milestoneId = Number(mid);
      if (pid) {
        this.projectId = pid;
        this.loadTasks();
      } else {
        this.milestoneService.getById(this.milestoneId).subscribe({
          next:  (m)  => { this.projectId = this.projectIdFromMilestone(m); this.loadTasks(); },
          error: ()   => { this.snack.open("Impossible de charger le jalon.", "OK", { duration: 4000 }); this.loadTasks(); },
        });
      }
    });
  }

  private projectIdFromMilestone(m: Milestone): string | null {
    const raw = m.projectId ?? m.project?.id;
    if (raw == null || raw === "") return null;
    return String(raw);
  }

  loadTasks(): void {
    if (this.milestoneId == null) return;
    this.loading = true;
    this.taskService.getTasksByMilestone(this.milestoneId).subscribe({
      next: (tasks) => {
        this.dataSource.data = tasks.map(t => this.mapTask(t));
        if (!this.projectId && this.dataSource.data.length > 0) {
          const fromRow = this.dataSource.data.find(r => r.projectId)?.projectId;
          if (fromRow) this.projectId = fromRow;
        }
        this.updateSearchSuggestions();
        this.dataSource._updateChangeSubscription();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.snack.open("Impossible de charger les tâches.", "OK", { duration: 4000 });
      },
    });
  }

  private mapTask(task: TaskResponseDto): TaskItem {
    return {
      taskId:      task.id,
      title:       task.title,
      status:      (task.status   || "todo").toLowerCase(),
      type:        (task.taskType || "task").toLowerCase(),
      assignedTo:  task.assignedToName ?? task.assignedTo?.fullName ?? "Non assigné",
      assignedToId: task.assignedToId ?? task.assignedTo?.id ?? null,
      assignHours:  task.estimatedHours != null ? Number(task.estimatedHours) : 0,
      loggedHours:  task.actualHours    != null ? Number(task.actualHours)    : 0,
      priority:     (task.priority || "medium").toLowerCase(),
      dueDate:      task.dueDate ? String(task.dueDate).slice(0, 10) : "-",
      description:  task.description ?? "",
      startDate:    task.startDate ? String(task.startDate).slice(0, 10) : "",
      projectId:    task.projectId ?? (task.project?.id != null ? String(task.project.id) : this.projectId),
    };
  }

  // Nouvelles méthodes utilitaires
  private updateSearchSuggestions(): void {
    const suggestions = new Set<string>();
    this.dataSource.data.forEach(task => {
      suggestions.add(task.title);
      suggestions.add(task.status);
      suggestions.add(task.assignedTo);
      suggestions.add(task.priority);
    });
    this.searchSuggestions = Array.from(suggestions).slice(0, 10);
  }

  getUserColor(name: string): string {
    if (name === 'Non assigné') return '#9e9e9e';
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    if (!name || name === 'Non assigné') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  truncateDescription(description: string, maxLength: number = 120): string {
    if (!description) return '';
    return description.length > maxLength ? description.substring(0, maxLength) + '...' : description;
  }

  openCreate(): void { this.openDialog("create", null); }
  openView(task: TaskItem): void { this.openDialog("view", task); }
  openEdit(task: TaskItem): void { this.openDialog("edit", task); }

  private openDialog(mode: "create" | "edit" | "view", task: TaskItem | null, projectIdResolved?: string | null): void {
    if (this.milestoneId == null) return;
    const projectId = projectIdResolved ?? task?.projectId ?? this.projectId;

    if (!projectId) {
      if (task && mode !== "create") {
        this.taskService.getById(task.taskId).subscribe({
          next: (dto) => {
            const mapped = this.mapTask(dto);
            const pid = mapped.projectId ?? this.projectId;
            if (!pid) { this.snack.open("Projet introuvable.", "OK", { duration: 5000 }); return; }
            if (!this.projectId) this.projectId = pid;
            this.openDialog(mode, mapped, pid);
          },
          error: () => this.snack.open("Impossible de charger la tâche.", "OK", { duration: 4000 }),
        });
        return;
      }
      this.snack.open("Projet non lié. Rechargez depuis la liste des jalons.", "OK", { duration: 5000 });
      return;
    }

    const ref = this.dialog.open(TaskManageDialogComponent, {
      width: "620px", maxWidth: "95vw", autoFocus: false,
      panelClass: "custom-dialog-container",
      data: { mode, task, milestoneId: this.milestoneId, projectId, users: this.users } satisfies TaskManageDialogData,
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.loadTasks(); });
  }

  confirmDelete(task: TaskItem): void {
    const ref = this.dialog.open(ConfirmTaskDeleteDialogComponent, {
      width: "450px", data: { title: task.title },
    });
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed !== true) return;
      this.taskService.delete(task.taskId).subscribe({
        next: () => { this.snack.open("Tâche supprimée avec succès.", "OK", { duration: 3000 }); this.loadTasks(); },
        error: (err) => this.snack.open(err?.error?.message || "Suppression impossible.", "OK", { duration: 5000 }),
      });
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterValue = value;
    this.dataSource.filter = value.trim().toLowerCase();
    this.hasActiveFilters = !!this.dataSource.filter;
    this.activeFiltersCount = this.hasActiveFilters ? 1 : 0;
    this.currentPage = 0;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  clearSearch(input: any): void {
    input.value = '';
    this.filterValue = '';
    this.dataSource.filter = '';
    this.hasActiveFilters = false;
    this.activeFiltersCount = 0;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'todo': 'radio_button_unchecked',
      'in_progress': 'schedule',
      'review': 'visibility',
      'done': 'check_circle',
      'blocked': 'block'
    };
    return icons[status] || 'help';
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'high': 'priority_high',
      'medium': 'unfold_more',
      'low': 'arrow_downward',
      'critical': 'warning'
    };
    return icons[priority] || 'help';
  }

  getDueIcon(dueDate: string): string {
    if (dueDate === '-') return 'calendar_today';
    if (this.isOverdue(dueDate)) return 'error';
    return 'calendar_today';
  }

  clearAllFilters(): void {
    this.filterValue = '';
    this.dataSource.filter = '';
    this.hasActiveFilters = false;
    this.activeFiltersCount = 0;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openFilterDialog(): void {
    // TODO: Implémenter un dialogue de filtres avancés
    this.snack.open("Filtres avancés à venir", "OK", { duration: 2000 });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate || dueDate === '-') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  getCompletedTasksCount(): number {
    return this.dataSource.filteredData.filter(t => t.status === 'done').length;
  }

  getInProgressTasksCount(): number {
    return this.dataSource.filteredData.filter(t => t.status === 'in_progress').length;
  }

  getTaskProgress(task: TaskItem): number {
    if (task.status === 'done') return 100;
    if (task.status === 'todo') return 0;
    const logged = Number(task.loggedHours) || 0;
    const assigned = Number(task.assignHours) || 1;
    return Math.min(Math.round((logged / assigned) * 100), 100);
  }

  getTypeIcon(type: string): string {
    const icons: any = {
      bug: 'bug_report',
      epic: 'stars',
      story: 'auto_stories',
      task: 'checklist',
      subtask: 'subdirectory_arrow_right'
    };
    return icons[type] || 'task';
  }

  get paginatedTasks(): TaskItem[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.dataSource.filteredData.slice(start, end);
  }

  get paginationStart(): number {
    return this.dataSource.filteredData.length === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.dataSource.filteredData.length);
  }
}
