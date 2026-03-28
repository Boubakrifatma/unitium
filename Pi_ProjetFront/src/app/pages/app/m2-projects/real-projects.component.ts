import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSnackBar } from "@angular/material/snack-bar";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { M2ProjectMember, M2ProjectService, M2ProjectSummary } from "./m2-project.service";
import { M2Workspace, M2WorkspaceMember, M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { ProjectsCardsComponent, TableItem as ProjectCardItem } from "./projects-cards.component";
import { ProjectsGridComponent } from "./projects-grid.component";
import { CreateProjectWorkflowDialogComponent, CreateProjectWorkflowDialogResult } from "./create-project-workflow-dialog.component";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "../m2-templates/use-template-wizard-dialog.component";
import { register } from "swiper/element/bundle";

register();

interface RealProjectRow {
    workspaceId: string;
    id: string;
    name: string;
    company: string;
    description: string;
    visibility: string;
    status: string;
    priority: "High" | "Medium" | "Low";
    manager: string;
    managerAvatarUrl: string;
    dueDate: string;
    dueDateSort: string;
    progress: number;
    image: string;
    // list of team members (lightweight profile)
    members?: Array<{ userId: number; fullName: string; avatarUrl?: string }>;
}

@Component({
    selector: "app-real-projects",
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
        MatSnackBarModule,
        ProjectsCardsComponent,
        ProjectsGridComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    styles: [`
        .status-chip { border:1px solid rgba(0,0,0,0.13); background:none; padding:4px 14px; border-radius:16px; cursor:pointer; font-size:12px; color:#475569; transition:all .15s; }
        .status-chip.active { border-color:#6366f1; background:rgba(99,102,241,0.09); color:#6366f1; font-weight:600; }
        .status-chip:hover:not(.active) { background:rgba(0,0,0,0.04); }
        .bulk-bar { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:white; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.18); padding:12px 20px; display:flex; align-items:center; gap:12px; z-index:1000; min-width:360px; }
    `],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Real Projects</h3>
                        <p class="small mb-0">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Real Projects
                        </p>
                        <p class="text-secondary small mb-0 mt-1">@if (selectedWorkspaceName()) { Workspace: {{ selectedWorkspaceName() }} } @else { Open from a workspace to focus this view }</p>
                    </div>

                    <div class="col-12 col-md-auto order-3 mb-3 mb-xl-0">
                        <mat-form-field appearance="outline" class="inline-small w-100">
                            <mat-label>Search</mat-label>
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput placeholder="Project name, workspace, manager..." (input)="onSearch($event)" />
                        </mat-form-field>
                    </div>

                    <div class="col-auto order-2 order-lg-3 mb-3 mb-xl-0 d-flex gap-1 align-items-center flex-wrap">
                        <button matButton (click)="loadRealProjects()"><mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh</button>
                        @if (selectedWorkspaceId()) {
                        <button matButton class="ms-1" (click)="goBackToWorkspace()"><mat-icon class="material-icons-outlined">arrow_back</mat-icon> Workspace</button>
                        <button matButton class="ms-1" (click)="showAllWorkspaces()"><mat-icon class="material-icons-outlined">layers_clear</mat-icon> Show All</button>
                        }
                        <button matIconButton [class.text-theme]="bulkMode()"
                            matTooltip="{{ bulkMode() ? 'Exit select mode' : 'Select multiple' }}"
                            (click)="toggleBulkMode()">
                            <mat-icon class="material-icons-outlined">{{ bulkMode() ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                        </button>
                    </div>
                </div>
                <!-- status filter chips -->
                @if (projectCardsData().length > 0) {
                    <div class="d-flex align-items-center gap-2 mt-2 flex-wrap">
                        @for (opt of statusOptions; track opt.value) {
                            <button class="status-chip" [class.active]="statusFilter() === opt.value"
                                (click)="statusFilter.set(opt.value)">
                                {{ opt.label }}
                                <span style="font-size:11px;opacity:0.7;margin-left:4px;">{{ countByStatus(opt.value) }}</span>
                            </button>
                        }
                    </div>
                }
            </mat-card>
        </div>

        <div class="container fade-in">
            @if (lastError()) {
            <mat-card class="mb-3 mb-lg-4 border theme-red">
                <mat-card-content>
                    <div class="d-flex align-items-start">
                        <mat-icon class="material-icons-outlined me-2 theme-red">error</mat-icon>
                        <div>
                            <p class="fw-medium mb-1">Failed to load real projects</p>
                            <p class="small mb-0">{{ lastError() }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            @if (isLoading()) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <p class="mb-0">Loading real projects...</p>
                </mat-card-content>
            </mat-card>
            }

            @if (!isLoading() && projectCardsData().length === 0) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="text-center py-5">
                    <div class="avatar avatar-80 rounded-circle bg-light-theme text-theme d-inline-flex align-items-center justify-content-center mb-3">
                        <mat-icon class="material-icons-outlined fs-1">dataset</mat-icon>
                    </div>
                    <h3 class="mb-2">No real projects found</h3>
                    <p class="text-secondary mb-3">Create a project in the workspace first, then it will appear here as a real card.</p>
                </mat-card-content>
            </mat-card>
            }

            @if (selectedWorkspaceId()) {
            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="bg-theme text-white mb-3 mb-lg-4">
                        <mat-card-content>
                            <h1 class="mb-3">
                                Let's create a project<br />
                                for your workspace
                            </h1>
                            <p class="opacity-75 mb-md-4 pb-lg-2">You can start with your very new project or you can create a task within your current project</p>

                            <button matButton="elevated" (click)="openCreateProjectDialog()"><mat-icon class="material-icons-outlined">add_circle</mat-icon> New Project</button>
                            <button matButton class="ms-1 text-theme" (click)="openTemplatePickerDialog()"><mat-icon class="material-icons-outlined">layers</mat-icon> From Template</button>
                            <button matButton="filled" class="ms-1" disabled><mat-icon class="material-icons-outlined">add</mat-icon> New Task</button>
                        </mat-card-content>
                    </mat-card>
                </div>

                @if (highlightProjects().length > 0) {
                <div class="col-12 col-lg-6 col-xl-4">
                    <swiper-container slides-per-view="1" space-between="20px" autoplay="false" navigation="true" class="swiper small-nav-v50">
                        @for (highlight of highlightProjects(); track highlight.id) {
                        <swiper-slide>
                            <mat-card class="mb-3 mb-lg-4" style="cursor:pointer" (click)="openProjectByCard(highlight)">
                                <mat-card-content class="pb-0">
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto mb-3">
                                            <div class="avatar avatar-80 rounded coverimg">
                                                <img [src]="highlight.image" alt="" />
                                            </div>
                                        </div>
                                        <div class="col mb-3">
                                            <h3 class="text-theme mb-1">{{ highlight.company }}</h3>
                                            <p class="mb-2">{{ highlight.name }}</p>
                                            <p class="text-secondary small">Deadline {{ highlight.dueDate }}</p>
                                        </div>
                                    </div>

                                    <div class="row gx-3 align-items-center">
                                        <div class="col mb-3">
                                            <h3 class="fw-medium mb-1 text-theme">{{ progressNumerator(highlight.progress) }}<span class="text-secondary">/{{ progressDenominator(highlight.progress) }}</span></h3>
                                            <p class="small text-secondary">Task Completed</p>
                                        </div>
                                    </div>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col mb-3">
                                            <p class="mb-1">+ {{ teamMembersCount(highlight) }}</p>
                                            <p class="text-secondary small">Team Members</p>
                                        </div>
                                    </div>
                                </mat-card-content>
                            </mat-card>
                        </swiper-slide>
                        }
                    </swiper-container>
                </div>

                <div class="col-12 col-lg-6 col-xl-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-header>
                            <div class="mb-3">
                                <h3 class="mb-1">Document Updates</h3>
                                <p class="text-secondary small">Stay tuned with recent changes</p>
                            </div>
                        </mat-card-header>
                        <mat-card-content class="pb-0 position-relative">
                            <swiper-container slides-per-view="1" space-between="0px" autoplay="false" pagination='{"el":".pagination-v"}' pagination-clickable="true" direction="vertical" class="swiper height-160">
                                @for (doc of documentProjects(); track doc.id) {
                                <swiper-slide>
                                    <div class="row gx-3 align-items-center">
                                        <div class="col-auto">
                                            <div class="avatar avatar-40 rounded coverimg">
                                                <img [src]="doc.image" alt="" />
                                            </div>
                                        </div>
                                        <div class="col">
                                            <p class="mb-1">{{ doc.company }}</p>
                                            <p class="text-secondary small">{{ doc.name }}</p>
                                        </div>
                                    </div>
                                </swiper-slide>
                                }
                            </swiper-container>
                            <div class="pagination-v position-absolute end-0 bottom-0 m-3"></div>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>
            }

            @if (filteredProjectCardsData().length > 0) {
            <app-projects-cards [projectsData]="filteredProjectCardsData()" [useRealRouting]="true"></app-projects-cards>
            <app-projects-grid [projectsData]="filteredProjectCardsData()" [useRealRouting]="true"></app-projects-grid>
            }

            @if (!isLoading() && projectCardsData().length > 0 && filteredProjectCardsData().length === 0) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="text-center py-4">
                    <mat-icon class="material-icons-outlined fs-1 text-secondary">search_off</mat-icon>
                    <h3 class="mb-2 mt-2">No projects match your search</h3>
                    <p class="text-secondary mb-0">Try a different project name, workspace, or manager.</p>
                </mat-card-content>
            </mat-card>
            }
        </div>

        <!-- Bulk action floating bar -->
        @if (bulkMode() && selectedProjectIds().length > 0) {
            <div class="bulk-bar">
                <mat-icon class="material-icons-outlined text-theme">checklist</mat-icon>
                <span class="fw-medium" style="font-size:13px;">{{ selectedProjectIds().length }} selected</span>
                <mat-form-field appearance="outline" class="inline-small mb-0" style="min-width:160px;">
                    <mat-label>Change status to</mat-label>
                    <mat-select [(ngModel)]="bulkTargetStatus">
                        @for (s of changeableStatuses; track s.value) {
                            <mat-option [value]="s.value">{{ s.label }}</mat-option>
                        }
                    </mat-select>
                </mat-form-field>
                <button matButton class="text-theme" [disabled]="!bulkTargetStatus" (click)="applyBulkStatus()">Apply</button>
                <button matButton (click)="clearBulkSelection()">Cancel</button>
            </div>
        }
    `,
})
export class RealProjectsComponent implements OnInit {
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly projectService = inject(M2ProjectService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly isLoading = signal(false);
    readonly lastError = signal<string | null>(null);
    readonly selectedWorkspaceId = signal("");
    readonly selectedWorkspaceName = signal("");
    readonly selectedWorkspaceOrgType = signal("enterprise");
    readonly searchQuery = signal("");
    readonly statusFilter = signal("");
    readonly bulkMode = signal(false);
    readonly selectedProjectIds = signal<string[]>([]);
    bulkTargetStatus = "";
    readonly selectedWorkspaceMembers = signal<M2WorkspaceMember[]>([]);

    readonly statusOptions = [
        { value: "",          label: "All" },
        { value: "PLANNING",  label: "Planning" },
        { value: "ACTIVE",    label: "Active" },
        { value: "ON_HOLD",   label: "On Hold" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
    ];
    readonly changeableStatuses = [
        { value: "ACTIVE",    label: "Active" },
        { value: "ON_HOLD",   label: "On Hold" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
    ];

    readonly projects = signal<RealProjectRow[]>([]);
    readonly projectCardsData = computed<ProjectCardItem[]>(() =>
        this.projects().map((row, index) => ({
            id: index + 1,
            image: row.image,
            name: row.name,
            company: row.company,
            status: row.status,
            priority: row.priority,
            managerimage: row.managerAvatarUrl,
            manager: row.manager,
            dueDate: row.dueDate,
            progress: row.progress,
            workspaceId: row.workspaceId,
            projectUuid: row.id,
            // forward lightweight member profiles and team size
            teamMembers: row.members || [],
            teamSize: (row.members || []).length,
        }))
    );

    readonly filteredProjectCardsData = computed<ProjectCardItem[]>(() => {
        let list = this.projectCardsData();
        const q = this.searchQuery().trim().toLowerCase();
        const statusF = this.statusFilter();
        if (q) list = list.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.company.toLowerCase().includes(q) ||
            (p.manager || "").toLowerCase().includes(q)
        );
        if (statusF) list = list.filter(p => p.status === statusF);
        return list;
    });

    readonly highlightProjects = computed(() => this.projectCardsData());

    readonly documentProjects = computed(() => {
        const rows = this.projectCardsData();
        return rows.length >= 3 ? rows.slice(0, 3) : rows;
    });

    ngOnInit(): void {
        this.route.queryParamMap.subscribe((params) => {
            const workspaceId = (params.get("workspaceId") || "").trim();
            this.selectedWorkspaceId.set(workspaceId);
            this.loadRealProjects();
        });
    }

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value || "";
        this.searchQuery.set(value);
    }

    openCreateProjectDialog(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to create a real project.", "Close", { duration: 3500 });
            return;
        }

        const ref = this.dialog.open(CreateProjectWorkflowDialogComponent, {
            width: "760px",
            maxWidth: "95vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.selectedWorkspaceName() || "Workspace",
                orgType: this.selectedWorkspaceOrgType(),
                members: this.selectedWorkspaceMembers().map((member) => ({
                    userId: member.userId,
                    fullName: member.user?.fullName || `User #${member.userId}`,
                    email: member.user?.email || "",
                    avatarUrl: member.user?.avatarUrl || "",
                    workspaceRole: member.role,
                })),
            },
        });

        ref.afterClosed().subscribe((result?: CreateProjectWorkflowDialogResult) => {
            if (result?.useTemplate) {
                // Defer to let the close animation finish before opening the next dialog
                setTimeout(() => this.openTemplatePickerDialog(), 150);
                return;
            }
            if (!result?.payload) {
                return;
            }

            this.projectService.createProject(workspaceId, result.payload).subscribe({
                next: (created) => {
                    const assignments = (result.assignments || []).filter((row) => row.userId !== 0);
                    if (assignments.length === 0) {
                        this.snackBar.open("Project created successfully.", "Close", { duration: 3000 });
                        this.loadRealProjects();
                        return;
                    }

                    const assignRequests = assignments.map((assignment) =>
                        this.projectService.addProjectMember(workspaceId, created.id, assignment.userId, assignment.role).pipe(
                            catchError(() => of(null))
                        )
                    );

                    forkJoin(assignRequests).subscribe(() => {
                        this.snackBar.open("Project and members created successfully.", "Close", { duration: 3200 });
                        this.loadRealProjects();
                    });
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to create project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                },
            });
        });
    }

    openTemplatePickerDialog(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to use a template.", "Close", { duration: 3500 });
            return;
        }
        const ref = this.dialog.open(UseTemplateWizardDialogComponent, {
            width: "820px",
            maxWidth: "96vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: { workspaceId, workspaceName: this.selectedWorkspaceName() || "Workspace" },
        });
        ref.afterClosed().subscribe((result: UseTemplateWizardResult) => {
            if (result?.projectId) {
                this.loadRealProjects();
            }
        });
    }

    openProjectByCard(project: ProjectCardItem): void {
        if (!project.workspaceId || !project.projectUuid) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid]);
    }

    progressNumerator(progress: number): number {
        const base = 690;
        return Math.max(0, Math.round((progress / 100) * base));
    }

    progressDenominator(progress: number): number {
        return progress >= 90 ? 750 : 690;
    }

    teamMembersCount(project: ProjectCardItem): number {
        if (project.teamSize !== undefined && project.teamSize !== null) {
            return project.teamSize;
        }
        if (!project.workspaceId) {
            return 7;
        }
        if (project.progress >= 90) {
            return 16;
        }
        return 7;
    }

    countByStatus(status: string): number {
        if (!status) return this.projectCardsData().length;
        return this.projectCardsData().filter(p => p.status === status).length;
    }

    toggleBulkMode(): void {
        this.bulkMode.update(v => !v);
        if (!this.bulkMode()) this.clearBulkSelection();
    }

    toggleProjectSelection(id: string): void {
        this.selectedProjectIds.update(ids =>
            ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
        );
    }

    clearBulkSelection(): void {
        this.selectedProjectIds.set([]);
        this.bulkTargetStatus = "";
        this.bulkMode.set(false);
    }

    applyBulkStatus(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId || !this.bulkTargetStatus || this.selectedProjectIds().length === 0) return;
        this.projectService.bulkChangeStatus(workspaceId, this.selectedProjectIds(), this.bulkTargetStatus).subscribe({
            next: (updated) => {
                this.snackBar.open(`${updated.length} project(s) updated to ${this.bulkTargetStatus}.`, "Close", { duration: 3200 });
                this.clearBulkSelection();
                this.loadRealProjects();
            },
            error: () => this.snackBar.open("Bulk update failed.", "Close", { duration: 3500 }),
        });
    }

    loadRealProjects(): void {
        const workspaceId = this.selectedWorkspaceId();
        this.isLoading.set(true);
        this.lastError.set(null);
        this.projects.set([]);

        if (workspaceId) {
            this.loadForSingleWorkspace(workspaceId);
            return;
        }

        this.selectedWorkspaceName.set("");

        this.workspaceService.getWorkspaces().subscribe({
            next: (workspaces) => {
                if (workspaces.length === 0) {
                    this.projects.set([]);
                    this.isLoading.set(false);
                    return;
                }

                const workspaceRequests = workspaces.map((workspace) =>
                    forkJoin({
                        projectsPage: this.projectService.getProjects(workspace.id, 0, 50).pipe(
                            catchError(() => of({ content: [] as M2ProjectSummary[] }))
                        ),
                        workspaceMembers: this.workspaceService.getWorkspaceMembers(workspace.id).pipe(
                            catchError(() => of([] as M2WorkspaceMember[]))
                        ),
                    }).pipe(
                        map(({ projectsPage, workspaceMembers }) => ({
                            workspace,
                            projects: projectsPage.content || [],
                            workspaceMembers,
                        }))
                    )
                );

                forkJoin(workspaceRequests).subscribe({
                    next: (workspaceRows) => {
                        const projectContexts = workspaceRows.flatMap((row) => {
                            const profileByUserId = this.buildWorkspaceProfiles(row.workspaceMembers);
                            return row.projects.map((project) => ({
                                workspace: row.workspace,
                                project,
                                profileByUserId,
                            }));
                        });

                        if (projectContexts.length === 0) {
                            this.projects.set([]);
                            this.isLoading.set(false);
                            return;
                        }

                        const memberRequests = projectContexts.map((ctx) =>
                            this.projectService.getProjectMembers(ctx.workspace.id, ctx.project.id).pipe(
                                map((members) => this.toRow(ctx.workspace, ctx.project, members || [], ctx.profileByUserId)),
                                catchError(() => of(this.toRow(ctx.workspace, ctx.project, [], ctx.profileByUserId)))
                            )
                        );

                        forkJoin(memberRequests).subscribe({
                            next: (rows) => {
                                const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
                                this.projects.set(sorted);
                                this.isLoading.set(false);
                            },
                            error: (error: HttpErrorResponse) => {
                                this.projects.set([]);
                                this.lastError.set(this.errorMessage(error));
                                this.isLoading.set(false);
                            },
                        });
                    },
                    error: (error: HttpErrorResponse) => {
                        this.projects.set([]);
                        this.lastError.set(this.errorMessage(error));
                        this.isLoading.set(false);
                    },
                });
            },
            error: (error: HttpErrorResponse) => {
                this.projects.set([]);
                this.lastError.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    showAllWorkspaces(): void {
        this.router.navigate(["/app/real-projects"]);
    }

    goBackToWorkspace(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            return;
        }
        this.router.navigate(["/app/workspaces", workspaceId]);
    }

    openProject(project: RealProjectRow): void {
        if (!project?.workspaceId || !project?.id) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.id]);
    }

    statusDisplay(status: string): string {
        const map: Record<string, string> = {
            PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold",
            COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived",
        };
        return map[(status || "").toUpperCase()] || status;
    }

    statusClass(status: string): string {
        switch ((status || "").toUpperCase()) {
            case "ACTIVE":    return "theme-green";
            case "ON_HOLD":   return "theme-orange";
            case "PLANNING":  return "theme-orange";
            case "COMPLETED": return "theme-violet";
            case "CANCELLED": return "theme-red";
            case "ARCHIVED":  return "badge-light";
            default:          return "badge-light";
        }
    }

    priorityClass(priority: "High" | "Medium" | "Low"): string {
        if (priority === "High") {
            return "theme-red";
        }
        if (priority === "Medium") {
            return "theme-orange";
        }
        return "theme-green";
    }

    private toRow(
        workspace: M2Workspace,
        project: M2ProjectSummary,
        projectMembers: M2ProjectMember[],
        profileByUserId: Map<number, { fullName: string; avatarUrl: string }>
    ): RealProjectRow {
        const normalizedStatus = (project.status || "PLANNING").toUpperCase();
        const managerMember = this.pickManager(projectMembers);
        const managerProfile = managerMember?.userId ? profileByUserId.get(managerMember.userId) : undefined;
        const memberProfiles = (projectMembers || []).map((m) => ({
            userId: m.userId,
            fullName: profileByUserId.get(m.userId)?.fullName || m.user?.fullName || `User #${m.userId}`,
            avatarUrl: profileByUserId.get(m.userId)?.avatarUrl || m.user?.avatarUrl || "",
        }));

        return {
            workspaceId: workspace.id,
            id: project.id,
            name: project.name || "Unnamed project",
            company: workspace.name || "Workspace",
            description: project.description || "",
            visibility: (project.visibility || "PRIVATE").toUpperCase(),
            status: normalizedStatus,
            priority: this.derivePriority(normalizedStatus),
            manager: managerProfile?.fullName || managerMember?.user?.fullName || this.fallbackManagerLabel(managerMember?.userId),
            managerAvatarUrl: managerProfile?.avatarUrl || managerMember?.user?.avatarUrl || "",
            dueDate: this.toDateLabel(project.endDate),
            dueDateSort: project.endDate || "",
            progress: this.deriveProgress(normalizedStatus),
            image: this.cardImageFor(project.id),
            members: memberProfiles,
        };
    }

    private loadForSingleWorkspace(workspaceId: string): void {
        forkJoin({
            workspace: this.workspaceService.getWorkspaceById(workspaceId),
            projectsPage: this.projectService.getProjects(workspaceId, 0, 100),
            workspaceMembers: this.workspaceService.getWorkspaceMembers(workspaceId).pipe(catchError(() => of([] as M2WorkspaceMember[]))),
        }).subscribe({
            next: ({ workspace, projectsPage, workspaceMembers }) => {
                this.selectedWorkspaceName.set(workspace.name || "");
                this.selectedWorkspaceOrgType.set(
                    (workspace.orgType || workspace.organization?.orgType || "enterprise").toLowerCase()
                );
                this.selectedWorkspaceMembers.set(workspaceMembers || []);

                const profileByUserId = this.buildWorkspaceProfiles(workspaceMembers);
                const projects = projectsPage?.content || [];
                if (projects.length === 0) {
                    this.projects.set([]);
                    this.isLoading.set(false);
                    return;
                }

                const memberRequests = projects.map((project) =>
                    this.projectService.getProjectMembers(workspaceId, project.id).pipe(
                        map((members) => this.toRow(workspace, project, members || [], profileByUserId)),
                        catchError(() => of(this.toRow(workspace, project, [], profileByUserId)))
                    )
                );

                forkJoin(memberRequests).subscribe({
                    next: (rows) => {
                        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
                        this.projects.set(sorted);
                        this.isLoading.set(false);
                    },
                    error: (error: HttpErrorResponse) => {
                        this.projects.set([]);
                        this.lastError.set(this.errorMessage(error));
                        this.isLoading.set(false);
                    },
                });
            },
            error: (error: HttpErrorResponse) => {
                this.projects.set([]);
                this.lastError.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    private buildWorkspaceProfiles(members: M2WorkspaceMember[]): Map<number, { fullName: string; avatarUrl: string }> {
        const mapById = new Map<number, { fullName: string; avatarUrl: string }>();
        for (const member of members || []) {
            mapById.set(member.userId, {
                fullName: member.user?.fullName || `User #${member.userId}`,
                avatarUrl: member.user?.avatarUrl || "",
            });
        }
        return mapById;
    }

    private pickManager(members: M2ProjectMember[]): M2ProjectMember | undefined {
        return (
            members.find((m) => {
                const role = (m.role || "").toUpperCase();
                return role === "PROJECT_MANAGER" || role === "PROFESSOR";
            })
            || members[0]
        );
    }

    private fallbackManagerLabel(userId?: number): string {
        if (!userId) {
            return "Unassigned";
        }
        return `User #${userId}`;
    }

    private derivePriority(status: string): "High" | "Medium" | "Low" {
        if (status === "ON_HOLD" || status === "CANCELLED") {
            return "High";
        }
        if (status === "COMPLETED" || status === "ARCHIVED") {
            return "Low";
        }
        return "Medium";
    }

    private deriveProgress(status: string): number {
        if (status === "COMPLETED" || status === "ARCHIVED") {
            return 100;
        }
        if (status === "ACTIVE") {
            return 75;
        }
        if (status === "ON_HOLD") {
            return 10;
        }
        if (status === "CANCELLED") {
            return 0;
        }
        return 50;
    }

    private toDateLabel(value?: string): string {
        if (!value) {
            return "-";
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "-";
        }
        return parsed.toISOString().slice(0, 10);
    }

    private cardImageFor(seed: string): string {
        const images = [
            "assets/img/product1.jpg",
            "assets/img/product2.jpg",
            "assets/img/product3.jpg",
            "assets/img/product4.jpg",
            "assets/img/product5.jpg",
            "assets/img/product6.jpg",
            "assets/img/product7.jpg",
            "assets/img/product8.jpg",
        ];
        const hash = [...(seed || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return images[Math.abs(hash) % images.length];
    }

    private errorMessage(error: HttpErrorResponse): string {
        const message = (error?.error && (error.error.message || error.error.error)) || error.message || "Request failed";
        return `status=${error.status || 0} message=${message}`;
    }
}
