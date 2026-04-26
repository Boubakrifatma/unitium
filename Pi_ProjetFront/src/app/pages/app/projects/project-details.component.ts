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
import { CreateEditProjectModal } from "./createeditproject.component";
import { EffortLogDialogComponent } from "../task-manage/time-log.component";
import { RouterLink } from "@angular/router";
import { MatTabsModule } from "@angular/material/tabs";
import { CreateEditTaskComponent } from "../task-manage/create-edit-task.component";

export interface EffortLog {
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
    progress: number; // Percentage
    // Added for detail view
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
    selector: "app-project-details",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatTabsModule, MatMenuModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, CircleProgressBlueComponent],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Projects: {{ project().name }}</h3>
                        <p class="small">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"> <mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            <span routerLink="/app/projects" class="me-2 text-theme style-none">Projects</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Project Details
                        </p>
                    </div>

                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matButton class="ms-1" (click)="openDialog()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                        <button matButton="filled" class="ms-1" (click)="createTask()"><mat-icon class="material-icons-outlined">add</mat-icon> Task</button>
                    </div>
                </div>
            </mat-card>
        </div>
        <!-- page content -->
        <div class="container fade-in">
            @if (project()) {

            <!-- task summary -->
            <div class="row gx-3 gx-lg-4">
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">$ 600.00</h1>
                            <p class="small text-secondary">Budget Remaining</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-6">
                                    <p class="text-secondary">Total Budget:</p>
                                </div>
                                <div class="col">
                                    <h3>$ 1200.00</h3>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6">
                                    <p class="text-secondary">Progress:</p>
                                </div>
                                <div class="col">
                                    <h3>{{ project().progress }} %</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">120.00</h1>
                            <p class="small text-secondary">Total Hours</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-6">
                                    <p class="text-secondary">Billing:</p>
                                </div>
                                <div class="col">
                                    <h3>60.50</h3>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6">
                                    <p class="text-secondary">Learning:</p>
                                </div>
                                <div class="col">
                                    <h3>60.50</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">$ 50.00</h1>
                            <p class="small text-secondary">Infrastructure Cost</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-6">
                                    <p class="text-secondary">Expenses:</p>
                                </div>
                                <div class="col-auto">
                                    <h3>34.50</h3>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6">
                                    <p class="text-secondary">Utilities:</p>
                                </div>
                                <div class="col">
                                    <h3>15.50</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">$ 150.00</h1>
                            <p class="small text-secondary">Pending Invoice</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-2">
                                <div class="col-6">
                                    <p class="text-secondary">Next Billing:</p>
                                </div>
                                <div class="col">
                                    <h3>6 June 2025</h3>
                                </div>
                            </div>
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6">
                                    <p class="text-secondary">Method:</p>
                                </div>
                                <div class="col">
                                    <h3>Paypal</h3>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <div mat-card-image class="w-100 height-200 coverimg mb-3">
                            <img class="d-none" [src]="project().image" alt="Project Image" />
                        </div>
                        <mat-card-content class="pb-0">
                            <h3 class="mb-1">{{ project().name }}</h3>
                            <p class="text-secondary">{{ project().company }}</p>
                            <br />
                            <h4 class="mb-3">Status Details</h4>
                            <div class="row gx-3 mb-3">
                                <div class="col-4"><p class="text-secondary">Status</p></div>
                                <div class="col-8">
                                    <span
                                        class="badge badge-light"
                                        [ngClass]="{
                                            'theme-green': project().status === 'Active',
                                            'theme-orange': project().status === 'On Hold',
                                            'theme-red': project().status === 'Completed'
                                        }">
                                        {{ project().status }}
                                    </span>
                                </div>
                            </div>
                            <div class="row gx-3 mb-3">
                                <div class="col-4"><p class="text-secondary">Priority</p></div>
                                <div class="col-8">
                                    <span
                                        class="badge"
                                        [ngClass]="{
                                            'theme-green': project().priority === 'Low',
                                            'theme-orange': project().priority === 'Medium',
                                            'theme-violet': project().priority === 'High'
                                        }">
                                        {{ project().priority }}
                                    </span>
                                </div>
                            </div>
                            <div class="row gx-3 mb-3">
                                <div class="col-4"><p class="text-secondary">Due Date</p></div>
                                <div class="col-8">
                                    <p>{{ project().dueDate }}</p>
                                </div>
                            </div>
                            <div class="row gx-3 mb-2">
                                <div class="col-4"><p class="text-secondary">Progress</p></div>
                                <div class="col-8">
                                    <p class="mb-1">{{ project().progress }} %</p>
                                    <!-- Progress Bar -->
                                    <mat-progress-bar class="mb-2" mode="determinate" value="{{ project().progress }}"></mat-progress-bar>
                                </div>
                            </div>
                            <br />

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
                                <button matIconButton><mat-icon>repeat</mat-icon></button>
                            </div>
                            <br />

                            <!-- team -->
                            <h4 class="mb-3">Team</h4>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-2.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ava Johnson</p>
                                    <p class="text-secondary small">Software Developer</p>
                                </span>
                                <button matIconButton class="text-theme theme-red"><mat-icon>remove</mat-icon></button>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-3.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ben Smith</p>
                                    <p class="text-secondary small">Software Developer</p>
                                </span>
                                <button matIconButton class="text-theme theme-red"><mat-icon>remove</mat-icon></button>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-4.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Chloe Lee</p>
                                    <p class="text-secondary small">Backend Engineer</p>
                                </span>
                                <button matIconButton class="text-theme theme-red"><mat-icon>remove</mat-icon></button>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-5.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">David Chen</p>
                                    <p class="text-secondary small">AI Caretaker</p>
                                </span>
                                <button matIconButton class="text-theme theme-red"><mat-icon>remove</mat-icon></button>
                            </div>
                            <div class="mb-3 d-flex align-items-center">
                                <span class="avatar avatar-40 coverimg rounded-circle align-middle me-2">
                                    <img class="d-none" src="assets/img/user-6.jpg" alt="Team Image" />
                                </span>
                                <span class="align-middle d-inline-block flex-grow-1">
                                    <p class="mb-1">Ella Garcia</p>
                                    <p class="text-secondary small">UX Designer</p>
                                </span>
                                <button matIconButton class="text-theme theme-red"><mat-icon>remove</mat-icon></button>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                <div class="col-12 col-lg-8">
                    <!-- documents -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="row gx-3 gx-lg-4">
                                <div class="col-auto mb-3">
                                    <h3 class="mb-1">Documents (12)</h3>
                                    <p class="text-secondary small">Today 10 Document uploaded</p>
                                </div>
                                <div class="col-auto mb-3"></div>
                            </div>

                            <swiper-container slides-per-view="auto" space-between="20px" autoplay="true" class="swiper">
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document1.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document2.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document3.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document4.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document2.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document3.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                                <swiper-slide class="w-auto">
                                    <mat-card class="overflow-hidden mb-3">
                                        <mat-card-content class="coverimg avatar avatar-100 rounded">
                                            <img src="assets/img/document4.jpg" alt="" />
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                            </swiper-container>
                        </mat-card-content>
                    </mat-card>

                    <!-- comments activities -->
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

                    <!-- task summary -->
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-6 col-md-3 col-xl">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content class="pb-0">
                                    <div class="row gx-2 align-items-center">
                                        <div class="col-auto mb-3">
                                            <app-circle-progress-blue class="avatar avatar-50 rounded-circle"></app-circle-progress-blue>
                                        </div>
                                        <div class="col-12 col-xl mb-3">
                                            <h3 class="mb-1">495<span class="text-secondary">/690</span></h3>
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
                    <!-- task list -->
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content>
                            <div class="row gx-3">
                                <div class="col mb-3">
                                    <h3 class="mb-1">Tasks</h3>
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
                                        <p class="text-theme" routerLink="/app/task-details">{{ task.taskId }}</p>
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

                                <ng-container matColumnDef="assignedTo">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Assigned To</th>
                                    <td mat-cell *matCellDef="let task">
                                        <div class="row gx-2 align-items-center flex-nowrap">
                                            <div class="col-auto">
                                                <div class="avatar avatar-20 rounded-circle coverimg">
                                                    <img [src]="task.assignedToimage" alt="{{ task.assignedTo }}" class="" />
                                                </div>
                                            </div>
                                            <div class="col">
                                                <p class="mb-0 text-truncated">{{ task.assignedTo }}</p>
                                            </div>
                                        </div>
                                    </td>
                                </ng-container>

                                <ng-container matColumnDef="status">
                                    <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                                    <td mat-cell *matCellDef="let task">
                                        <span
                                            class="badge"
                                            [ngClass]="{
                                                'theme-green': task.status === 'in-progress',
                                                'theme-orange': task.status === 'ready to test',
                                                'theme-sky': task.status === 'new',
                                                'theme-red': task.status === 'completed'
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
                                <!-- Actions Column -->
                                <ng-container matColumnDef="actions">
                                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                                    <td mat-cell *matCellDef="let task">
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
            </div>
            }
        </div>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectDetailsComponent implements OnInit {
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

    public tasks: TaskItem[] = [
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

    dataSource = new MatTableDataSource<TaskItem>(this.tasks);
    displayedColumns: string[] = ["taskId", "title", "assignedTo", "status", "priority", "actions"];

    // comments and activity
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

    // activity comment
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
