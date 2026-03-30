import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, Input, signal, inject, computed } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatDialog } from "@angular/material/dialog";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { RouterLink } from "@angular/router";
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from "@angular/cdk/drag-drop";
import { CreateEditTaskComponent } from "./create-edit-task.component";

export interface EffortLog {
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
}

export type TaskStatus = "new" | "ready to test" | "in-progress" | "resolved" | "completed";
export type TaskType = "Development" | "Design" | "Backend" | "Bug" | "Design Bug";
export type TaskPriority = "High" | "Medium" | "Low";
export type ProjectStatus = "Active" | "On Hold" | "Completed" | "";
export type ProjectPriority = "High" | "Medium" | "Low" | "";

export interface TaskItem {
    description: string;
    taskId: number;
    projectId: number;
    title: string;
    status: TaskStatus;
    type: TaskType;
    assignedTo: string;
    priority: TaskPriority;
    assignHours: string;
    loggedHours: string;
    assignedToImage: string;
    effortLogs: EffortLog[];
}

export interface ProjectData {
    id: number;
    image: string;
    projectName: string;
    company: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    managerImage: string;
    manager: string;
    dueDate: string;
    progress: number;
    description: string;
    budget: number;
    tasksCompleted: number;
    totalTasks: number;
    teamSize: number;
    tasks: TaskItem[];
}

const projectMembers = [
    { id: 1, name: "Ava Johnson", avatarUrl: "assets/img/user-1.jpg", title: "Software Engineer" },
    { id: 2, name: "Ben Smith", avatarUrl: "assets/img/user-3.jpg", title: "Product Manager" },
    { id: 3, name: "Chloe Lee", avatarUrl: "assets/img/user-2.jpg", title: "UX Designer" },
    { id: 4, name: "David Chen", avatarUrl: "assets/img/user-5.jpg", title: "Data Analyst" },
    { id: 5, name: "Ella Garcia", avatarUrl: "assets/img/user-4.jpg", title: "Marketing Specialist" },
    { id: 6, name: "Finn O'Connell", avatarUrl: "assets/img/user-7.jpg", title: "Sales Director" },
    { id: 7, name: "Grace Kim", avatarUrl: "assets/img/user-6.jpg", title: "HR Coordinator" },
    { id: 8, name: "Henry Davis", avatarUrl: "assets/img/user-9.jpg", title: "DevOps Engineer" },
    { id: 9, name: "Ivy Ross", avatarUrl: "assets/img/user-8.jpg", title: "Financial Controller" },
    { id: 10, name: "Jack Miller", avatarUrl: "assets/img/user-9.jpg", title: "CTO" },
];

