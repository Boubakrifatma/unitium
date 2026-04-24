import { Component, OnInit, signal, inject } from "@angular/core";
import { provideNativeDateAdapter } from "@angular/material/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatTimepickerModule } from "@angular/material/timepicker";
import { MatListModule } from "@angular/material/list";
import { MatTableModule } from "@angular/material/table";

// --- INTERFACES ---
interface EffortLog {
    date: string;
    startTime: string;
    endTime: string;
    duration: string;
}

interface Task {
    taskId: number;
    projectId: number;
    title: string;
    status: string;
    type: string;
    assignHours: string;
    loggedHours: string;
    priority: string;
    effortLogs: EffortLog[];
}

@Component({
    selector: "app-effort-log-dialog",
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatDialogModule, MatTableModule, MatTimepickerModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatListModule],
    template: `
        <h3 mat-dialog-title>
            Log time: #{{ data.taskId }}<br />
            <small class="text-secondary ps-2">
                {{ data.title }}.
                <span
                    class="badge badge-light"
                    [ngClass]="{
                        'theme-green': data.status === 'in-progress',
                        'theme-orange': data.status === 'ready to test',
                        'theme-sky': data.status === 'new',
                        'theme-red': data.status === 'completed'
                    }">
                    {{ data.status | titlecase }}
                </span>
            </small>
        </h3>
        <mat-dialog-content class="mat-typography">
            @if (data.effortLogs.length > 0) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-header>
                    <h4 class="mb-2">
                        Existing Effort Logs ({{ data.effortLogs.length }}) - <span class="fw-bold">{{ data.loggedHours }}</span> <span class="fw-bold text-secondary"> / {{ data.assignHours }} hrs</span>
                    </h4>
                </mat-card-header>
                <mat-card-content class="p-0">
                    <mat-table [dataSource]="data.effortLogs" class="bg-none responsive-table">
                        <!-- Date Column -->
                        <ng-container matColumnDef="date">
                            <mat-header-cell *matHeaderCellDef> Date </mat-header-cell>
                            <mat-cell *matCellDef="let log">
                                {{ log.date | date : "mediumDate" }}
                            </mat-cell>
                        </ng-container>

                        <!-- Start - End Time Range Column -->
                        <ng-container matColumnDef="timeRange">
                            <mat-header-cell *matHeaderCellDef> Start - End </mat-header-cell>
                            <mat-cell *matCellDef="let log"> {{ log.startTime }} - {{ log.endTime }} </mat-cell>
                        </ng-container>

                        <!-- Duration Column -->
                        <ng-container matColumnDef="duration">
                            <mat-header-cell *matHeaderCellDef> Duration </mat-header-cell>
                            <mat-cell *matCellDef="let log">
                                {{ log.duration }}
                            </mat-cell>
                        </ng-container>

                        <!-- Row Definitions -->
                        <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                        <mat-row *matRowDef="let row; columns: displayedColumns"></mat-row>
                    </mat-table>
                </mat-card-content>
            </mat-card>
            } @else {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <p>No effort has been logged for this task yet.</p>
                </mat-card-content>
            </mat-card>
            }

            <h4 class="mb-3 mb-lg-4">Log New Time</h4>
            <form [formGroup]="effortLogForm" (ngSubmit)="saveLog()" class="grid grid-cols-1 gap-4 sm:gap-6">
                <div class="row gx-3 gx-lg-4">
                    <div class="col-12 col-md-12">
                        <!-- Date Picker -->
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Date</mat-label>
                            <input matInput [matDatepicker]="picker" formControlName="date" />
                            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                            <mat-datepicker #picker></mat-datepicker>
                            @if (effortLogForm.get('date')?.invalid && effortLogForm.get('date')?.touched) {
                            <mat-error>Date is required</mat-error>
                            }
                        </mat-form-field>
                    </div>
                    <div class="col-6 col-md-6">
                        <!-- Time Inputs (From/To) -->
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Pick a time</mat-label>
                            <input matInput [matTimepicker]="pickerStarttime" formControlName="startTime" />
                            <mat-timepicker-toggle matIconSuffix [for]="pickerStarttime">
                                <mat-icon matTimepickerToggleIcon>keyboard_arrow_down</mat-icon>
                            </mat-timepicker-toggle>
                            <mat-timepicker #pickerStarttime />
                            @if (effortLogForm.get('startTime')?.invalid && effortLogForm.get('startTime')?.touched) {
                            <mat-error>Required</mat-error>
                            }
                        </mat-form-field>
                    </div>
                    <div class="col-6 col-md-6">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>To time</mat-label>
                            <input matInput [matTimepicker]="pickerEndtime" formControlName="endTime" />
                            <mat-timepicker-toggle matIconSuffix [for]="pickerEndtime">
                                <mat-icon matTimepickerToggleIcon>keyboard_arrow_down</mat-icon>
                            </mat-timepicker-toggle>
                            <mat-timepicker #pickerEndtime />
                            @if (effortLogForm.get('endTime')?.invalid && effortLogForm.get('endTime')?.touched) {
                            <mat-error>Required</mat-error>
                            }
                        </mat-form-field>
                    </div>
                    <div class="col-12 ">
                        <mat-form-field class="w-100" appearance="outline">
                            <mat-label>Leave a comment</mat-label>
                            <textarea matInput placeholder="Ex. Completed the task..."></textarea>
                        </mat-form-field>
                    </div>
                </div>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions>
            <div class="w-100">
                <!-- Save Button -->
                <div class="row gx-3 gx-lg-4">
                    <div class="col">
                        <button matButton="filled" type="submit" [disabled]="effortLogForm.invalid"><mat-icon>save</mat-icon> Save Effort Log</button>
                    </div>
                    <div class="col-auto">
                        <button matButton (click)="dialogRef.close()" class="theme-red">Cancel</button>
                    </div>
                </div>
            </div>
        </mat-dialog-actions>
    `,
    providers: [
        // ... other providers
        provideNativeDateAdapter(),
    ],
})
export class EffortLogDialogComponent {
    dialogRef = inject(MatDialogRef<EffortLogDialogComponent>);
    data: Task = inject(MAT_DIALOG_DATA);
    formbuild = inject(FormBuilder);

    effortLogForm: FormGroup;
    displayedColumns: string[] = ["date", "timeRange", "duration"];

    constructor() {
        this.effortLogForm = this.formbuild.group({
            date: [new Date(), Validators.required],
            startTime: ["", Validators.required],
            endTime: ["", Validators.required],
        });
    }

    saveLog(): void {
        if (this.effortLogForm.valid) {
            const formValue = this.effortLogForm.value;

            const newLog: EffortLog = {
                date: formValue.date.toISOString().split("T")[0],
                startTime: formValue.startTime,
                endTime: formValue.endTime,

                duration: "New Log",
            };

            this.dialogRef.close(newLog);
        }
    }
}
