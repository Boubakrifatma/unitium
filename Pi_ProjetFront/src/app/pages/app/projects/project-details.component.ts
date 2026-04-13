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
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { forkJoin, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { ProjectService, Project } from "../../../services/project-service";
import { DeliverableService, MilestoneDeliverableGroup } from "../../../services/Deliverable.service";
import { ReviewService, DeliverableReviewDto } from "../../../services/review.service";
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
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatTabsModule, MatMenuModule, MatProgressBarModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, CircleProgressBlueComponent, MatProgressSpinnerModule, MatDividerModule, MatTooltipModule],
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

            <!-- ═══════════════════════════════════════════════════════════════ -->
            <!-- KPI LIVRABLES                                                   -->
            <!-- ═══════════════════════════════════════════════════════════════ -->
            <div class="row gx-3 gx-lg-4 mt-2">
              <div class="col-12">
                <mat-card class="mb-3 mb-lg-4">
                  <mat-card-content>

                    <!-- Header + project selector -->
                    <div class="row gx-3 align-items-center mb-3">
                      <div class="col">
                        <h3 class="mb-1">
                          <mat-icon class="align-middle me-1" style="color:#6366f1">insights</mat-icon>
                          KPI Livrables
                        </h3>
                        <p class="small text-secondary">Scores et livrables par milestone et par employé</p>
                      </div>
                      <div class="col-auto">
                        <mat-form-field appearance="outline" style="min-width:220px;margin-bottom:-1.25em">
                          <mat-label><mat-icon>folder_open</mat-icon> Projet</mat-label>
                          <mat-select [ngModel]="selectedKpiProjectId()" (ngModelChange)="loadKpiData($event)">
                            @for (p of kpiProjects(); track p.id) {
                              <mat-option [value]="p.id">{{ p.name }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                      </div>
                    </div>

                    <!-- Loading -->
                    @if (kpiLoading()) {
                      <div class="text-center py-5">
                        <mat-progress-spinner diameter="44" mode="indeterminate" style="margin:auto"></mat-progress-spinner>
                        <p class="text-secondary mt-3 small">Chargement des KPIs...</p>
                      </div>

                    } @else if (!selectedKpiProjectId()) {
                      <p class="text-center text-secondary py-4">Sélectionnez un projet pour afficher les KPIs.</p>

                    } @else if (kpiStats().totalDeliverables === 0) {
                      <p class="text-center text-secondary py-4">Aucun livrable trouvé pour ce projet.</p>

                    } @else {

                      <!-- ── Summary cards ──────────────────────────── -->
                      <div class="row gx-3 mb-4">
                        <div class="col-6 col-md-3">
                          <div style="background:#f0f9ff;border-radius:14px;padding:16px 14px;text-align:center">
                            <mat-icon style="color:#0284c7;font-size:28px;width:28px;height:28px">description</mat-icon>
                            <h2 style="margin:6px 0 2px;color:#0284c7">{{ kpiStats().totalDeliverables }}</h2>
                            <p class="small text-secondary mb-0">Livrables au total</p>
                          </div>
                        </div>
                        <div class="col-6 col-md-3">
                          <div style="border-radius:14px;padding:16px 14px;text-align:center"
                               [style.background]="kpiStats().projectAvg == null ? '#f8fafc' : kpiStats().projectAvg! === 10 ? '#dcfce7' : kpiStats().projectAvg! >= 7 ? '#fef3c7' : '#fee2e2'">
                            <mat-icon [style.color]="getScoreColor(kpiStats().projectAvg)" style="font-size:28px;width:28px;height:28px">stars</mat-icon>
                            <h2 style="margin:6px 0 2px" [style.color]="getScoreColor(kpiStats().projectAvg)">
                              {{ kpiStats().projectAvg != null ? (kpiStats().projectAvg! | number:'1.1-1') + '/10' : '—' }}
                            </h2>
                            <p class="small text-secondary mb-0">Score moyen projet</p>
                          </div>
                        </div>
                        <div class="col-6 col-md-3">
                          <div style="background:#faf5ff;border-radius:14px;padding:16px 14px;text-align:center">
                            <mat-icon style="color:#7c3aed;font-size:28px;width:28px;height:28px">flag</mat-icon>
                            <h2 style="margin:6px 0 2px;color:#7c3aed">{{ kpiStats().milestoneStats.length }}</h2>
                            <p class="small text-secondary mb-0">Milestones</p>
                          </div>
                        </div>
                        <div class="col-6 col-md-3">
                          <div style="background:#f0fdf4;border-radius:14px;padding:16px 14px;text-align:center">
                            <mat-icon style="color:#16a34a;font-size:28px;width:28px;height:28px">group</mat-icon>
                            <h2 style="margin:6px 0 2px;color:#16a34a">{{ kpiStats().employeeRanking.length }}</h2>
                            <p class="small text-secondary mb-0">Employés évalués</p>
                          </div>
                        </div>
                      </div>

                      <mat-divider class="mb-4"></mat-divider>

                      <div class="row gx-3 gx-lg-4">

                        <!-- ── Per-milestone table ─────────────────── -->
                        <div class="col-12 col-lg-6 mb-4">
                          <h5 class="mb-3" style="font-weight:700;color:#374151">
                            <mat-icon class="align-middle me-1" style="color:#7c3aed;font-size:18px">flag</mat-icon>
                            Livrables & scores par milestone
                          </h5>
                          <div style="display:flex;flex-direction:column;gap:10px">
                            @for (ms of kpiStats().milestoneStats; track ms.milestoneName) {
                              <div style="background:#f8fafc;border-radius:12px;padding:14px 16px">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
                                  <div style="display:flex;align-items:center;gap:8px">
                                    <mat-icon style="font-size:16px;width:16px;height:16px;color:#7c3aed">flag</mat-icon>
                                    <span style="font-weight:600;font-size:0.88rem;color:#1f2937">{{ ms.milestoneName }}</span>
                                    @if (ms.milestoneStatus) {
                                      <span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:#ede9fe;color:#6d28d9">
                                        {{ getMilestoneStatusLabel(ms.milestoneStatus) }}
                                      </span>
                                    }
                                  </div>
                                  <div style="display:flex;align-items:center;gap:12px">
                                    <span style="font-size:0.8rem;color:#6b7280">
                                      <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">description</mat-icon>
                                      {{ ms.deliverableCount }} livrable(s)
                                    </span>
                                    <span style="font-weight:700;font-size:0.95rem;padding:3px 10px;border-radius:10px"
                                          [style.background]="getScoreColor(ms.avgScore) + '20'"
                                          [style.color]="getScoreColor(ms.avgScore)">
                                      {{ ms.avgScore != null ? (ms.avgScore | number:'1.1-1') + '/10' : '—' }}
                                    </span>
                                  </div>
                                </div>
                                <!-- score bar -->
                                <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
                                  <div style="height:100%;border-radius:3px;transition:width .4s"
                                       [style.width.%]="ms.avgScore != null ? ms.avgScore * 10 : 0"
                                       [style.background]="getScoreColor(ms.avgScore)">
                                  </div>
                                </div>
                                @if (ms.reviewedCount === 0) {
                                  <p style="font-size:0.75rem;color:#94a3b8;margin:6px 0 0">Aucune review enregistrée</p>
                                } @else {
                                  <p style="font-size:0.75rem;color:#94a3b8;margin:6px 0 0">{{ ms.reviewedCount }} review(s) prise(s) en compte</p>
                                }
                              </div>
                            }
                          </div>
                        </div>

                        <!-- ── Employee ranking ───────────────────────── -->
                        <div class="col-12 col-lg-6 mb-4">
                          <h5 class="mb-3" style="font-weight:700;color:#374151">
                            <mat-icon class="align-middle me-1" style="color:#0284c7;font-size:18px">leaderboard</mat-icon>
                            Classement des employés
                          </h5>
                          <div style="display:flex;flex-direction:column;gap:8px">
                            @for (emp of kpiStats().employeeRanking; track emp.name; let i = $index) {
                              <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:#f8fafc">
                                <!-- rank badge -->
                                <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0"
                                     [style.background]="i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fef3c7' : '#f8fafc'"
                                     [style.color]="i === 0 ? '#d97706' : i === 1 ? '#6b7280' : '#92400e'">
                                  {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 }}
                                </div>
                                <!-- name + bar -->
                                <div style="flex:1;min-width:0">
                                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                                    <span style="font-weight:600;font-size:0.88rem;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%">{{ emp.name }}</span>
                                    <span style="font-size:0.75rem;color:#6b7280">{{ emp.deliverableCount }} livrable(s)</span>
                                  </div>
                                  <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
                                    <div style="height:100%;border-radius:3px;transition:width .4s"
                                         [style.width.%]="emp.avgScore != null ? emp.avgScore * 10 : 0"
                                         [style.background]="getScoreColor(emp.avgScore)">
                                    </div>
                                  </div>
                                </div>
                                <!-- score -->
                                <span style="font-weight:700;font-size:1rem;min-width:48px;text-align:right"
                                      [style.color]="getScoreColor(emp.avgScore)">
                                  {{ emp.avgScore != null ? (emp.avgScore | number:'1.1-1') : '—' }}
                                </span>
                              </div>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- ── Employee × Milestone matrix ──────────────── -->
                      @if (kpiStats().milestoneNames.length > 0 && kpiStats().employeeMilestoneMatrix.length > 0) {
                        <mat-divider class="mb-4"></mat-divider>
                        <h5 class="mb-3" style="font-weight:700;color:#374151">
                          <mat-icon class="align-middle me-1" style="color:#0891b2;font-size:18px">grid_on</mat-icon>
                          Score par employé × milestone
                        </h5>
                        <div style="overflow-x:auto">
                          <table style="width:100%;border-collapse:collapse;font-size:0.83rem">
                            <thead>
                              <tr>
                                <th style="text-align:left;padding:8px 12px;background:#f1f5f9;border-radius:8px 0 0 0;color:#374151;font-weight:600;white-space:nowrap">Employé</th>
                                @for (mn of kpiStats().milestoneNames; track mn) {
                                  <th style="text-align:center;padding:8px 10px;background:#f1f5f9;color:#374151;font-weight:600;white-space:nowrap;max-width:120px">
                                    <span style="display:block;overflow:hidden;text-overflow:ellipsis;max-width:120px" [matTooltip]="mn">
                                      {{ mn.length > 14 ? (mn | slice:0:14) + '…' : mn }}
                                    </span>
                                  </th>
                                }
                              </tr>
                            </thead>
                            <tbody>
                              @for (row of kpiStats().employeeMilestoneMatrix; track row.name) {
                                <tr style="border-bottom:1px solid #f1f5f9">
                                  <td style="padding:8px 12px;font-weight:600;color:#1f2937;white-space:nowrap">{{ row.name }}</td>
                                  @for (cell of row.milestoneScores; track cell.milestoneName) {
                                    <td style="text-align:center;padding:8px 6px">
                                      @if (cell.avgScore != null) {
                                        <span style="display:inline-block;padding:3px 10px;border-radius:8px;font-weight:700"
                                              [style.background]="getScoreColor(cell.avgScore) + '20'"
                                              [style.color]="getScoreColor(cell.avgScore)">
                                          {{ cell.avgScore | number:'1.1-1' }}
                                        </span>
                                      } @else {
                                        <span style="color:#cbd5e1">—</span>
                                      }
                                    </td>
                                  }
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      }

                    }
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
    readonly dialog      = inject(MatDialog);
    private projectSvc   = inject(ProjectService);
    private delivSvc     = inject(DeliverableService);
    private reviewSvc    = inject(ReviewService);

    // ── KPI signals ────────────────────────────────────────────────────────────
    kpiProjects          = signal<Project[]>([]);
    selectedKpiProjectId = signal<string | null>(null);
    kpiGroups            = signal<MilestoneDeliverableGroup[]>([]);
    kpiReviews           = signal<Map<number, DeliverableReviewDto[]>>(new Map());
    kpiLoading           = signal(false);

    kpiStats = computed(() => {
        const groups  = this.kpiGroups();
        const reviews = this.kpiReviews();
        const avg = (scores: number[]) =>
            scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        // ── Flatten all deliverables with context ──────────────────────────
        type DFlat = { deliverableId: number; milestoneId: number | null; milestoneName: string; employeeName: string; scores: number[] };
        const flat: DFlat[] = [];
        groups.forEach(mg => mg.tasks.forEach(t => t.deliverables.forEach(d => {
            const scores = (reviews.get(d.deliverableId) ?? []).map(r => r.score).filter((s): s is number => s != null);
            flat.push({ deliverableId: d.deliverableId, milestoneId: mg.milestoneId, milestoneName: mg.milestoneName, employeeName: d.employeeName, scores });
        })));

        const totalDeliverables = flat.length;
        const allScores = flat.flatMap(d => d.scores);
        const projectAvg = avg(allScores);

        // ── Per-milestone ──────────────────────────────────────────────────
        const msMap = new Map<string, { milestoneName: string; count: number; scores: number[]; status: string | null }>();
        groups.forEach(mg => {
            const key = String(mg.milestoneId ?? 'none');
            if (!msMap.has(key)) msMap.set(key, { milestoneName: mg.milestoneName, count: 0, scores: [], status: mg.milestoneStatus });
            const entry = msMap.get(key)!;
            mg.tasks.forEach(t => {
                entry.count += t.deliverables.length;
                t.deliverables.forEach(d => {
                    const sc = (reviews.get(d.deliverableId) ?? []).map(r => r.score).filter((s): s is number => s != null);
                    entry.scores.push(...sc);
                });
            });
        });
        const milestoneStats = Array.from(msMap.values()).map(m => ({
            milestoneName: m.milestoneName,
            milestoneStatus: m.status,
            deliverableCount: m.count,
            avgScore: avg(m.scores),
            reviewedCount: m.scores.length,
        }));

        // ── Per-employee (ranking) ─────────────────────────────────────────
        const empMap = new Map<string, { scores: number[]; deliverableCount: number }>();
        flat.forEach(d => {
            if (!empMap.has(d.employeeName)) empMap.set(d.employeeName, { scores: [], deliverableCount: 0 });
            const e = empMap.get(d.employeeName)!;
            e.deliverableCount++;
            e.scores.push(...d.scores);
        });
        const employeeRanking = Array.from(empMap.entries())
            .map(([name, data]) => ({ name, avgScore: avg(data.scores), deliverableCount: data.deliverableCount, reviewedCount: data.scores.length }))
            .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1));

        // ── Per-employee per-milestone (score table) ───────────────────────
        // Build map: employeeName → milestoneName → scores[]
        const empMsMap = new Map<string, Map<string, number[]>>();
        flat.forEach(d => {
            if (!empMsMap.has(d.employeeName)) empMsMap.set(d.employeeName, new Map());
            const msInner = empMsMap.get(d.employeeName)!;
            if (!msInner.has(d.milestoneName)) msInner.set(d.milestoneName, []);
            msInner.get(d.milestoneName)!.push(...d.scores);
        });
        const milestoneNames = milestoneStats.map(m => m.milestoneName);
        const employeeMilestoneMatrix = Array.from(empMsMap.entries()).map(([name, msInner]) => ({
            name,
            milestoneScores: milestoneNames.map(mn => ({ milestoneName: mn, avgScore: avg(msInner.get(mn) ?? []) })),
        }));

        return { totalDeliverables, projectAvg, milestoneStats, employeeRanking, milestoneNames, employeeMilestoneMatrix };
    });

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

    ngOnInit() {
        this.loadKpiProjects();
    }

    // ── KPI Methods ────────────────────────────────────────────────────────────
    loadKpiProjects(): void {
        this.projectSvc.getAll().subscribe({
            next: (projects) => {
                this.kpiProjects.set(projects);
                if (projects.length > 0) {
                    this.loadKpiData(projects[0].id);
                }
            }
        });
    }

    loadKpiData(projectId: string): void {
        this.selectedKpiProjectId.set(projectId);
        this.kpiLoading.set(true);
        this.kpiGroups.set([]);
        this.kpiReviews.set(new Map());

        this.delivSvc.getManagerView(projectId).subscribe({
            next: (groups) => {
                this.kpiGroups.set(groups);
                this.kpiLoading.set(false);
                this.loadKpiReviews(groups);
            },
            error: () => this.kpiLoading.set(false)
        });
    }

    private loadKpiReviews(groups: MilestoneDeliverableGroup[]): void {
        const ids: number[] = [];
        groups.forEach(mg => mg.tasks.forEach(t => t.deliverables.forEach(d => ids.push(d.deliverableId))));
        if (!ids.length) return;

        const requests = ids.map(id =>
            this.reviewSvc.getDeliverableReviews(id).pipe(
                map((reviews: DeliverableReviewDto[]) => ({ id, reviews })),
                catchError(() => of({ id, reviews: [] as DeliverableReviewDto[] }))
            )
        );

        forkJoin(requests).subscribe(results => {
            const m = new Map<number, DeliverableReviewDto[]>();
            results.forEach(r => m.set(r.id, r.reviews));
            this.kpiReviews.set(m);
        });
    }

    getScoreColor(score: number | null): string {
        if (score == null) return '#94a3b8';
        if (score === 10) return '#16a34a';
        if (score >= 7)   return '#d97706';
        return '#dc2626';
    }

    getMilestoneStatusLabel(status: string | null): string {
        const map: Record<string, string> = { pending: 'En attente', in_progress: 'En cours', at_risk: 'À risque', completed: 'Terminé', missed: 'Manqué' };
        return map[status ?? ''] ?? (status ?? '—');
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
