import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, Input, signal, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
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
import { MatMenuModule } from "@angular/material/menu";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { RouterLink } from "@angular/router";
import { CreateEditProjectModal } from "../projects/createeditproject.component";
import { EffortLogDialogComponent } from "./time-log.component";
import { CircleProgressBlueComponent } from "../../../components/charts/circle-progress-blue.component";
import { InventoryBannerChartComponent } from "../../../components/charts/inventory-banner-chart.component";
import { CreateEditTaskComponent } from "./create-edit-task.component";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();

interface EffortLog {
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
}

export interface TaskItem {
    taskId: number;
    projectId: number;
    title: string;
    status: "new" | "ready to test" | "in-progress" | "resolved" | "completed";
    type: "Development" | "Design" | "Backend" | "Bug" | "Design Bug";
    assignedTo: string;
    assignedToimage: string;
    assignHours: string;
    loggedHours: string;
    priority: "High" | "Medium" | "Low";
    effortLogs: EffortLog[];
}

export interface TableItem {
    id: number;
    image: string;
    name: string;
    company: string;
    status: "Active" | "On Hold" | "Completed" | "";
    priority: "High" | "Medium" | "Low" | "";
    managerimage: string;
    manager: string;
    dueDate: string;
    progress: number; // Percentage
    // Added for detail view
    description: string;
    budget: number;
    tasksCompleted: number;
    totalTasks: number;
    teamSize: number;
}

interface Project {
    id: string;
    name: string;
    totalHours: string;
}

