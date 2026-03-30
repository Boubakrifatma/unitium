import { Component, OnInit, Inject, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup, ValidationErrors, ValidatorFn } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
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
        MatDialogModule
    ],
    template: `
        <div class="container-fluid">
            <mat-card class="shadow-none">
                <mat-card-header>
                    <mat-card-title>{{ isEdit ? 'Edit Milestone' : 'Create Milestone' }}</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <form [formGroup]="milestoneForm" (ngSubmit)="onSubmit()">
                        <div class="row">
                            <div class="col-12 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Name</mat-label>
                                    <input matInput formControlName="name" placeholder="Milestone name">
                                    <mat-error *ngIf="milestoneForm.get('name')?.invalid && milestoneForm.get('name')?.touched">
                                        Le nom est requis
                                    </mat-error>
                                </mat-form-field>
                            </div>
                            <div class="col-12 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Description</mat-label>
                                    <textarea matInput formControlName="description" placeholder="Milestone description" rows="3"></textarea>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Due Date</mat-label>
                                    <input matInput [matDatepicker]="picker" formControlName="dueDate">
                                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                                    <mat-error *ngIf="milestoneForm.hasError('dueDatePast') && milestoneForm.get('dueDate')?.touched">
                                        La date d'échéance ne peut pas être dans le passé
                                    </mat-error>
                                    <mat-datepicker #picker [dateFilter]="dateFilter"></mat-datepicker>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Status</mat-label>
                                    <mat-select formControlName="status">
                                        <mat-option value="pending">Pending</mat-option>
                                        <mat-option value="in_progress">In Progress</mat-option>
                                        <mat-option value="completed">Completed</mat-option>
                                    </mat-select>
                                    <mat-error *ngIf="milestoneForm.get('status')?.invalid && milestoneForm.get('status')?.touched">
                                        Le statut est requis
                                    </mat-error>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Completion %</mat-label>
                                    <input matInput type="number" formControlName="completionPct" min="0" max="100">
                                    <mat-error *ngIf="milestoneForm.get('completionPct')?.invalid && milestoneForm.get('completionPct')?.touched">
                                        Doit être entre 0 et 100
                                    </mat-error>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Project</mat-label>
                                    <mat-select formControlName="projectId">
                                        <mat-option *ngFor="let project of projects" [value]="project.id">
                                            {{ project.name }}
                                        </mat-option>
                                    </mat-select>
                                    <mat-error *ngIf="milestoneForm.get('projectId')?.invalid && milestoneForm.get('projectId')?.touched">
                                        Le projet est requis
                                    </mat-error>
                                </mat-form-field>
                            </div>
                        </div>
                        <div class="d-flex justify-content-end mt-3">
                            <button mat-button type="button" (click)="onCancel()">Cancel</button>
                            <button mat-raised-button color="primary" type="submit" [disabled]="!milestoneForm.valid">
                                {{ isEdit ? 'Update' : 'Create' }}
                            </button>
                        </div>
                    </form>
                </mat-card-content>
            </mat-card>
        </div>
    `,
    styles: [`
        .container-fluid {
            padding: 20px;
        }
        mat-card {
            max-width: 600px;
            margin: 0 auto;
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CreateEditMilestoneComponent implements OnInit {
    milestoneForm: FormGroup;
    projects: Project[] = [];
    isEdit = false;
    milestone: Milestone | null = null;
    private today: Date = new Date();

    // Disable dates in the past (UX + validation safety net).
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
        if (this.data?.milestone) {
            this.isEdit = true;
            this.milestone = this.data.milestone;
            this.milestoneForm.patchValue({
                name: this.milestone.name,
                description: this.milestone.description,
                dueDate: this.milestone.dueDate ? new Date(this.milestone.dueDate) : '',
                status: this.milestone.status,
                completionPct: this.milestone.completionPct,
                projectId: this.milestone.projectId ?? this.milestone.project?.id ?? ""
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
            },
            error: (err) => {
                console.error('Error loading projects', err);
            }
        });
    }

    onSubmit() {
        if (this.milestoneForm.valid) {
            const formValue = this.milestoneForm.value;
            const milestone: Milestone = {
                ...formValue,
                dueDate: formValue.dueDate ? formValue.dueDate.toISOString().split('T')[0] : undefined
            };

            if (this.isEdit && this.milestone?.id) {
                this.milestoneService.update(this.milestone.id, milestone).subscribe({
                    next: () => {
                        this.dialogRef.close(true);
                    },
                    error: (err) => {
                        console.error('Error updating milestone', err);
                    }
                });
            } else {
                this.milestoneService.create(milestone).subscribe({
                    next: () => {
                        this.dialogRef.close(true);
                    },
                    error: (err) => {
                        console.error('Error creating milestone', err);
                    }
                });
            }
        }
    }

    onCancel() {
        this.dialogRef.close();
    }
}
