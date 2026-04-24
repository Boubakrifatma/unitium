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
import { MatTooltipModule } from "@angular/material/tooltip";

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
    selector: "app-gantt-chart",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatMenuModule, MatTooltipModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, DragDropModule],
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

                    <div class="col-8 col-md-6 col-lg-4 col-xl-3">
                        <mat-form-field appearance="outline" class="w-100 inline-small mb-3 mb-xl-0">
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

            <!-- Gantt -->

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <div class="row border-bottom ">
                        <div class="col-6 col-lg-3 order-1 order-lg-1">
                            <h4>Task <br />Assigned to</h4>
                        </div>
                        <div class="col-12 col-lg-6 order-3 order-lg-2">
                            <h4 class="mb-1 text-center">Progress Timeline</h4>
                            <p class="text-secondary small text-center mb-3">(Max {{ VISUALIZATION_CAP_HOURS }}h View)</p>
                            <div class="row border-top">
                                @for (h of timelineMarkers(); track $index) {
                                <div class="col py-1 border-end border-start" [class]="getTimelineSegmentClass($index, timelineMarkers().length)">
                                    <span class=" text-truncated">{{ h }} hrs</span>
                                </div>
                                }
                            </div>
                        </div>
                        <div class="col-6 col-lg-3 order-2 order-lg-3 text-end">
                            <h4>Logged/Assigned<br />Efforts</h4>
                        </div>
                    </div>

                    <!-- Gantt Grid Body (Tasks) -->
                    @if (processedTasks().length === 0) {
                    <div class="text-center mb-4">
                        <img src="assets/img/noproduct.png" alt="" class="width-300 mt-4 mt-lg-5" />
                        <h3 class="mb-1">No data found</h3>
                        <p class="text-secondary">No tasks or total assigned hours are zero for this project.</p>
                    </div>
                    } @else { @for (task of processedTasks(); track task.taskId) {
                    <div class="row align-items-center " [class.border-bottom]="!$last">
                        <!--Task Title & Assignee -->
                        <div class="col-6 col-lg-3 order-1 order-lg-1 py-3">
                            <h4 class="text-truncated mb-1">{{ task.taskId }}. {{ task.title }}</h4>
                            <div class="row gx-2 align-items-center">
                                <div class="col-auto">
                                    <span class="avatar avatar-20 coverimg rounded-circle align-middle" style="background-image:url('{{ task.assignedToImage }}')">
                                        <img class="d-none" [src]="task.assignedToImage" alt="Team Image" />
                                    </span>
                                </div>
                                <div class="col">
                                    <p class="text-secondary">{{ task.assignedTo }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Chart Area (Max 40h View) -->
                        <div class="col-12 col-lg-6 order-3 order-lg-2 px-lg-0 pb-3 py-lg-3">
                            <div class="position-relative mb-1">
                                <mat-progress-bar
                                    mode="determinate"
                                    class="height-15"
                                    [ngClass]="{
                                        'theme-green': task.status === 'completed',
                                        'theme-orange': task.status === 'ready to test',
                                        'theme-sky opacity-50': task.status === 'new',
                                        'theme-violet': task.status === 'in-progress',
                                        'theme-cyan': task.status === 'resolved'
                                    }"
                                    value="{{ task.loggedWidthPercentage }}"
                                    matTooltip="Logged: {{ task.loggedHoursNum.toFixed(1) }}h"></mat-progress-bar>
                                @if (task.isRunOverCap) {
                                <div class="h-100 position-absolute top-0 end-0 bg-theme theme-red" style="width: {{ (100 * ((task.assignHoursNum - task.loggedHoursNum) * -1)) / VISUALIZATION_CAP_HOURS }}%" matTooltip="Logged {{ task.loggedHoursNum }}h exceed {{ (task.assignHoursNum - task.loggedHoursNum) * -1 }}h more from assigned {{ task.assignHoursNum }}h task"></div>
                                }
                            </div>
                            <div class="position-relative opacity-50 mb-0">
                                <mat-progress-bar mode="determinate" class="height-15 theme-sky" value="{{ task.assignedWidthPercentage }}" matTooltip="Assigned: {{ task.assignHoursNum.toFixed(1) }}h"></mat-progress-bar>

                                @if (task.isOverCap) {
                                <div class="h-100 position-absolute top-0 start-0 bg-theme theme-orange" style="width: {{ task.assignHoursNum - VISUALIZATION_CAP_HOURS }}%" matTooltip="Total effort ({{ task.assignHoursNum.toFixed(1) }}h) exceeds {{ VISUALIZATION_CAP_HOURS }}h view cap"></div>
                                }
                            </div>
                        </div>

                        <!-- Total Time Allocation / Status -->
                        <div class="col-6 col-lg-3 order-2 order-lg-3 py-3 text-end">
                            <h4 class="mb-1">
                                {{ task.loggedHours }} <span class="text-secondary"> /{{ task.assignHours }}</span>
                            </h4>
                            <span
                                class="badge me-1"
                                [ngClass]="{
                                    'theme-green': task.status === 'completed',
                                    'theme-orange': task.status === 'ready to test',
                                    'theme-sky': task.status === 'new',
                                    'theme-violet': task.status === 'in-progress',
                                    'theme-cyan': task.status === 'resolved'
                                }">
                                {{ task.status | titlecase }}
                            </span>
                            <span
                                class="badge badge-light me-1"
                                [ngClass]="{
                                    'theme-red': task.priority === 'High',
                                    'theme-green': task.priority === 'Low',
                                    'theme-orange': task.priority === 'Medium',
                                }">
                                {{ task.priority | titlecase }}
                            </span>
                        </div>
                    </div>
                    } }
                </mat-card-content>
            </mat-card>
        </div>
    `,
    styles: [
        `
            mat-progress-bar.height-15 {
                --mat-progress-bar-track-height: 15px;
                --mat-progress-bar-active-indicator-height: 15px;
            }
        `,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GanttChartComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

    // default hours
    VISUALIZATION_CAP_HOURS = 40;

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
                { taskId: 101, projectId: 1, title: "Create wireframes", status: "completed", type: "Design", assignedTo: "Jane Johnson", priority: "Low", assignHours: "12h", loggedHours: "11h", description: "", assignedToImage: "assets/img/user-1.jpg", effortLogs: [] },
                { taskId: 102, projectId: 1, title: "Setup component library", status: "in-progress", type: "Development", assignedTo: "John Williams", priority: "High", assignHours: "43h", loggedHours: "15h 30m", description: "", assignedToImage: "assets/img/user-3.jpg", effortLogs: [] },
                { taskId: 103, projectId: 1, title: "Define data models", status: "new", type: "Backend", assignedTo: "Alice Brown", priority: "Medium", assignHours: "20h", loggedHours: "0h", description: "", assignedToImage: "assets/img/user-4.jpg", effortLogs: [] },
                { taskId: 104, projectId: 1, title: "Fix modal overflow bug", status: "ready to test", type: "Bug", assignedTo: "Bob Davis", priority: "High", assignHours: "4h", loggedHours: "10h", description: "", assignedToImage: "assets/img/user-5.jpg", effortLogs: [] },
                { taskId: 105, projectId: 1, title: "Review design system guide", status: "new", type: "Design", assignedTo: "Daniel Wilson", priority: "Medium", assignHours: "8h", loggedHours: "0h", description: "", assignedToImage: "assets/img/user-6.jpg", effortLogs: [] },
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
                { taskId: 201, projectId: 2, title: "Audit current API endpoints", status: "completed", type: "Backend", assignedTo: "Mike Williams", priority: "High", assignHours: "16h", loggedHours: "15h", description: "", assignedToImage: "assets/img/user-3.jpg", effortLogs: [] },
                { taskId: 202, projectId: 2, title: "Setup AWS Lambda infra", status: "new", type: "Backend", assignedTo: "Alice Brown", priority: "High", assignHours: "24h", loggedHours: "0h", description: "", assignedToImage: "assets/img/user-8.jpg", effortLogs: [] },
                { taskId: 203, projectId: 2, title: "Refactor Auth module", status: "in-progress", type: "Development", assignedTo: "Sara Davis", priority: "Medium", assignHours: "30h", loggedHours: "15h", description: "", assignedToImage: "assets/img/user-6.jpg", effortLogs: [] },
            ],
        },
    ];
    projects = signal<ProjectData[]>(this.projectData);
    selectedProjectId = signal(this.projectData[0].id);
    selectedProject = computed(() => this.projects().find((p) => p.id === this.selectedProjectId()));

    ngOnInit() {}
    ngAfterViewInit() {}

    parseHoursStringToNumber(hoursString: string | undefined): number {
        if (!hoursString) return 0;
        const match = hoursString.toLowerCase().match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/);

        if (!match) {
            const numberPart = parseFloat(hoursString);
            return isNaN(numberPart) ? 0 : numberPart;
        }

        const hours = parseInt(match[1] as string) || 0;
        const minutes = parseInt(match[2] as string) || 0;

        return hours + minutes / 60;
    }

    totalProjectHours = computed(() => {
        const project = this.selectedProject();
        if (!project) return 0;
        return project.tasks.reduce((sum, task) => sum + this.parseHoursStringToNumber(task.assignHours), 0);
    });

    processedTasks = computed(() => {
        const project = this.selectedProject();
        const maxHours = this.VISUALIZATION_CAP_HOURS;

        if (!project || this.totalProjectHours() === 0) return [];

        return project.tasks.map((task) => {
            const assignHoursNum = this.parseHoursStringToNumber(task.assignHours);
            const loggedHoursNum = this.parseHoursStringToNumber(task.loggedHours);

            const scaledHours = Math.min(assignHoursNum, maxHours);
            const assignedWidthPercentage = (scaledHours / maxHours) * 100;

            const loggedWidthPercentage = assignHoursNum > 0 ? (loggedHoursNum / maxHours) * 100 : 0;

            return {
                ...task,
                assignHoursNum,
                loggedHoursNum,
                assignedWidthPercentage,
                loggedWidthPercentage: Math.min(100, loggedWidthPercentage), // Cap at 100%
                isOverCap: assignHoursNum > maxHours,
                isRunOverCap: loggedHoursNum > assignHoursNum,
            };
        });
    });

    // Timeline markers for the chart header (0, 10, 20, 30, 40 hours)
    timelineMarkers = computed(() => {
        const cap = this.VISUALIZATION_CAP_HOURS;
        return [0, Math.floor(cap * 0.25), Math.floor(cap * 0.5), Math.floor(cap * 0.75), cap];
    });

    // Methods for Template Interaction
    selectProject(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.selectedProjectId.set(parseInt(target.value));
    }

    // Gets the Tailwind classes for timeline header segments.
    getTimelineSegmentClass(index: number, length: number): string {
        const isLast = index === length - 1;
        const isFirst = index === 0;
        // Each segment (0-10, 10-20, 20-30, 30-40) takes 25% of the chart width 0 status hidden by d-none class
        const segmentWidth = isFirst ? "d-none border-start" : "text-end";
        return `${segmentWidth} `;
    }

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
