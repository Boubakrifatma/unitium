import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, Signal, WritableSignal, computed, inject } from "@angular/core";
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
import { MatProgressBar, MatProgressBarModule } from "@angular/material/progress-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { CreateEditProjectModal } from "./createeditproject.component";
import { RouterLink } from "@angular/router";

export interface TableItem {
    id: number;
    image: string;
    name: string;
    company: string;
    status: "Active" | "On Hold" | "Completed" | "";
    priority: "High" | "Medium" | "Low" | "";
    managerimage: string;
    manager: string;
    dueDate: string;
    progress: number; // Percentage
}

type SortColumn = keyof TableItem | "";
type SortDirection = "asc" | "desc" | "";

@Component({
    selector: "app-projects-cards",
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatTooltipModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule],
    template: ` <div class="row gx-3 align-items-center">
            <div class="col-auto mb-3">
                <div class="avatar avatar-40 text-theme rounded">
                    <span class="material-symbols-outlined"> stacks </span>
                </div>
            </div>
            <div class="col mb-3">
                <h3 class="mb-1">Top Project Cards</h3>
                <p class="text-secondary small">Overview of top project highlights</p>
            </div>
            <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                <mat-form-field appearance="outline" class="w-100 inline-small">
                    <mat-label>Search</mat-label>
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput placeholder="Search" (keyup)="setSearchQuery($event)" #searchinput />
                </mat-form-field>
            </div>

            <!-- Sort Selectors for Card View -->
            <div class="col-12 col-md-6 col-lg-4 col-xl-3 mb-3">
                <mat-form-field appearance="outline" class="w-100 inline-small">
                    <mat-select id="sort-column" [ngModel]="sortColumn()" (ngModelChange)="toggleSort($event)" class="sort-select">
                        <mat-option value="name">Project Name</mat-option>
                        <mat-option value="manager">Manager</mat-option>
                        <mat-option value="dueDate">Due Date</mat-option>
                        <mat-option value="progress">Progress</mat-option>
                    </mat-select>
                    <mat-icon matPrefix>sort</mat-icon>
                </mat-form-field>
            </div>
            <div class="col-auto mb-3">
                <button (click)="toggleSortDirection()" matIconButton class="text-theme">@if(sortDirection() === "asc") {<span class="material-symbols-outlined"> edit_arrow_down </span> } @else {<span class="material-symbols-outlined"> edit_arrow_up </span>}</button>
            </div>
        </div>

        <div class="row gx-3">
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3" [class]="selectedStatus() === 'All' ? 'bg-theme text-white' : 'text-theme'" (click)="setSelectedStatus('All')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ originalTabledata.length }}</h3>
                        <p class="opacity-75">All</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-green" [class]="selectedStatus() === 'Active' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('Active')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("Active") }}</h3>
                        <p class="opacity-75">Active</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-orange" [class]="selectedStatus() === 'On Hold' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('On Hold')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("On Hold") }}</h3>
                        <p class="opacity-75">On Hold</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-violet" [class]="selectedStatus() === 'Completed' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('Completed')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("Completed") }}</h3>
                        <p class="opacity-75">Completed</p>
                    </mat-card-content>
                </mat-card>
            </div>
        </div>

        <p class="text-secondary small mb-3 mb-lg-4">Project with selected category ({{ filteredTableItems().length }})</p>

        <div class="row gx-3 gx-lg-4">
            <!-- Project Cards -->
            @for (project of filteredTableItems(); track project.id) {
            <div class="col-12 col-sm-6 col-lg-4">
                <mat-card class="overflow-hidden mb-3 mb-lg-4">
                    <!-- Top Image Area -->
                    <div mat-card-image class="w-100 height-200 coverimg mb-3" routerLink="/app/project-details">
                        <img [src]="project.image" alt="Project Image" class="w-100" loading="lazy" />
                    </div>

                    <div class="position-absolute top-0 end-0 m-3 z-index-1">
                        <span
                            class="badge me-2"
                            [ngClass]="{
                                'theme-green': project.status === 'Active',
                                'theme-orange': project.status === 'On Hold',
                                'theme-red': project.status === 'Completed'
                            }">
                            {{ project.status }}
                        </span>
                        <span
                            class="badge badge-light"
                            [ngClass]="{
                                'theme-green': project.priority === 'Low',
                                'theme-orange': project.priority === 'Medium',
                                'theme-red': project.priority === 'High'
                            }">
                            {{ project.priority }}
                        </span>
                    </div>

                    <!-- Content Body -->
                    <mat-card-content>
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3 hoverview" routerLink="/app/project-details">
                                <h3 class="mb-1 text-truncated">{{ project.name }} <mat-icon class="material-icons-outlined hoverview-icon d-inline-block align-middle text-theme">arrow_forward</mat-icon></h3>
                                <p class="text-secondary text-truncated">{{ project.company }}</p>
                            </div>
                            <div class="col-auto mb-3">
                                <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                    <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                </button>
                                <mat-menu #actionsMenu="matMenu">
                                    <button mat-menu-item (click)="openDialog(project)">
                                        <mat-icon class="material-icons-outlined">edit</mat-icon>
                                        <span>Edit</span>
                                    </button>
                                    <button mat-menu-item (click)="deleteProject(project)">
                                        <mat-icon class="material-icons-outlined">delete</mat-icon>
                                        <span>Delete</span>
                                    </button>
                                </mat-menu>
                            </div>
                        </div>
                        <mat-divider class="mb-3"></mat-divider>

                        <!-- Manager & Due Date Footer -->
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 coverimg rounded-circle">
                                            <img [src]="project.managerimage" alt="{{ project.manager }}" class="manager-avatar" loading="lazy" />
                                        </div>
                                    </div>
                                    <div class="col">
                                        <h4 class="mb-1">{{ project.manager }}</h4>
                                        <p class="text-secondary small">Project Manager</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-auto text-end mb-3">
                                <p class="small mb-1">{{ project.dueDate }}</p>
                                <p class="text-secondary small">Due Date</p>
                            </div>
                        </div>

                        <div class="row gx-3 align-items-center">
                            <div class="col-auto avatar-group mb-3">
                                <div class="avatar avatar-30 rounded-circle coverimg" matTooltip="John Dmitri">
                                    <img src="assets/img/user-1.jpg" alt="" />
                                </div>
                                <div class="avatar avatar-30 rounded-circle coverimg" matTooltip="Ayub Shan">
                                    <img src="assets/img/user-3.jpg" alt="" />
                                </div>
                                <div class="avatar avatar-30 rounded-circle coverimg" matTooltip="Liana Doe">
                                    <img src="assets/img/user-4.jpg" alt="" />
                                </div>
                            </div>
                            <div class="col mb-3">
                                <p class="mb-0">+ 16</p>
                                <p class="text-secondary small">Team Members</p>
                            </div>
                            <div class="col-auto mb-3">
                                <button matIconButton><mat-icon class="material-icons-outlined">person_add</mat-icon></button>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <mat-progress-bar class="mb-2" mode="determinate" value="{{ project.progress }}"></mat-progress-bar>
                        <p class="text-secondary small">{{ project.progress }}% Complete</p>
                    </mat-card-content>
                </mat-card>
            </div>
            } @if(filteredTableItems().length != 0) {
            <div class="col-12 col-sm-6 col-lg-4 loading-card">
                <mat-card class="overflow-hidden mb-3 mb-lg-4">
                    <!-- Top Image Area -->
                    <div mat-card-image class="w-100 height-200 coverimg mb-3">
                        <img src="" alt="Project Image" class="w-100" loading="lazy" />
                    </div>

                    <div class="position-absolute top-0 end-0 m-3 z-index-1">
                        <span class="badge badge-light me-2">&nbsp;</span>
                        <span class="badge">&nbsp;</span>
                    </div>

                    <!-- Content Body -->
                    <mat-card-content>
                        <h3 class="mb-1 text-truncated">&nbsp;</h3>
                        <p class="text-secondary text-truncated">&nbsp;</p>

                        <mat-divider class="mb-2"></mat-divider>

                        <!-- Manager & Due Date Footer -->
                        <div class="row gx-3 align-items-center">
                            <div class="col mb-3">
                                <div class="row gx-3 align-items-center">
                                    <div class="col-auto">
                                        <div class="avatar avatar-40 coverimg rounded-circle"></div>
                                    </div>
                                    <div class="col">
                                        <h4 class="mb-1">&nbsp;</h4>
                                        <p class="text-secondary small">&nbsp;</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-auto text-end mb-3">
                                <p class="small mb-1">&nbsp;</p>
                                <p class="text-secondary small">&nbsp;</p>
                            </div>
                        </div>

                        <div class="row gx-3 align-items-center">
                            <div class="col-auto avatar-group mb-3">
                                <div class="avatar avatar-30 rounded-circle"></div>
                                <div class="avatar avatar-30 rounded-circle"></div>
                                <div class="avatar avatar-30 rounded-circle"></div>
                            </div>
                            <div class="col mb-3">
                                <p class="mb-1">&nbsp;</p>
                                <p class="text-secondary small">&nbsp;</p>
                            </div>
                            <div class="col-auto mb-3">
                                <button matIconButton><mat-icon class="material-icons-outlined"></mat-icon></button>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <mat-progress-bar class="mb-2" mode="determinate" value="50"></mat-progress-bar>
                        <p class="text-secondary small text-center ">&nbsp;</p>
                    </mat-card-content>
                </mat-card>
            </div>
            } @if(filteredTableItems().length === 0) {
            <div class="col-12 text-center mb-4 pb-5">
                <img src="assets/img/noproduct.png" alt="" class="width-300 mt-4 mt-lg-5" />
                <h3 class="mb-1">No project found</h3>
                <p class="text-secondary">Search for different project name or status</p>
            </div>
            }
        </div>`,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectsCardsComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);

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

    ngOnInit() {}
    ngAfterViewInit() {}

    searchQuery: WritableSignal<string> = signal("");
    selectedStatus: WritableSignal<"All" | TableItem["status"]> = signal("All");
    selectedItem: TableItem | null = null;

    // Signals for tracking Sort state (Defaulting to 'name' ascending)
    sortColumn: WritableSignal<SortColumn> = signal("name");
    sortDirection: WritableSignal<SortDirection> = signal("asc");

    // Computed signal for filtering AND sorting the data
    filteredTableItems: Signal<TableItem[]> = computed(() => {
        const query = this.searchQuery().toLowerCase();
        const status = this.selectedStatus();
        const column = this.sortColumn();
        const direction = this.sortDirection();
        const projects = this.originalTabledata;

        // 1. Filtering
        const filtered = projects.filter((project) => {
            // Search now includes the new 'company' field
            const matchesSearch = project.name.toLowerCase().includes(query) || project.manager.toLowerCase().includes(query) || project.company.toLowerCase().includes(query);

            const matchesStatus = status === "All" || project.status === status;

            return matchesSearch && matchesStatus;
        });

        // 2. Sorting
        if (!column || !direction) {
            // If sort is disabled, return filtered array unsorted
            return filtered;
        }

        // Sort the filtered array
        return [...filtered].sort((a, b) => {
            const isAsc = direction === "asc";
            let comparison = 0;

            // Handle sorting logic for different data types
            if (column === "progress") {
                comparison = (a.progress || 0) - (b.progress || 0);
            } else if (column === "dueDate") {
                // Simple string comparison for ISO dates
                comparison = a.dueDate.localeCompare(b.dueDate);
            } else {
                // Default string comparison
                const aValue = String(a[column as keyof TableItem]).toLowerCase();
                const bValue = String(b[column as keyof TableItem]).toLowerCase();
                if (aValue > bValue) comparison = 1;
                else if (aValue < bValue) comparison = -1;
            }

            // Apply direction multiplier
            return comparison * (isAsc ? 1 : -1);
        });
    });

    // --- Methods ---

    /** Toggles the sort column or direction. Called from select/toggle button. */
    toggleSort(columnOrEvent: SortColumn | string): void {
        let newColumn: SortColumn;
        if (typeof columnOrEvent === "string") {
            // If from <select>
            newColumn = columnOrEvent as SortColumn;
        } else {
            // Fallback or explicit call
            newColumn = columnOrEvent;
        }

        const currentColumn = this.sortColumn();
        const currentDirection = this.sortDirection();

        if (currentColumn === newColumn) {
            // If clicking the current column, just toggle direction
            this.sortDirection.set(currentDirection === "asc" ? "desc" : "asc");
        } else {
            // New column clicked, set new column and reset direction to ascending
            this.sortColumn.set(newColumn);
            this.sortDirection.set("asc");
        }
        this.logAction("Sort by " + newColumn + " " + this.sortDirection());
    }

    /** Toggles only the sort direction, useful for the button. */
    toggleSortDirection(): void {
        this.sortDirection.set(this.sortDirection() === "asc" ? "desc" : "asc");
        this.logAction("Sort direction changed to: " + this.sortDirection());
    }

    /** Updates the search query signal. */
    setSearchQuery(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        this.searchQuery.set(inputElement.value);
        this.logAction("Search: " + inputElement.value);
    }

    /** Updates the selected status signal. */
    setSelectedStatus(status: "All" | TableItem["status"]): void {
        this.selectedStatus.set(status);
        this.logAction("Filter by Status: " + status);
    }

    getStatusClasses(status: TableItem["status"]): string {
        // Note: The 'Active' status is handled with the explicit @if logic in the template for the 'badge' style.
        switch (status) {
            case "Active":
                return "status-active";
            case "On Hold":
                return "status-onhold";
            case "Completed":
                return "status-completed";
            default:
                return "";
        }
    }

    getPriorityClasses(priority: TableItem["priority"]): string {
        switch (priority) {
            case "High":
                return "priority-high";
            case "Medium":
                return "priority-medium";
            case "Low":
                return "priority-low";
            default:
                return "";
        }
    }

    countStatus(status: TableItem["status"]): number {
        return this.originalTabledata.filter((p) => p.status === status).length;
    }

    logAction(action: string): void {
        console.log(`User Action: ${action}`);
    }

    deleteProject(project: TableItem) {
        // console.log("Deleting order:", order);
        // Logic for deleting an order goes here
    }

    openDialog(project: TableItem) {
        this.selectedItem = { ...project };
        this.dialog.open(CreateEditProjectModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: this.selectedItem,
        });
    }
}
