import { Component, OnInit, Inject, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatSliderModule } from "@angular/material/slider";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup, ValidationErrors, ValidatorFn } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { trigger, transition, style, animate } from "@angular/animations";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService, Project } from "../../../services/project-service";

@Component({
    selector: "app-create-edit-milestone",
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSliderModule,
        MatProgressBarModule,
        MatSnackBarModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="dialog-overlay" [@dialogOverlay]>
            <div class="dialog-container">
                <!-- Header -->
                <div class="dialog-header" [class.edit-mode]="isEdit">
                    <div class="header-content">
                        <div class="header-icon">
                            <mat-icon>{{ isEdit ? 'edit' : 'flag' }}</mat-icon>
                        </div>
                        <div class="header-text">
                            <h2 class="dialog-title">{{ isEdit ? 'Edit Milestone' : 'Create New Milestone' }}</h2>
                            <p class="dialog-subtitle">
                                {{ isEdit ? 'Update milestone details and track progress' : 'Set up a new milestone to track your project' }}
                            </p>
                        </div>
                    </div>
                    <button mat-icon-button (click)="onCancel()" class="close-btn">
                        <mat-icon>close</mat-icon>
                    </button>
                </div>

                <!-- Form Content -->
                <div class="dialog-content">
                    <form [formGroup]="milestoneForm" (ngSubmit)="onSubmit()">
                        <!-- Name Section -->
                        <div class="form-section">
                            <h3 class="section-title">
                                <mat-icon>label</mat-icon>
                                Basic Information
                            </h3>
                            <div class="form-group">
                                <mat-form-field appearance="outline" class="form-field-large">
                                    <mat-label>Milestone Name</mat-label>
                                    <input matInput formControlName="name" placeholder="e.g., MVP Launch, Beta Testing Phase">
                                    <mat-hint>Give your milestone a descriptive name</mat-hint>
                                    <mat-error *ngIf="milestoneForm.get('name')?.invalid && milestoneForm.get('name')?.touched">
                                        <mat-icon>error</mat-icon> Name is required
                                    </mat-error>
                                </mat-form-field>
                            </div>

                            <div class="form-group">
                                <mat-form-field appearance="outline" class="form-field-large">
                                    <mat-label>Description</mat-label>
                                    <textarea matInput formControlName="description" placeholder="Add details about this milestone..." rows="4"></textarea>
                                    <mat-hint>{{ milestoneForm.get('description')?.value?.length || 0 }} / 500 characters</mat-hint>
                                </mat-form-field>
                            </div>
                        </div>

                        <!-- Timeline Section -->
                        <div class="form-section">
                            <h3 class="section-title">
                                <mat-icon>calendar_today</mat-icon>
                                Timeline & Status
                            </h3>
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <mat-form-field appearance="outline" class="form-field">
                                        <mat-label>Due Date</mat-label>
                                        <input matInput [matDatepicker]="picker" formControlName="dueDate" readonly>
                                        <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                                        <mat-error *ngIf="milestoneForm.hasError('dueDatePast') && milestoneForm.get('dueDate')?.touched">
                                            <mat-icon>error</mat-icon> Date must be today or later
                                        </mat-error>
                                        <mat-datepicker #picker [dateFilter]="dateFilter"></mat-datepicker>
                                    </mat-form-field>
                                </div>

                            <div class="form-group flex-1">
                                    <mat-form-field appearance="outline" class="form-field">
                                        <mat-label>Status</mat-label>
                                        <mat-select formControlName="status">
                                            <mat-option value="pending">
                                                <span class="status-option pending">●</span> Pending
                                            </mat-option>
                                            <mat-option value="in_progress">
                                                <span class="status-option in-progress">●</span> In Progress
                                            </mat-option>
                                            <mat-option value="completed">
                                                <span class="status-option completed">●</span> Completed
                                            </mat-option>
                                        </mat-select>
                                        <mat-error *ngIf="milestoneForm.get('status')?.invalid && milestoneForm.get('status')?.touched">
                                            <mat-icon>error</mat-icon> Status is required
                                        </mat-error>
                                    </mat-form-field>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Section -->
                        <div class="form-section">
                            <h3 class="section-title">
                                <mat-icon>trending_up</mat-icon>
                                Progress Tracking
                            </h3>
                            <div class="completion-wrapper">
                                <div class="completion-header">
                                    <label class="completion-label">Completion Progress</label>
                                    <span class="completion-value">{{ milestoneForm.get('completionPct')?.value || 0 }}%</span>
                                </div>
                                <mat-slider min="0" max="100" formControlName="completionPct" class="custom-slider">
                                </mat-slider>
                                <mat-progress-bar 
                                    mode="determinate" 
                                    [value]="milestoneForm.get('completionPct')?.value || 0"
                                    class="progress-bar-visual">
                                </mat-progress-bar>
                                <div class="progress-markers">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Project Section -->
                        <div class="form-section">
                            <h3 class="section-title">
                                <mat-icon>folder</mat-icon>
                                Project Association
                            </h3>
                            <div class="form-group">
                                <mat-form-field appearance="outline" class="form-field-large">
                                    <mat-label>Select Project</mat-label>
                                    <mat-select formControlName="projectId">
                                        <mat-select-trigger>
                                            <mat-icon class="project-icon">folder_open</mat-icon>
                                            {{ getProjectName(milestoneForm.get('projectId')?.value) }}
                                        </mat-select-trigger>
                                        <mat-option *ngFor="let project of projects" [value]="project.id" class="project-option">
                                            <mat-icon>folder</mat-icon>
                                            <span>{{ project.name }}</span>
                                        </mat-option>
                                    </mat-select>
                                    <mat-error *ngIf="milestoneForm.get('projectId')?.invalid && milestoneForm.get('projectId')?.touched">
                                        <mat-icon>error</mat-icon> Project is required
                                    </mat-error>
                                </mat-form-field>
                            </div>
                        </div>

                        <!-- Summary Card -->
                        <div class="summary-card" *ngIf="milestoneForm.get('name')?.value">
                            <h4 class="summary-title">
                                <mat-icon>preview</mat-icon>
                                Live Preview
                            </h4>
                            <div class="summary-content">
                                <div class="summary-item">
                                    <span class="summary-label">Milestone</span>
                                    <span class="summary-value-clear">{{ milestoneForm.get('name')?.value }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Project</span>
                                    <span class="summary-value-clear">{{ getProjectName(milestoneForm.get('projectId')?.value) }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Status</span>
                                    <span class="summary-badge" [ngClass]="'status-' + (milestoneForm.get('status')?.value || 'pending')">
                                        {{ milestoneForm.get('status')?.value | titlecase }}
                                    </span>
                                </div>
                                <div class="summary-item" *ngIf="milestoneForm.get('dueDate')?.value">
                                    <span class="summary-label">Due Date</span>
                                    <span class="summary-value-clear">{{ milestoneForm.get('dueDate')?.value | date: 'MMM dd, yyyy' }}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Progress</span>
                                    <span class="summary-value-clear">{{ milestoneForm.get('completionPct')?.value || 0 }}%</span>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Footer Actions -->
                <div class="dialog-footer">
                    <button mat-button class="cancel-btn" (click)="onCancel()">
                        <mat-icon>close</mat-icon>
                        Cancel
                    </button>
                    <div class="action-spacer"></div>
                    <button mat-raised-button 
                        color="primary" 
                        class="submit-btn"
                        (click)="onSubmit()"
                        [disabled]="!milestoneForm.valid || isSubmitting">
                        <mat-icon *ngIf="!isSubmitting">{{ isEdit ? 'update' : 'add' }}</mat-icon>
                        <mat-icon *ngIf="isSubmitting" class="spinning">autorenew</mat-icon>
                        {{ isSubmitting ? 'Processing...' : (isEdit ? 'Update Milestone' : 'Create Milestone') }}
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        :host {
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-primary: #ffffff;
            --bg-secondary: #f0f9ff;
            --bg-tertiary: #e0f2fe;
            --border-color: #e0f2fe;
            --accent-primary: #0ea5e9;
            --accent-secondary: #0284c7;
        }

        @media (prefers-color-scheme: dark) {
            :host {
                --text-primary: #f3f4f6;
                --text-secondary: #d1d5db;
                --bg-primary: #1f2937;
                --bg-secondary: #0f172a;
                --bg-tertiary: #1e3a8a;
                --border-color: #1e3a8a;
                --accent-primary: #0ea5e9;
                --accent-secondary: #0284c7;
            }
        }

        .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
        }

        .dialog-container {
            background: var(--bg-primary);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dialog-header {
            padding: 28px 32px;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            color: white;
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
        }

        .dialog-header.edit-mode {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .header-content {
            display: flex;
            gap: 16px;
            flex: 1;
        }

        .header-icon {
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .dialog-title {
            margin: 0 0 4px 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
        }

        .dialog-subtitle {
            margin: 0;
            font-size: 0.9rem;
            opacity: 0.95;
            color: white;
        }

        .close-btn {
            color: white;
            opacity: 0.8;
            transition: opacity 0.3s;
        }

        .close-btn:hover {
            opacity: 1;
        }

        .dialog-content {
            flex: 1;
            padding: 32px;
            overflow-y: auto;
            background: var(--bg-primary);
            color: var(--text-primary);
        }

        .form-section {
            margin-bottom: 32px;
            padding-bottom: 32px;
            border-bottom: 1px solid var(--border-color);
        }

        .form-section:last-of-type {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .section-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 20px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-title mat-icon {
            color: var(--accent-primary);
            font-size: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .flex-1 {
            flex: 1;
        }

        .form-field-large {
            width: 100% !important;
        }

        .form-field {
            width: 100%;
        }

        /* Improve text visibility in form fields */
        ::ng-deep .mat-mdc-text-field-wrapper {
            color: var(--text-primary) !important;
        }

        ::ng-deep .mat-mdc-form-field-infix {
            color: var(--text-primary) !important;
        }

        ::ng-deep .mat-mdc-input-element {
            color: var(--text-primary) !important;
            font-weight: 500;
            font-size: 0.95rem;
        }

        ::ng-deep .mat-mdc-input-element::placeholder {
            color: var(--text-secondary) !important;
            opacity: 0.7;
        }

        ::ng-deep textarea.mat-mdc-input-element {
            color: var(--text-primary) !important;
        }

        ::ng-deep .mat-mdc-select-trigger {
            color: var(--text-primary) !important;
            font-weight: 500;
        }

        ::ng-deep .mat-mdc-form-field-label {
            color: var(--text-secondary) !important;
        }

        ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
            color: var(--accent-primary) !important;
        }

        ::ng-deep .mat-mdc-option {
            color: var(--text-primary) !important;
        }

        ::ng-deep .mat-mdc-option:hover {
            background-color: rgba(14, 165, 233, 0.1) !important;
        }

        .completion-wrapper {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
        }

        .completion-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .completion-label {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95rem;
        }

        .completion-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--accent-primary);
            min-width: 60px;
            text-align: right;
        }

        .custom-slider {
            margin-bottom: 16px;
            width: 100%;
        }

        .progress-bar-visual {
            height: 6px;
            border-radius: 3px;
            margin-bottom: 12px;
            background-color: var(--bg-tertiary);
        }

        .progress-bar-visual ::ng-deep .mat-progress-bar-fill {
            background: linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
        }

        .progress-markers {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .status-option {
            margin-right: 8px;
            font-size: 1.2rem;
        }

        .status-option.pending {
            color: #6b7280;
        }

        .status-option.in-progress {
            color: #f59e0b;
        }

        .status-option.completed {
            color: #10b981;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.85rem;
            font-weight: 600;
            color: white;
        }

        .status-badge.status-pending {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }

        .status-badge.status-in_progress {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .status-badge.status-completed {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .project-icon {
            margin-right: 8px;
            color: var(--accent-primary);
        }

        .project-option {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .summary-card {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border: 2px dashed var(--accent-primary);
            border-radius: 12px;
            padding: 20px;
            margin-top: 24px;
        }

        .summary-title {
            margin: 0 0 16px 0;
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--accent-primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .summary-title mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
        }

        .summary-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .summary-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .summary-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .summary-value-clear {
            font-size: 1.4rem;
            font-weight: 950;
            color: var(--text-primary);
            word-break: break-word;
            line-height: 1.4;
            letter-spacing: 0.3px;
        }

        .dialog-footer {
            padding: 20px 32px;
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 12px;
            align-items: center;
            background: var(--bg-secondary);
            border-radius: 0 0 16px 16px;
        }

        .cancel-btn {
            color: var(--text-secondary);
            transition: all 0.3s;
        }

        .cancel-btn:hover {
            background: var(--bg-tertiary);
        }

        .action-spacer {
            flex: 1;
        }

        .submit-btn {
            padding: 8px 24px;
            font-weight: 600;
            display: flex;
            gap: 8px;
            align-items: center;
            min-width: 200px;
            justify-content: center;
        }

        .submit-btn:disabled {
            opacity: 0.6;
        }

        .spinning {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Snackbar Popups */
        ::ng-deep .snackbar-success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
            color: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3) !important;
            font-weight: 600 !important;
        }

        ::ng-deep .snackbar-success .mdc-button {
            color: white !important;
            font-weight: 600;
        }

        ::ng-deep .snackbar-error {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
            color: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3) !important;
            font-weight: 600 !important;
        }

        ::ng-deep .snackbar-error .mdc-button {
            color: white !important;
            font-weight: 600;
        }

        ::ng-deep .snackbar-info {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
            color: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3) !important;
            font-weight: 600 !important;
        }

        ::ng-deep .snackbar-info .mdc-button {
            color: white !important;
            font-weight: 600;
        }

        ::ng-deep .mdc-snackbar__surface {
            border-radius: 8px !important;
        }

        /* Date Picker */
        ::ng-deep .mat-datepicker-toggle {
            color: var(--accent-primary);
        }

        ::ng-deep .mat-calendar-body-selected {
            background-color: var(--accent-primary) !important;
            color: white !important;
        }

        ::ng-deep .mat-calendar-header {
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%) !important;
        }

        @media (max-width: 600px) {
            .dialog-container {
                max-width: 100%;
                border-radius: 16px 16px 0 0;
            }

            .dialog-header {
                padding: 20px;
            }

            .dialog-content {
                padding: 20px;
            }

            .form-row {
                grid-template-columns: 1fr;
            }

            .summary-content {
                grid-template-columns: 1fr;
            }

            .dialog-footer {
                flex-direction: column-reverse;
            }

            .submit-btn {
                width: 100%;
                min-width: unset;
            }

            .cancel-btn {
                width: 100%;
            }
        }
    `],
    animations: [
        trigger('dialogOverlay', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CreateEditMilestoneComponent implements OnInit {
    milestoneForm: FormGroup;
    projects: Project[] = [];
    isEdit = false;
    milestone: Milestone | null = null;
    isSubmitting = false;
    private today: Date = new Date();

    dateFilter = (date: Date | null): boolean => {
        if (!date) return false;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const t = new Date(this.today);
        t.setHours(0, 0, 0, 0);
        return d >= t;
    };

    constructor(
        private fb: FormBuilder,
        private milestoneService: MilestoneService,
        private projectService: ProjectService,
        private dialogRef: MatDialogRef<CreateEditMilestoneComponent>,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: { milestone?: Milestone }
    ) {
        this.today.setHours(0, 0, 0, 0);

        this.milestoneForm = this.fb.group(
            {
                name: ['', Validators.required],
                description: [''],
                dueDate: [''],
                status: ['pending', Validators.required],
                completionPct: [0, [Validators.min(0), Validators.max(100)]],
                projectId: ['', Validators.required]
            },
            { validators: [this.dueDateNotPastValidator()] }
        );
    }

    private dueDateNotPastValidator(): ValidatorFn {
        return (group: AbstractControl): ValidationErrors | null => {
            const due = group.get("dueDate")?.value as Date | null;
            if (!due) return null;

            const d = new Date(due);
            d.setHours(0, 0, 0, 0);
            const t = new Date(this.today);
            t.setHours(0, 0, 0, 0);

            if (d < t) return { dueDatePast: true };
            return null;
        };
    }

    ngOnInit() {
        this.loadProjects();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (this.data?.milestone) {
            this.isEdit = true;
            this.milestone = this.data.milestone;
            this.milestoneForm.patchValue({
                name: this.milestone.name,
                description: this.milestone.description,
                dueDate: this.milestone.dueDate ? new Date(this.milestone.dueDate) : today,
                status: this.milestone.status || 'pending',
                completionPct: this.milestone.completionPct,
                projectId: this.milestone.projectId ?? this.milestone.project?.id ?? ""
            });
        } else {
            // For new milestones, set pending as default status
            this.milestoneForm.patchValue({
                dueDate: today,
                status: 'pending'
            });
        }
    }

    loadProjects() {
        this.projectService.getAll().subscribe({
            next: (projects) => {
                this.projects = projects;
                if (!this.isEdit && projects.length > 0) {
                    this.milestoneForm.patchValue({ projectId: projects[0].id });
                }
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading projects', err);
                this.showSnackBar('Failed to load projects', 'error');
            }
        });
    }

    getProjectName(projectId: string | number | undefined): string {
        if (!projectId) return 'Select a project';
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.name : 'Unknown Project';
    }

    onSubmit() {
        if (this.milestoneForm.valid) {
            this.isSubmitting = true;
            this.cdr.markForCheck();

            const formValue = this.milestoneForm.value;
            const milestone: Milestone = {
                ...formValue,
                dueDate: formValue.dueDate ? formValue.dueDate.toISOString().split('T')[0] : undefined
            };

            const operation$ = this.isEdit && this.milestone?.id
                ? this.milestoneService.update(this.milestone.id, milestone)
                : this.milestoneService.create(milestone);

            operation$.subscribe({
                next: () => {
                    const action = this.isEdit ? 'updated' : 'created';
                    this.showSnackBar(`Milestone ${action} successfully!`, 'success');
                    setTimeout(() => {
                        this.dialogRef.close(true);
                    }, 800);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    this.cdr.markForCheck();
                    console.error('Error submitting milestone', err);
                    this.showSnackBar(`Failed to ${this.isEdit ? 'update' : 'create'} milestone`, 'error');
                }
            });
        }
    }

    onCancel() {
        this.dialogRef.close();
    }

    private showSnackBar(message: string, type: 'success' | 'error' | 'info' = 'info') {
        const config = {
            duration: type === 'success' ? 3500 : type === 'error' ? 5000 : 4000,
            panelClass: [`snackbar-${type}`],
            horizontalPosition: 'end' as const,
            verticalPosition: 'bottom' as const,
        };

        this.snackBar.open(message, 'Dismiss', config);
    }
}