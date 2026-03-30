import { Component, OnInit, AfterViewInit, OnDestroy, signal, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { CommonModule, AsyncPipe } from "@angular/common";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSnackBar, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarModule, MatSnackBarRef } from "@angular/material/snack-bar";
import { MatDatepickerInputEvent, MatCalendarCellClassFunction, MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { startWith, map, Observable } from "rxjs";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatCardModule } from "@angular/material/card";
import { TableItem } from "./projects-cards.component";
import { MatSelectModule } from "@angular/material/select";
import { EmployeeSelect2Component } from "../../../components/employee-select/employee-select2.component";
import { M2ProjectService } from "./m2-project.service";

@Component({
    selector: "app-createditproject",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [CommonModule, MatDividerModule, MatAutocompleteModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatSnackBarModule, MatDialogTitle, MatButtonModule, FormsModule, MatIconModule, MatChipsModule, MatDatepickerModule, ReactiveFormsModule, MatDialogContent, MatDialogActions, MatDialogClose, MatButtonModule, EmployeeSelect2Component],
    template: `
        <h3 mat-dialog-title>
            Project: {{ projectData.name }} <br />
            <small class="text-secondary ps-2">Due Date: {{ projectData.dueDate }}, Progress: {{ projectData.progress }}%</small>
        </h3>
        <mat-dialog-content class="mat-typography">
            @if (projectData) {
            <form class="pt-3 pt-lg-4">
                <div class="row gx-3">
                    <div class="col-12 col-lg-4 text-center">
                        <div class="height-180 width-180 lh-20 position-relative d-block mx-auto my-4">
                            <div class="position-absolute bottom-0 end-0 z-index-1 m-2">
                                <button matMiniFab="elevated" onclick="this.nextElementSibling.click()"><mat-icon class="material-icons-outlined mx-0">photo_camera</mat-icon></button>
                                <input type="file" class="d-none" />
                            </div>
                            <div class="coverimg avatar avatar-180 mb-0 position-relative z-index-0 overflow-hidden rounded bg-light-theme" style="background-image:url('{{ data.image }}')"></div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-8">
                        <div class="row gx-3 align-items-center">
                            <div class="col-12">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Project Name</mat-label>
                                    <input matInput [(ngModel)]="projectData.name" name="name" />
                                </mat-form-field>
                            </div>
                            <div class="col-12">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Client Name</mat-label>
                                    <input matInput [(ngModel)]="projectData.company" name="company" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Status</mat-label>
                                    <mat-select [(ngModel)]="projectData.status" name="status">
                                        <mat-option value="">Select Status</mat-option>
                                        <mat-option value="PLANNING">Planning</mat-option>
                                        <mat-option value="ACTIVE">Active</mat-option>
                                        <mat-option value="ON_HOLD">On Hold</mat-option>
                                        <mat-option value="COMPLETED">Completed</mat-option>
                                        <mat-option value="CANCELLED">Cancelled</mat-option>
                                    </mat-select>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Priority</mat-label>
                                    <mat-select [(ngModel)]="projectData.priority" name="priority">
                                        <mat-option value="">Select</mat-option>
                                        <mat-option value="High">High</mat-option>
                                        <mat-option value="Medium">Medium</mat-option>
                                        <mat-option value="Low">Low</mat-option>
                                    </mat-select>
                                </mat-form-field>
                            </div>
                            <div class="col-12">
                                <h4 class="my-3">Team</h4>
                            </div>

                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Project Manager</mat-label>
                                    <input matInput [(ngModel)]="projectData.manager" name="manager" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-6">
                                <app-employee-select2></app-employee-select2>
                            </div>
                            <div class="col-12 col-md-6">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Due date</mat-label>
                                    <input matInput [matDatepicker]="picker" [(ngModel)]="projectData.dueDate" name="dueDate" />
                                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                                    <mat-datepicker #picker></mat-datepicker>
                                </mat-form-field>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
            }
        </mat-dialog-content>
        <mat-dialog-actions>
            <div class="col">
                @if (projectData.name) {
                <button matButton="filled" (click)="updateOrder()" [disabled]="saving"><mat-icon class="material-icons-outlined">event</mat-icon> {{ saving ? 'Saving…' : 'Update' }}</button>
                } @else {
                <button matButton="filled" mat-dialog-close><mat-icon class="material-icons-outlined">event</mat-icon> Add</button>
                }
            </div>
            <div class="col-auto">
                <button matButton mat-dialog-close class="theme-red">Cancel</button>
            </div>
        </mat-dialog-actions>
    `,
    styles: [``],
})
export class CreateEditProjectModal implements OnDestroy {
    public projectData: TableItem;
    saving = false;
    private updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(
        public dialogRef: MatDialogRef<CreateEditProjectModal>,
        @Inject(MAT_DIALOG_DATA) public data: TableItem,
        private snackBar: MatSnackBar,
        private projectService: M2ProjectService,
    ) {
        this.projectData = { ...data };
        if (!this.projectData.status) {
            this.projectData.status = "";
        }
    }

    updateOrder(): void {
        if (!this.data.workspaceId || !this.data.projectUuid) {
            // Demo mode — no real data
            this.openSnackBar("Project updated (demo mode).", "Dismiss");
            this.dialogRef.close(this.projectData);
            return;
        }
        this.saving = true;
        this.projectService.updateProject(this.data.workspaceId, this.data.projectUuid, {
            name: this.projectData.name,
            status: this.projectData.status || undefined,
            endDate: this.projectData.dueDate || undefined,
        }).subscribe({
            next: (updated) => {
                this.saving = false;
                this.openSnackBar("Project updated successfully.", "Dismiss");
                this.dialogRef.close({
                    ...this.projectData,
                    name: updated.name ?? this.projectData.name,
                    status: updated.status ?? this.projectData.status,
                });
            },
            error: () => {
                this.saving = false;
                this.openSnackBar("Failed to update project.", "Dismiss");
            },
        });
    }

    openSnackBar(message: string, action: string): void {
        this.snackBar.open(message, action, {
            duration: 3000,
            verticalPosition: "top",
            horizontalPosition: "right",
            panelClass: ["bg-light-theme", "theme-green"],
        });
    }

    ngOnDestroy(): void {
        if (this.updateTimeoutId !== null) {
            clearTimeout(this.updateTimeoutId);
        }
    }
}