@Component({
    selector: "app-kanban",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, DragDropModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Task Progress: Kanban</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Kanban Chart
                        </p>
                    </div>

                    <div class="col-8 col-md-6 col-lg-4 col-xl-3 mb-3 mb-xl-0">
                        <mat-form-field appearance="outline" class="w-100 inline-small">
                            <mat-select [ngModel]="selectedProjectId()" (ngModelChange)="selectedProjectId.set($event)">
                                @for (project of projects(); track project.id) {
                                <mat-option [value]="project.id">{{ project.projectName }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                    </div>
                    <div class="col-auto mb-3 mb-xl-0">
                        <button matButton="filled" (click)="createTask()" class="ms-1"><mat-icon class="material-icons-outlined">add</mat-icon> Task</button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            @if (selectedProject()){
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="pb-0">
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-lg-12 col-xl-6">
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-80 coverimg rounded mb-3" style="background-image:url('{{ selectedProject()!.image }}')">
                                        <!-- <img class="d-none" [src]="selectedProject()!.image" alt="Project Image" /> -->
                                    </div>
                                </div>
                                <div class="col mb-3">
                                    <h3 class="mb-1">{{ selectedProject()!.projectName }}</h3>
                                    <p class="text-secondary mb-2">{{ selectedProject()!.company }}</p>
                                    <span
                                        class="badge badge-light me-1"
                                        [ngClass]="{
                                            'theme-green': selectedProject()!.status === 'Active',
                                            'theme-orange': selectedProject()!.status === 'On Hold',
                                            'theme-red': selectedProject()!.status === 'Completed'
                                        }">
                                        {{ selectedProject()!.status }}
                                    </span>
                                    <span
                                        class="badge me-1"
                                        [ngClass]="{
                                            'theme-green': selectedProject()!.priority === 'Low',
                                            'theme-orange': selectedProject()!.priority === 'Medium',
                                            'theme-violet': selectedProject()!.priority === 'High'
                                        }">
                                        {{ selectedProject()!.priority }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-md-6 col-xl-3">
                            <h4 class="mb-3">Progress</h4>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <p>{{ selectedProject()!.progress }} %</p>
                                </div>
                                <div class="col-auto">
                                    <p><span class="text-secondary">Due Date: </span> {{ selectedProject()!.dueDate }}</p>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <mat-progress-bar class="mb-3" mode="determinate" value="{{ selectedProject()!.progress }}"></mat-progress-bar>
                        </div>
                        <div class="col-12 col-md-6 col-xl-3">
                            <!-- manager -->
                            <h4 class="mb-3">Manager</h4>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2" style="background-image:url('{{ selectedProject()!.managerImage }}')">
                                    <img class="d-none" [src]="selectedProject()!.managerImage" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">{{ selectedProject()!.manager }}</p>
                                    <p class="text-secondary small">ESEM, Agile, Level3</p>
                                </span>
                            </div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            <!-- Summary cards -->
            <div class="row gx-3 gx-lg-4">
                @for (summary of summaryMetrics(); track summary.title) {
                <div class="col-6 col-md-6 col-lg-3">
                    <mat-card class="mb-3 mb-lg-4" [ngClass]="summary.colorClass">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3">
                                <div class="col-12 col-md-auto col-lg-12 col-xl-auto mb-3">
                                    <div class="avatar avatar-50 bg-light-theme text-theme rounded">
                                        <mat-icon class="material-icons-outlined">{{ summary.icon }}</mat-icon>
                                    </div>
                                </div>
                                <div class="col-12 col-md col-lg-12 col-xl mb-3">
                                    <p class="text-secondary small mb-1">{{ summary.title }}</p>
                                    <h2 class="">{{ summary.value }}</h2>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>

            <!-- Kanban wrapper -->
            @if (selectedProject()) {
            <div class="row gx-3 gx-lg-4">
                <!-- Kanban columns -->
                @for (column of kanbanColumns; track column.id) {
                <div class="col-12 col-sm-6 col-lg-3" [ngClass]="column.titleClass">
                    <mat-card class="mb-3 mb-lg-4 p-2 pb-0 bg-light-theme shadow-none">
                        <h4 class="text-theme p-3 mb-2">
                            <mat-icon class="align-middle material-icons-outlined me-2">{{ column.icon }}</mat-icon>
                            {{ column.title }} <span class="badge badge-light align-middle ms-2">{{ getTasksForStatus(column.id).length }}</span>
                        </h4>

                        <!-- CDK Drop list wrap -->
                        <div cdkDropList [id]="column.id" [cdkDropListData]="getTasksForStatus(column.id)" [cdkDropListConnectedTo]="columnIds()" (cdkDropListDropped)="drop($event)" class="">
                            <!-- task card -->
                            @for (task of getTasksForStatus(column.id); track task.taskId) {
                            <div cdkDrag>
                                <mat-card class="mb-2" style="cursor:grab">
                                    <mat-card-content>
                                        <p>{{ task.title }}</p>

                                        <p class="mb-2">
                                            <mat-icon class="material-icons-outlined text-sm me-2 text-theme">schedule</mat-icon>
                                            <span>{{ task.loggedHours }} / {{ task.assignHours }}</span>
                                        </p>
                                        <p class="mb-3">
                                            <mat-icon class="material-icons-outlined text-sm me-2 text-theme">person</mat-icon>
                                            <span>{{ task.assignedTo }}</span>
                                        </p>
                                        <div class="row gx-3">
                                            <div class="col">
                                                <p class="mb-2">
                                                    <span class="badge badge-light" [ngClass]="getTypeBadgeClass(task.type)">
                                                        {{ task.type }}
                                                    </span>
                                                </p>
                                            </div>
                                            <div class="col-auto">
                                                <p class="mb-2">
                                                    <span class="badge ms-1" [ngClass]="getPriorityClass(task.priority)">
                                                        {{ task.priority }}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <!-- drag handle -->
                                        <div class="text-secondary text-center position-absolute bottom-0 start-0 end-0 opacity-50">
                                            <mat-icon class="material-icons-outlined">drag_handle</mat-icon>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                            }

                            <!-- Placeholder for Empty List -->
                            @if (getTasksForStatus(column.id).length === 0) {
                            <mat-card class="height-100 w-100 d-flex align-items-center justify-content-center text-center text-theme opacity-50 mb-2">
                                <div>Drop here</div>
                            </mat-card>
                            }
                        </div>
                    </mat-card>
                </div>
                }
            </div>
            } @else {
            <div class="text-center p-12 bg-white rounded-xl shadow-lg">
                <h3 class="text-xl font-medium text-gray-600">Please select a project to view the dashboard.</h3>
            </div>
            }
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class KanbanComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

    projectData: ProjectData[] = [
        {
            id: 1,
            image: "assets/img/product1.jpg",
            projectName: "Redesign User Dashboard",
            company: "Innovate Solutions",
            status: "Active",
            priority: "High",
            managerImage: "assets/img/user-10.jpg",
            manager: "Jane Doe",
            dueDate: "2025-11-30",
            progress: 60,
            description: "Complete overhaul of the main user interface.",
            budget: 15000,
            tasksCompleted: 6,
            totalTasks: 10,
            teamSize: 5,
            tasks: [
                { taskId: 101, projectId: 1, title: "Create wireframes", status: "completed", type: "Design", assignedTo: "Jane Johnson", priority: "High", assignHours: "12h", loggedHours: "12h", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 102, projectId: 1, title: "Setup component library", status: "in-progress", type: "Development", assignedTo: "John Williams", priority: "High", assignHours: "40h", loggedHours: "15h 30m", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 103, projectId: 1, title: "Define data models", status: "new", type: "Backend", assignedTo: "Alice Brown", priority: "Medium", assignHours: "20h", loggedHours: "0h", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 104, projectId: 1, title: "Fix modal overflow bug", status: "ready to test", type: "Bug", assignedTo: "Bob Davis", priority: "High", assignHours: "4h", loggedHours: "4h", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 105, projectId: 1, title: "Review design system guide", status: "new", type: "Design", assignedTo: "Daniel Wilson", priority: "Medium", assignHours: "8h", loggedHours: "0h", description: "", assignedToImage: "", effortLogs: [] },
            ],
        },
        {
            id: 2,
            image: "assets/img/product2.jpg",
            projectName: "API Microservice Migration",
            company: "Innovate Solutions",
            status: "On Hold",
            priority: "Low",
            managerImage: "assets/img/user-9.jpg",
            manager: "Mike Tech",
            dueDate: "2026-03-01",
            progress: 25,
            description: "Move monolithic API to serverless microservices.",
            budget: 45000,
            tasksCompleted: 1,
            totalTasks: 4,
            teamSize: 3,
            tasks: [
                { taskId: 201, projectId: 2, title: "Audit current API endpoints", status: "completed", type: "Backend", assignedTo: "Mike", priority: "High", assignHours: "16h", loggedHours: "16h", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 202, projectId: 2, title: "Setup AWS Lambda infra", status: "new", type: "Backend", assignedTo: "Mike", priority: "High", assignHours: "24h", loggedHours: "0h", description: "", assignedToImage: "", effortLogs: [] },
                { taskId: 203, projectId: 2, title: "Refactor Auth module", status: "in-progress", type: "Development", assignedTo: "Sara", priority: "Medium", assignHours: "30h", loggedHours: "5h", description: "", assignedToImage: "", effortLogs: [] },
            ],
        },
    ];
    projects = signal<ProjectData[]>(this.projectData);
    selectedProjectId = signal(this.projectData[0].id);
    selectedProject = computed(() => this.projects().find((p) => p.id === this.selectedProjectId()));

    columnIds = computed(() => this.kanbanColumns.map((c) => c.id));

    // Kanban Column Definitions
    kanbanColumns = [
        { id: "new", title: "To Do", icon: "assignment", titleClass: "theme-violet" },
        { id: "in-progress", title: "In Progress", icon: "autorenew", titleClass: "theme-blue" },
        { id: "ready to test", title: "Ready to Test", icon: "verified", titleClass: "theme-red" },
        { id: "completed", title: "Completed", icon: "done_all", titleClass: "theme-green" },
    ];

    // helper functions
    private calculateEffortSum(tasks: TaskItem[], field: "assignHours" | "loggedHours"): string {
        const totalMinutes = tasks.reduce((sum, task) => {
            const value = task[field];
            const match = value.match(/(\d+)\s*h\s*(\d*)\s*m?|(\d+)/i);
            if (match) {
                let hours = 0;
                let minutes = 0;

                if (match[1]) {
                    hours = parseInt(match[1], 10);
                    minutes = parseInt(match[2] || "0", 10);
                } else if (match[3]) {
                    hours = parseInt(match[3], 10);
                }

                return sum + hours * 60 + minutes;
            }
            return sum;
        }, 0);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    summaryMetrics = computed(() => {
        const project = this.selectedProject();
        if (!project) return [];

        const totalTasks = project.tasks.length;
        const totalEffort = this.calculateEffortSum(project.tasks, "assignHours");
        const effortInvested = this.calculateEffortSum(project.tasks, "loggedHours");
        const totalBudget = project.budget.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

        return [
            { title: "Total Budget", value: totalBudget, icon: "account_balance_wallet", colorClass: "theme-blue" },
            { title: "Total Tasks", value: totalTasks, icon: "checklist", colorClass: "theme-green" },
            { title: "Total Effort", value: totalEffort, icon: "timer", colorClass: "theme-orange" },
            { title: "Effort Invested", value: effortInvested, icon: "trending_up", colorClass: "theme-red" },
        ];
    });

    getTasksForStatus(status: TaskStatus | string): TaskItem[] {
        const project = this.selectedProject();
        if (!project) return [];
        return project.tasks.filter((t) => t.status === status);
    }

    getPriorityClass(priority: TaskPriority): string {
        switch (priority) {
            case "High":
                return "theme-red";
            case "Medium":
                return "theme-orange";
            case "Low":
                return "theme-green";
            default:
                return "theme-yellow";
        }
    }

    getTypeBadgeClass(type: TaskType): string {
        switch (type) {
            case "Development":
                return "theme-blue";
            case "Design":
                return "theme-red";
            case "Backend":
                return "theme-violet";
            case "Bug":
            case "Design Bug":
                return "theme-orange";
            default:
                return "theme-blue";
        }
    }

    // drag and drop
    drop(event: CdkDragDrop<TaskItem[]>) {
        const previousStatus = event.previousContainer.id as TaskStatus;
        const newStatus = event.container.id as TaskStatus;
        const currentProject = this.selectedProject();

        if (!currentProject) return;

        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

            const taskToMove = event.container.data[event.currentIndex];

            this.projects.update((projects) => {
                const projectIndex = projects.findIndex((p) => p.id === currentProject.id);

                if (projectIndex !== -1) {
                    const updatedProjects = [...projects];
                    const updatedProject = { ...updatedProjects[projectIndex] };
                    const updatedTasks = [...updatedProject.tasks];

                    const taskIndexInProject = updatedTasks.findIndex((t) => t.taskId === taskToMove.taskId);

                    if (taskIndexInProject !== -1) {
                        updatedTasks[taskIndexInProject] = {
                            ...updatedTasks[taskIndexInProject],
                            status: newStatus,
                        };

                        updatedProject.tasks = updatedTasks;
                        updatedProjects[projectIndex] = updatedProject;

                        return updatedProjects;
                    }
                }
                return projects;
            });
        }
    }

    ngOnInit() {}
    ngAfterViewInit() {}

    createTask() {
        const project = this.selectedProject();
        if (!project) return;

        this.dialog.open(CreateEditTaskComponent, {
            width: "500px",
            maxWidth: "500px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: {
                projectName: project.projectName,
                projectId: project.id,
                members: projectMembers,
            },
        });
    }
}
