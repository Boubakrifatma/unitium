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
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface EffortLog {
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
}

export type TaskStatus = "new" | "ready to test" | "in-progress" | "resolved" | "completed";
export type TaskType = "bug" | "epic" | "story" | "subtask" | "task";
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
    assignedToId: number | null;
    priority: TaskPriority;
    assignHours: string;
    loggedHours: string;
    effortLogs: EffortLog[];
}

export interface DialogData {
    projectName: string;
    projectId: string;
    members: { id: number | null; name: string; title: string; avatarUrl: string }[];
    task?: TaskItem; // For edit mode
}

@Component({
    selector: "app-create-edit-task",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatDialogModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, ReactiveFormsModule],
    template: `
        <!-- Dialog Header with Gradient -->
        <div class="dialog-header">
            <div class="header-icon">
                <mat-icon>task_alt</mat-icon>
            </div>
            <div class="header-text">
                <h2 class="dialog-title">{{ isEdit() ? 'Edit Task' : 'Create New Task' }}</h2>
                <p class="header-subtitle">{{ data.projectName }}</p>
            </div>
        </div>

        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
            <mat-dialog-content class="mat-typography dialog-content">
                <!-- Title Section -->
                <div class="form-section">
                    <label class="form-label">Task Title</label>
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Enter task title</mat-label>
                        <input matInput formControlName="title" placeholder="e.g., Design dashboard mockup" required />
                        @if (taskForm.get('title')?.invalid && taskForm.get('title')?.touched) {
                            <mat-error>Title is required</mat-error>
                        }
                    </mat-form-field>
                </div>

                <!-- Description Section -->
                <div class="form-section">
                    <label class="form-label">Description (Optional)</label>
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Add details about the task</mat-label>
                        <textarea matInput formControlName="description" rows="3" placeholder="Describe what needs to be done..."></textarea>
                    </mat-form-field>
                </div>

                <!-- Form Grid -->
                <div class="form-grid">
                    <div class="form-section">
                        <label class="form-label">Task Type</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Select type</mat-label>
                            <mat-select formControlName="type" required>
                                @for (type of taskTypes; track type) {
                                    <mat-option [value]="type">{{ type }}</mat-option>
                                }
                            </mat-select>
                            @if (taskForm.get('type')?.invalid && taskForm.get('type')?.touched) {
                                <mat-error>Type is required</mat-error>
                            }
                        </mat-form-field>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Priority</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Select priority</mat-label>
                            <mat-select formControlName="priority" required>
                                @for (priority of taskPriorities; track priority) {
                                    <mat-option [value]="priority">{{ priority }}</mat-option>
                                }
                            </mat-select>
                            @if (taskForm.get('priority')?.invalid && taskForm.get('priority')?.touched) {
                                <mat-error>Priority is required</mat-error>
                            }
                        </mat-form-field>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Effort (Hours)</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Estimated hours</mat-label>
                            <input matInput formControlName="assignHours" placeholder="e.g., 8" required />
                            @if (taskForm.get('assignHours')?.invalid && taskForm.get('assignHours')?.touched) {
                                <mat-error>Effort is required</mat-error>
                            }
                        </mat-form-field>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Start Date</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Start date</mat-label>
                            <input matInput type="date" formControlName="startDate" />
                        </mat-form-field>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Due Date</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Due date</mat-label>
                            <input matInput type="date" formControlName="dueDate" />
                        </mat-form-field>
                    </div>

                    <div class="form-section">
                        <label class="form-label">Actual Hours</label>
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Actual hours</mat-label>
                            <input matInput formControlName="actualHours" placeholder="e.g., 0" />
                        </mat-form-field>
                    </div>
                </div>

                <!-- Assign To Section -->
                <div class="form-section">
                    <label class="form-label">Assign To</label>
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Select team member</mat-label>
                        <mat-select formControlName="assignedTo" required>
                            @for (member of data.members; track member.id) {
                                <mat-option [value]="member.id">
                                    <div class="member-option">
                                        @if (member.avatarUrl) {
                                            <img [src]="member.avatarUrl" alt="{{ member.name }}" class="member-avatar" />
                                        } @else {
                                            <div class="member-avatar-initials">{{ getInitials(member.name) }}</div>
                                        }
                                        <div class="member-info">
                                            <span class="member-name">{{ member.name }}</span>
                                            <span class="member-role">{{ member.title }}</span>
                                        </div>
                                    </div>
                                </mat-option>
                            }
                        </mat-select>
                        @if (taskForm.get('assignedTo')?.invalid && taskForm.get('assignedTo')?.touched) {
                            <mat-error>Assignment is required</mat-error>
                        }
                    </mat-form-field>
                </div>

                <!-- Preview Card -->
                @if (taskForm.get('title')?.value) {
                    <div class="preview-section">
                        <div class="preview-label">Preview</div>
                        <div class="preview-card">
                            <div class="preview-header">
                                <div class="preview-icon">
                                    <mat-icon>{{ getTypeIcon(taskForm.get('type')?.value) }}</mat-icon>
                                </div>
                                <div class="preview-info">
                                    <h4 class="preview-title">{{ taskForm.get('title')?.value }}</h4>
                                    <p class="preview-subtitle">{{ taskForm.get('type')?.value }}</p>
                                </div>
                            </div>

                            <div class="preview-badges">
                                <span class="badge type">{{ taskForm.get('type')?.value }}</span>
                                <span class="badge priority" [class]="'priority-' + taskForm.get('priority')?.value?.toLowerCase()">
                                    {{ taskForm.get('priority')?.value }}
                                </span>
                            </div>

                            <div class="preview-details">
                                <div class="detail-row">
                                    <mat-icon>person</mat-icon>
                                    <span>{{ getMemberName(taskForm.get('assignedTo')?.value) || 'Not assigned' }}</span>
                                </div>
                                <div class="detail-row">
                                    <mat-icon>schedule</mat-icon>
                                    <span>{{ taskForm.get('assignHours')?.value || '0' }}h estimated</span>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </mat-dialog-content>

            <mat-dialog-actions align="end" class="dialog-actions">
                <button mat-stroked-button type="button" (click)="dialogRef.close()" class="cancel-btn">
                    <mat-icon>close</mat-icon>
                    Cancel
                </button>
                <button 
                    mat-raised-button 
                    color="primary" 
                    type="submit" 
                    [disabled]="taskForm.invalid"
                    class="submit-btn">
                    <mat-icon>{{ isEdit() ? 'edit' : 'add_task' }}</mat-icon>
                    {{ isEdit() ? 'Update Task' : 'Create Task' }}
                </button>
            </mat-dialog-actions>
        </form>
    `,
    styles: [`
        :host {
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-light: #9ca3af;
            --border-color: #e5e7eb;
            --accent-primary: #0ea5e9;
            --accent-secondary: #0284c7;
            --bg-primary: #ffffff;
            display: block;
        }

        @media (prefers-color-scheme: dark) {
            :host {
                --text-primary: #f3f4f6;
                --text-secondary: #d1d5db;
                --text-light: #9ca3af;
                --border-color: #374151;
                --bg-primary: #1f2937;
            }
        }

        /* Dialog Header */
        .dialog-header {
            display: flex;
            gap: 16px;
            align-items: flex-start;
            padding: 24px;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            margin: -24px -24px 0 -24px;
            border-radius: 8px 8px 0 0;
        }

        .header-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            backdrop-filter: blur(10px);

            mat-icon {
                font-size: 28px;
                color: white;
            }
        }

        .header-text {
            flex: 1;
        }

        .dialog-title {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }

        .header-subtitle {
            margin: 6px 0 0;
            font-size: 13px;
            opacity: 0.92;
            font-weight: 500;
        }

        /* Dialog Content */
        .dialog-content {
            padding: 24px !important;
            background: white !important;
        }

        /* Form Sections */
        .form-section {
            margin-bottom: 24px;
        }

        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;

            @media (max-width: 600px) {
                grid-template-columns: 1fr;
            }
        }

        /* Form Fields */
        mat-form-field {
            ::ng-deep {
                .mdc-notched-outline__leading,
                .mdc-notched-outline__notch,
                .mdc-notched-outline__trailing {
                    border-color: var(--border-color) !important;
                }

                .mdc-text-field--focused .mdc-notched-outline__leading,
                .mdc-text-field--focused .mdc-notched-outline__notch,
                .mdc-text-field--focused .mdc-notched-outline__trailing {
                    border-color: var(--accent-primary) !important;
                    border-width: 2px !important;
                }

                .mat-mdc-input-element,
                .mat-mdc-select-trigger {
                    color: var(--text-primary) !important;
                    font-weight: 500;
                }

                .mat-mdc-input-element::placeholder {
                    color: var(--text-light) !important;
                    opacity: 0.7;
                }

                .mat-mdc-form-field-label {
                    color: var(--text-secondary) !important;
                }

                .mat-mdc-option {
                    color: var(--text-primary) !important;
                }

                .mat-mdc-option:hover {
                    background: rgba(14, 165, 233, 0.08) !important;
                }
            }
        }

        /* Member Option */
        .member-option {
            display: flex;
            gap: 12px;
            align-items: center;
            width: 100%;
            padding: 2px 0;
        }

        .member-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 12px;
        }

        .member-avatar-initials {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 12px;
            flex-shrink: 0;
        }

        .member-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
            min-width: 0;
        }

        .member-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
        }

        .member-role {
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* Preview Section */
        .preview-section {
            margin-top: 28px;
            padding-top: 28px;
            border-top: 1px solid var(--border-color);
        }

        .preview-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--accent-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .preview-card {
            padding: 16px;
            background: var(--bg-primary);
            border: 1.5px solid var(--border-color);
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            transition: all 0.3s ease;
        }

        .preview-card:hover {
            border-color: var(--accent-primary);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
        }

        .preview-header {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .preview-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;

            mat-icon {
                font-size: 20px;
            }
        }

        .preview-info {
            flex: 1;
            min-width: 0;
        }

        .preview-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .preview-subtitle {
            margin: 2px 0 0;
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .preview-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .badge {
            display: inline-flex;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: capitalize;
            color: white;
            white-space: nowrap;

            &.type {
                background: #3b82f6;
            }

            &.priority-high {
                background: #ef4444;
            }

            &.priority-medium {
                background: #f59e0b;
            }

            &.priority-low {
                background: #10b981;
            }
        }

        .preview-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--border-color);
        }

        .detail-row {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 13px;
            color: var(--text-secondary);

            mat-icon {
                font-size: 16px;
                width: 16px;
                height: 16px;
                color: var(--accent-primary);
                flex-shrink: 0;
            }
        }

        /* Dialog Actions */
        .dialog-actions {
            padding: 16px 24px !important;
            border-top: 1px solid #e5e7eb;
            background: white !important;
            gap: 12px !important;
        }

        .cancel-btn {
            color: var(--text-secondary) !important;
            border-color: var(--border-color) !important;
            display: flex !important;
            gap: 6px;
            align-items: center;

            &:hover {
                background: var(--border-color) !important;
                color: var(--text-primary) !important;
            }

            mat-icon {
                font-size: 18px;
            }
        }

        .submit-btn {
            display: flex !important;
            gap: 8px;
            font-weight: 700 !important;
            border-radius: 8px !important;
            padding: 8px 20px !important;

            mat-icon {
                font-size: 20px;
            }
        }

        @media (max-width: 600px) {
            .dialog-header {
                padding: 16px;
                margin: -16px -16px 0 -16px;
            }

            .dialog-content {
                padding: 16px !important;
            }

            .dialog-actions {
                padding: 12px 16px !important;
                flex-wrap: wrap;
            }

            .form-grid {
                grid-template-columns: 1fr;
            }

            .submit-btn {
                width: 100%;
            }
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CreateEditTaskComponent {
    dialogRef = inject(MatDialogRef<CreateEditTaskComponent>);
    fb = inject(FormBuilder);
    data: DialogData = inject(MAT_DIALOG_DATA);

    isEdit = signal(false);
    taskForm: FormGroup;

    taskTypes: TaskType[] = ["bug", "epic", "story", "subtask", "task"];
    taskPriorities: TaskPriority[] = ["High", "Medium", "Low"];

    constructor() {
        this.taskForm = this.fb.group({
            title: ["", Validators.required],
            description: [""],
            type: [this.taskTypes[0], Validators.required],
            priority: [this.taskPriorities[1], Validators.required],
            assignedTo: [this.data.members[0]?.id || null, Validators.required],
            assignHours: ["8", Validators.required],
            startDate: [""],
            dueDate: [""],
            actualHours: ["0"],
        });
    }

    getTypeIcon(type: string): string {
        const icons: { [key: string]: string } = {
            "bug": "bug_report",
            "epic": "flag",
            "story": "description",
            "subtask": "subdirectory_arrow_right",
            "task": "task_alt",
        };
        return icons[type] || "task_alt";
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

    getMemberName(memberId: number): string {
        const member = this.data.members.find(m => m.id === memberId);
        return member?.name || 'Not assigned';
    }

    onSubmit() {
        if (this.taskForm.valid) {
            const formValue = this.taskForm.value;
            const newTask: Partial<TaskItem> = {
                ...formValue,
                projectId: this.data.projectId,
                status: "new" as TaskStatus,
                loggedHours: formValue.actualHours || "0",
                effortLogs: [],
            };
            this.dialogRef.close(newTask);
        }
    }

    ngOnInit() {
        if (this.data.task) {
            this.isEdit.set(true);
            this.populateForm(this.data.task);
        }
    }

    populateForm(task: TaskItem) {
        this.taskForm.patchValue({
            title: task.title,
            description: task.description,
            type: task.type,
            priority: task.priority,
            assignedTo: task.assignedToId,
            assignHours: task.assignHours.toString(),
            actualHours: task.loggedHours.toString(),
        });
    }
    ngAfterViewInit() {}
}