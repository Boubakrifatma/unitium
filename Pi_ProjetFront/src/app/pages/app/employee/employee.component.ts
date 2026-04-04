import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { PageRightComponent } from "../../../components/page-right/pageright.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { EditEmployeeDialogComponent } from "./editemployee.component";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { ViewEmployeeDrawerComponent } from "./viewemployee.component";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
import { TimelineChartComponent } from "../../../components/charts/timelinechart.component";
import { SemiDoughnutChartjs180Component } from "../../../components/charts/semi-doughnut-chartjs-180.component";
register();
declare const jsVectorMap: any;

export interface TableItem {
    employeeImage: string;
    employeeName: string;
    city: string;
    country: string;
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
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule, MatSidenavModule, MatFormFieldModule, MatDialogModule, FormsModule, MatTooltipModule, MatListModule, MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatSortModule, MatChipsModule, MatProgressBarModule, PageRightComponent, ViewEmployeeDrawerComponent, TimelineChartComponent, SemiDoughnutChartjs180Component],
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
                        <div class="col-6 col-sm-6 col-md-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3 mb-xl-0">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                <mat-icon class="material-icons-outlined">group</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col-12 col-xl">
                                            <p class="small text-secondary mb-1">Total Employee</p>
                                            <h2>320</h2>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-6 col-sm-6 col-md-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3 mb-xl-0">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                                                <mat-icon class="material-icons-outlined">work</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col-12 col-xl">
                                            <p class="small text-secondary mb-1">Job Applicants</p>
                                            <h2>15</h2>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-6 col-sm-6 col-md-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3 mb-xl-0">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                                                <span class="material-symbols-outlined"> cases </span>
                                            </div>
                                        </div>
                                        <div class="col-12 col-xl">
                                            <p class="small text-secondary mb-1">Departments</p>
                                            <h2>6</h2>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-6 col-sm-6 col-md-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3 mb-xl-0">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                                                <mat-icon class="material-icons-outlined">trending_up</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col-12 col-xl">
                                            <p class="small text-secondary mb-1">Average Tenure</p>
                                            <h2>2.8 Yrs</h2>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                    <div class="row gx-3 gx-lg-4">
                        <!-- employee performance -->
                        <div class="col-12 col-lg-12 col-xl-6">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <span class="material-symbols-outlined"> pace </span>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Performance</h3>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <app-timeline-chart class="height-200 d-block mb-3 mb-lg-4"></app-timeline-chart>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-6 col-lg-3 col-xl mb-3">
                                            <h3 class="mb-1">42.5 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-blue align-middle"></span> Productive</p>
                                        </div>
                                        <div class="col-6 col-lg-3 col-xl mb-3">
                                            <h3 class="mb-1">18.0 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-sky align-middle"></span> Learning</p>
                                        </div>
                                        <div class="col-6 col-lg-3 col-xl mb-3">
                                            <h3 class="mb-1">14.0 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-light-theme theme-chartreuse align-middle"></span> Unproductive</p>
                                        </div>
                                        <div class="col-6 col-lg-3 col-xl mb-3">
                                            <h3 class="mb-1">6.5 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded align-middle bg-theme theme-red"></span> Idle Time</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-sm-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <span class="material-symbols-outlined"> group </span>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Teams</h3>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <div class="height-140 w-100 text-center position-relative mb-4">
                                        <div class="position-absolute bottom-0 mx-auto start-0 w-100 mb-0">
                                            <h1 class="mb-1">320</h1>
                                            <p class="text-secondary small mb-1">Employee</p>
                                        </div>
                                        <app-semi-doughnut-chartjs-180 class="height-140 w-100 position-relative mx-auto" id="semidoughnutchart" style="top:-20px"></app-semi-doughnut-chartjs-180>
                                    </div>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-6 mb-3">
                                            <h3 class="mb-1">42.5 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-blue align-middle"></span> Developers</p>
                                        </div>
                                        <div class="col-6 mb-3">
                                            <h3 class="mb-1">18.0 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-theme theme-sky align-middle"></span> Sales</p>
                                        </div>
                                        <div class="col-6 mb-3">
                                            <h3 class="mb-1">14.0 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded bg-light-theme theme-chartreuse align-middle"></span> Designer</p>
                                        </div>
                                        <div class="col-6 mb-3">
                                            <h3 class="mb-1">6.5 hrs</h3>
                                            <p class="text-secondary small"><span class="avatar avatar-10 rounded align-middle bg-theme theme-red"></span> QA</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-sm-6 col-xl-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-header>
                                    <div class="w-100">
                                        <div class="row gx-3 align-items-center">
                                            <div class="col-auto mb-3 mb-lg-4">
                                                <div class="avatar avatar-40 text-theme rounded">
                                                    <span class="material-symbols-outlined"> business_center </span>
                                                </div>
                                            </div>
                                            <div class="col mb-3 mb-lg-4">
                                                <h3>Top Employee</h3>
                                            </div>
                                        </div>
                                    </div>
                                </mat-card-header>
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3 align-items-center mb-3">
                                        <div class="col-auto">
                                            <img src="assets/img/user-4.jpg" alt="" class="avatar avatar-70 rounded-circle" />
                                        </div>
                                        <div class="col">
                                            <p class="fw-bold mb-2">Liana Doe</p>
                                            <p class="mb-1 text-truncated">olivia.d@email.com</p>
                                            <p class="text-secondary small">Sydney, Australia</p>
                                        </div>
                                    </div>

                                    <h4 class="mb-1">Working Hours</h4>
                                    <p class="text-secondary small">2025-09-22, 09:00 AM</p>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-6 mb-3">
                                            <mat-card class="bg-light-theme shadow-none">
                                                <mat-card-content>
                                                    <h3 class="mb-0">2100.50</h3>
                                                    <p class="text-secondary small">Life Time</p>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                        <div class="col-6 mb-3">
                                            <mat-card class="bg-light-theme shadow-none theme-green">
                                                <mat-card-content>
                                                    <h3 class="mb-0">250.75</h3>
                                                    <p class="text-secondary small">This Month</p>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                    </div>
                                    <div class="row gx-2 justify-content-center mb-3">
                                        <div class="col">
                                            <button matButton class="text-theme theme-green"><mat-icon class="material-icons-outlined">call</mat-icon> Call</button>
                                        </div>
                                        <div class="col-auto">
                                            <button matButton class="text-theme theme-orange"><mat-icon class="material-icons-outlined">sms</mat-icon> Message</button>
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
                                                    <p class="text-secondary small">{{ element.city }}, {{ element.country }}</p>
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
        `,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmployeeComponent implements OnInit {
    // mat drawer view employee
    @ViewChild("viewemployee") viewemployee!: MatDrawer;

    // dialog
    readonly dialog = inject(MatDialog);

    //table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    originalTabledata: TableItem[] = [
        {
            employeeImage: "assets/img/user-1.jpg",
            employeeName: "Michael Johnson",
            city: "Los Angeles",
            country: "USA",
            email: "michael.j@email.com",
            phone: "555-234-5678",
            lastLoginDate: "2025-09-22",
            lastVisitedTime: "09:00 AM",
            totalWorkingTime: 2100.5,
            totalWorkingTimeThisMonth: 250.75,
            activeTask: 3,
            completedTask: 22,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-2.jpg",
            employeeName: "Emily Williams",
            city: "Paris",
            country: "France",
            email: "emily.w@email.com",
            phone: "555-876-5432",
            lastLoginDate: "2025-09-21",
            lastVisitedTime: "04:15 PM",
            totalWorkingTime: 850.0,
            totalWorkingTimeThisMonth: 120.0,
            activeTask: 0,
            completedTask: 10,
            cancelledTask: 2,
        },
        {
            employeeImage: "assets/img/user-3.jpg",
            employeeName: "David Brown",
            city: "Tokyo",
            country: "Japan",
            email: "david.b@email.com",
            phone: "555-345-6789",
            lastLoginDate: "2025-09-20",
            lastVisitedTime: "11:50 AM",
            totalWorkingTime: 350.25,
            totalWorkingTimeThisMonth: 45.5,
            activeTask: 1,
            completedTask: 5,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-4.jpg",
            employeeName: "Olivia Davis",
            city: "Sydney",
            country: "Australia",
            email: "olivia.d@email.com",
            phone: "555-765-4321",
            lastLoginDate: "2025-09-19",
            lastVisitedTime: "06:30 PM",
            totalWorkingTime: 1500.0,
            totalWorkingTimeThisMonth: 300.0,
            activeTask: 2,
            completedTask: 18,
            cancelledTask: 1,
        },
        {
            employeeImage: "assets/img/user-5.jpg",
            employeeName: "Daniel Wilson",
            city: "Berlin",
            country: "Germany",
            email: "daniel.w@email.com",
            phone: "555-456-7890",
            lastLoginDate: "2025-09-18",
            lastVisitedTime: "01:20 PM",
            totalWorkingTime: 675.8,
            totalWorkingTimeThisMonth: 80.25,
            activeTask: 0,
            completedTask: 9,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-6.jpg",
            employeeName: "Sophia Martinez",
            city: "Madrid",
            country: "Spain",
            email: "sophia.m@email.com",
            phone: "555-654-3210",
            lastLoginDate: "2025-09-17",
            lastVisitedTime: "09:45 AM",
            totalWorkingTime: 950.9,
            totalWorkingTimeThisMonth: 150.0,
            activeTask: 1,
            completedTask: 14,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-7.jpg",
            employeeName: "Matthew Taylor",
            city: "Toronto",
            country: "Canada",
            email: "matthew.t@email.com",
            phone: "555-543-2109",
            lastLoginDate: "2025-09-16",
            lastVisitedTime: "03:10 PM",
            totalWorkingTime: 420.0,
            totalWorkingTimeThisMonth: 65.75,
            activeTask: 0,
            completedTask: 7,
            cancelledTask: 1,
        },
        {
            employeeImage: "assets/img/user-8.jpg",
            employeeName: "Isabella Anderson",
            city: "Rome",
            country: "Italy",
            email: "isabella.a@email.com",
            phone: "555-432-1098",
            lastLoginDate: "2025-09-15",
            lastVisitedTime: "08:00 PM",
            totalWorkingTime: 2800.5,
            totalWorkingTimeThisMonth: 450.0,
            activeTask: 4,
            completedTask: 30,
            cancelledTask: 2,
        },
        {
            employeeImage: "assets/img/user-9.jpg",
            employeeName: "Joseph Thomas",
            city: "Dubai",
            country: "UAE",
            email: "joseph.t@email.com",
            phone: "555-321-0987",
            lastLoginDate: "2025-09-14",
            lastVisitedTime: "05:00 AM",
            totalWorkingTime: 760.0,
            totalWorkingTimeThisMonth: 95.0,
            activeTask: 1,
            completedTask: 11,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-10.jpg",
            employeeName: "Ava Hernandez",
            city: "Mexico City",
            country: "Mexico",
            email: "ava.h@email.com",
            phone: "555-210-9876",
            lastLoginDate: "2025-09-13",
            lastVisitedTime: "12:00 PM",
            totalWorkingTime: 550.0,
            totalWorkingTimeThisMonth: 70.0,
            activeTask: 0,
            completedTask: 6,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-1.jpg",
            employeeName: "Christopher Moore",
            city: "Shanghai",
            country: "China",
            email: "chris.m@email.com",
            phone: "555-109-8765",
            lastLoginDate: "2025-09-12",
            lastVisitedTime: "07:45 PM",
            totalWorkingTime: 1800.0,
            totalWorkingTimeThisMonth: 200.0,
            activeTask: 2,
            completedTask: 25,
            cancelledTask: 1,
        },
        {
            employeeImage: "assets/img/user-2.jpg",
            employeeName: "Mia White",
            city: "Mumbai",
            country: "India",
            email: "mia.w@email.com",
            phone: "555-987-6543",
            lastLoginDate: "2025-09-11",
            lastVisitedTime: "02:30 PM",
            totalWorkingTime: 600.5,
            totalWorkingTimeThisMonth: 85.0,
            activeTask: 1,
            completedTask: 12,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-3.jpg",
            employeeName: "James Harris",
            city: "Rio de Janeiro",
            country: "Brazil",
            email: "james.h@email.com",
            phone: "555-876-5432",
            lastLoginDate: "2025-09-10",
            lastVisitedTime: "10:15 AM",
            totalWorkingTime: 950.0,
            totalWorkingTimeThisMonth: 110.0,
            activeTask: 0,
            completedTask: 16,
            cancelledTask: 0,
        },
        {
            employeeImage: "assets/img/user-4.jpg",
            employeeName: "Charlotte Clark",
            city: "Moscow",
            country: "Russia",
            email: "charlotte.c@email.com",
            phone: "555-765-4321",
            lastLoginDate: "2025-09-09",
            lastVisitedTime: "04:50 PM",
            totalWorkingTime: 1200.75,
            totalWorkingTimeThisMonth: 180.5,
            activeTask: 3,
            completedTask: 20,
            cancelledTask: 1,
        },
        {
            employeeImage: "assets/img/user-5.jpg",
            employeeName: "Ethan Lewis",
            city: "Cairo",
            country: "Egypt",
            email: "ethan.l@email.com",
            phone: "555-654-3210",
            lastLoginDate: "2025-09-08",
            lastVisitedTime: "09:20 AM",
            totalWorkingTime: 320.0,
            totalWorkingTimeThisMonth: 55.0,
            activeTask: 0,
            completedTask: 4,
            cancelledTask: 0,
        },
    ];

    dataSource = new MatTableDataSource<TableItem>(this.originalTabledata);
    displayedColumns: string[] = ["employeeName", "contactInfo", "lastVisited", "totalPurchase", "status", "actions"];
    public selectedEmployee = signal<TableItem | null>(null);

    ngOnInit() {}
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
