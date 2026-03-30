import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, Input, signal, inject, computed } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from "@angular/forms";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

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
    assignHours: string; // e.g., "8h 30m"
    loggedHours: string; // e.g., "4h 15m"
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

const projectData: ProjectData[] = [
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
            { taskId: 101, projectId: 1, title: "Create wireframes", status: "completed", type: "Design", assignedTo: "Jane Johnson", priority: "High", assignHours: "12h", loggedHours: "12h", description: "", effortLogs: [] },
            { taskId: 102, projectId: 1, title: "Setup component library", status: "in-progress", type: "Development", assignedTo: "John Williams", priority: "High", assignHours: "40h", loggedHours: "15h 30m", description: "", effortLogs: [] },
            { taskId: 103, projectId: 1, title: "Define data models", status: "new", type: "Backend", assignedTo: "Alice Brown", priority: "Medium", assignHours: "20h", loggedHours: "0h", description: "", effortLogs: [] },
            { taskId: 104, projectId: 1, title: "Fix modal overflow bug", status: "ready to test", type: "Bug", assignedTo: "Bob Davis", priority: "High", assignHours: "4h", loggedHours: "4h", description: "", effortLogs: [] },
            { taskId: 105, projectId: 1, title: "Review design system guide", status: "new", type: "Design", assignedTo: "Daniel Wilson", priority: "Medium", assignHours: "8h", loggedHours: "0h", description: "", effortLogs: [] },
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
            { taskId: 201, projectId: 2, title: "Audit current API endpoints", status: "completed", type: "Backend", assignedTo: "Mike", priority: "High", assignHours: "16h", loggedHours: "16h", description: "", effortLogs: [] },
            { taskId: 202, projectId: 2, title: "Setup AWS Lambda infra", status: "new", type: "Backend", assignedTo: "Mike", priority: "High", assignHours: "24h", loggedHours: "0h", description: "", effortLogs: [] },
            { taskId: 203, projectId: 2, title: "Refactor Auth module", status: "in-progress", type: "Development", assignedTo: "Sara", priority: "Medium", assignHours: "30h", loggedHours: "5h", description: "", effortLogs: [] },
        ],
    },
];

@Component({
    selector: "app-create-edit-task",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatDialogModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, ReactiveFormsModule],
    template: `
        <h2 mat-dialog-title>
            Create New Task<br /><small class="text-secondary ps-1">Project: {{ data.projectName }}</small>
        </h2>
        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
            <mat-dialog-content class="mat-typography">
                <!-- Title -->
                <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                    <mat-label>Task Title</mat-label>
                    <input matInput formControlName="title" required />
                    @if (taskForm.get('title')?.invalid && taskForm.get('title')?.touched) {
                    <mat-error>Title is required.</mat-error>
                    }
                </mat-form-field>

                <!-- Description -->
                <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="3"></textarea>
                </mat-form-field>

                <div class="row gx-3 gx-lg-4">
                    <div class="col-12 col-md-4">
                        <!-- Type -->
                        <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                            <mat-label>Task Type</mat-label>
                            <mat-select formControlName="type" required>
                                @for (type of taskTypes; track type) {
                                <mat-option [value]="type">{{ type }}</mat-option>
                                }
                            </mat-select>
                            @if (taskForm.get('type')?.invalid && taskForm.get('type')?.touched) {
                            <mat-error>Type is required.</mat-error>
                            }
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-4">
                        <!-- Priority -->
                        <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                            <mat-label>Priority</mat-label>
                            <mat-select formControlName="priority" required>
                                @for (priority of taskPriorities; track priority) {
                                <mat-option [value]="priority">{{ priority }}</mat-option>
                                }
                            </mat-select>
                            @if (taskForm.get('priority')?.invalid && taskForm.get('priority')?.touched) {
                            <mat-error>Priority is required.</mat-error>
                            }
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-4">
                        <!-- Assigned Hours -->
                        <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                            <mat-label>Effort (hrs)</mat-label>
                            <input matInput formControlName="assignHours" required />
                            @if (taskForm.get('assignHours')?.invalid && taskForm.get('assignHours')?.touched) {
                            <mat-error>Effort is required.</mat-error>
                            }
                        </mat-form-field>
                    </div>
                </div>

                <!-- Assigned To -->
                <mat-form-field appearance="outline" class="w-100 mb-lg-2">
                    <mat-label>Assigned To</mat-label>
                    <mat-select formControlName="assignedTo" required>
                        @for (member of data.members; track member.id) {
                        <mat-option [value]="member.name">
                            <div class="row gx-2 align-items-center">
                                <div class="col-auto">
                                    <img [src]="member.avatarUrl" alt="{{ member.name }} avatar" class="rounded-circle avatar avatar-30" onerror="this.onerror=null;" />
                                </div>
                                <div class="col maxwidth-dynamic" style="--mw-dynamic:calc(100% - 30px - 0.5rem)">
                                    <p class="mb-0 text-truncated">{{ member.name }}</p>
                                    <p class="small text-secondary text-truncated">- {{ member.title }}</p>
                                </div>
                            </div>
                        </mat-option>
                        }
                    </mat-select>
                </mat-form-field>
            </mat-dialog-content>

            <mat-dialog-actions>
                <div class="col">
                    <button matButton="filled" color="primary" type="submit" [disabled]="taskForm.invalid">Create Task</button>
                </div>
                <div class="col-auto">
                    <button matButton type="button" (click)="dialogRef.close()" class="theme-red">Cancel</button>
                </div>
            </mat-dialog-actions>
        </form>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CreateEditTaskComponent {
    dialogRef = inject(MatDialogRef<CreateEditTaskComponent>);
    fb = inject(FormBuilder);
    data: { projectName: string; projectId: number; members: { name: string; id: number; title: string; avatarUrl: string }[] } = inject(MAT_DIALOG_DATA);

    taskForm: FormGroup;

    // Static lists for selects
    taskTypes: TaskType[] = ["Development", "Design", "Backend", "Bug", "Design Bug"];
    taskPriorities: TaskPriority[] = ["High", "Medium", "Low"];

    constructor() {
        this.taskForm = this.fb.group({
            title: ["", Validators.required],
            description: [""],
            type: [this.taskTypes[0], Validators.required],
            priority: [this.taskPriorities[1], Validators.required], // Default to Medium
            assignedTo: [this.data.members[0].name, Validators.required], // Default to first member
            assignHours: ["8h", Validators.required], // Default to 8h
        });
    }

    onSubmit() {
        if (this.taskForm.valid) {
            const formValue = this.taskForm.value;
            // Map form data to TaskItem structure, providing defaults for other required fields
            const newTask: Partial<TaskItem> = {
                ...formValue,
                projectId: this.data.projectId,
                status: "new" as TaskStatus, // New tasks always start in 'new' status
                loggedHours: "0h",
                effortLogs: [],
            };
            this.dialogRef.close(newTask);
        }
    }

    ngOnInit() {}
    ngAfterViewInit() {}
}
