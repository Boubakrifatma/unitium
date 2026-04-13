import { Component, OnInit, ViewChild, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatChipsModule } from "@angular/material/chips";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { PageRightComponent } from "../../../components/page-right/pageright.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { EditEmployeeDialogComponent } from "./editemployee.component";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { ViewEmployeeDrawerComponent } from "./viewemployee.component";
import { OrganizationService, OrgMemberDTO } from "../../../organizations/organization.service";
import { switchMap } from "rxjs/operators";
declare const jsVectorMap: any;

export interface TableItem {
    employeeImage: string;
    employeeName: string;
    role: string;
    email: string;
    phone: string;
    lastLoginDate: string;
    lastVisitedTime: string;
    totalWorkingTime: number;
    totalWorkingTimeThisMonth: number;
    activeTask: number;
    completedTask: number;
    cancelledTask: number;
}

@Component({
    selector: "app-employee",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule, MatSidenavModule, MatFormFieldModule, MatDialogModule, FormsModule, MatTooltipModule, MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatSortModule, MatChipsModule, MatProgressBarModule, PageRightComponent, ViewEmployeeDrawerComponent],
    template: `
        <mat-drawer-container class="bg-none p-0 m-0" hasBackdrop="false">
            <mat-drawer-content>
                <div class="container-fluid fade-in mb-3 mb-lg-4">
                    <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3 mb-xl-0 py-1">
                                <h3 class="mb-1">Employees</h3>
                                <p class="small opacity-50">Manage your employee & support</p>
                            </div>

                            <div class="col-auto mb-3 mb-xl-0">
                                <app-page-right></app-page-right>
                            </div>
                        </div>
                    </mat-card>
                </div>
                <div class="container fade-in">
                    <!-- overview -->
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-md-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3 mb-xl-0">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                <mat-icon class="material-icons-outlined">group</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col-12 col-xl">
                                            <p class="small text-secondary mb-1">Total Members</p>
                                            <h2>{{ dataSource.data.length }}</h2>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                    <div class="row gx-3 gx-lg-4">
                        <!-- list -->
                        <div class="col-12 col-md-12 position-relative">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <mat-icon class="material-icons-outlined">group</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col mb-3">
                                                <h3 class="mb-1">Employees</h3>
                                                <p class="text-secondary small">All in employee</p>
                                            </div>
                                            <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                                                <mat-form-field appearance="outline" class="w-100 inline-small">
                                                    <mat-label>Search</mat-label>
                                                    <mat-icon matPrefix>search</mat-icon>
                                                    <input matInput placeholder="Search" (keyup)="applyFilter($event)" #searchinput />
                                                </mat-form-field>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>

                                <table mat-table [dataSource]="dataSource" matSort class="bg-none mb-3 responsive-table">
                                    <ng-container matColumnDef="employeeName">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Employee Info</th>
                                        <td mat-cell *matCellDef="let element" class="py-2 hoverview">
                                            <div class="row gx-3">
                                                <div class="col-auto">
                                                    <div class="avatar avatar-40 rounded coverimg" (click)="openEmployeeDrawer(element)">
                                                        <img [src]="element.employeeImage" alt="{{ element.employeeName }}" class="" />
                                                        <mat-icon class="hoverview-icon bg-light-theme text-theme rounded circle avatar avatar-40 position-absolute start-0 top-0">visibility</mat-icon>
                                                    </div>
                                                </div>
                                                <div class="col">
                                                    <h4 class="mb-0">{{ element.employeeName }} <mat-icon class="text-sm text-theme" (click)="editEmployee(element)">edit</mat-icon></h4>
                                                    <span class="badge badge-light d-inline-block mt-1" [ngClass]="roleClass(element.role)">{{ roleLabel(element.role) }}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="contactInfo">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Contact</th>
                                        <td mat-cell *matCellDef="let element">
                                            <p class="mb-1">{{ element.email }}</p>
                                            <p class="text-secondary small">{{ element.phone }}</p>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="lastVisited">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Login</th>
                                        <td mat-cell *matCellDef="let element">
                                            <p class="mb-1">{{ element.lastLoginDate }}</p>
                                            <p class="text-secondary small">{{ element.lastVisitedTime }}</p>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="totalPurchase">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Working Hours</th>
                                        <td mat-cell *matCellDef="let element">
                                            <h4 class="mb-1">{{ element.totalWorkingTime | number : "1.2-2" }} hrs</h4>
                                            <p class="text-secondary small">This Month: {{ element.totalWorkingTimeThisMonth | number : "1.2-2" }}</p>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="status">
                                        <th mat-header-cell *matHeaderCellDef>Task</th>
                                        <td mat-cell *matCellDef="let element">
                                            <div class="badge badge-light theme-blue d-inline-block me-1" matTooltip="Assigned">
                                                <h4 class="px-1">{{ element.activeTask }}</h4>
                                            </div>
                                            <div class="badge badge-light theme-green d-inline-block me-1" matTooltip="Completed">
                                                <h4 class="px-1">{{ element.completedTask }}</h4>
                                            </div>
                                            <div class="badge badge-light theme-yellow d-inline-block" matTooltip="In-Progress">
                                                <h4 class="px-1">{{ element.cancelledTask }}</h4>
                                            </div>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="actions">
                                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                                        <td mat-cell *matCellDef="let element">
                                            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Actions menu">
                                                <mat-icon>more_vert</mat-icon>
                                            </button>
                                            <mat-menu #menu="matMenu">
                                                <button mat-menu-item (click)="editEmployee(element)">
                                                    <mat-icon>edit</mat-icon>
                                                    <span>Edit</span>
                                                </button>
                                                <button mat-menu-item (click)="banEmployee(element)">
                                                    <mat-icon>block</mat-icon>
                                                    <span>Ban</span>
                                                </button>
                                                <button mat-menu-item (click)="deleteEmployee(element)">
                                                    <mat-icon>delete</mat-icon>
                                                    <span>Delete</span>
                                                </button>
                                            </mat-menu>
                                        </td>
                                    </ng-container>

                                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                                    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

                                    <tr class="mat-row" *matNoDataRow>
                                        <td class="mat-cell" [attr.colspan]="displayedColumns.length">No data matching the filter "{{ searchinput.value }}"</td>
                                    </tr>
                                </table>

                                <mat-card-content>
                                    <!-- Paginator -->
                                    <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of employees" class="bg-none"></mat-paginator>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                </div>
            </mat-drawer-content>
            <mat-drawer #viewemployee mode="over" position="end" style="--mat-sidenav-container-elevation-shadow:0px 5px 15px rgba(0, 0, 0, 0.15);z-index:12">
                <app-view-employee-drawer [employee]="selectedEmployee()" (editEmployee)="editEmployee(selectedEmployee())" (closeDrawer)="closeEmployeeDrawer()"></app-view-employee-drawer>
            </mat-drawer>
        </mat-drawer-container>
    `,
    styles: [
        `
            .mat-drawer-container {
                position: unset !important;
                mat-drawer {
                    position: fixed;
                    z-index: 20;
                }
            }
            .badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
        `,
    ],
})
export class EmployeeComponent implements OnInit {
    // mat drawer view employee
    @ViewChild("viewemployee") viewemployee!: MatDrawer;

