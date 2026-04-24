import { Component, Input, signal, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TableItem } from "./projects-grid.component";
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatProgressBarModule } from "@angular/material/progress-bar";

@Component({
    selector: "app-view-project-drawer",
    imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatToolbarModule],
    template: `
        @if (project) {
        <mat-toolbar>
            <h2 class="fw-bold">Project Details</h2>
            <span class="spacer"></span>
            <button matIconButton aria-label="theme close" (click)="closeDrawer.emit()">
                <mat-icon>close</mat-icon>
            </button>
        </mat-toolbar>
        <div class="text-center">
            <div class="avatar avatar-140 coverimg rounded mb-3" style="background-image:url({{ project.image }})">
                <img class="d-none" [src]="project.image" alt="Project Image" />
            </div>
            <h3 class="mb-1">{{ project.name }}</h3>
            <p class="text-secondary">{{ project.company }}</p>
        </div>
        <mat-card class="m-3">
            <mat-card-content>
                <h4 class="mb-3">Status Details</h4>
                <div class="row gx-3 mb-3">
                    <div class="col-4"><p class="text-secondary">Status</p></div>
                    <div class="col-8">
                        <span
                            class="badge badge-light"
                            [ngClass]="{
                                'theme-green': project.status === 'Active',
                                'theme-orange': project.status === 'On Hold',
                                'theme-red': project.status === 'Completed'
                            }">
                            {{ project.status }}
                        </span>
                    </div>
                </div>
                <div class="row gx-3 mb-3">
                    <div class="col-4"><p class="text-secondary">Priority</p></div>
                    <div class="col-8">
                        <span
                            class="badge"
                            [ngClass]="{
                                'theme-green': project.priority === 'Low',
                                'theme-orange': project.priority === 'Medium',
                                'theme-violet': project.priority === 'High'
                            }">
                            {{ project.priority }}
                        </span>
                    </div>
                </div>
                <div class="row gx-3 mb-3">
                    <div class="col-4"><p class="text-secondary">Due Date</p></div>
                    <div class="col-8">
                        <p>{{ project.dueDate }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-4"><p class="text-secondary">Progress</p></div>
                    <div class="col-8">
                        <p class="mb-1">{{ project.progress }} %</p>
                        <!-- Progress Bar -->
                        <mat-progress-bar class="mb-2" mode="determinate" value="{{ project.progress }}"></mat-progress-bar>
                    </div>
                </div>

                <br />
                <h4 class="mb-3">Team Info</h4>
                <div class="row gx-3 mb-3">
                    <div class="col-4"><p class="text-secondary">Manager</p></div>
                    <div class="col-8">
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2" style="background-image:url({{ project.managerimage }})">
                                <img class="d-none" [src]="project.managerimage" alt="Project Image" />
                            </span>
                            <span class="align-middle">{{ project.manager }} </span>
                        </p>
                    </div>
                </div>
                <div class="row gx-3 mb-3">
                    <div class="col-4"><p class="text-secondary">Team</p></div>
                    <div class="col-8">
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2">
                                <img class="d-none" src="assets/img/user-2.jpg" alt="Team Image" />
                            </span>
                            <span class="align-middle d-inline-block">
                                <p>Ava Johnson</p>
                            </span>
                        </p>
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2">
                                <img class="d-none" src="assets/img/user-3.jpg" alt="Team Image" />
                            </span>
                            <span class="align-middle d-inline-block">
                                <p>Ben Smith</p>
                            </span>
                        </p>
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2">
                                <img class="d-none" src="assets/img/user-4.jpg" alt="Team Image" />
                            </span>
                            <span class="align-middle d-inline-block">
                                <p>Chloe Lee</p>
                            </span>
                        </p>
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2">
                                <img class="d-none" src="assets/img/user-5.jpg" alt="Team Image" />
                            </span>
                            <span class="align-middle d-inline-block">
                                <p>David Chen</p>
                            </span>
                        </p>
                        <p>
                            <span class="avatar avatar-20 coverimg rounded-circle align-middle me-2">
                                <img class="d-none" src="assets/img/user-6.jpg" alt="Team Image" />
                            </span>
                            <span class="align-middle d-inline-block">
                                <p>Ella Garcia</p>
                            </span>
                        </p>
                    </div>
                </div>
            </mat-card-content>
        </mat-card>
        <div class="px-3">
            <div class="row gx-3 mb-2">
                <div class="col">
                    <button matButton="filled" (click)="openDialog.emit()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                </div>
                <div class="col-auto">
                    <button matButton class="theme-red" (click)="closeDrawer.emit()">Cancel</button>
                </div>
            </div>
        </div>
        }
    `,
})
export class ViewProjectDrawerComponent {
    @Input() project: TableItem | null = null;
    @Output() closeDrawer = new EventEmitter<void>();
    @Output() openDialog = new EventEmitter<void>();

    formatCurrency(value: number): string {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    }
}
