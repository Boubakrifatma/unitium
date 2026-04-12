import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, Signal, WritableSignal, computed, inject, Input, OnChanges, SimpleChanges } from "@angular/core";
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
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { CreateEditProjectModal } from "./createeditproject.component";

import { ProjectAddMemberModalComponent } from "./project-add-member-modal.component";
import { ProjectDeleteConfirmDialogComponent } from "./project-delete-confirm-dialog.component";
import { M2ProjectService } from "./m2-project.service";
import { ProjectPermissionService } from "./project-permission.service";
import { WorkspacePermissionService } from "../m2-workspaces/workspace-permission.service";
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
    // optional lightweight members forwarded by real projects view
    teamMembers?: Array<{ userId: number; fullName: string; avatarUrl?: string }>;
    teamSize?: number;
}

type SortColumn = keyof TableItem | "";
type SortDirection = "asc" | "desc" | "";

@Component({
    selector: "app-projects-cards",
    standalone: true,
    imports: [CommonModule, MatCardModule, MatIconModule, MatMenuModule, MatProgressBarModule, MatTooltipModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatFormFieldModule, FormsModule, MatListModule, MatInputModule, MatSelectModule, MatChipsModule, MatSnackBarModule],
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
                        <h3 class="mb-1">{{ sourceTabledata().length }}</h3>
                        <p class="opacity-75">All</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-green" [class]="selectedStatus() === 'ACTIVE' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('ACTIVE')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("ACTIVE") }}</h3>
                        <p class="opacity-75">Active</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-orange" [class]="selectedStatus() === 'ON_HOLD' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('ON_HOLD')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("ON_HOLD") }}</h3>
                        <p class="opacity-75">On Hold</p>
                    </mat-card-content>
                </mat-card>
            </div>
            <div class="col-6 col-md-3">
                <mat-card class="mb-2 mb-lg-3 theme-violet" [class]="selectedStatus() === 'COMPLETED' ? 'bg-theme text-white' : 'bg-light-theme text-theme'" (click)="setSelectedStatus('COMPLETED')">
                    <mat-card-content>
                        <h3 class="mb-1">{{ countStatus("COMPLETED") }}</h3>
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
                <mat-card class="overflow-hidden mb-3 mb-lg-4" (click)="openProject(project)">
                    <!-- Top Image Area -->
                    <div mat-card-image class="w-100 height-200 coverimg mb-3" (click)="openProject(project)">
                        <img [src]="project.image" alt="Project Image" class="w-100" loading="lazy" />
                    </div>

                    <div class="position-absolute top-0 end-0 m-3 z-index-1">
                        <span
                            class="badge me-2"
                            [ngClass]="{
                                'theme-green':  project.status === 'ACTIVE',
                                'theme-orange': project.status === 'ON_HOLD' || project.status === 'PLANNING',
                                'theme-red':    project.status === 'CANCELLED',
                                'theme-violet': project.status === 'COMPLETED' || project.status === 'ARCHIVED'
                            }">
                            {{ statusDisplay(project.status) }}
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
                            <div class="col mb-3 hoverview" (click)="openProject(project)">
                                <h3 class="mb-1 text-truncated">{{ project.name }} <mat-icon class="material-icons-outlined hoverview-icon d-inline-block align-middle text-theme">arrow_forward</mat-icon></h3>
                                <p class="text-secondary text-truncated">{{ project.company }}</p>
                            </div>
                            @if (projectPermissions.canManageProject() && workspacePermissions.userRole() !== 'EMPLOYEE' && workspacePermissions.userRole() !== 'STUDENT') {
                            <div class="col-auto mb-3">
                                <button matIconButton [matMenuTriggerFor]="actionsMenu" aria-label="Actions" (click)="$event.stopPropagation()">
                                    <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                </button>
                                <mat-menu #actionsMenu="matMenu">
                                    <button mat-menu-item (click)="$event.stopPropagation(); openDialog(project)">
                                        <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                        <span>View Details</span>
                                    </button>
                                    <button mat-menu-item (click)="$event.stopPropagation(); archiveProject(project)">
                                        <mat-icon class="material-icons-outlined">archive</mat-icon>
                                        <span>Archive</span>
                                    </button>
                                </mat-menu>
                            </div>
                            } @else {
                            <div class="col-auto mb-3"></div>
                            }
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
                                @for (member of (project.teamMembers || []).slice(0, 3); track member.userId) {
                                <div class="avatar avatar-30 rounded-circle coverimg d-flex align-items-center justify-content-center bg-light-theme overflow-hidden" matTooltip="{{ member.fullName }}">
                                    @if (member.avatarUrl) {
                                    <img class="w-100 h-100" [src]="member.avatarUrl" [alt]="member.fullName" (error)="$any($event.target).style.display='none'" />
                                    } @else {
                                    <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px;">person</mat-icon>
                                    }
                                </div>
                                }
                                @if ((project.teamMembers || []).length > 3) {
                                <div class="avatar avatar-30 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center" style="font-size:10px;font-weight:600;" matTooltip="{{ (project.teamMembers || []).length - 3 }} more members">
                                    +{{ (project.teamMembers || []).length - 3 }}
                                </div>
                                }
                            </div>
                            <div class="col mb-3">
                                <p class="mb-0">{{ project.teamSize || (project.teamMembers ? project.teamMembers.length : 0) }}</p>
                                <p class="text-secondary small">Team Members</p>
                            </div>
                            <div class="col-auto mb-3">
                                @if (useRealRouting && projectPermissions.canManageProject() && workspacePermissions.userRole() !== 'EMPLOYEE' && workspacePermissions.userRole() !== 'STUDENT') {
                                <button matIconButton (click)="$event.stopPropagation(); openAddMemberModal(project)"><mat-icon class="material-icons-outlined">person_add</mat-icon></button>
                                } @else {
                                <span></span>
                                }
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
                <h3 class="mb-1">No projects found</h3>
                @if (searchQuery() || selectedStatus() !== 'All') {
                    <p class="text-secondary mb-2">No projects match your current search or filter.</p>
                    <button matButton class="text-theme" (click)="clearFilters()">
                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">filter_alt_off</mat-icon>
                        Clear filters
                    </button>
                } @else {
                    <p class="text-secondary">No projects have been created in this workspace yet.</p>
                }
            </div>
            }
        </div>`,
    styles: [``],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProjectsCardsComponent implements OnInit {
    // dialog
    readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectService = inject(M2ProjectService);
    readonly projectPermissions = inject(ProjectPermissionService);
    readonly workspacePermissions = inject(WorkspacePermissionService);
    private readonly router = inject(Router);

    @Input() projectsData: TableItem[] | null = null;
    @Input() useRealRouting = false;
    @Input() historicalAt: string | null = null;
    private readonly externalData = signal<TableItem[] | null>(null);

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
    ngOnChanges(changes: SimpleChanges): void {
        if (changes["projectsData"]) {
            const rows = (this.projectsData || []).map((row) => ({ ...row }));
            this.externalData.set(rows.length > 0 ? rows : null);
        }
    }
    ngAfterViewInit() {}

    searchQuery: WritableSignal<string> = signal("");
    selectedStatus: WritableSignal<string> = signal("All");
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
        const projects = this.sourceTabledata();

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
    setSelectedStatus(status: string): void {
        this.selectedStatus.set(status);
        this.logAction("Filter by Status: " + status);
    }

    clearFilters(): void {
        this.searchQuery.set("");
        this.selectedStatus.set("All");
    }

    statusDisplay(status: string): string {
        const map: Record<string, string> = {
            PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold",
            COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived",
        };
        return map[(status || "").toUpperCase()] || status;
    }

    getStatusClasses(status: string): string {
        switch ((status || "").toUpperCase()) {
            case "ACTIVE":    return "status-active";
            case "ON_HOLD":   return "status-onhold";
            case "PLANNING":  return "status-onhold";
            case "COMPLETED": return "status-completed";
            case "CANCELLED": return "status-cancelled";
            default:          return "";
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

    countStatus(status: string): number {
        return this.sourceTabledata().filter((p) => p.status === status).length;
    }

    logAction(action: string): void {
        console.log(`User Action: ${action}`);
    }

    archiveProject(project: TableItem) {
        if (this.historicalAt) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }
        if (!this.useRealRouting || !project.workspaceId || !project.projectUuid) return;

        const ref = this.dialog.open(ProjectDeleteConfirmDialogComponent, {
            width: "480px",
            maxWidth: "95vw",
            data: { projectName: project.name, permanent: false },
        });

        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.projectService.archiveProject(project.workspaceId!, project.projectUuid!).subscribe({
                next: () => {
                    this.snackBar.open("Project archived and removed from view.", "Close", { duration: 3500 });
                    const current = this.externalData();
                    if (current) this.externalData.set(current.filter((p) => p.projectUuid !== project.projectUuid));
                },
                error: () => this.snackBar.open("Failed to archive project.", "Close", { duration: 4200 }),
            });
        });
    }

    openDialog(project: TableItem) {
        if (this.useRealRouting && project.workspaceId && project.projectUuid) {
            this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid], {
                queryParams: this.realRoutingQueryParams(),
            });
            return;
        }
        this.selectedItem = { ...project };
        this.dialog.open(CreateEditProjectModal, {
            width: "990px",
            maxWidth: "990px",
            panelClass: "custom-dialog-container",
            autoFocus: false,
            data: this.selectedItem,
        });
    }

    openAddMemberModal(project: TableItem) {
        if (this.historicalAt) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }
        if (!this.useRealRouting || !project.workspaceId || !project.projectUuid) return;

        this.projectService.getAvailableWorkspaceMembers(project.workspaceId, project.projectUuid).subscribe({
            next: (members) => {
                if (!members || members.length === 0) {
                    this.snackBar.open("No workspace members are available to add.", "Close", { duration: 3200 });
                    return;
                }

                const ref = this.dialog.open(ProjectAddMemberModalComponent, {
                    width: "560px",
                    maxWidth: "95vw",
                    data: {
                        workspaceId: project.workspaceId,
                        projectId: project.projectUuid,
                        orgType: "enterprise",
                        members,
                    },
                });

                ref.afterClosed().subscribe();
            },
            error: () => this.snackBar.open("Failed to load available members.", "Close", { duration: 3200 }),
        });
    }

    sourceTabledata(): TableItem[] {
        return this.externalData() || this.originalTabledata;
    }

    openProject(project: TableItem): void {
        if (this.useRealRouting && project.workspaceId && project.projectUuid) {
            this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid], {
                queryParams: this.realRoutingQueryParams(),
            });
            return;
        }
        this.router.navigate(["/app/project-details"]);
    }

    private realRoutingQueryParams(): Record<string, string> {
        return this.historicalAt ? { at: this.historicalAt } : {};
    }
}
