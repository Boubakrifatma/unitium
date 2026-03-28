import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, inject, Input, OnChanges, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormField, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatMenuModule } from "@angular/material/menu";
import { FormsModule } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatDrawer, MatSidenavModule } from "@angular/material/sidenav";
import { CreateEditProjectModal } from "./createeditproject.component";
import { ViewProjectDrawerComponent } from "./viewproject.component";
import { ProjectDeleteConfirmDialogComponent } from "./project-delete-confirm-dialog.component";
import { M2ProjectService } from "./m2-project.service";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { Router } from "@angular/router";

export interface TableItem {
    id: number;
    image: string;
    name: string;
    company: string;
    status: string; // raw backend enum: ACTIVE, ON_HOLD, PLANNING, COMPLETED, CANCELLED, ARCHIVED
    priority: "High" | "Medium" | "Low" | "";
    managerimage: string;
    manager: string;
    dueDate: string;
    progress: number; // Percentage
    workspaceId?: string;
    projectUuid?: string;
}

@Component({
    selector: "app-projects-grid",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatSidenavModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, ViewProjectDrawerComponent, MatSnackBarModule],
    template: `
        <mat-card>
            <mat-card-header>
                <div class="w-100">
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto mb-3">
                            <div class="avatar avatar-40 text-theme rounded">
                                <mat-icon class="material-icons-outlined">dashboard</mat-icon>
                            </div>
                        </div>
                        <div class="col mb-3">
                            <h3 class="mb-1">Projects</h3>
                            <p class="text-secondary small">All projects grid list view</p>
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
                <!-- Product Column -->
                <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Project</th>
                    <td mat-cell *matCellDef="let item" class="py-2 hoverview" (dblclick)="openDialog(item)">
                        <p class="mat-mobile-label">Project</p>
                        <div class="row gx-3">
                            <div class="col-auto">
                                <div class="avatar avatar-40 rounded" (click)="openProjectDrawer(item)">
                                    <img [src]="item.image" alt="{{ item.name }}" class="" />
                                    <mat-icon class="hoverview-icon bg-light-theme text-theme rounded circle avatar avatar-40 position-absolute start-0 top-0">visibility</mat-icon>
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-0" (click)="openProject(item)">{{ item.name }} <mat-icon class="material-icons-outlined text-sm text-theme" (click)="openDialog(item)">edit</mat-icon></h4>
                                <p class="text-secondary small">{{ item.company }}</p>
                            </div>
                        </div>
                    </td>
                </ng-container>
                <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Status</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Status</p>
                        <span
                            class="badge"
                            [ngClass]="{
                                'theme-green':  item.status === 'ACTIVE',
                                'theme-orange': item.status === 'ON_HOLD' || item.status === 'PLANNING',
                                'theme-red':    item.status === 'CANCELLED',
                                'theme-violet': item.status === 'COMPLETED' || item.status === 'ARCHIVED'
                            }">
                            {{ statusDisplay(item.status) }}
                        </span>
                    </td>
                </ng-container>
                <ng-container matColumnDef="priority">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Priority</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Priority</p>
                        <span
                            class="badge badge-light"
                            [ngClass]="{
                                'theme-green': item.priority === 'Low',
                                'theme-orange': item.priority === 'Medium',
                                'theme-red': item.priority === 'High'
                            }">
                            {{ item.priority }}
                        </span>
                    </td>
                </ng-container>
                <ng-container matColumnDef="manager">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Manager</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Manager</p>

                        <div class="avatar avatar-30 rounded-circle align-middle me-1 d-inline-block coverimg">
                            <img [src]="item.managerimage" alt="{{ item.manager }}" class="" />
                        </div>
                        <span class="px-1 align-middle">{{ item.manager }}</span>
                    </td>
                </ng-container>
                <ng-container matColumnDef="dueDate">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Due Date</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Due Date</p>
                        <p class="">{{ item.dueDate }}</p>
                    </td>
                </ng-container>
                <ng-container matColumnDef="progress">
                    <th mat-header-cell *matHeaderCellDef mat-sort-header class="">Progress</th>
                    <td mat-cell *matCellDef="let item" class="py-2">
                        <p class="mat-mobile-label">Progress</p>
                        <p class="">{{ item.progress }}</p>
                    </td>
                </ng-container>
                <!-- Actions Column -->
                <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Actions</th>
                    <td mat-cell *matCellDef="let item" class="">
                        <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                            <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                        </button>
                        <mat-menu #actionsMenu="matMenu">
                            <button mat-menu-item (click)="openProject(item)">
                                <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                <span>View Details</span>
                            </button>
                            <button mat-menu-item (click)="deleteOrder(item)">
                                <mat-icon class="material-icons-outlined">archive</mat-icon>
                                <span>Archive</span>
                            </button>
                        </mat-menu>
                    </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns" class="cursor-pointer" (click)="openProject(row)"></tr>
            </table>

            <mat-card-content>
                <!-- Paginator -->
                <mat-paginator [pageSizeOptions]="[5, 10, 25, 100]" aria-label="Select page of orders" class="bg-none"></mat-paginator>
            </mat-card-content>
        </mat-card>

        <mat-drawer #viewproject mode="over" position="end" class="position-fixed" style="--mat-sidenav-container-elevation-shadow:0px 5px 15px rgba(0, 0, 0, 0.15);z-index:12">
            <app-view-project-drawer [project]="selectedProject()" (openDialog)="openDialog(selectedProject())" (closeDrawer)="closeProjectDrawer()"></app-view-project-drawer>
        </mat-drawer>
    `,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectsGridComponent implements OnInit {
    // mat drawer view customer
    @ViewChild("viewproject") viewproject!: MatDrawer;

    readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectService = inject(M2ProjectService);
    private readonly router = inject(Router);

    @Input() projectsData: TableItem[] | null = null;
    @Input() useRealRouting = false;

    // table grid
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // --- State and Data Management ---
    originalTabledata: TableItem[] = [
        { id: 1, image: "assets/img/product1.jpg", name: "Q4 Marketing Campaign Launch", company: "Lindsey Group", status: "Active", priority: "High", managerimage: "assets/img/user-1.jpg", manager: "Alice Johnson", dueDate: "2025-10-30", progress: 75 },
        { id: 2, image: "assets/img/product3.jpg", name: "Internal Server Migration", company: "Britaniaca LLC", status: "On Hold", priority: "High", managerimage: "assets/img/user-2.jpg", manager: "Bob Smith", dueDate: "2025-11-15", progress: 10 },
        { id: 3, image: "assets/img/product2.jpg", name: "Website Redesign Phase 1", company: "Lawmakers Ltd.", status: "Completed", priority: "Medium", managerimage: "assets/img/user-3.jpg", manager: "Charlie Brown", dueDate: "2025-09-01", progress: 100 },
        { id: 4, image: "assets/img/product4.jpg", name: "Mobile App Feature X Development", company: "PrivateJet Company", status: "Active", priority: "Medium", managerimage: "assets/img/user-4.jpg", manager: "Dana Scully", dueDate: "2025-12-05", progress: 50 },
        { id: 5, image: "assets/img/product5.jpg", name: "Annual Budget Review", company: "Gilldrop Water", status: "Active", priority: "Low", managerimage: "assets/img/user-5.jpg", manager: "Eve Adams", dueDate: "2025-10-15", progress: 90 },
        { id: 6, image: "assets/img/product6.jpg", name: "HR System Integration", company: "Oil Trends", status: "Completed", priority: "High", managerimage: "assets/img/user-6.jpg", manager: "Frank Green", dueDate: "2025-08-20", progress: 100 },
        { id: 7, image: "assets/img/product7.jpg", name: "Client Feedback Collection Tool", company: "German Engineering Co.", status: "Active", priority: "High", managerimage: "assets/img/user-7.jpg", manager: "Gail Higgins", dueDate: "2025-11-20", progress: 45 },
        { id: 8, image: "assets/img/product8.jpg", name: "Vendor Contract Renewal", company: "Manhowar Lineup", status: "On Hold", priority: "Low", managerimage: "assets/img/user-8.jpg", manager: "Ian Davies", dueDate: "2025-12-01", progress: 20 },
    ];

    dataSource = new MatTableDataSource<TableItem>(this.originalTabledata);
    displayedColumns: string[] = ["name", "status", "priority", "manager", "dueDate", "progress", "actions"];
    selectedItem: TableItem | null = null;
    public selectedProject = signal<TableItem | null>(null);

    ngOnInit() {}
    ngOnChanges(changes: SimpleChanges): void {
        if (changes["projectsData"]) {
            const rows = this.projectsData && this.projectsData.length > 0 ? this.projectsData : this.originalTabledata;
            this.dataSource.data = [...rows];
        }
    }
    ngAfterViewInit() {
        // table grid
        //table
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item: TableItem, header: string): string | number => {
            switch (header) {
                case "name":
                    return item.name;
                case "status":
                    return item.status;
                case "priority":
                    return item.priority;
                case "manager":
                    return item.manager;
                case "dueDate":
                    return item.dueDate;
                case "progress":
                    return item.progress;
                default:
                    return "";
            }
        };

        this.dataSource.filterPredicate = (data: TableItem, filter: string) => {
            const dataStr = [data.name, data.company, data.status, data.priority, data.manager, data.dueDate, String(data.progress)].join(" ").toLowerCase();
            return dataStr.indexOf(filter) !== -1;
        };

        if (this.projectsData && this.projectsData.length > 0) {
            this.dataSource.data = [...this.projectsData];
        }
    }

    statusDisplay(status: string): string {
        const map: Record<string, string> = {
            PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold",
            COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived",
        };
        return map[(status || "").toUpperCase()] || status;
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();

        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    deleteOrder(order: TableItem) {
        if (!this.useRealRouting || !order.workspaceId || !order.projectUuid) return;
        const ref = this.dialog.open(ProjectDeleteConfirmDialogComponent, {
            width: "480px",
            maxWidth: "95vw",
            data: { projectName: order.name, permanent: false },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.projectService.archiveProject(order.workspaceId!, order.projectUuid!).subscribe({
                next: () => {
                    this.snackBar.open("Project archived and removed from view.", "Close", { duration: 3500 });
                    this.dataSource.data = this.dataSource.data.filter((p) => p.projectUuid !== order.projectUuid);
                },
                error: () => this.snackBar.open("Failed to archive project.", "Close", { duration: 4200 }),
            });
        });
    }

    saveChanges() {
        if (this.selectedItem) {
            const index = this.originalTabledata.findIndex((i) => i === this.selectedItem);
            if (index !== -1) {
                // Find the original item and update its properties
                const originalItem = this.originalTabledata[index];
                originalItem.name = this.selectedItem.name;
                originalItem.status = this.selectedItem.status;
                originalItem.manager = this.selectedItem.manager;
            }
            this.selectedItem = null;
            this.dataSource.data = [...this.originalTabledata];
        }
    }

    deleteProject(project: TableItem) {
        // console.log("Deleting order:", order);
        // Logic for deleting an order goes here
    }

    openDialog(project: TableItem | null) {
        this.dialog.open(CreateEditProjectModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: { ...project },
        });
    }

    openProject(project: TableItem): void {
        if (this.useRealRouting && project.workspaceId && project.projectUuid) {
            this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid]);
            return;
        }
        this.router.navigate(["/app/project-details"]);
    }

    // drawer
    openProjectDrawer(customer: TableItem) {
        this.selectedProject.set(customer);
        this.viewproject.open();
    }

    closeProjectDrawer() {
        this.viewproject.close();
        this.selectedProject();
    }
}
