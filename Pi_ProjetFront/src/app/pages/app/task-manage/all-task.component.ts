import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef, signal, computed } from "@angular/core";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";

import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { TaskService, TaskResponseDto } from "../../../services/TaskService/task.service";
import { RiskPredictionService } from "../../../services/TaskService/risk-prediction.service";
import { RiskConfirmDialogComponent } from "./risk-confirm-dialog.component";
import { TaskDependencyService, TaskDependencyResponseDto } from "../../../services/TaskService/taskDepdendencyService";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService } from "../../../services/project-service";
import { UserDTO } from "../../../users/user.service";
import { CreateEditTaskComponent } from "./create-edit-task.component";
import { ConfirmDeleteTaskDialogComponent } from "./confirm-delete-task-dialog.component";
import { SuggestTasksDialogComponent } from "./suggest-tasks-dialog.component";
import { forkJoin } from "rxjs";
import { GanttViewComponent } from "./gantt-view.component";
import { CriticalPathComponent } from "./critical-path.component";
import { WbsViewComponent } from "./wbs-view.component";
import { DependencyImpactComponent } from "./dependency-impact.component";
import { AuthService } from "../../../auth/auth.service";

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
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdByName: string;
  parentTaskId?: number | null;
  parentTaskTitle?: string | null;
  isVisibleToAssignees: boolean;
}

export interface TaskGroup {
  parent: TaskItem | null;
  children: TaskItem[];
}

@Component({
  selector: "app-all-task",
  standalone: true,
  templateUrl: "./all-task.component.html",
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    GanttViewComponent,
    CriticalPathComponent,
    WbsViewComponent,
    DependencyImpactComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ["./all-task.component.scss"],
})
export class AllTaskComponent implements OnInit, AfterViewInit {

  milestoneId = signal<number | null>(null);
  milestoneName = signal<string>("");
  milestoneStartDate = signal<string | null>(null);
  milestoneDueDate = signal<string | null>(null);
  projectId = signal<string | null>(null);
  projectStartDate = signal<string | null>(null);
  projectEndDate = signal<string | null>(null);
  tasks = signal<TaskItem[]>([]);
  expandedGroupIds = signal<Set<number>>(new Set());
  expandedTaskIds = signal<Set<number>>(new Set());

  selectedPanel = signal<'tasks' | 'gantt' | 'wbs' | 'critical' | 'impact'>('tasks');
  dependencies = signal<TaskDependencyResponseDto[]>([]);
  searchFilter = signal<string>("");
  loading = signal<boolean>(true);

  projectMembers = signal<UserDTO[]>([]);

