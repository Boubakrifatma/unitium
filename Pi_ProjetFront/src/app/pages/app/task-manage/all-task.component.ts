import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from "@angular/core";
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
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { TaskService, TaskResponseDto } from "../../../services/TaskService/task.service";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService } from "../../../services/project-service";
import { UserDTO } from "../../../users/user.service";
import { CreateEditTaskComponent } from "./create-edit-task.component";
import { ViewTaskDialogComponent } from "./view-task-dialog.component";
import { ConfirmDeleteTaskDialogComponent } from "./confirm-delete-task-dialog.component";

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
  createdAt: string;
  updatedAt: string;
  createdByName: string;
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
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatAutocompleteModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ["./all-task.component.scss"],
})
export class AllTaskComponent implements OnInit {
  milestoneId = signal<number | null>(null);
  projectId = signal<string | null>(null);
  tasks = signal<TaskItem[]>([]);
  expandedTaskIds = signal<Set<number>>(new Set());
  searchFilter = signal("");
  viewMode = "grid";
  pageSize = 12;
  currentPage = 0;

  filteredTasks = computed(() => {
    const search = this.searchFilter().toLowerCase();
    return this.tasks().filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.status.toLowerCase().includes(search) ||
      t.assignedTo.toLowerCase().includes(search)
    );
  });

  paginatedTasks = computed(() => {
    const filtered = this.filteredTasks();
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return filtered.slice(start, end);
  });

  paginationStart = computed(() => {
    return this.filteredTasks().length === 0 ? 0 : this.currentPage * this.pageSize + 1;
  });

  paginationEnd = computed(() => {
    return Math.min((this.currentPage + 1) * this.pageSize, this.filteredTasks().length);
  });

  loading = signal(true);
  projectMembers = signal<UserDTO[]>([]);

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
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
        if (this.projectId()) {
          this.loadProjectMembers();
        }
        this.loadTasks();
      },
      error: () => {
        this.projectId.set(null);
        this.loadTasks();
      }
    });
  }

  loadProjectMembers() {
    const pid = this.projectId();
    if (!pid) return;

    this.projectService.getMembers(pid).subscribe({
      next: (members: UserDTO[]) => this.projectMembers.set(members),
      error: () => this.projectMembers.set([])
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
        const mapped = data.map(t => ({
          taskId: t.id,
          title: t.title,
          status: t.status,
          type: t.taskType,
          assignedTo: t.assignedToName || "Unassigned",
          assignedToId: t.assignedToId,
          assignHours: t.estimatedHours || 0,
          loggedHours: t.actualHours || 0,
          priority: t.priority,
          dueDate: t.dueDate || "-",
          description: t.description || "",
          startDate: t.startDate || "",
          completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
          updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
          createdByName: t.createdByName || "Unknown",
        }));
        this.tasks.set(mapped);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error("Error loading tasks", err);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchFilter.set(value);
    this.currentPage = 0;
  }

  clearSearch(input: HTMLInputElement) {
    input.value = "";
    this.searchFilter.set("");
    this.currentPage = 0;
  }

  isFiltering(): boolean {
    return this.searchFilter() !== "";
  }

  getCompletedCount(): number {
    return this.filteredTasks().filter(t => t.status === "done").length;
  }

  getInProgressCount(): number {
    return this.filteredTasks().filter(t => t.status === "in_progress").length;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      task: "assignment",
      bug: "bug_report",
      epic: "flag",
      story: "description",
      subtask: "subdirectory_arrow_right",
    };
    return map[type] || "assignment";
  }

  getDueIcon(dueDate: string): string {
    return this.isOverdue(dueDate) ? "error" : "event";
  }

  isOverdue(dueDate: string): boolean {
    if (!dueDate || dueDate === "-") return false;
    return new Date(dueDate) < new Date();
  }

  formatDate(date: string): string {
    if (!date || date === "-") return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  getProgress(task: TaskItem): number {
    if (task.assignHours === 0) return 0;
    return Math.round((task.loggedHours / task.assignHours) * 100);
  }

  truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + "…" : text;
  }

  onPageChange(event: any) {
    this.currentPage = event.pageIndex;
  }

  openView(task: TaskItem) {
    this.dialog.open(ViewTaskDialogComponent, {
      width: "90vw",
      maxWidth: "900px",
      maxHeight: "90vh",
      data: { task }
    });
  }

  openCreate() {
    const dialogRef = this.dialog.open(CreateEditTaskComponent, {
      width: "600px",
      maxWidth: "90vw",
      data: { 
        projectName: "Task Management",
        projectId: this.projectId()!,
        members: [
          { name: "Unassigned", id: null, title: "No assignment", avatarUrl: "" },
          ...this.projectMembers().map(u => ({ name: u.fullName, id: u.id, title: u.role || 'Member', avatarUrl: u.avatarUrl || '' }))
        ]
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.projectId() || !this.milestoneId()) {
          this.snackBar.open("Project or milestone not found", "Close", { duration: 3000 });
          return;
        }

        console.log("Task created:", result);
        // Create task via service
        const createTaskPayload = {
          title: result.title,
          description: result.description,
          taskType: result.type,
          status: "todo",
          priority: result.priority,
          estimatedHours: result.assignHours,
          actualHours: result.actualHours || 0,
          assignedToId: result.assignedTo,
          projectId: this.projectId()!,
          milestoneId: this.milestoneId()!,
          startDate: result.startDate,
          dueDate: result.dueDate,
        };
        
        this.taskService.create(createTaskPayload).subscribe({
          next: (newTask) => {
            this.snackBar.open("Task created successfully", "Close", { duration: 3000 });
            this.loadTasks();
          },
          error: (err) => {
            console.error("Error creating task", err);
            this.snackBar.open("Error creating task", "Close", { duration: 3000 });
          }
        });
      }
    });
  }

  openEdit(task: TaskItem) {
    const dialogRef = this.dialog.open(CreateEditTaskComponent, {
      width: "600px",
      maxWidth: "90vw",
      data: { 
        projectName: "Task Management",
        projectId: this.projectId()!,
        members: [
          { name: "Unassigned", id: null, title: "No assignment", avatarUrl: "" },
          ...this.projectMembers().map(u => ({ name: u.fullName, id: u.id, title: u.role || 'Member', avatarUrl: u.avatarUrl || '' }))
        ],
        task: task
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.projectId()) {
          this.snackBar.open("Project not found", "Close", { duration: 3000 });
          return;
        }

        console.log("Task updated:", result);
        // Update task via service
        const updateTaskPayload = {
          title: result.title,
          description: result.description,
          taskType: result.type,
          status: task.status, // Keep current status
          priority: result.priority,
          estimatedHours: result.assignHours,
          actualHours: result.actualHours || 0,
          assignedToId: result.assignedTo,
          startDate: result.startDate,
          dueDate: result.dueDate,
        };
        
        this.taskService.update(task.taskId, updateTaskPayload).subscribe({
          next: (updatedTask) => {
            this.snackBar.open("Task updated successfully", "Close", { duration: 3000 });
            this.loadTasks();
          },
          error: (err) => {
            console.error("Error updating task", err);
            this.snackBar.open("Error updating task", "Close", { duration: 3000 });
          }
        });
      }
    });
  }

  confirmDelete(task: TaskItem) {
    const dialogRef = this.dialog.open(ConfirmDeleteTaskDialogComponent, {
      width: "450px",
      data: { taskTitle: task.title }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.delete(task.taskId).subscribe({
          next: () => {
            this.snackBar.open("Task deleted successfully", "Close", { duration: 3000 });
            this.loadTasks();
          },
          error: (err) => {
            console.error("Error deleting task", err);
            this.snackBar.open("Error deleting task", "Close", { duration: 3000 });
          }
        });
      }
    });
  }

  toggleDetails(taskId: number) {
    const expanded = new Set(this.expandedTaskIds());
    if (expanded.has(taskId)) {
      expanded.delete(taskId);
    } else {
      expanded.add(taskId);
    }
    this.expandedTaskIds.set(expanded);
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = {
      todo: "radio_button_unchecked",
      in_progress: "pending",
      review: "assignment_turned_in",
      done: "check_circle",
      blocked: "block",
    };
    return map[status] || "assignment";
  }

  getPriorityIcon(priority: string): string {
    const map: Record<string, string> = {
      low: "arrow_downward",
      medium: "remove",
      high: "arrow_upward",
      critical: "priority_high",
    };
    return map[priority] || "info";
  }

  getUserColor(name: string): string {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getInitials(name: string): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }
}