    // dialog
    readonly dialog = inject(MatDialog);

    //table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    private orgService = inject(OrganizationService);

    dataSource = new MatTableDataSource<TableItem>([]);
    displayedColumns: string[] = ["employeeName", "contactInfo", "lastVisited", "totalPurchase", "status", "actions"];
    public selectedEmployee = signal<TableItem | null>(null);

    ngOnInit() {
        this.orgService.getMyOrganization().pipe(
            switchMap(org => this.orgService.getMembers(org.id))
        ).subscribe({
            next: (members: OrgMemberDTO[]) => {
                this.dataSource.data = members.map((m: OrgMemberDTO, index: number) => {
                    const joinedDate = m.joinedAt ? new Date(m.joinedAt) : null;
                    return {
                        employeeImage: `assets/img/user-${(index % 10) + 1}.jpg`,
                        employeeName: m.userFullName ?? m.userEmail ?? 'Unknown',
                        role: m.platformRole ?? m.role,
                        email: m.userEmail ?? '—',
                        phone: '—',
                        lastLoginDate: joinedDate ? joinedDate.toISOString().split('T')[0] : '—',
                        lastVisitedTime: joinedDate ? joinedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
                        totalWorkingTime: 0,
                        totalWorkingTimeThisMonth: 0,
                        activeTask: 0,
                        completedTask: 0,
                        cancelledTask: 0,
                    } as TableItem;
                });
            },
            error: () => console.warn('Could not load organization members.')
        });
    }
    ngAfterViewInit() {
        //table
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item: TableItem, header: string): string | number => {
            switch (header) {
                case "employeeName":
                    return item.employeeName;
                case "contactInfo":
                    return item.email;
                case "lastVisited":
                    return item.lastLoginDate;
                case "totalPurchase":
                    return item.totalWorkingTime;
                case "status":
                    return item.activeTask;
                default:
                    return "";
            }
        };

        this.dataSource.filterPredicate = (data: TableItem, filter: string) => {
            const dataStr = Object.values(data).join(" ").toLowerCase();
            return dataStr.indexOf(filter) !== -1;
        };
    }
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    roleLabel(role: string): string {
        const labels: Record<string, string> = {
            SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', MANAGER: 'Manager',
            EMPLOYEE: 'Employee', PRODUCT_OWNER: 'Product Owner',
            TUTOR: 'Tutor', STUDENT: 'Student', VIEWER: 'Viewer',
        };
        return labels[role] ?? role;
    }

    roleClass(role: string): string {
        const classes: Record<string, string> = {
            SUPER_ADMIN: 'theme-red', ADMIN: 'theme-orange', MANAGER: 'theme-blue',
            EMPLOYEE: 'theme-cyan', PRODUCT_OWNER: 'theme-purple',
            TUTOR: 'theme-yellow', STUDENT: 'theme-green', VIEWER: 'theme-gray',
        };
        return classes[role] ?? '';
    }

    editEmployee(employee: TableItem | null) {
        this.dialog.open(EditEmployeeDialogComponent, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: { ...employee },
        });
    }
    banEmployee(employee: TableItem) {
        console.log("Ban employee:", employee.employeeName);
    }

    deleteEmployee(employee: TableItem) {
        console.log("Delete employee:", employee.employeeName);
    }

    // drawer open
    openEmployeeDrawer(employee: TableItem) {
        this.selectedEmployee.set(employee);
        this.viewemployee.open();
    }

    closeEmployeeDrawer() {
        this.viewemployee.close();
        this.selectedEmployee.set(null);
    }
}
