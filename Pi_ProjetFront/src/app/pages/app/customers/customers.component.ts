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
import { EditCustomerDialogComponent } from "./editcustomer.component";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { ViewCustomerDrawerComponent } from "./viewcustomer.component";
import Swiper from "swiper";
import { register } from "swiper/element/bundle";
register();
declare const jsVectorMap: any;

export interface TableItem {
    customerImage: string;
    customerName: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    lastVisitedDate: string;
    lastVisitedTime: string;
    totalPurchaseLifetime: number;
    totalPurchaseThisMonth: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
}

@Component({
    selector: "app-customers",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatButtonModule, MatSidenavModule, MatFormFieldModule, MatDialogModule, FormsModule, MatTooltipModule, MatListModule, MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule, MatSortModule, MatChipsModule, MatProgressBarModule, PageRightComponent, ViewCustomerDrawerComponent],
    template: `
        <mat-drawer-container class="bg-none p-0 m-0" hasBackdrop="false">
            <mat-drawer-content>
                <div class="container-fluid fade-in mb-3 mb-lg-4">
                    <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3 mb-xl-0 py-1">
                                <h3 class="mb-1">Customers</h3>
                                <p class="small opacity-50">Manage your customer & support</p>
                            </div>

                            <div class="col-auto mb-3 mb-xl-0">
                                <app-page-right></app-page-right>
                            </div>
                        </div>
                    </mat-card>
                </div>

                <div class="container fade-in">
                    <!-- sales overview -->
                    <div class="row gx-3 gx-lg-4">
                        <div class="col-12 col-md-6 col-lg-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-cyan">
                                                <mat-icon class="material-icons-outlined">shopping_cart</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class="small text-secondary mb-1">Total Sales</p>
                                            <h3>320</h3>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-yellow">
                                                <mat-icon class="material-icons-outlined">bar_chart</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class="small text-secondary mb-1">Revenue</p>
                                            <h3>$ 50.0K</h3>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-red">
                                                <mat-icon class="material-icons-outlined">paid</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class="small text-secondary mb-1">Cost</p>
                                            <h3>$ 36.85K</h3>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                        <div class="col-12 col-md-6 col-lg-3">
                            <mat-card class="mb-3 mb-lg-4">
                                <mat-card-content>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green">
                                                <mat-icon class="material-icons-outlined">trending_up</mat-icon>
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class="small text-secondary mb-1">Profit</p>
                                            <h3>$ 1.31K</h3>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>

                    <div class="row gx-3 gx-lg-4">
                        <!-- Orders -->
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
                                                <h3 class="mb-1">Customers</h3>
                                                <p class="text-secondary small">All in orders items</p>
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
                                    <ng-container matColumnDef="customerName">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Customer Info</th>
                                        <td mat-cell *matCellDef="let element" class="py-2 hoverview">
                                            <div class="row gx-3">
                                                <div class="col-auto">
                                                    <div class="avatar avatar-40 rounded coverimg" (click)="openCustomerDrawer(element)">
                                                        <img [src]="element.customerImage" alt="{{ element.customerName }}" class="" />
                                                        <mat-icon class="hoverview-icon bg-light-theme text-theme rounded circle avatar avatar-40 position-absolute start-0 top-0">visibility</mat-icon>
                                                    </div>
                                                </div>
                                                <div class="col">
                                                    <h4 class="mb-0">{{ element.customerName }} <mat-icon class="text-sm text-theme" (click)="editCustomer(element)">edit</mat-icon></h4>
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
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Last Visited</th>
                                        <td mat-cell *matCellDef="let element">
                                            <p class="mb-1">{{ element.lastVisitedDate }}</p>
                                            <p class="text-secondary small">{{ element.lastVisitedTime }}</p>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="totalPurchase">
                                        <th mat-header-cell *matHeaderCellDef mat-sort-header>Total Purchase</th>
                                        <td mat-cell *matCellDef="let element">
                                            <h4 class="mb-1">$ {{ element.totalPurchaseLifetime | number : "1.2-2" }}</h4>
                                            <p class="text-secondary small">This Month: $ {{ element.totalPurchaseThisMonth | number : "1.2-2" }}</p>
                                        </td>
                                    </ng-container>

                                    <ng-container matColumnDef="status">
                                        <th mat-header-cell *matHeaderCellDef>Status</th>
                                        <td mat-cell *matCellDef="let element">
                                            <div class="badge badge-light theme-blue d-inline-block me-1" matTooltip="Active">
                                                <h4 class="px-1">{{ element.activeOrders }}</h4>
                                            </div>
                                            <div class="badge badge-light theme-green d-inline-block me-1" matTooltip="Completed">
                                                <h4 class="px-1">{{ element.completedOrders }}</h4>
                                            </div>
                                            <div class="badge badge-light theme-red d-inline-block" matTooltip="Cancelled">
                                                <h4 class="px-1">{{ element.cancelledOrders }}</h4>
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
                                                <button mat-menu-item (click)="editCustomer(element)">
                                                    <mat-icon>edit</mat-icon>
                                                    <span>Edit</span>
                                                </button>
                                                <button mat-menu-item (click)="banCustomer(element)">
                                                    <mat-icon>block</mat-icon>
                                                    <span>Ban</span>
                                                </button>
                                                <button mat-menu-item (click)="deleteCustomer(element)">
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
                                    <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of customers" class="bg-none"></mat-paginator>
                                </mat-card-content>
                            </mat-card>
                        </div>
                    </div>
                </div>
            </mat-drawer-content>
            <mat-drawer #viewcustomer mode="over" position="end" style="--mat-sidenav-container-elevation-shadow:0px 5px 15px rgba(0, 0, 0, 0.15);z-index:12">
                <app-view-customer-drawer [customer]="selectedCustomer()" (editCustomer)="editCustomer(selectedCustomer())" (closeDrawer)="closeCustomerDrawer()"></app-view-customer-drawer>
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
export class CustomersComponent implements OnInit {
    // mat drawer view customer
    @ViewChild("viewcustomer") viewcustomer!: MatDrawer;

    // dialog
    readonly dialog = inject(MatDialog);

    //table
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    originalTabledata: TableItem[] = [
        {
            customerImage: "assets/img/user-1.jpg",
            customerName: "Michael Johnson",
            city: "Los Angeles",
            country: "USA",
            email: "michael.j@email.com",
            phone: "555-234-5678",
            lastVisitedDate: "2025-09-22",
            lastVisitedTime: "09:00 AM",
            totalPurchaseLifetime: 2100.5,
            totalPurchaseThisMonth: 250.75,
            activeOrders: 3,
            completedOrders: 22,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-2.jpg",
            customerName: "Emily Williams",
            city: "Paris",
            country: "France",
            email: "emily.w@email.com",
            phone: "555-876-5432",
            lastVisitedDate: "2025-09-21",
            lastVisitedTime: "04:15 PM",
            totalPurchaseLifetime: 850.0,
            totalPurchaseThisMonth: 120.0,
            activeOrders: 0,
            completedOrders: 10,
            cancelledOrders: 2,
        },
        {
            customerImage: "assets/img/user-3.jpg",
            customerName: "David Brown",
            city: "Tokyo",
            country: "Japan",
            email: "david.b@email.com",
            phone: "555-345-6789",
            lastVisitedDate: "2025-09-20",
            lastVisitedTime: "11:50 AM",
            totalPurchaseLifetime: 350.25,
            totalPurchaseThisMonth: 45.5,
            activeOrders: 1,
            completedOrders: 5,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-4.jpg",
            customerName: "Olivia Davis",
            city: "Sydney",
            country: "Australia",
            email: "olivia.d@email.com",
            phone: "555-765-4321",
            lastVisitedDate: "2025-09-19",
            lastVisitedTime: "06:30 PM",
            totalPurchaseLifetime: 1500.0,
            totalPurchaseThisMonth: 300.0,
            activeOrders: 2,
            completedOrders: 18,
            cancelledOrders: 1,
        },
        {
            customerImage: "assets/img/user-5.jpg",
            customerName: "Daniel Wilson",
            city: "Berlin",
            country: "Germany",
            email: "daniel.w@email.com",
            phone: "555-456-7890",
            lastVisitedDate: "2025-09-18",
            lastVisitedTime: "01:20 PM",
            totalPurchaseLifetime: 675.8,
            totalPurchaseThisMonth: 80.25,
            activeOrders: 0,
            completedOrders: 9,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-6.jpg",
            customerName: "Sophia Martinez",
            city: "Madrid",
            country: "Spain",
            email: "sophia.m@email.com",
            phone: "555-654-3210",
            lastVisitedDate: "2025-09-17",
            lastVisitedTime: "09:45 AM",
            totalPurchaseLifetime: 950.9,
            totalPurchaseThisMonth: 150.0,
            activeOrders: 1,
            completedOrders: 14,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-7.jpg",
            customerName: "Matthew Taylor",
            city: "Toronto",
            country: "Canada",
            email: "matthew.t@email.com",
            phone: "555-543-2109",
            lastVisitedDate: "2025-09-16",
            lastVisitedTime: "03:10 PM",
            totalPurchaseLifetime: 420.0,
            totalPurchaseThisMonth: 65.75,
            activeOrders: 0,
            completedOrders: 7,
            cancelledOrders: 1,
        },
        {
            customerImage: "assets/img/user-8.jpg",
            customerName: "Isabella Anderson",
            city: "Rome",
            country: "Italy",
            email: "isabella.a@email.com",
            phone: "555-432-1098",
            lastVisitedDate: "2025-09-15",
            lastVisitedTime: "08:00 PM",
            totalPurchaseLifetime: 2800.5,
            totalPurchaseThisMonth: 450.0,
            activeOrders: 4,
            completedOrders: 30,
            cancelledOrders: 2,
        },
        {
            customerImage: "assets/img/user-9.jpg",
            customerName: "Joseph Thomas",
            city: "Dubai",
            country: "UAE",
            email: "joseph.t@email.com",
            phone: "555-321-0987",
            lastVisitedDate: "2025-09-14",
            lastVisitedTime: "05:00 AM",
            totalPurchaseLifetime: 760.0,
            totalPurchaseThisMonth: 95.0,
            activeOrders: 1,
            completedOrders: 11,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-10.jpg",
            customerName: "Ava Hernandez",
            city: "Mexico City",
            country: "Mexico",
            email: "ava.h@email.com",
            phone: "555-210-9876",
            lastVisitedDate: "2025-09-13",
            lastVisitedTime: "12:00 PM",
            totalPurchaseLifetime: 550.0,
            totalPurchaseThisMonth: 70.0,
            activeOrders: 0,
            completedOrders: 6,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-1.jpg",
            customerName: "Christopher Moore",
            city: "Shanghai",
            country: "China",
            email: "chris.m@email.com",
            phone: "555-109-8765",
            lastVisitedDate: "2025-09-12",
            lastVisitedTime: "07:45 PM",
            totalPurchaseLifetime: 1800.0,
            totalPurchaseThisMonth: 200.0,
            activeOrders: 2,
            completedOrders: 25,
            cancelledOrders: 1,
        },
        {
            customerImage: "assets/img/user-2.jpg",
            customerName: "Mia White",
            city: "Mumbai",
            country: "India",
            email: "mia.w@email.com",
            phone: "555-987-6543",
            lastVisitedDate: "2025-09-11",
            lastVisitedTime: "02:30 PM",
            totalPurchaseLifetime: 600.5,
            totalPurchaseThisMonth: 85.0,
            activeOrders: 1,
            completedOrders: 12,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-3.jpg",
            customerName: "James Harris",
            city: "Rio de Janeiro",
            country: "Brazil",
            email: "james.h@email.com",
            phone: "555-876-5432",
            lastVisitedDate: "2025-09-10",
            lastVisitedTime: "10:15 AM",
            totalPurchaseLifetime: 950.0,
            totalPurchaseThisMonth: 110.0,
            activeOrders: 0,
            completedOrders: 16,
            cancelledOrders: 0,
        },
        {
            customerImage: "assets/img/user-4.jpg",
            customerName: "Charlotte Clark",
            city: "Moscow",
            country: "Russia",
            email: "charlotte.c@email.com",
            phone: "555-765-4321",
            lastVisitedDate: "2025-09-09",
            lastVisitedTime: "04:50 PM",
            totalPurchaseLifetime: 1200.75,
            totalPurchaseThisMonth: 180.5,
            activeOrders: 3,
            completedOrders: 20,
            cancelledOrders: 1,
        },
        {
            customerImage: "assets/img/user-5.jpg",
            customerName: "Ethan Lewis",
            city: "Cairo",
            country: "Egypt",
            email: "ethan.l@email.com",
            phone: "555-654-3210",
            lastVisitedDate: "2025-09-08",
            lastVisitedTime: "09:20 AM",
            totalPurchaseLifetime: 320.0,
            totalPurchaseThisMonth: 55.0,
            activeOrders: 0,
            completedOrders: 4,
            cancelledOrders: 0,
        },
    ];

    dataSource = new MatTableDataSource<TableItem>(this.originalTabledata);
    displayedColumns: string[] = ["customerName", "contactInfo", "lastVisited", "totalPurchase", "status", "actions"];
    public selectedCustomer = signal<TableItem | null>(null);

    ngOnInit() {}
    ngAfterViewInit() {
        //table
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item: TableItem, header: string): string | number => {
            switch (header) {
                case "customerName":
                    return item.customerName;
                case "contactInfo":
                    return item.email;
                case "lastVisited":
                    return item.lastVisitedDate;
                case "totalPurchase":
                    return item.totalPurchaseLifetime;
                case "status":
                    return item.activeOrders;
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

    editCustomer(customer: TableItem | null) {
        this.dialog.open(EditCustomerDialogComponent, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: { ...customer },
        });
    }
    banCustomer(customer: TableItem) {
        console.log("Ban customer:", customer.customerName);
    }

    deleteCustomer(customer: TableItem) {
        console.log("Delete customer:", customer.customerName);
    }

    // drawer open
    openCustomerDrawer(customer: TableItem) {
        this.selectedCustomer.set(customer);
        this.viewcustomer.open();
    }

    closeCustomerDrawer() {
        this.viewcustomer.close();
        this.selectedCustomer.set(null);
    }
}
