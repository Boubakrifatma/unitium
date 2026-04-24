import {
  Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, inject, signal, computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatSortModule } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { RouterLink } from "@angular/router";
import { MatTooltipModule } from "@angular/material/tooltip";
import {
  DragDropModule, CdkDragDrop,
  moveItemInArray, transferArrayItem
} from "@angular/cdk/drag-drop";
import { forkJoin } from "rxjs";
import { TaskService, TaskResponseDto } from "../../../services/TaskService/task.service";
import { DeliverableService } from "../../../services/Deliverable.service";
import { UserService, UserDTO } from "../../../users/user.service";
import { ProjectService, Project } from "../../../services/project-service";
import { DeliverableDialogComponent, DeliverableFormData } from "../deliverable/deliverable-dialog.component";
import { AuthService } from "../../../auth/auth.service";

export type TaskStatus   = "new" | "in-progress" | "ready to test" | "completed" | "resolved";
export type TaskType     = "task" | "bug" | "epic" | "story" | "subtask";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskItem {
  taskId:          number;
  projectId:       string;
  projectName:     string;
  title:           string;
  description:     string;
  status:          TaskStatus;
  type:            TaskType;
  assignedTo:      string;
  assignedToEmail: string;
  priority:        TaskPriority;
  assignHours:     string;
  loggedHours:     string;
  dueDate:         string;
  hasDeliverable?: boolean;  // ✅ Indique si la tâche a un livrable
  deliverableId?:  number;   // ✅ ID du livrable associé
}