  // Chart.js donut canvas
  @ViewChild('taskDonutCanvas') taskDonutCanvas!: ElementRef<HTMLCanvasElement>;
  private taskDonutChart: Chart | null = null;

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private riskService: RiskPredictionService,
    private taskDependencyService: TaskDependencyService,
    private milestoneService: MilestoneService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params["milestoneId"]) {
        this.milestoneId.set(+params["milestoneId"]);
        this.loadMilestone();
      }
    });
  }

  loadMilestone() {
    const mid = this.milestoneId();
    if (!mid) return;

    this.milestoneService.getById(mid).subscribe({
      next: (m: Milestone) => {
        this.projectId.set(m.projectId ?? m.project?.id ?? null);
        this.milestoneName.set(m.name ?? "");
        this.milestoneStartDate.set(m.startDate ?? (m.createdAt ? m.createdAt.split('T')[0] : null));
        this.milestoneDueDate.set(m.dueDate ?? null);
        if (this.projectId()) {
          this.loadProjectMembers();
          this.loadProjectDates();
        }
        this.loadTasks();
      },
      error: () => this.loadTasks()
    });
  }

  loadProjectMembers() {
    const pid = this.projectId();
    if (!pid) return;
    this.projectService.getMembers(pid).subscribe({
      next: members => this.projectMembers.set(members),
      error: () => this.projectMembers.set([])
    });
  }

  loadProjectDates() {
    const pid = this.projectId();
    if (!pid) return;
    this.projectService.getById(pid).subscribe({
      next: p => {
        this.projectStartDate.set(p.startDate ?? null);
        this.projectEndDate.set(p.endDate ?? null);
      },
      error: () => {}
    });
  }

  loadTasks() {
    this.loading.set(true);
    const mid = this.milestoneId();
    if (!mid) {
      this.loading.set(false);
      return;
    }

    this.taskService.getTasksByMilestone(mid).subscribe({
      next: (data: TaskResponseDto[]) => {
        const mapped: TaskItem[] = data.map(t => ({
          taskId: t.id,
          title: t.title,
          status: t.status,
          type: t.taskType,
          assignedTo: t.assignedToName || "Non assigné",
          assignedToId: t.assignedToId,
          assignHours: t.estimatedHours || 0,
          loggedHours: t.actualHours || 0,
          priority: t.priority || "Medium",
          dueDate: t.dueDate || "-",
          description: t.description || "",
          startDate: t.startDate || "",
          completedAt: t.completedAt || null,
          createdAt: t.createdAt || null,
          updatedAt: t.updatedAt || null,
          createdByName: t.createdByName || "Inconnu",
          parentTaskId: t.parentTaskId,
          parentTaskTitle: t.parentTaskTitle || null,
          isVisibleToAssignees: t.isVisibleToAssignees !== false,
        }));

        this.tasks.set(mapped);
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => this.renderTaskDonut(), 80);
      },
      error: (err) => {
        console.error("Erreur chargement tâches", err);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // ... (filteredTasks, taskGroups, taskStats, getStatusLabel, getTypeIcon restent identiques)

  filteredTasks = computed(() => {
    const search = this.searchFilter().toLowerCase().trim();
    if (!search) return this.tasks();
    return this.tasks().filter(task =>
      task.title.toLowerCase().includes(search) ||
      task.status.toLowerCase().includes(search) ||
      task.assignedTo.toLowerCase().includes(search)
    );
  });

  taskGroups = computed((): TaskGroup[] => {
    const tasksList = this.filteredTasks();
    const parents = tasksList.filter(t => !t.parentTaskId);
    const childrenMap = new Map<number, TaskItem[]>();

    tasksList.filter(t => t.parentTaskId).forEach(child => {
      if (child.parentTaskId) {
        const list = childrenMap.get(child.parentTaskId) || [];
        list.push(child);
        childrenMap.set(child.parentTaskId, list);
      }
    });

    const groups: TaskGroup[] = parents.map(parent => ({
      parent,
      children: childrenMap.get(parent.taskId) || []
    }));

    const orphanChildren = tasksList.filter(t =>
      t.parentTaskId && !parents.some(p => p.taskId === t.parentTaskId)
    );

    if (orphanChildren.length > 0) {
      groups.push({ parent: null, children: orphanChildren });
    }

    return groups;
  });

  taskStats = computed(() => {
    const all = this.filteredTasks();
    return {
      total: all.length,
      done: all.filter(t => t.status === 'done').length,
      inProgress: all.filter(t => t.status === 'in_progress').length,
      todo: all.filter(t => t.status === 'todo').length,
      blocked: all.filter(t => t.status === 'blocked').length,
    };
  });

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      todo: "À faire", in_progress: "En cours", review: "Révision",
      done: "Terminé", blocked: "Bloqué"
    };
    return labels[status] || status;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      task: "assignment", bug: "bug_report", epic: "flag",
      story: "description", subtask: "subdirectory_arrow_right"
    };
    return icons[type] || "assignment";
  }

  // ── Roles excluded from assignee selection ────────────────────────────────
  private readonly EXCLUDED_ROLES = new Set([
    'MANAGER', 'ADMIN', 'PO', 'PROJECT_MANAGER', 'TUTOR'
  ]);

  /**
   * Builds the filtered assignable-member list with workload (todo hours).
   * Excludes MANAGER, ADMIN, PO, PROJECT_MANAGER.
   */
  private buildAssignableMembers() {
    // Compute todo-hours per user from the already-loaded task list
    const workloadMap = new Map<number, number>();
    this.tasks().forEach((t: any) => {
      if (t.status === 'todo' && t.assignedToId) {
        workloadMap.set(t.assignedToId,
          (workloadMap.get(t.assignedToId) ?? 0) + (t.assignHours ?? 0));
      }
    });

    const filtered = this.projectMembers().filter((u: any) => {
      const role = (u.role ?? u.user?.role ?? '').toUpperCase();
      return !this.EXCLUDED_ROLES.has(role);
    });

    return [
      { id: null, name: 'Non assigné', title: '', avatarUrl: null, workloadHours: 0 },
      ...filtered.map((u: any) => {
        const uid = u.userId ?? u.id ?? u.user?.id ?? null;
        return {
          id: uid,
          name: u.user?.fullName ?? u.fullName ?? u.name ?? u.email ?? `User #${uid ?? ''}`,
          title: u.role ?? u.user?.role ?? '',
          avatarUrl: u.user?.avatarUrl ?? u.avatarUrl ?? null,
          workloadHours: uid ? (workloadMap.get(uid) ?? 0) : 0
        };
      })
    ];
  }

  // ===================== Dialogs - Création & Modification =====================
  openCreate() {
    const dialogData = {
      projectId: this.projectId(),
      milestoneId: this.milestoneId(),
      milestoneStartDate: this.milestoneStartDate(),
      milestoneDueDate: this.milestoneDueDate(),
      projectStartDate: this.projectStartDate(),
      projectEndDate: this.projectEndDate(),
      members: this.buildAssignableMembers(),
      parentTasks: this.tasks().map(t => ({ taskId: t.taskId, title: t.title })),
      availableTasks: this.tasks().map(t => ({ taskId: t.taskId, title: t.title }))
    };
    console.log('Dialog data:', dialogData);

    const dialogRef = this.dialog.open(CreateEditTaskComponent, {
      width: '650px',
      maxWidth: '95vw',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
      if (result) {
        this.createTask(result);
      }
    });
  }

  openSuggestTasks() {
    if (!this.milestoneId() || !this.projectId()) {
      this.snackBar.open("Milestone ou projet manquant", "OK", { duration: 3000 });
      return;
    }
    if (!this.milestoneName()) {
      this.snackBar.open("Nom du jalon introuvable", "OK", { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(SuggestTasksDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { milestoneName: this.milestoneName() }
    });

    dialogRef.afterClosed().subscribe((picked: { title: string; description: string }[] | undefined) => {
      if (!picked || picked.length === 0) return;
      this.bulkCreateSuggestedTasks(picked);
    });
  }

  private bulkCreateSuggestedTasks(items: { title: string; description: string }[]) {
    const pid = this.projectId()!;
    const mid = this.milestoneId()!;

    const calls = items.map(item => this.taskService.create({
      title: item.title,
      description: item.description || "",
      taskType: "task",
      status: "todo",
      priority: "Medium",
      estimatedHours: 0,
      actualHours: 0,
      assignedToId: undefined,
      parentTaskId: undefined,
      projectId: pid,
      milestoneId: mid,
      startDate: undefined,
      dueDate: undefined,
    }));

    forkJoin(calls).subscribe({
      next: () => {
        this.snackBar.open(`${items.length} tâche(s) créée(s) avec succès`, "OK", { duration: 3000 });
        this.loadTasks();
        this.loadDependencies();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open("Erreur lors de la création des tâches suggérées", "OK", { duration: 4000 });
        this.loadTasks();
      }
    });
  }

  openEdit(task: TaskItem) {
    this.taskDependencyService.getDependenciesByTaskId(task.taskId).subscribe({
      next: (existingDeps) => {
        const existingDependencies = existingDeps.map(d => ({
          dependencyId: d.id,
          taskId: d.dependsOnTaskId,
          type: d.dependencyType
        }));

        const dialogRef = this.dialog.open(CreateEditTaskComponent, {
          width: '650px',
          maxWidth: '95vw',
          data: {
            projectId: this.projectId(),
            milestoneId: this.milestoneId(),
            milestoneStartDate: this.milestoneStartDate(),
            milestoneDueDate: this.milestoneDueDate(),
            projectStartDate: this.projectStartDate(),
            projectEndDate: this.projectEndDate(),
            task: task,
            existingDependencies,
            members: this.buildAssignableMembers(),
            parentTasks: this.tasks()
              .filter(t => t.taskId !== task.taskId)
              .map(t => ({ taskId: t.taskId, title: t.title })),
            availableTasks: this.tasks()
              .filter(t => t.taskId !== task.taskId)
              .map(t => ({ taskId: t.taskId, title: t.title }))
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.updateTask(task.taskId, result, existingDependencies);
          }
        });
      },
      error: () => {
        // Open dialog even if deps fail to load
        const dialogRef = this.dialog.open(CreateEditTaskComponent, {
          width: '650px',
          maxWidth: '95vw',
          data: {
            projectId: this.projectId(),
            milestoneId: this.milestoneId(),
            milestoneStartDate: this.milestoneStartDate(),
            milestoneDueDate: this.milestoneDueDate(),
            projectStartDate: this.projectStartDate(),
            projectEndDate: this.projectEndDate(),
            task: task,
            existingDependencies: [],
            members: this.buildAssignableMembers(),
            parentTasks: this.tasks()
              .filter(t => t.taskId !== task.taskId)
              .map(t => ({ taskId: t.taskId, title: t.title })),
            availableTasks: this.tasks()
              .filter(t => t.taskId !== task.taskId)
              .map(t => ({ taskId: t.taskId, title: t.title }))
          }
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result) this.updateTask(task.taskId, result, []);
        });
      }
    });
  }

  private createTask(formData: any) {
    if (!this.projectId() || !this.milestoneId()) {
      this.snackBar.open("Projet ou Milestone manquant", "OK", { duration: 3000 });
      return;
    }

    const payload = {
      title:               formData.title,
      description:         formData.description || "",
      taskType:            formData.type || "task",
      status:              "todo",
      priority:            formData.priority || "Medium",
      estimatedHours:      formData.assignHours || 0,
      actualHours:         0,
      assignedToId:        formData.assignedTo || null,
      parentTaskId:        formData.parentTaskId || null,
      projectId:           this.projectId()!,
      milestoneId:         this.milestoneId()!,
      startDate:           formData.startDate || null,
      dueDate:             formData.dueDate || null,
      isVisibleToAssignees: formData.isVisibleToAssignees !== false,
      difficulty:          formData.difficulty || null,
    };

    // ── Step 1: ML risk check ────────────────────────────────────────────────
    this.snackBar.open("Analysing risk…", "", { duration: 2500 });

    this.riskService.checkRisk(payload).subscribe({
      next: (risk) => {
        // ── Step 2: Show risk confirmation dialog ──────────────────────────
        const riskDialogRef = this.dialog.open(RiskConfirmDialogComponent, {
          width: '540px',
          maxWidth: '95vw',
          disableClose: true,
          data: { risk, taskTitle: payload.title }
        });

        riskDialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (!confirmed) {
            // User cancelled – do not save
            this.snackBar.open("Task creation cancelled.", "OK", { duration: 2500 });
            return;
          }

          // ── Step 3: User confirmed – actually save the task ────────────
          this.taskService.create(payload).subscribe({
            next: (createdTask) => {
              if (formData.dependencies && formData.dependencies.length > 0) {
                this.createTaskDependencies(createdTask.id, formData.dependencies);
              } else {
                this.snackBar.open("Task created successfully", "OK", { duration: 3000 });
                this.loadTasks();
                this.loadDependencies();
              }
            },
            error: (err) => {
              console.error('Error creating task:', err);
              this.snackBar.open("Error creating task", "OK", { duration: 4000 });
            }
          });
        });
      },
      error: (err) => {
        // ML check itself failed — open dialog with fallback risk so user can still proceed
        console.warn('Risk check request failed, using fallback:', err);
        const fallbackRisk = {
          riskScore: 0, highRisk: false, threshold: 0.5,
          method: 'fallback', reasoning: null, userWorkload: 0,
          fallback: true,
          fallbackReason: 'Risk service unavailable. You may proceed safely.'
        };
        const riskDialogRef = this.dialog.open(RiskConfirmDialogComponent, {
          width: '540px', maxWidth: '95vw', disableClose: true,
          data: { risk: fallbackRisk, taskTitle: payload.title }
        });
        riskDialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (!confirmed) return;
          this.taskService.create(payload).subscribe({
            next: (createdTask) => {
              if (formData.dependencies && formData.dependencies.length > 0) {
                this.createTaskDependencies(createdTask.id, formData.dependencies);
              } else {
                this.snackBar.open("Task created successfully", "OK", { duration: 3000 });
                this.loadTasks();
                this.loadDependencies();
              }
            },
            error: () => this.snackBar.open("Error creating task", "OK", { duration: 4000 })
          });
        });
      }
    });
  }

  private createTaskDependencies(taskId: number, dependencies: any[]) {
    console.log('Creating dependencies for taskId:', taskId, 'dependencies:', dependencies);
    let completed = 0;
    let errors = 0;

    const onComplete = () => {
      completed++;
      if (completed + errors === dependencies.length) {
        if (errors === 0) {
          this.snackBar.open("Tâche et dépendances créées avec succès", "OK", { duration: 3000 });
        } else {
          this.snackBar.open(`Tâche créée, ${errors} dépendance(s) non créée(s)`, "OK", { duration: 4000 });
        }
        this.loadTasks();
        this.loadDependencies(); // Recharger les dépendances pour le chemin critique
      }
    };

    dependencies.forEach(dep => {
      const dependencyPayload = {
        taskId: taskId,
        dependsOnTaskId: dep.taskId,
        dependencyType: dep.type
      };
      console.log('Sending dependency payload:', dependencyPayload);

      this.taskDependencyService.create(dependencyPayload).subscribe({
        next: (response) => {
          console.log('Dependency created successfully:', response);
          onComplete();
        },
        error: (err) => {
          console.error('Error creating dependency:', err);
          errors++;
          onComplete();
        }
      });
    });
  }

  private updateTask(taskId: number, formData: any, originalDeps: { dependencyId: number; taskId: number; type: string }[] = []) {
    const payload = {
      title: formData.title,
      description: formData.description || "",
      taskType: formData.type || "task",
      status: formData.status || "todo",
      priority: formData.priority || "Medium",
      estimatedHours: formData.assignHours || 0,
      actualHours: formData.actualHours || 0,
      assignedToId: formData.assignedTo || null,
      parentTaskId: formData.parentTaskId || null,
      startDate: formData.startDate || null,
      dueDate: formData.dueDate || null,
      isVisibleToAssignees: formData.isVisibleToAssignees !== false,
    };

    this.taskService.update(taskId, payload).subscribe({
      next: () => {
        const currentDeps: { dependencyId?: number; taskId: number; type: string }[] = formData.dependencies || [];

        // Dependencies to delete: existed before but no longer in current list
        const toDelete = originalDeps.filter(
          orig => !currentDeps.some(cur => cur.taskId === orig.taskId)
        );

        // Dependencies to create: in current list but not in original (no dependencyId)
        const toCreate = currentDeps.filter(
          cur => !originalDeps.some(orig => orig.taskId === cur.taskId)
        );

        const deleteObs = toDelete.map(d => this.taskDependencyService.delete(d.dependencyId));
        const createObs = toCreate.map(d => this.taskDependencyService.create({
          taskId,
          dependsOnTaskId: d.taskId,
          dependencyType: d.type as any
        }));

        const allOps = [...deleteObs, ...createObs];

        if (allOps.length === 0) {
          this.snackBar.open("Tâche mise à jour avec succès", "OK", { duration: 3000 });
          this.loadTasks();
          this.loadDependencies();
          return;
        }

        forkJoin(allOps).subscribe({
          next: () => {
            this.snackBar.open("Tâche et dépendances mises à jour avec succès", "OK", { duration: 3000 });
            this.loadTasks();
            this.loadDependencies();
          },
          error: () => {
            this.snackBar.open("Tâche mise à jour, erreur sur certaines dépendances", "OK", { duration: 4000 });
            this.loadTasks();
            this.loadDependencies();
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open("Erreur lors de la mise à jour", "OK", { duration: 4000 });
      }
    });
  }

  confirmDeleteParent(parent: TaskItem, childCount: number) {
    const title = childCount > 0
      ? `${parent.title} (+ ${childCount} sous-tâche${childCount > 1 ? 's' : ''} détachée${childCount > 1 ? 's' : ''})`
      : parent.title;
    const dialogRef = this.dialog.open(ConfirmDeleteTaskDialogComponent, {
      width: '420px',
      data: { taskTitle: title }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.taskService.delete(parent.taskId).subscribe({
          next: () => {
            this.snackBar.open("Tâche parente supprimée avec succès", "OK", { duration: 3000 });
            this.loadTasks();
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open("Erreur lors de la suppression", "OK", { duration: 4000 });
          }
        });
      }
    });
  }

  confirmDelete(task: TaskItem) {
    const dialogRef = this.dialog.open(ConfirmDeleteTaskDialogComponent, {
      width: '420px',
      data: { taskTitle: task.title }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.taskService.delete(task.taskId).subscribe({
          next: () => {
            this.snackBar.open("Tâche supprimée avec succès", "OK", { duration: 3000 });
            this.loadTasks();
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open("Erreur lors de la suppression", "OK", { duration: 4000 });
          }
        });
      }
    });
  }

  // Méthodes restantes (applyFilter, switchPanel, toggleGroup, etc.)
  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchFilter.set(value);
  }

  switchPanel(panel: 'tasks' | 'gantt' | 'wbs' | 'critical' | 'impact') {
    this.selectedPanel.set(panel);
    if (panel === 'gantt' || panel === 'wbs') {
      setTimeout(() => this.refreshAdvancedView(panel as 'gantt' | 'wbs'), 80);
    }
    if (panel === 'critical') {
      // Small delay to let the panel become visible before Cytoscape renders
      setTimeout(() => this.loadDependencies(), 80);
    }
  }

  loadDependencies() {
    const taskIds = this.tasks().map(t => t.taskId);
    if (taskIds.length === 0) return;

    this.taskDependencyService.getAll().subscribe({
      next: (deps) => {
        const filtered = deps.filter(
          d => taskIds.includes(d.taskId) && taskIds.includes(d.dependsOnTaskId)
        );
        this.dependencies.set(filtered);
        this.cdr.markForCheck();
      },
      error: () => this.dependencies.set([])
    });
  }

  private refreshAdvancedView(panel: 'gantt' | 'wbs') {
    if (panel === 'gantt') this.renderGantt();
    if (panel === 'wbs') this.renderWBS();
  }

  toggleGroup(parentId: number) {
    const current = new Set(this.expandedGroupIds());
    current.has(parentId) ? current.delete(parentId) : current.add(parentId);
    this.expandedGroupIds.set(current);
  }

  toggleDetails(taskId: number) {
    const current = new Set(this.expandedTaskIds());
    current.has(taskId) ? current.delete(taskId) : current.add(taskId);
    this.expandedTaskIds.set(current);
  }

  renderGantt() { console.log("%c📊 Gantt activated", "color:#0ea5e9"); }
  renderWBS() { console.log("%c📋 WBS activated", "color:#0ea5e9"); }

  // ── Chart.js / AfterViewInit ─────────────────────────────────────────────

  ngAfterViewInit() {
    // Defer so canvas is visible and signals have values
    setTimeout(() => this.renderTaskDonut(), 200);
  }

  renderTaskDonut() {
    if (!this.taskDonutCanvas) return;
    const ctx = this.taskDonutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.taskDonutChart) {
      this.taskDonutChart.destroy();
      this.taskDonutChart = null;
    }

    const s = this.taskStats();
    this.taskDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Terminées', 'En cours', 'À faire', 'Bloquées'],
        datasets: [{
          data: [s.done, s.inProgress, s.todo, s.blocked],
          backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`
            }
          }
        },
      },
    });
  }

  // ── Due-date helpers used in the template ────────────────────────────────

  isDueDateOverdue(dateStr: string, status: string): boolean {
    if (!dateStr || dateStr === '-' || status === 'done') return false;
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  isDueDateToday(dateStr: string): boolean {
    if (!dateStr || dateStr === '-') return false;
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() === today.getTime();
  }
}
