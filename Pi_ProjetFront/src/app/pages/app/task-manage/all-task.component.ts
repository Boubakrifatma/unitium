import { Component, OnInit, ViewChild, AfterViewInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import {
  TaskService,
  TaskResponseDto,
  TaskWritePayload,
} from "../../../services/TaskService/task.service";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { UserDTO, UserService } from "../../../users/user.service";

export interface TaskItem {
  taskId: number;
  title: string;
  status: string;
  type: string;
  assignedTo: string;
  assignedToId: number | null;
  assignHours: string;
  loggedHours: string;
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

const TASK_TYPES = ["epic", "story", "task", "bug", "subtask"] as const;
const TASK_STATUSES = ["todo", "in_progress", "review", "done", "blocked"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    todo: "À faire",
    in_progress: "En cours",
    review: "Révision",
    done: "Terminé",
    blocked: "Bloqué",
  };
  return map[s] ?? s;
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
    critical: "Critique",
  };
  return map[p] ?? p;
}

function typeLabel(t: string): string {
  return t.replace(/_/g, " ");
}

function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

@Component({
  selector: "app-task-manage-dialog",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <form [formGroup]="taskForm" (ngSubmit)="save()">
      <mat-dialog-content class="task-dialog-content">
        @if (data.mode !== "view") {
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Titre</mat-label>
            <input matInput formControlName="title" />
            @if (taskForm.get("title")?.invalid && taskForm.get("title")?.touched) {
              <mat-error>Titre requis</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <div class="row-fields">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Type</mat-label>
              <mat-select formControlName="taskType">
                @for (t of taskTypes; track t) {
                  <mat-option [value]="t">{{ typeLabel(t) }}</mat-option>
                }
              </mat-select>
              @if (taskForm.get("taskType")?.invalid && taskForm.get("taskType")?.touched) {
                <mat-error>Type requis</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Statut</mat-label>
              <mat-select formControlName="status">
                @for (s of taskStatuses; track s) {
                  <mat-option [value]="s">{{ statusLabel(s) }}</mat-option>
                }
              </mat-select>
              @if (taskForm.get("status")?.invalid && taskForm.get("status")?.touched) {
                <mat-error>Statut requis</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="row-fields">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Priorité</mat-label>
              <mat-select formControlName="priority">
                @for (p of taskPriorities; track p) {
                  <mat-option [value]="p">{{ priorityLabel(p) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Assigné à</mat-label>
              <mat-select formControlName="assignedToId">
                <mat-option [value]="null">Non assigné</mat-option>
                @for (u of data.users; track u.id) {
                  <mat-option [value]="u.id">{{ u.fullName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="row-fields">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Heures estimées</mat-label>
              <input matInput type="number" min="0" step="0.5" formControlName="estimatedHours" />
              @if (taskForm.get("estimatedHours")?.touched && taskForm.get("estimatedHours")?.invalid) {
                @if (taskForm.get("estimatedHours")?.hasError("required")) {
                  <mat-error>Heures estimées requises</mat-error>
                } @else if (taskForm.get("estimatedHours")?.hasError("min")) {
                  <mat-error>Les heures estimées doivent être >= 0</mat-error>
                }
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Heures réelles</mat-label>
              <input matInput type="number" min="0" step="0.5" formControlName="actualHours" />
              @if (taskForm.get("actualHours")?.touched && taskForm.get("actualHours")?.invalid) {
                @if (taskForm.get("actualHours")?.hasError("min")) {
                  <mat-error>Les heures réelles doivent être >= 0</mat-error>
                }
              }
            </mat-form-field>
          </div>

          <div class="row-fields">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Date de début</mat-label>
              <input matInput type="date" formControlName="startDate" [min]="minDate" />
              @if (taskForm.get("startDate")?.touched && taskForm.hasError("startDatePast")) {
                <mat-error>La date de début ne peut pas être dans le passé</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Échéance</mat-label>
              <input matInput type="date" formControlName="dueDate" [min]="minDate" />
              @if (taskForm.get("dueDate")?.touched && taskForm.hasError("dueDatePast")) {
                <mat-error>L'échéance ne peut pas être dans le passé</mat-error>
              }
              @if (taskForm.hasError("dateRangeInvalid") && taskForm.get("dueDate")?.touched) {
                <mat-error>L'échéance doit être >= à la date de début</mat-error>
              }
            </mat-form-field>
          </div>
        } @else {
          <dl class="detail-grid">
            <dt>Titre</dt>
            <dd>{{ data.task?.title }}</dd>
            <dt>Description</dt>
            <dd class="pre">{{ data.task?.description || "—" }}</dd>
            <dt>Type</dt>
            <dd>{{ typeLabel(data.task?.type || "") }}</dd>
            <dt>Statut</dt>
            <dd>{{ statusLabel(data.task?.status || "") }}</dd>
            <dt>Priorité</dt>
            <dd>{{ priorityLabel(data.task?.priority || "") }}</dd>
            <dt>Assigné à</dt>
            <dd>{{ data.task?.assignedTo }}</dd>
            <dt>Heures est. / réelles</dt>
            <dd>{{ data.task?.assignHours }}h / {{ data.task?.loggedHours }}h</dd>
            <dt>Dates</dt>
            <dd>
              {{ data.task?.startDate || "—" }} → {{ data.task?.dueDate || "—" }}
            </dd>
          </dl>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="dialogRef.close(false)">
          {{ data.mode === "view" ? "Fermer" : "Annuler" }}
        </button>
        @if (data.mode === "edit") {
          <button mat-flat-button color="primary" type="submit" [disabled]="taskForm.invalid || saving">
            @if (saving) {
              <span>Enregistrement…</span>
            } @else {
              <span>Enregistrer</span>
            }
          </button>
        }
        @if (data.mode === "create") {
          <button mat-flat-button color="primary" type="submit" [disabled]="taskForm.invalid || saving">
            @if (saving) {
              <span>Création…</span>
            } @else {
              <span>Créer</span>
            }
          </button>
        }
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .task-dialog-content {
        min-width: min(100vw - 48px, 480px);
        padding-top: 0.5rem;
      }
      .w-100 {
        width: 100%;
      }
      .row-fields {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .flex-1 {
        flex: 1 1 200px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 8px 16px;
        margin: 0;
      }
      .detail-grid dt {
        margin: 0;
        color: rgba(0, 0, 0, 0.6);
        font-size: 13px;
      }
      .detail-grid dd {
        margin: 0;
        font-weight: 500;
      }
      .pre {
        white-space: pre-wrap;
        font-weight: 400;
      }
    `,
  ],
})
export class TaskManageDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<TaskManageDialogComponent, boolean>);
  data = inject<TaskManageDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private snack = inject(MatSnackBar);

  taskTypes = TASK_TYPES;
  taskStatuses = TASK_STATUSES;
  taskPriorities = TASK_PRIORITIES;
  typeLabel = typeLabel;
  statusLabel = statusLabel;
  priorityLabel = priorityLabel;

  saving = false;
  minDate = toLocalISODate(new Date());

  taskForm = this.fb.group(
    {
      title: ["", Validators.required],
      description: [""],
      taskType: ["task", Validators.required],
      status: ["todo", Validators.required],
      priority: ["medium"],
      estimatedHours: [0, [Validators.required, Validators.min(0)]],
      actualHours: [0 as number | null, Validators.min(0)],
      assignedToId: [null as number | null],
      startDate: [""],
      dueDate: [""],
    },
    { validators: [this.dateRangeValidator()] },
  );

  get title(): string {
    if (this.data.mode === "create") return "Nouvelle tâche";
    if (this.data.mode === "edit") return "Modifier la tâche";
    return "Détails de la tâche";
  }

  ngOnInit(): void {
    if (this.data.mode === "view") {
      this.taskForm.disable();
      return;
    }
    const t = this.data.task;
    if (t && this.data.mode === "edit") {
      this.taskForm.patchValue({
        title: t.title,
        description: t.description || "",
        taskType: t.type,
        status: t.status,
        priority: t.priority || "medium",
        estimatedHours: Number(t.assignHours) || 0,
        actualHours: Number(t.loggedHours) || 0,
        assignedToId: t.assignedToId,
        startDate: this.normalizeDateInput(t.startDate),
        dueDate: this.normalizeDateInput(t.dueDate === "-" ? "" : t.dueDate),
      });
    }
  }

  private dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = control.get("startDate")?.value as string | null;
      const due = control.get("dueDate")?.value as string | null;

      // dates are in YYYY-MM-DD format from <input type="date">
      const errors: ValidationErrors = {};

      if (start && String(start) < this.minDate) {
        errors["startDatePast"] = true;
      }

      if (due && String(due) < this.minDate) {
        errors["dueDatePast"] = true;
      }

      if (start && due && String(due) < String(start)) {
        errors["dateRangeInvalid"] = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }

  private normalizeDateInput(d: string): string {
    if (!d || d === "-") return "";
    return d.length >= 10 ? d.slice(0, 10) : d;
  }

  save(): void {
    if (this.data.mode === "view") return;
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    const v = this.taskForm.getRawValue();
    const payload: TaskWritePayload = {
      title: v.title!,
      description: v.description?.trim() || undefined,
      taskType: v.taskType!,
      status: v.status!,
      priority: v.priority || undefined,
      estimatedHours: v.estimatedHours != null ? Number(v.estimatedHours) : undefined,
      actualHours: v.actualHours != null && v.actualHours !== ("" as unknown as number) ? Number(v.actualHours) : undefined,
      projectId: this.data.projectId,
      milestoneId: this.data.milestoneId,
      assignedToId: v.assignedToId != null ? v.assignedToId : undefined,
      startDate: v.startDate || undefined,
      dueDate: v.dueDate || undefined,
    };

    this.saving = true;
    const req$ =
      this.data.mode === "create"
        ? this.taskService.create(payload)
        : this.taskService.update(this.data.task!.taskId, payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.snack.open(this.data.mode === "create" ? "Tâche créée." : "Tâche mise à jour.", "OK", { duration: 3200 });
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

@Component({
  selector: "app-confirm-task-delete-dialog",
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Supprimer cette tâche ?</h2>
    <mat-dialog-content>
      <p class="mb-0">{{ data.title }}</p>
      <p class="text-secondary small mb-0">Cette action est définitive.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Annuler</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Supprimer</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmTaskDeleteDialogComponent {
  data = inject<{ title: string }>(MAT_DIALOG_DATA);
}

@Component({
  selector: "app-all-task",
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="container mt-3">
      <div class="page-head row align-items-start gx-3 mb-3">
        <div class="col">
          <h2 class="mb-1">Tâches — jalon #{{ milestoneId ?? "?" }}</h2>
          @if (!milestoneId) {
            <p class="text-warning small mb-0">
              Indiquez un jalon dans l’URL (<code class="small">?milestoneId=…</code>) ou ouvrez cette page depuis la
              liste des jalons.
            </p>
          }
        </div>
        <div class="col-auto">
          <button
            mat-flat-button
            color="primary"
            (click)="openCreate()"
            [disabled]="!milestoneId || loadingUsers"
          >
            <mat-icon>add_task</mat-icon>
            Nouvelle tâche
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="loading-wrap text-center py-5">
          <mat-spinner diameter="40"></mat-spinner>
          <p class="text-secondary small mt-2 mb-0">Chargement des tâches…</p>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="w-100 mb-2">
          <mat-label>Rechercher</mat-label>
          <input matInput placeholder="Titre, statut, assigné…" (keyup)="applyFilter($event)" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        @if (dataSource.data.length === 0) {
          <div class="empty-state text-center py-5">
            <mat-icon class="empty-icon">assignment</mat-icon>
            <p class="text-muted mb-1">Aucune tâche pour ce jalon.</p>
            <button mat-stroked-button color="primary" (click)="openCreate()" [disabled]="!milestoneId">
              Créer une tâche
            </button>
          </div>
        } @else {
          <div class="table-wrap mat-elevation-z2">
            <table mat-table [dataSource]="dataSource" matSort class="tasks-table">
              <ng-container matColumnDef="taskId">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>#</th>
                <td mat-cell *matCellDef="let task">{{ task.taskId }}</td>
              </ng-container>

              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Titre</th>
                <td mat-cell *matCellDef="let task" class="cell-title">{{ task.title }}</td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let task">
                  <span class="badge-type">{{ typeLabel(task.type) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="assignedTo">
                <th mat-header-cell *matHeaderCellDef>Assigné à</th>
                <td mat-cell *matCellDef="let task">{{ task.assignedTo }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
                <td mat-cell *matCellDef="let task">
                  <span [class]="'badge-status st-' + task.status">{{ statusLabel(task.status) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="priority">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Priorité</th>
                <td mat-cell *matCellDef="let task">
                  <span [class]="'badge-priority pr-' + task.priority">{{ priorityLabel(task.priority) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="assignHours">
                <th mat-header-cell *matHeaderCellDef>Heures est.</th>
                <td mat-cell *matCellDef="let task">{{ task.assignHours }}h</td>
              </ng-container>

              <ng-container matColumnDef="dueDate">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Échéance</th>
                <td mat-cell *matCellDef="let task">{{ task.dueDate }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="col-actions">Actions</th>
                <td mat-cell *matCellDef="let task" class="col-actions">
                  <button mat-icon-button color="primary" (click)="openView(task)" matTooltip="Détails">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button (click)="openEdit(task)" matTooltip="Modifier">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(task)" matTooltip="Supprimer">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns" class="task-row"></tr>
            </table>
          </div>

          <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons></mat-paginator>
        }
      }
    </div>
  `,
  styles: [
    `
      .page-head h2 {
        font-size: 1.35rem;
      }
      .w-100 {
        width: 100%;
      }
      .tasks-table {
        width: 100%;
      }
      .cell-title {
        max-width: 220px;
      }
      .col-actions {
        width: 156px;
        text-align: right;
        white-space: nowrap;
      }
      .badge-status {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      .st-todo {
        background: #e0e0e0;
        color: #333;
      }
      .st-in_progress {
        background: #fff3e0;
        color: #e65100;
      }
      .st-review {
        background: #e3f2fd;
        color: #1565c0;
      }
      .st-done {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .st-blocked {
        background: #ffebee;
        color: #c62828;
      }
      .badge-priority {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      .pr-high,
      .pr-critical {
        background: #ffebee;
        color: #c62828;
      }
      .pr-medium {
        background: #fff8e1;
        color: #f57f17;
      }
      .pr-low {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .badge-type {
        padding: 3px 8px;
        border-radius: 8px;
        background: #e3f2fd;
        color: #1565c0;
        font-size: 12px;
        text-transform: capitalize;
      }
      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #bdbdbd;
        margin-bottom: 8px;
      }
      .task-row:hover {
        background: rgba(0, 0, 0, 0.02);
      }
    `,
  ],
})
export class AllTaskComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);
  private milestoneService = inject(MilestoneService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    "title",
    "type",
    "assignedTo",
    "status",
    "priority",
    "assignHours",
    "dueDate",
    "actions",
  ];

  dataSource = new MatTableDataSource<TaskItem>([]);
  milestoneId: number | null = null;
  projectId: string | null = null;
  loading = false;
  loadingUsers = true;
  users: UserDTO[] = [];

  statusLabel = statusLabel;
  priorityLabel = priorityLabel;
  typeLabel = typeLabel;

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
    this.dataSource.sort = this.sort;
  }

  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users = users.filter((u) => u.isActive !== false);
        this.loadingUsers = false;
      },
      error: () => {
        this.users = [];
        this.loadingUsers = false;
      },
    });

    this.route.queryParamMap.subscribe((params) => {
      const mid = params.get("milestoneId");
      const pid = params.get("projectId");

      if (!mid) {
        this.milestoneId = null;
        this.projectId = pid;
        this.dataSource.data = [];
        return;
      }

      this.milestoneId = Number(mid);

      if (pid) {
        this.projectId = pid;
        this.loadTasks();
      } else {
        this.milestoneService.getById(this.milestoneId).subscribe({
          next: (m) => {
            this.projectId = this.projectIdFromMilestone(m);
            this.loadTasks();
          },
          error: () => {
            this.snack.open("Impossible de charger le jalon.", "OK", { duration: 4000 });
            this.loadTasks();
          },
        });
      }
    });
  }

  /** L’API Spring renvoie souvent `project: { id }` au lieu de `projectId`. */
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
        this.dataSource.data = tasks.map((t) => this.mapTask(t));
        if (!this.projectId && this.dataSource.data.length > 0) {
          const fromRow = this.dataSource.data.find((row) => row.projectId)?.projectId;
          if (fromRow) this.projectId = fromRow;
        }
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
      taskId: task.id,
      title: task.title,
      status: (task.status || "todo").toLowerCase(),
      type: (task.taskType || "task").toLowerCase(),
      assignedTo: task.assignedTo?.fullName ?? "Non assigné",
      assignedToId: task.assignedTo?.id ?? null,
      assignHours: task.estimatedHours != null ? String(task.estimatedHours) : "0",
      loggedHours: task.actualHours != null ? String(task.actualHours) : "0",
      priority: (task.priority || "medium").toLowerCase(),
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "-",
      description: task.description ?? "",
      startDate: task.startDate ? String(task.startDate).slice(0, 10) : "",
      projectId: task.project?.id != null ? String(task.project.id) : this.projectId,
    };
  }

  openCreate(): void {
    this.openDialog("create", null);
  }

  openView(task: TaskItem): void {
    this.openDialog("view", task);
  }

  openEdit(task: TaskItem): void {
    this.openDialog("edit", task);
  }

  /**
   * Ouvre le dialogue. Résout `projectId` depuis le contexte, la ligne ou GET /tasks/:id.
   */
  private openDialog(
    mode: "create" | "edit" | "view",
    task: TaskItem | null,
    projectIdResolved?: string | null,
  ): void {
    if (this.milestoneId == null) return;

    const projectId = projectIdResolved ?? task?.projectId ?? this.projectId;

    if (!projectId) {
      if (task && mode !== "create") {
        this.taskService.getById(task.taskId).subscribe({
          next: (dto) => {
            const mapped = this.mapTask(dto);
            const pid = mapped.projectId ?? this.projectId;
            if (!pid) {
              this.snack.open("Projet introuvable pour cette tâche.", "OK", { duration: 5000 });
              return;
            }
            if (!this.projectId) this.projectId = pid;
            this.openDialog(mode, mapped, pid);
          },
          error: () =>
            this.snack.open("Impossible de charger le détail de la tâche.", "OK", { duration: 4000 }),
        });
        return;
      }
      this.snack.open(
        "Projet non lié : impossible de créer ou d’enregistrer. Rechargez depuis la liste des jalons.",
        "OK",
        { duration: 5000 },
      );
      return;
    }

    const ref = this.dialog.open(TaskManageDialogComponent, {
      width: "520px",
      maxWidth: "95vw",
      autoFocus: false,
      panelClass: "custom-dialog-container",
      data: {
        mode,
        task,
        milestoneId: this.milestoneId,
        projectId,
        users: this.users,
      } satisfies TaskManageDialogData,
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.loadTasks();
    });
  }

  confirmDelete(task: TaskItem): void {
    const ref = this.dialog.open(ConfirmTaskDeleteDialogComponent, {
      width: "400px",
      data: { title: task.title },
    });
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed !== true) return;
      this.taskService.delete(task.taskId).subscribe({
        next: () => {
          this.snack.open("Tâche supprimée.", "OK", { duration: 3000 });
          this.loadTasks();
        },
        error: (err) => {
          const msg = err?.error?.message || "Suppression impossible.";
          this.snack.open(msg, "OK", { duration: 5000 });
        },
      });
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