@Component({
  selector: "app-kanban",
  standalone: true,
  templateUrl: "./kanban.component.html",
  styleUrls: ["./kanban.component.scss"],
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatMenuModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule,
    MatFormFieldModule, FormsModule, MatListModule, MatInputModule,
    MatSelectModule, MatChipsModule, DragDropModule, MatTooltipModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class KanbanComponent implements OnInit {

  readonly dialog     = inject(MatDialog);
  private taskService = inject(TaskService);
  private deliverableService = inject(DeliverableService);
  private userService = inject(UserService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  // ── State (tous signals pour réactivité) ───────────────────────
  tasks                = signal<TaskItem[]>([]);
  loading              = signal(true);
  error                = signal('');
  selectedProjectId    = signal<string>('all');
  dialogLoading        = signal(false);
  taskDeliverables     = signal<Map<number, { hasDeliverable: boolean; deliverableId?: number }>>(new Map());

  // ── Projets distincts extraits des tâches ──────────────────────
  projectList = computed(() => {
    const seen = new Map<string, string>();
    this.tasks().forEach(t => {
      if (t.projectId && !seen.has(t.projectId)) {
        seen.set(t.projectId, t.projectName);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  });

  // ── Tâches filtrées selon le projet sélectionné ────────────────
  filteredTasks = computed(() => {
    const pid = this.selectedProjectId();
    if (pid === 'all') return this.tasks();
    return this.tasks().filter(t => t.projectId === pid);
  });

  // ── Projet sélectionné (pour afficher les infos) ───────────────
  selectedProject = computed(() =>
    this.projectList().find(p => p.id === this.selectedProjectId()) ?? null
  );

  // ── Summary metrics ────────────────────────────────────────────
  summaryMetrics = computed(() => {
    const all = this.filteredTasks();
    return [
      { title: 'Total Tâches', value: all.length,                                           icon: 'checklist', colorClass: 'theme-blue'   },
      { title: 'En cours',     value: all.filter(t => t.status === 'in-progress').length,   icon: 'autorenew', colorClass: 'theme-orange' },
      { title: 'À tester',     value: all.filter(t => t.status === 'ready to test').length, icon: 'verified',  colorClass: 'theme-red'    },
      { title: 'Terminées',    value: all.filter(t => t.status === 'completed').length,      icon: 'done_all',  colorClass: 'theme-green'  },
    ];
  });

  // ── Colonnes Kanban ────────────────────────────────────────────
  kanbanColumns: { id: TaskStatus; title: string; icon: string; accent: string }[] = [
    { id: 'new',           title: 'To Do',         icon: 'assignment', accent: '#8b5cf6' },
    { id: 'in-progress',   title: 'In Progress',   icon: 'autorenew',  accent: '#3b82f6' },
    { id: 'ready to test', title: 'Ready to Test', icon: 'verified',   accent: '#f59e0b' },
    { id: 'completed',     title: 'Completed',     icon: 'done_all',   accent: '#10b981' },
  ];
  columnIds = this.kanbanColumns.map(c => c.id);

  // ── View state ─────────────────────────────────────────────────
  viewMode = signal<'comfortable' | 'compact'>('comfortable');
  searchText = signal<string>('');
  priorityFilter = signal<TaskPriority | 'all'>('all');

  toggleView() {
    this.viewMode.update(v => v === 'comfortable' ? 'compact' : 'comfortable');
  }

  onSearchChange(value: string) {
    this.searchText.set(value || '');
  }

  setPriorityFilter(p: TaskPriority | 'all') {
    this.priorityFilter.set(p);
  }

  // Column tasks filtered by search + priority
  getTasksForColumn(status: TaskStatus): TaskItem[] {
    const q = this.searchText().trim().toLowerCase();
    const pr = this.priorityFilter();
    return this.filteredTasks().filter(t =>
      t.status === status &&
      (pr === 'all' || t.priority === pr) &&
      (!q ||
        t.title.toLowerCase().includes(q) ||
        t.assignedTo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q))
    );
  }

  // ── UI helpers for card rendering ──────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  getAvatarColor(name: string): string {
    const palette = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'];
    const key = name || '?';
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  getPriorityColor(priority: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#10b981',
    };
    return map[priority] ?? '#94a3b8';
  }

  private toHours(val: string | number | undefined | null): number {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  getHoursProgress(task: TaskItem): number {
    const est = this.toHours(task.assignHours);
    const done = this.toHours(task.loggedHours);
    if (est <= 0) return 0;
    return Math.min(100, Math.round((done / est) * 100));
  }

  getDueUrgency(dueDate: string): 'overdue' | 'soon' | 'normal' | '' {
    if (!dueDate) return '';
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  }

  // ── Lifecycle ──────────────────────────────────────────────────
  ngOnInit() {
    this.loadMyTasks();
  }

  loadMyTasks() {
    this.loading.set(true);
    this.error.set('');
    this.taskService.getMyTasks().subscribe({
      next: (data: TaskResponseDto[]) => {
        const mappedTasks = data.map(t => this.mapToTaskItem(t));
        this.tasks.set(mappedTasks);
        
        // ✅ Charger les livrables pour chaque tâche
        this.loadTaskDeliverables(mappedTasks);
        
        // ✅ Sélectionner automatiquement le premier projet
        const first = this.projectList()[0];
        if (first) this.selectedProjectId.set(first.id);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Impossible de charger les tâches.');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  // ── Charger les livrables pour chaque tâche ────────────────────
  private loadTaskDeliverables(tasks: TaskItem[]) {
    const deliverableMap = new Map<number, { hasDeliverable: boolean; deliverableId?: number }>();
    
    tasks.forEach(task => {
      this.deliverableService.getByTaskId(task.taskId).subscribe({
        next: (deliverables) => {
          if (deliverables && deliverables.length > 0) {
            deliverableMap.set(task.taskId, {
              hasDeliverable: true,
              deliverableId: deliverables[0].id
            });
          } else {
            deliverableMap.set(task.taskId, { hasDeliverable: false });
          }
          this.taskDeliverables.set(new Map(deliverableMap));
        },
        error: (err) => {
          console.error(`Error loading deliverables for task ${task.taskId}:`, err);
          deliverableMap.set(task.taskId, { hasDeliverable: false });
          this.taskDeliverables.set(new Map(deliverableMap));
        }
      });
    });
  }

  // ── Changer de projet ──────────────────────────────────────────
  selectProject(projectId: string) {
    this.selectedProjectId.set(projectId);
  }

  // ── Mapping backend → frontend ─────────────────────────────────
  private mapToTaskItem(t: TaskResponseDto): TaskItem {
    const deliverableInfo = this.taskDeliverables().get(t.id);
    return {
      taskId:          t.id,
      projectId:       t.projectId ?? '',
      projectName:     t.projectName ?? 'Sans projet',
      title:           t.title,
      description:     t.description ?? '',
      status:          this.mapStatus(t.status),
      type:            (t.taskType?.toLowerCase() as TaskType) ?? 'task',
      assignedTo:      t.assignedToName ?? '',
      assignedToEmail: t.assignedToEmail ?? '',
      priority:        (t.priority?.toLowerCase() as TaskPriority) ?? 'medium',
      assignHours:     t.estimatedHours != null ? `${t.estimatedHours}h` : '0h',
      loggedHours:     t.actualHours    != null ? `${t.actualHours}h`    : '0h',
      dueDate:         t.dueDate ?? '',
      hasDeliverable:  deliverableInfo?.hasDeliverable ?? false,
      deliverableId:   deliverableInfo?.deliverableId,
    };
  }

  /**
   * Vérifie si une tâche a un livrable
   */
  hasDeliverable(taskId: number): boolean {
    return this.taskDeliverables().get(taskId)?.hasDeliverable ?? false;
  }

  /**
   * Récupère l'ID du livrable d'une tâche
   */
  getDeliverableId(taskId: number): number | undefined {
    return this.taskDeliverables().get(taskId)?.deliverableId;
  }

  private mapStatus(status: string): TaskStatus {
    const map: Record<string, TaskStatus> = {
      'todo':        'new',
      'in_progress': 'in-progress',
      'review':      'ready to test',
      'done':        'completed',
      'blocked':     'new',
    };
    return map[status?.toLowerCase()] ?? 'new';
  }

  private mapStatusToBackend(status: TaskStatus): string {
    const map: Record<TaskStatus, string> = {
      'new':           'todo',
      'in-progress':   'in_progress',
      'ready to test': 'review',
      'completed':     'done',
      'resolved':      'done',
    };
    return map[status];
  }

  // ── Helpers ────────────────────────────────────────────────────
  getTasksForStatus(status: string): TaskItem[] {
    return this.filteredTasks().filter(t => t.status === status);
  }

  getPriorityClass(priority: TaskPriority): string {
    const map: Record<TaskPriority, string> = {
      'critical': 'theme-red',
      'high':     'theme-red',
      'medium':   'theme-orange',
      'low':      'theme-green',
    };
    return map[priority] ?? 'theme-orange';
  }

  getTypeBadgeClass(type: TaskType): string {
    const map: Record<TaskType, string> = {
      'task':    'theme-blue',
      'story':   'theme-blue',
      'epic':    'theme-violet',
      'subtask': 'theme-blue',
      'bug':     'theme-orange',
    };
    return map[type] ?? 'theme-blue';
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  // ── Drag & Drop ────────────────────────────────────────────────
  drop(event: CdkDragDrop<TaskItem[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    const movedTask = event.container.data[event.currentIndex];
    const newStatus = event.container.id as TaskStatus;

    // Mise à jour locale
    this.tasks.update(tasks =>
      tasks.map(t =>
        t.taskId === movedTask.taskId ? { ...t, status: newStatus } : t
      )
    );

    // Persistance backend
    const backendStatus = this.mapStatusToBackend(newStatus);
    this.taskService.updateStatus(movedTask.taskId, backendStatus).subscribe({
      error: (err) => {
        console.error('Erreur mise à jour statut:', err);
        this.loadMyTasks();
      }
    });

    // ✅ Auto-open deliverable dialog if task is completed
    if (newStatus === 'completed') {
      this.openDeliverableDialog(movedTask);
    }
  }

  // ── Open Deliverable Dialog ────────────────────────────────────
  openDeliverableDialog(task: TaskItem, mode: 'create' | 'add-version' = 'create') {
    this.dialogLoading.set(true);

    // Load only users and projects (we already have tasks from current view)
    forkJoin({
      users: this.userService.getAll(),
      projects: this.projectService.getAll(),
    }).subscribe({
      next: ({ users, projects }) => {
        this.dialogLoading.set(false);

        const activeUsers = users.filter(u => u.isActive !== false);

        // The submitter is the currently logged-in user (the one performing the action)
        const userId = this.authService.getUserId() ?? this.authService.currentUser()?.id;
        if (!userId) {
          this.error.set('Utilisateur non authentifié. Veuillez vous reconnecter.');
          return;
        }

        // Determine mode based on whether task has deliverable
        const hasExistingDeliverable = this.hasDeliverable(task.taskId);
        const dialogMode = hasExistingDeliverable ? 'add-version' : 'create';
        const deliverableId = this.getDeliverableId(task.taskId);

        // Open dialog with appropriate mode
        const dialogRef = this.dialog.open(DeliverableDialogComponent, {
          width: '600px',
          maxWidth: '95vw',
          autoFocus: false,
          panelClass: 'custom-dialog-container',
          data: {
            mode: dialogMode,
            deliverable: null,
            tasks: [{
              id: task.taskId,
              title: task.title,
              taskType: task.type,
              projectName: task.projectName
            }],
            users: activeUsers,
            projects: projects,
            currentUserId: userId,
            currentProjectId: task.projectId,
            deliverableId: deliverableId,
            hasExistingDeliverable: hasExistingDeliverable,
          } satisfies DeliverableFormData,
        });

        dialogRef.afterClosed().subscribe(saved => {
          if (saved) {
            console.log('Deliverable action completed successfully');
            // Refresh deliverables info
            this.loadTaskDeliverables(this.tasks());
          }
        });
      },
      error: (err) => {
        this.dialogLoading.set(false);
        this.error.set('Erreur lors du chargement des utilisateurs et projets.');
        console.error('Error loading deliverable dialog data:', err);
      }
    });
  }
}