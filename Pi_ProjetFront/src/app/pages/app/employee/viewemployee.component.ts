import { Component, Input, signal, Output, EventEmitter } from "@angular/core";
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TableItem } from "./employee.component";
import { MatCard, MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatToolbarModule } from "@angular/material/toolbar";

@Component({
    selector: "app-view-employee-drawer",
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatToolbarModule],
    template: `
        @if (employee) {
        <mat-toolbar>
            <h2 class="fw-bold">Employee Details</h2>
            <span class="spacer"></span>
            <button matIconButton aria-label="theme close" (click)="closeDrawer.emit()">
                <mat-icon>close</mat-icon>
            </button>
        </mat-toolbar>
        <div class="text-center">
            <div class="avatar avatar-140 coverimg rounded-circle mb-3" style="background-image:url({{ employee.employeeImage }})">
                <img class="d-none" [src]="employee.employeeImage" alt="Employee Image" />
            </div>
            <h3 class="mb-2">{{ employee.employeeName }}</h3>
            <p class=""><span class="text-secondary ">Last Login:</span> {{ employee.lastLoginDate }}, {{ employee.lastVisitedTime }}</p>
        </div>
        <mat-card class="m-3">
            <mat-card-content>
                <h4 class="mb-3">Contact Info</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-4"><p class="text-secondary">Email</p></div>
                    <div class="col-8">
                        <p>{{ employee.email }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-4"><p class="text-secondary">Phone</p></div>
                    <div class="col-8">
                        <p>{{ employee.phone }}</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Location Info</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-5"><p class="text-secondary">City</p></div>
                    <div class="col-7">
                        <p>{{ employee.city }}</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-5">
                        <p class="text-secondary">Country</p>
                    </div>
                    <div class="col-7">
                        <p>{{ employee.country }}</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Working Hours</h4>
                <div class="row gx-3 mb-2">
                    <div class="col-5"><p class="text-secondary">Lifetime</p></div>
                    <div class="col-7">
                        <p>{{ employee.totalWorkingTime }} hrs</p>
                    </div>
                </div>
                <div class="row gx-3 mb-2">
                    <div class="col-5">
                        <p class="text-secondary">This month</p>
                    </div>
                    <div class="col-7">
                        <p>{{ employee.totalWorkingTimeThisMonth }} hrs</p>
                    </div>
                </div>
                <br />
                <h4 class="mb-3">Task Status</h4>
                <div class="mb-3 mb-lg-2">
                    <div class="badge badge-light theme-blue me-1 mb-2 d-inline-block">
                        <h4>{{ employee.activeTask }} Assigned</h4>
                    </div>
                    <div class="badge badge-light theme-green me-1 mb-2 d-inline-block">
                        <h4>{{ employee.completedTask }} Completed</h4>
                    </div>
                    <div class="badge badge-light theme-yellow me-1 mb-2 d-inline-block">
                        <h4>{{ employee.cancelledTask }} In-Progress</h4>
                    </div>
                </div>
            </mat-card-content>
        </mat-card>
        <div class="px-3">
            <div class="row gx-3 mb-2">
                <div class="col">
                    <button matButton="filled" (click)="editEmployee.emit()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                </div>
                <div class="col-auto">
                    <button matButton class="theme-red" (click)="closeDrawer.emit()">Cancel</button>
                </div>
            </div>
        </div>
        }
    `,
})
export class ViewEmployeeDrawerComponent {
    @Input() employee: TableItem | null = null;
    @Output() closeDrawer = new EventEmitter<void>();
    @Output() editEmployee = new EventEmitter<void>();
}
