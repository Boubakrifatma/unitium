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
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { CircleProgressBlueComponent } from "../../../components/charts/circle-progress-blue.component";
import { RouterLink } from "@angular/router";
import { EffortLogDialogComponent } from "../task-manage/time-log.component";
import { CreateEditProjectModal } from "../projects/createeditproject.component";
import { MatTabsModule } from "@angular/material/tabs";
import { CreateEditTaskComponent } from "./create-edit-task.component";

export interface EffortLog {
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
}
export interface TaskItem {
    description: string;
    taskId: number;
    projectId: number;
    title: string;
    status: "new" | "ready to test" | "in-progress" | "resolved" | "completed";
    type: "Development" | "Design" | "Backend" | "Bug" | "Design Bug";
    assignedTo: string;
    priority: "High" | "Medium" | "Low";
    assignHours: string;
    loggedHours: string;
    assignedToimage: string;
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
    progress: number;
    description: string;
    budget: number;
    tasksCompleted: number;
    totalTasks: number;
    teamSize: number;
}

interface Comment {
    id: number;
    user: string;
    timestamp: Date;
    text: string;
}

interface Activity {
    id: number;
    icon: string;
    user: string;
    action: string;
    target: string;
    timestamp: Date;
}

@Component({
    selector: "app-task-details",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatTabsModule, MatMenuModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">#{{ tasks().taskId }}: {{ tasks().title }}</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            <span routerLink="/app/projects" class="me-2 text-theme style-none">Projects</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            <span routerLink="/app/time-tracking" class="me-2 text-theme style-none">Project Details</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Task Details
                        </p>
                    </div>

                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matButton class="ms-1" (click)="createTask()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                        <button matButton="filled" class="ms-1" (click)="createTask()"><mat-icon class="material-icons-outlined">add</mat-icon> Task</button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col mb-3">
                                    <h3 class="mb-1">Description</h3>
                                </div>
                                <div class="col-auto mb-3">
                                    <button matIconButton (click)="createTask()"><mat-icon class="material-icons-outlined">edit</mat-icon></button>
                                </div>
                            </div>
                            <div [innerHTML]="tasks().description"></div>
                            <br />
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col mb-3">
                                    <h3 class="mb-1">Sub Tasks (3)</h3>
                                </div>
                                <div class="col-auto mb-3">
                                    <button matIconButton="filled" (click)="createTask()" class="ms-1"><mat-icon class="material-icons-outlined">add</mat-icon></button>
                                </div>
                            </div>
                            <mat-nav-list>
                                <a mat-list-item>
                                    <mat-icon matListItemIcon>check_small</mat-icon>
                                    <div class="row gx-3">
                                        <div class="col">
                                            <p>Server-Side templating</p>
                                        </div>
                                        <div class="col-auto">
                                            <span class="badge badge-light theme-blue me-1">Development</span>
                                            <span class="badge theme-green me-1">Low</span>
                                        </div>
                                    </div>
                                </a>
                                <a mat-list-item>
                                    <mat-icon matListItemIcon>check_small</mat-icon>
                                    <div class="row gx-3">
                                        <div class="col">
                                            <p>Client side integration</p>
                                        </div>
                                        <div class="col-auto">
                                            <span class="badge badge-light theme-violet me-1">Backend</span>
                                            <span class="badge theme-red me-1">High</span>
                                        </div>
                                    </div>
                                </a>
                                <a mat-list-item>
                                    <mat-icon matListItemIcon>check_small</mat-icon>
                                    <div class="row gx-3">
                                        <div class="col">
                                            <p>Responsive design support</p>
                                        </div>
                                        <div class="col-auto">
                                            <span class="badge badge-light theme-red me-1">Design</span>
                                            <span class="badge theme-orange me-1">Medium</span>
                                        </div>
                                    </div>
                                </a>
                            </mat-nav-list>
                        </mat-card-content>
                    </mat-card>

                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="p-0">
                            <mat-tab-group animationDuration="300ms">
                                <!-- Comments Tab -->
                                <mat-tab>
                                    <ng-template mat-tab-label>
                                        <mat-icon class="me-2">comment</mat-icon>
                                        Comments <span class="badge badge-light ms-2">{{ comments().length }}</span>
                                    </ng-template>

                                    <div class="px-3">
                                        <!-- New Comment Input Area -->
                                        <mat-form-field appearance="outline" class="w-100 my-3 mt-lg-4">
                                            <mat-label>Add a comment...</mat-label>
                                            <input matInput rows="3" [(ngModel)]="newCommentText" (keyup.enter)="addComment()" />
                                            <button matIconButton matSuffix class="text-theme me-2" (click)="addComment()" [disabled]="!newCommentText() || newCommentText().trim().length === 0" aria-label="Send comment">
                                                <mat-icon>send</mat-icon>
                                            </button>
                                        </mat-form-field>

                                        <!-- Comment List -->
                                        @for (comment of sortedComments(); track comment.id) {

                                        <div class="row gx-3 mb-3">
                                            <div class="col-auto">
                                                <!-- Avatar placeholder -->
                                                <div class="avatar avatar-40 bg-light-theme text-theme fw-bold rounded-circle">
                                                    {{ comment.user.charAt(0) }}
                                                </div>
                                            </div>
                                            <div class="col">
                                                <p class="fw-bold mb-1">{{ comment.user }}</p>
                                                <p class="text-secondary small">{{ comment.timestamp | date : "MMM d, h:mm a" }}</p>

                                                <p>{{ comment.text }}</p>
                                            </div>
                                        </div>
                                        @if (!$last) {
                                        <mat-divider class="mb-3"></mat-divider>} } @if (comments().length === 0) {
                                        <p class="text-center text-secondary">No comments yet. Start a discussion!</p>
                                        }
                                    </div>
                                </mat-tab>

                                <!-- Activity Tab -->
                                <mat-tab>
                                    <ng-template mat-tab-label>
                                        <mat-icon class="me-2">history</mat-icon>
                                        Activity <span class="badge badge-light ms-2">{{ activityLog().length }}</span>
                                    </ng-template>

                                    <div class="px-3">
                                        <!-- Activity Timeline -->
                                        <ul class="activity">
                                            @for (activity of sortedActivityLog(); track activity.id) {
                                            <li>
                                                <div class="row gx-3">
                                                    <!-- icon -->
                                                    <div class="col-auto">
                                                        <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme">
                                                            <mat-icon class="material-icons-outlined">{{ activity.icon }}</mat-icon>
                                                        </div>
                                                    </div>

                                                    <!-- Activity Content -->
                                                    <div class="col">
                                                        <p class="text-secondary small mb-1">
                                                            {{ activity.timestamp | date : "MMM d, y, h:mm a" }}
                                                        </p>
                                                        <p class="">
                                                            <span class="text-theme" routerLink="./">{{ activity.user }}</span>
                                                            {{ activity.action }}
                                                            <span class="text-theme" routerLink="./">{{ activity.target }}</span
                                                            >.
                                                        </p>
                                                    </div>
                                                </div>
                                            </li>

                                            }
                                        </ul>
                                    </div>
                                </mat-tab>
                            </mat-tab-group>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-lg-4">
                    <!-- task details -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-auto mb-3">
                                    <h3 class="mb-1">Task Details</h3>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col mb-3 maxwidth-dynamic" style="--mw-dynamic:100px">
                                    <p class="text-secondary">Status</p>
                                </div>
                                <div class="col mb-3">
                                    <span
                                        class="badge me-1"
                                        [ngClass]="{
                                            'theme-blue': tasks().status === 'new',
                                            'theme-green': tasks().status === 'ready to test',
                                            'theme-orange': tasks().status === 'in-progress',
                                            'theme-sky': tasks().status === 'resolved',
                                            'theme-violet': tasks().status === 'completed'
                                        }">
                                        {{ tasks().status | titlecase }}
                                    </span>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col mb-3 maxwidth-dynamic" style="--mw-dynamic:100px">
                                    <p class="text-secondary">Type</p>
                                </div>
                                <div class="col mb-3">
                                    <span
                                        class="badge badge-light me-1"
                                        [ngClass]="{
                                            'theme-blue': tasks().type === 'Development',
                                            'theme-sky': tasks().type === 'Design',
                                            'theme-violet': tasks().type === 'Backend',
                                            'theme-red': tasks().type === 'Bug',
                                            'theme-cyan': tasks().type === 'Design Bug'
                                        }">
                                        {{ tasks().type }}
                                    </span>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col mb-3 maxwidth-dynamic" style="--mw-dynamic:100px">
                                    <p class="text-secondary">Priority</p>
                                </div>
                                <div class="col mb-3">
                                    <span
                                        class="badge me-1"
                                        [ngClass]="{
                                            'theme-green': tasks().priority === 'Low',
                                            'theme-orange': tasks().priority === 'Medium',
                                            'theme-red': tasks().priority === 'High'
                                        }">
                                        {{ tasks().priority }}
                                    </span>
                                </div>
                            </div>
                            <div class="row gx-3">
                                <div class="col mb-3 maxwidth-dynamic" style="--mw-dynamic:100px">
                                    <p class="text-secondary">Efforts</p>
                                </div>
                                <div class="col mb-3">
                                    <p>
                                        {{ tasks().loggedHours }} <span class="text-secondary"> / {{ tasks().assignHours }} hours</span>
                                    </p>
                                </div>
                                <div class="col-auto mb-3">
                                    <p (click)="openEffortLogDialog()" class="text-theme small"><span class="material-symbols-outlined align-middle"> more_time </span></p>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>

                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col mb-3">
                                    <h3 class="mb-1">Documents (12)</h3>
                                </div>
                                <div class="col-auto mb-3">
                                    <button matIconButton><mat-icon class="material-icons-outlined">upload</mat-icon></button>
                                </div>
                            </div>

                            <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper">
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document1.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document2.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document3.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document4.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document2.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document3.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded p-0">
                                            <img src="assets/img/document4.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                            </swiper-container>

                            <p class="text-secondary small">Today 10 Document uploaded</p>
                        </mat-card-content>
                    </mat-card>

                    <!-- project -->
                    @if (project()) {
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4 align-items-center mb-3">
                                <div class="col">
                                    <h3>Project</h3>
                                </div>
                                <div class="col-auto">
                                    <button matIconButton (click)="openDialog()"><mat-icon class="material-icons-outlined">edit</mat-icon></button>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center">
                                <div class="col-auto">
                                    <div class="avatar avatar-80 coverimg rounded mb-3">
                                        <img class="d-none" [src]="project().image" alt="Project Image" />
                                    </div>
                                </div>
                                <div class="col mb-3">
                                    <h4 class="mb-1">{{ project().name }}</h4>
                                    <p class="text-secondary small">{{ project().company }}</p>
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
                        </mat-card-content>
                    </mat-card>
                    }

                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4 align-items-center">
                                <div class="col mb-3">
                                    <h3 class="mb-1">Team Members (7)</h3>
                                </div>
                                <div class="col-auto mb-3">
                                    <button matIconButton><mat-icon class="material-icons-outlined">person_add</mat-icon></button>
                                </div>
                            </div>
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
                            <br />
                            <!-- assigned to -->
                            <h4 class="mb-3">Assigned To</h4>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" [src]="tasks().assignedToimage" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">{{ tasks().assignedTo }}</p>
                                    <p class="text-secondary small">Developer</p>
                                </span>
                            </div>
                            <br />
                            <!-- team -->
                            <h4 class="mb-3">Other</h4>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-2.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ava Johnson</p>
                                    <p class="text-secondary small">Software Developer</p>
                                </span>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-3.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ben Smith</p>
                                    <p class="text-secondary small">Software Developer</p>
                                </span>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-4.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Chloe Lee</p>
                                    <p class="text-secondary small">Backend Engineer</p>
                                </span>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-5.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">David Chen</p>
                                    <p class="text-secondary small">AI Caretaker</p>
                                </span>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-6.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ella Garcia</p>
                                    <p class="text-secondary small">UX Designer</p>
                                </span>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TaskDetailsComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

    // table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

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

    tasks = signal<TaskItem>({
        description:
            "<p>This task involves integrating the application's authentication flow with the new Project Chimera Auth Service API. The primary goal is to deprecate the legacy Firebase/Auth0 dependency and fully transition to the new, centralized microservice for user identity management.</p><p>Key outcomes include robust token management, secure credential storage, and a seamless user experience during login and sign-up.</p><h4>Acceptance Criteria (AC)</h4><ul><li>The application's Login and Sign-up routes must successfully utilize the new /v1/auth/token endpoint to acquire an Access Token and a Refresh Token.</li><li>A secure, centralized mechanism (e.g., an HTTP-only cookie or backend session store) must be implemented for storing the tokens.</li><li>All API calls to secured resources must include the active Access Token in the Authorization: Bearer <token> header.</li><li>The system must include a Token Refresh mechanism: Upon receiving a 401 Unauthorized error, the Refresh Token must be automatically used to obtain a new Access Token without prompting the user to log in again.</li><li>All user data handling must comply with GDPR and internal security policies.</li></ul>",
        taskId: 101,
        projectId: 4,
        title: "Implement new auth API integration",
        status: "in-progress",
        type: "Backend",
        assignedTo: "Jack K",
        assignedToimage: "assets/img/user-9.jpg",
        priority: "High",
        assignHours: "20",
        loggedHours: "18",
        effortLogs: [
            { date: "2026-10-08", startTime: "09:00", endTime: "12:00", duration: "3.0 hrs" },
            { date: "2026-10-09", startTime: "13:00", endTime: "16:30", duration: "3.5 hrs" },
            { date: "2026-10-10", startTime: "10:00", endTime: "13:00", duration: "3.0 hrs" },
        ],
    });
    public projectMembers = [
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

    // State signals for comments and activity log
    currentUser = "AdminUIUX";
    comments = signal<Comment[]>([
        {
            id: 1,
            user: "Dana Scully",
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            text: "I think we should use the new design system components for the cards. It would ensure consistency across the application.",
        },
        {
            id: 2,
            user: "Ben Smith",
            timestamp: new Date(Date.now() - 1800000), // 30 mins ago
            text: "Agreed, John. I have updated the initial Figma draft to reflect the new component structure. Check it out and let me know if it meets the specs.",
        },
    ]);

    activityLog = signal<Activity[]>([
        {
            id: 101,
            icon: "add_task",
            user: "System",
            action: "created the task",
            target: "Redesign User Dashboard",
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        },
        {
            id: 102,
            icon: "label",
            user: "John Smith",
            action: "added the label",
            target: "UI/UX",
            timestamp: new Date(Date.now() - 6000000), // 1.67 hours ago
        },
        {
            id: 103,
            icon: "schedule",
            user: "Jane Doe",
            action: "changed the due date to",
            target: "10/25/2025",
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        },
        {
            id: 104,
            icon: "attach_file",
            user: "John Smith",
            action: "attached a new file",
            target: "dashboard_mockup_v2.png",
            timestamp: new Date(Date.now() - 1200000), // 20 minutes ago
        },
    ]);

    // Signal for the text currently in the comment input
    newCommentText = signal("");

    // Computed signal to sort comments (newest first)
    sortedComments = computed(() => {
        return [...this.comments()].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });

    // Computed signal to sort activity log (newest first)
    sortedActivityLog = computed(() => {
        return [...this.activityLog()].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });

    ngOnInit() {}
    ngAfterViewInit() {}

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
    openEffortLogDialog(): void {
        this.dialog.open(EffortLogDialogComponent, {
            width: "500px",
            maxWidth: "500px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: this.tasks(),
        });
    }

    trackByCommentId(index: number, comment: Comment): number {
        return comment.id;
    }

    trackByActivityId(index: number, activity: Activity): number {
        return activity.id;
    }

    addComment(): void {
        const text = this.newCommentText().trim();
        if (!text) {
            return;
        }

        const newComment: Comment = {
            id: Date.now(),
            user: this.currentUser,
            timestamp: new Date(),
            text: text,
        };

        this.comments.update((c) => [newComment, ...c]);

        const newActivity: Activity = {
            id: Date.now() + 1,
            icon: "chat",
            user: this.currentUser,
            action: "added a comment",
            target: "Comments",
            timestamp: new Date(),
        };
        this.activityLog.update((a) => [newActivity, ...a]);

        this.newCommentText.set("");
    }
    createTask() {
        this.dialog.open(CreateEditTaskComponent, {
            width: "500px",
            maxWidth: "500px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: {
                projectId: this.project().id,
                projectName: this.project().name,
                members: this.projectMembers,
            },
        });
    }
}