@Component({
    selector: "app-time-tracking",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, CircleProgressBlueComponent, InventoryBannerChartComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1">
                        <h3 class="mb-1">Time Tracking</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Time Tracking
                        </p>
                    </div>
                    <div class="col-12 col-md-4 col-xl-3 mb-3 mb-xl-0 ">
                        <mat-form-field class="inline-small w-100" appearance="outline">
                            <mat-select placeholder="Select Project" [formControl]="selectedProjectControl">
                                @for (project of projectList; track project.id) {
                                <mat-option [value]="project.id">{{ project.name }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                    </div>
                    <div class="col-auto order-2 mb-3 mb-xl-0">
                        <button matButton class="ms-1" (click)="openDialog()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                        <button matButton="filled" class="ms-1" (click)="createTask()"><mat-icon class="material-icons-outlined">add</mat-icon> Task</button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            @if (project()) {

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="pb-0">
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-lg-12 col-xl-6">
                            <div class="row gx-3">
                                <div class="col-auto">
                                    <div class="avatar avatar-80 coverimg rounded mb-3">
                                        <img class="d-none" [src]="project().image" alt="Project Image" />
                                    </div>
                                </div>
                                <div class="col mb-3">
                                    <h3 class="mb-1">{{ project().name }}</h3>
                                    <p class="text-secondary mb-2">{{ project().company }}</p>
                                    <span
                                        class="badge badge-light me-1"
                                        [ngClass]="{
                                            'theme-green': project().status === 'Active',
                                            'theme-orange': project().status === 'On Hold',
                                            'theme-red': project().status === 'Completed'
                                        }">
                                        {{ project().status }}
                                    </span>
                                    <span
                                        class="badge badge-light me-1"
                                        [ngClass]="{
                                            'theme-green': project().priority === 'Low',
                                            'theme-orange': project().priority === 'Medium',
                                            'theme-violet': project().priority === 'High'
                                        }">
                                        {{ project().priority }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-md-6 col-xl-3">
                            <h4 class="mb-3">Progress</h4>
                            <div class="row gx-3 mb-3">
                                <div class="col">
                                    <p>{{ project().progress }} %</p>
                                </div>
                                <div class="col-auto">
                                    <p><span class="text-secondary">Due Date: </span> {{ project().dueDate }}</p>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <mat-progress-bar class="mb-3" mode="determinate" value="{{ project().progress }}"></mat-progress-bar>
                        </div>
                        <div class="col-12 col-md-6 col-xl-3">
                            <!-- manager -->
                            <h4 class="mb-3">Manager</h4>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" [src]="project().managerimage" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">{{ project().manager }}</p>
                                    <p class="text-secondary small">ESEM, Agile, Level3</p>
                                </span>
                            </div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            <div class="row gx-3 gx-lg-4">
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-2 align-items-center">
                                <div class="col-auto mb-3">
                                    <app-circle-progress-blue class="avatar avatar-50 rounded-circle"></app-circle-progress-blue>
                                </div>
                                <div class="col-12 col-xl mb-3">
                                    <h3 class="mb-1">5<span class="text-secondary">/15</span></h3>
                                    <p class="small text-secondary">Completed</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto mb-3">
                                    <div class="avatar avatar-50 rounded bg-light-theme text-theme theme-red">
                                        <mat-icon>warning</mat-icon>
                                    </div>
                                </div>
                                <div class="col-12 col-xl mb-3">
                                    <h3 class="mb-0">5</h3>
                                    <p class="small text-secondary">High</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto mb-3">
                                    <div class="avatar avatar-50 rounded bg-light-theme text-theme theme-orange">
                                        <mat-icon>flag</mat-icon>
                                    </div>
                                </div>
                                <div class="col-12 col-xl mb-3">
                                    <h3 class="mb-0">10</h3>
                                    <p class="small text-secondary">Medium</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto mb-3">
                                    <div class="avatar avatar-50 rounded bg-light-theme text-theme theme-green">
                                        <mat-icon>flag</mat-icon>
                                    </div>
                                </div>
                                <div class="col-12 col-xl mb-3">
                                    <h3 class="mb-0">4</h3>
                                    <p class="small text-secondary">Low</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-9">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col mb-3">
                                    <h3 class="mb-1">My Tasks</h3>
                                    <p class="text-secondary small">2 Task Added, 4 Task Resolved, 1 Ready to Test</p>
                                </div>
                                <div class="col-12 col-lg-5 col-xl-4 mb-3">
                                    <mat-form-field appearance="outline" class="w-100 inline-small">
                                        <input matInput (keyup)="applyFilter($event)" placeholder="E.g., Task, Manager, Status..." #input />
                                        <mat-icon matSuffix>search</mat-icon>
                                    </mat-form-field>
                                </div>
                            </div>

                            <table mat-table [dataSource]="dataSource" matSort class="bg-none responsive-table">
                                <ng-container matColumnDef="taskId">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
                                    <td mat-cell *matCellDef="let task">
                                        <p class="fw-bold text-theme" routerLink="/app/task-details">{{ task.taskId }}</p>
                                    </td>
                                </ng-container>

                                <ng-container matColumnDef="title">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Title</th>
                                    <td mat-cell *matCellDef="let task" (dblclick)="openEffortLogDialog(task)" class="hoverview">
                                        <p>
                                            <span class="text-truncated d-inline-block align-middle" style="max-width:200px">{{ task.title }}</span>
                                            <span class="material-symbols-outlined hoverview-icon text-sm align-middle d-inline-block text-theme ms-1"> touch_double </span>
                                        </p>
                                    </td>
                                </ng-container>

                                <ng-container matColumnDef="status">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                                    <td mat-cell *matCellDef="let task">
                                        <span
                                            class="badge"
                                            [ngClass]="{
                                                'theme-orange': task.status === 'in-progress',
                                                'theme-cyan': task.status === 'ready to test',
                                                'theme-sky': task.status === 'new',
                                                'theme-violet': task.status === 'resolved',
                                                'theme-green': task.status === 'completed'
                                            }">
                                            {{ task.status | titlecase }}
                                        </span>
                                    </td>
                                </ng-container>

                                <ng-container matColumnDef="priority">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Priority</th>
                                    <td mat-cell *matCellDef="let task">
                                        <span
                                            class="badge badge-light text-theme"
                                            [ngClass]="{
                                                'theme-red': task.priority === 'High',
                                                'theme-orange': task.priority === 'Medium',
                                                'theme-green': task.priority === 'Low',
                                            }">
                                            <mat-icon class="text-sm" [class.high-priority]="task.priority === 'High'">
                                                {{ task.priority === "High" ? "warning" : "flag" }}
                                            </mat-icon>
                                            {{ task.priority | titlecase }}
                                        </span>
                                    </td>
                                </ng-container>

                                <ng-container matColumnDef="assignedHours">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Effort</th>
                                    <td mat-cell *matCellDef="let task">
                                        <p class="text-truncated" style="max-width:200px">
                                            <span class="fw-bold">{{ task.loggedHours }}</span> <small class="fw-bold text-secondary"> / {{ task.assignHours }} hrs</small>
                                        </p>
                                    </td>
                                </ng-container>

                                <!-- Actions Column -->
                                <ng-container matColumnDef="actions">
                                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                                    <td mat-cell *matCellDef="let task">
                                        <!--   <mat-form-field appearance="outline" class="inline-small width-200">
                                            <input matInput placeholder="Time Log" />
                                            <mat-icon matPrefix class="material-icons-outlined">alarm</mat-icon>
                                            <button matIconButton matSuffix>
                                                <mat-icon class="material-icons-outlined">alarm</mat-icon>
                                            </button>
                                        </mat-form-field> -->
                                        <button matIconButton (click)="openEffortLogDialog(task)">
                                            <span class="material-symbols-outlined"> more_time </span>
                                        </button>
                                        <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                        </button>
                                        <mat-menu #actionsMenu="matMenu">
                                            <button mat-menu-item>
                                                <mat-icon class="material-icons-outlined">edit</mat-icon>
                                                <span>Edit</span>
                                            </button>
                                            <button mat-menu-item (click)="deleteProject()">
                                                <mat-icon class="material-icons-outlined">delete</mat-icon>
                                                <span>Delete</span>
                                            </button>
                                        </mat-menu>
                                    </td>
                                </ng-container>

                                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                            </table>
                            <mat-paginator [pageSizeOptions]="[5, 10, 25]" aria-label="Select page of tasks" class="bg-none"></mat-paginator>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-3">
                    <!-- sales chart -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="w-100">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto mb-3 mb-lg-4">
                                        <div class="avatar avatar-40 text-theme rounded">
                                            <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                        </div>
                                    </div>
                                    <div class="col mb-3 mb-lg-4">
                                        <h3>Effort Utilization</h3>
                                    </div>
                                </div>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-0">
                            <app-inventory-banner-chart class="height-240 w-100 d-block mb-3 mb-lg-4"></app-inventory-banner-chart>
                            <div class="row gx-3 align-items-center">
                                <div class="col-6 mb-3">
                                    <h3 class="mb-1">42.50 <small>hrs</small></h3>
                                    <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-blue align-middle"></span> Billable</p>
                                </div>
                                <div class="col-6 mb-3">
                                    <h3 class="mb-1">18.00 <small>hrs</small></h3>
                                    <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-sky align-middle"></span> Non-Billable</p>
                                </div>
                                <div class="col-6 mb-3">
                                    <h3 class="mb-1">14.00 <small>hrs</small></h3>
                                    <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-light-theme theme-chartreuse align-middle"></span> Learning</p>
                                </div>
                                <div class="col-6 mb-3">
                                    <h3 class="mb-1">6.50 <small>hrs</small></h3>
                                    <p class="text-secondary small"><span class="avatar avatar-10 rounded align-middle bg-theme theme-red"></span> Idle Time</p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            }
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TimeTrackingComponent implements OnInit {
    lastLoggedDuration = signal<string | null>(null);

    // dialog
    readonly dialog = inject(MatDialog);

    // table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // projects
    projectList: Project[] = [
        { id: "1", name: "Mobile App Feature X Development", totalHours: "1200" },
        { id: "2", name: "Angular Budget Review", totalHours: "1450" },
        { id: "3", name: "HR System Integration", totalHours: "865" },
    ];
    selectedProjectControl = new FormControl<string | null>(null);

    // project details
    project = signal<TableItem>({
        id: 4,
        image: "assets/img/product4.jpg",
        name: "Mobile App Feature X Development",
        company: "PrivateJet Company",
        status: "Active",
        priority: "Medium",
        managerimage: "assets/img/user-10.jpg",
        manager: "Dana Scully",
        dueDate: "2025-12-05",
        progress: 50,
        description: "This project focuses on the development and deployment of Feature X for our primary mobile application. This feature includes a new user authentication flow, enhanced map integration, and real-time push notifications. We are currently in the mid-development phase, focusing on backend API stability and front-end state management. Strict adherence to deadlines and quality assurance is critical for a successful Q4 launch.",
        budget: 45000,
        tasksCompleted: 15,
        totalTasks: 30,
        teamSize: 19,
    });

    //tasks
    tasks: TaskItem[] = [
        {
            taskId: 101,
            projectId: 4,
            title: "Implement new auth API integration",
            status: "in-progress",
            type: "Backend",
            assignedTo: "Dana Scully",
            assignedToimage: "assets/img/user-10.jpg",
            priority: "High",
            assignHours: "20",
            loggedHours: "18",
            effortLogs: [
                { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
                { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
                { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
            ],
        },
        {
            taskId: 102,
            projectId: 4,
            title: "Design review for new map component",
            status: "ready to test",
            type: "Design",
            assignedTo: "Alice Johnson",
            assignedToimage: "assets/img/user-1.jpg",
            priority: "Medium",
            assignHours: "20",
            loggedHours: "18",
            effortLogs: [
                { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
                { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
                { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
            ],
        },
        {
            taskId: 103,
            projectId: 4,
            title: "Fix iOS scroll bug in notification view",
            status: "new",
            type: "Bug",
            assignedTo: "Bob Smith",
            assignedToimage: "assets/img/user-3.jpg",
            priority: "High",
            assignHours: "20",
            loggedHours: "0",
            effortLogs: [],
        },
        {
            taskId: 104,
            projectId: 4,
            title: "Create push notification template",
            status: "completed",
            type: "Development",
            assignedTo: "Charlie Brown",
            assignedToimage: "assets/img/user-5.jpg",
            priority: "Low",
            assignHours: "18",
            loggedHours: "16",
            effortLogs: [
                { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
                { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
                { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
            ],
        },
        {
            taskId: 105,
            projectId: 4,
            title: "Initial security audit prep",
            status: "new",
            type: "Backend",
            assignedTo: "Alice Johnson",
            assignedToimage: "assets/img/user-2.jpg",
            priority: "High",
            assignHours: "28",
            loggedHours: "0",
            effortLogs: [],
        },
        {
            taskId: 106,
            projectId: 2,
            title: "New employee onboarding flow mockups",
            status: "new",
            type: "Design",
            assignedTo: "Jane Smith",
            assignedToimage: "assets/img/user-4.jpg",
            priority: "Medium",
            assignHours: "25",
            loggedHours: "21",
            effortLogs: [
                { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
                { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
                { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
            ],
        },
        {
            taskId: 107,
            projectId: 2,
            title: "API Endpoint setup for profiles",
            status: "in-progress",
            type: "Backend",
            assignedTo: "Jane Smith",
            assignedToimage: "assets/img/user-4.jpg",
            priority: "Medium",
            assignHours: "15",
            loggedHours: "0",
            effortLogs: [],
        },
        {
            taskId: 108,
            projectId: 1,
            title: "Fix checkout CSS bug",
            status: "resolved",
            type: "Design Bug",
            assignedTo: "John Doe",
            assignedToimage: "assets/img/user-7.jpg",
            priority: "Low",
            assignHours: "20",
            loggedHours: "18",
            effortLogs: [
                { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
                { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
                { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
            ],
        },
        {
            taskId: 109,
            projectId: 3,
            title: "Aggregate Q3 Facebook data",
            status: "new",
            type: "Backend",
            assignedTo: "Bob Johnson",
            assignedToimage: "assets/img/user-9.jpg",
            priority: "Medium",
            assignHours: "19",
            loggedHours: "0",
            effortLogs: [],
        },
    ];

    projectMembers = [
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

    dataSource = new MatTableDataSource<TaskItem>(this.tasks);
    displayedColumns: string[] = ["taskId", "title", "status", "priority", "assignedHours", "actions"];

    ngOnInit() {
        if (this.projectList.length > 0) {
            this.selectedProjectControl.setValue(this.projectList[0].id);
        }
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        // Optional: Reset to the first page if filtering causes issues with the current page
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    deleteProject() {
        console.log("Deleting order:", this.project());
        // Logic for deleting an order goes here
    }

    openDialog() {
        this.dialog.open(CreateEditProjectModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: this.project(),
        });
    }

    openEffortLogDialog(tasks: TaskItem): void {
        this.dialog.open(EffortLogDialogComponent, {
            width: "500px",
            maxWidth: "500px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: tasks,
        });
    }

    createTask() {
        this.dialog.open(CreateEditTaskComponent, {
            width: "500px",
            maxWidth: "500px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: {
                projectName: this.project().name,
                projectId: this.project().id,
                members: this.projectMembers,
            },
        });
    }
}
