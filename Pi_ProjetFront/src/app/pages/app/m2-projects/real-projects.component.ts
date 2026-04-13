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
import { forkJoin, of, Observable } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { M2ProjectMember, M2ProjectService, M2ProjectSummary } from "./m2-project.service";
import { M2TimelineCheckpoint, M2Workspace, M2WorkspaceMember, M2WorkspaceService, M2WorkspaceSnapshot } from "../m2-workspaces/m2-workspace.service";
import { ProjectsCardsComponent, TableItem as ProjectCardItem } from "./projects-cards.component";
import { ProjectsGridComponent } from "./projects-grid.component";
import { CreateProjectWorkflowDialogComponent, CreateProjectWorkflowDialogResult } from "./create-project-workflow-dialog.component";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "../m2-templates/use-template-wizard-dialog.component";
import { WorkspaceSelectorDialogComponent } from "./workspace-selector-dialog.component";
import { ProjectPermissionService } from "./project-permission.service";
import { CreateWithAiComponent, CreateWithAiDialogResult } from "./create-with-ai.component";
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
        /* ===== Header & Workspace Switcher ===== */
        .header-section {
            background: linear-gradient(135deg, #f5f3ff 0%, #f0f4ff 100%);
            border-radius: 12px;
            border: 1px solid rgba(99, 102, 241, 0.1);
            transition: all 0.3s ease;
        }
        .workspace-context {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .workspace-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: white;
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .workspace-badge:hover {
            border-color: #6366f1;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
            background: linear-gradient(135deg, #f5f3ff, white);
        }
        .workspace-badge mat-icon {
            color: #6366f1;
        }
        .workspace-name-text {
            font-weight: 500;
            color: #1a202c;
            font-size: 14px;
        }
        .workspace-switch-btn {
            position: relative;
        }
        .workspace-switch-btn:hover {
            background: rgba(99, 102, 241, 0.05) !important;
        }

        /* ===== Status Chips ===== */
        .status-chip {
            border: 1px solid rgba(0, 0, 0, 0.13);
            background: white;
            padding: 6px 14px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            color: #475569;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .status-chip:hover {
            border-color: rgba(99, 102, 241, 0.3);
            background: rgba(99, 102, 241, 0.02);
            transform: translateY(-1px);
        }
        .status-chip.active {
            border-color: #6366f1;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02));
            color: #6366f1;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
        }
        .status-count {
            font-size: 11px;
            opacity: 0.7;
            margin-left: 4px;
            background: rgba(0, 0, 0, 0.05);
            padding: 2px 6px;
            border-radius: 10px;
        }

        /* ===== Search & Filters ===== */
        .search-section {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        .filter-divider {
            width: 1px;
            height: 24px;
            background: rgba(0, 0, 0, 0.1);
            margin: 0 8px;
        }

        /* ===== Bulk Action Bar ===== */
        .bulk-bar {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            padding: 14px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 1000;
            min-width: 360px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        /* ===== Action Buttons ===== */
        .action-button {
            transition: all 0.2s ease;
        }
        .action-button:hover {
            background: rgba(99, 102, 241, 0.05);
        }

        /* ===== Empty State ===== */
        .empty-state-icon {
            width: 80px;
            height: 80px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #6366f1;
            margin-bottom: 16px;
        }
        .empty-state-icon mat-icon {
            font-size: 40px;
            width: 40px;
            height: 40px;
        }

        /* ===== Error Card ===== */
        .error-card {
            border-left: 4px solid #ef4444;
        }

        /* ===== Responsive ===== */
        @media (max-width: 768px) {
            .workspace-badge {
                padding: 6px 12px;
                font-size: 13px;
            }
            .search-section {
                flex-direction: column;
                width: 100%;
            }
            .filter-divider {
                display: none;
            }
            .bulk-bar {
                min-width: auto;
                width: calc(100% - 32px);
                left: 16px;
                transform: none;
            }
        }

        /* ===== Loading Animation ===== */
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
    `],
    template: `
        <!-- Header Section -->
        <div class="container-fluid fade-in mb-4">
            <mat-card class="header-section shadow-none p-4">
                <div class="row gx-3 gx-lg-4 align-items-center mb-3">
                    <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                        <div>
                            <h2 class="mb-2" style="font-size: 28px; font-weight: 700; color: #1a202c;">Real Projects</h2>
                            <p class="text-secondary small mb-0">
                                <span routerLink="/app/dashboard" class="text-theme style-none d-inline-flex align-items-center gap-1">
                                    <mat-icon class="material-icons-outlined" style="font-size: 16px;">home</mat-icon> Dashboard
                                </span>
                                <span class="mx-2">/</span>
                                <span style="color: #6366f1; font-weight: 500;">Real Projects</span>
                            </p>
                        </div>
                    </div>

                    <div class="col-12 col-lg-auto ms-lg-auto mb-3 mb-lg-0">
                        @if (selectedWorkspaceName()) {
                            <div class="workspace-context">
                                <div class="workspace-badge" (click)="openWorkspaceSwitcher()" 
                                    matTooltip="Click to switch workspace">
                                    <mat-icon class="material-icons-outlined" style="font-size: 18px;">business</mat-icon>
                                    <span class="workspace-name-text">{{ selectedWorkspaceName() }}</span>
                                    <mat-icon class="material-icons-outlined" style="font-size: 16px; margin-left: 4px;">unfold_more</mat-icon>
                                </div>
                            </div>
                        } @else {
                            <button mat-raised-button color="primary" (click)="openWorkspaceSwitcher()" class="workspace-switch-btn">
                                <mat-icon class="material-icons-outlined">language</mat-icon>
                                Choose Workspace
                            </button>
                        }
                    </div>
                </div>

                <!-- Search & Filters Row -->
                <div class="row gx-3 gx-lg-4 align-items-center">
                    <div class="col-12 col-lg-8 mb-3 mb-lg-0">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Search projects</mat-label>
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput placeholder="By name, workspace, or manager..." (input)="onSearch($event)" />
                        </mat-form-field>
                    </div>

                    <div class="col-12 col-lg-auto ms-lg-auto mb-3 mb-lg-0 d-flex gap-2 align-items-center flex-wrap">
                        <button matIconButton matTooltip="Refresh" (click)="loadRealProjects()" class="action-button">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                        </button>
                        @if (selectedWorkspaceId()) {
                            <span class="filter-divider"></span>
                            <button matButton class="action-button" (click)="showAllWorkspaces()" matTooltip="Clear workspace filter">
                                <mat-icon class="material-icons-outlined">close</mat-icon>
                                Clear Filter
                            </button>
                        }
                        <button matIconButton 
                            [class.text-theme]="bulkMode()"
                            matTooltip="{{ bulkMode() ? 'Exit select mode' : 'Multi-select' }}"
                            (click)="toggleBulkMode()"
                            class="action-button">
                            <mat-icon class="material-icons-outlined">{{ bulkMode() ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                        </button>
                    </div>
                </div>

                <!-- Status Filter Chips -->
                @if (projectCardsData().length > 0) {
                    <div class="mt-4 pt-3 border-top d-flex align-items-center gap-2 flex-wrap">
                        <p class="small text-secondary mb-0 me-3" style="margin-bottom: 0 !important;">Filter:</p>
                        @for (opt of statusOptions; track opt.value) {
                            <button class="status-chip" [class.active]="statusFilter() === opt.value"
                                (click)="statusFilter.set(opt.value)">
                                <mat-icon class="material-icons-outlined" style="font-size: 14px; margin-right: 2px;">
                                    {{ opt.value === 'ALL' ? 'apps' : 'circle' }}
                                </mat-icon>
                                <span>{{ opt.label }}</span>
                                <span class="status-count">{{ countByStatus(opt.value) }}</span>
                            </button>
                        }
                    </div>
                }
            </mat-card>
        </div>

        @if (historicalMode()) {
        <div class="container fade-in mb-3">
            <mat-card class="mb-3" style="background:#fff7ed;border-left:4px solid #f59e0b;">
                <mat-card-content>
                    <div class="d-flex align-items-start align-items-lg-center gap-2 flex-column flex-lg-row">
                        <div class="d-flex align-items-center">
                            <mat-icon style="color:#b45309">history_toggle_off</mat-icon>
                            <div style="margin-left:12px">
                                <div style="font-weight:600">Viewing projects as of {{ historicalDisplay() }}</div>
                                <div class="small text-secondary">Read-only historical mode</div>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-1 ms-lg-auto">
                            @for (checkpoint of timelineQuickDates(); track checkpoint.at + '-' + $index) {
                                <button
                                    matButton
                                    class="badge-light"
                                    [matTooltip]="checkpoint.label || checkpoint.kind || checkpoint.at"
                                    (click)="jumpToHistoricalDate(checkpoint.at)">
                                    {{ checkpoint.at | date:'yyyy-MM-dd' }}
                                </button>
                            }
                            <button matButton (click)="clearHistorical()">Exit</button>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        }

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

                            <button matButton="elevated" [disabled]="historicalMode()" (click)="openCreateProjectDialog()"><mat-icon class="material-icons-outlined">add_circle</mat-icon> New Project</button>
                            @if (canShowCreateWithAi()) {
                            <button matButton="filled" class="ms-1" [disabled]="historicalMode()" (click)="openCreateWithAiDialog()"><mat-icon class="material-icons-outlined">auto_awesome</mat-icon> AI 4-Stage Bootstrap</button>
                            }
                            <button matButton class="ms-1 text-theme" [disabled]="historicalMode()" (click)="openTemplatePickerDialog()"><mat-icon class="material-icons-outlined">layers</mat-icon> From Template</button>
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
                <app-projects-cards [projectsData]="filteredProjectCardsData()" [useRealRouting]="true" [historicalAt]="historicalAt()"></app-projects-cards>
                <app-projects-grid [projectsData]="filteredProjectCardsData()" [useRealRouting]="true" [historicalAt]="historicalAt()" (projectEdited)="onProjectEdited($event)"></app-projects-grid>
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
    private readonly projectPermissionService = inject(ProjectPermissionService);

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
    readonly canShowCreateWithAi = computed(() => {
        const workspaceId = this.selectedWorkspaceId();
        return !!workspaceId;
    });

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
    readonly historicalAt = signal<string | null>(null);
    readonly timelineQuickDates = signal<M2TimelineCheckpoint[]>([]);
    readonly historicalMode = computed(() => !!this.historicalAt());
    readonly historicalDisplay = computed(() => this.historicalAt() ? new Date(this.historicalAt()!).toLocaleString() : "");
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
            const at = params.get('at');
            this.selectedWorkspaceId.set(workspaceId);
            this.historicalAt.set(at);
            this.timelineQuickDates.set([]);
            this.loadRealProjects();
        });
    }

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value || "";
        this.searchQuery.set(value);
    }

    openCreateProjectDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

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
                    if (error.status === 409) {
                        this.snackBar.open(
                            error?.error?.message || "A project with this name already exists in this workspace",
                            "Close",
                            { duration: 5000 }
                        );
                    } else if (error.status === 402) {
                        this.snackBar.open(
                            "Project quota exceeded for your organization's plan. Upgrade to create more projects.",
                            "Close",
                            { duration: 6000 }
                        );
                    } else {
                        this.snackBar.open(`Failed to create project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                    }
                },
            });
        });
    }

    openTemplatePickerDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

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

    openCreateWithAiDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to use Create with AI.", "Close", { duration: 3500 });
            return;
        }

        if (!this.canShowCreateWithAi()) {
            this.snackBar.open("Select a workspace first to use AI bootstrap.", "Close", { duration: 3500 });
            return;
        }

        const ref = this.dialog.open(CreateWithAiComponent, {
            width: "1080px",
            maxWidth: "98vw",
            maxHeight: "92vh",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.selectedWorkspaceName() || "Workspace",
                orgType: this.selectedWorkspaceOrgType(),
            },
        });

        ref.afterClosed().subscribe((result?: CreateWithAiDialogResult) => {
            if (!result?.createdProjectId) {
                return;
            }
            this.snackBar.open("Project created with AI successfully.", "Close", { duration: 3200 });
            this.loadRealProjects();
        });
    }

    openProjectByCard(project: ProjectCardItem): void {
        if (!project.workspaceId || !project.projectUuid) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid], {
            queryParams: this.buildHistoricalQueryParams(),
        });
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

    onProjectEdited(event: { projectUuid: string; name: string; status: string }): void {
        this.projects.update(list =>
            list.map(p => p.id === event.projectUuid ? { ...p, name: event.name, status: event.status } : p)
        );
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
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

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
        const at = this.historicalAt() || undefined;
        this.isLoading.set(true);
        this.lastError.set(null);
        this.projects.set([]);
        this.timelineQuickDates.set([]);

        if (workspaceId) {
            this.loadForSingleWorkspace(workspaceId, at);
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

                const atParam = at;
                const workspaceRequests = workspaces.map((workspace) =>
                    atParam
                        ? this.workspaceService.getWorkspaceSnapshot(workspace.id, atParam).pipe(
                            catchError(() => of(null)),
                            map((snap: M2WorkspaceSnapshot | null) => ({
                                workspace,
                                projects: (snap?.projects || []),
                                workspaceMembers: this.mapSnapshotMembers(snap?.members),
                            }))
                        )
                        : forkJoin({
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
                            return row.projects.map((project: any) => ({
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

                        const memberRequests = projectContexts.map((ctx) => {
                            if (at) {
                                // Historical mode: project-level member as-of is not available in snapshot MVP — fall back to empty list
                                return of(this.toRow(ctx.workspace, ctx.project, [], ctx.profileByUserId));
                            }
                            return this.projectService.getProjectMembers(ctx.workspace.id, ctx.project.id).pipe(
                                map((members) => this.toRow(ctx.workspace, ctx.project, members || [], ctx.profileByUserId)),
                                catchError(() => of(this.toRow(ctx.workspace, ctx.project, [], ctx.profileByUserId)))
                            );
                        });

                        const memberObs = forkJoin(memberRequests) as unknown as Observable<RealProjectRow[]>;
                        memberObs.subscribe({
                            next: (rows: RealProjectRow[]) => {
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
        this.router.navigate(["/app/real-projects"], { queryParams: this.buildHistoricalQueryParams() });
    }

    goBackToWorkspace(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            return;
        }
        this.router.navigate(["/app/workspaces", workspaceId], { queryParams: this.buildHistoricalQueryParams() });
    }

    openWorkspaceSwitcher(): void {
        this.dialog.open(WorkspaceSelectorDialogComponent, {
            width: "900px",
            maxWidth: "95vw",
            disableClose: false,
        }).afterClosed().subscribe((workspace) => {
            if (workspace) {
                this.router.navigate(["/app/real-projects"], {
                    queryParams: {
                        workspaceId: workspace.id,
                        ...this.buildHistoricalQueryParams(),
                    },
                });
            }
        });
    }

    openProject(project: RealProjectRow): void {
        if (!project?.workspaceId || !project?.id) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.id], {
            queryParams: this.buildHistoricalQueryParams(),
        });
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

    private loadForSingleWorkspace(workspaceId: string, at?: string): void {
        if (at) {
            // Historical snapshot path
            this.workspaceService.getWorkspaceSnapshot(workspaceId, at).subscribe({
                next: (snap: M2WorkspaceSnapshot) => {
                    // Populate lightweight workspace info from snapshot
                    this.selectedWorkspaceName.set(snap?.workspaceName || "");
                    this.selectedWorkspaceOrgType.set((snap?.organization?.orgType || "enterprise").toLowerCase());
                    const workspaceMembers = this.mapSnapshotMembers(snap?.members);
                    this.selectedWorkspaceMembers.set(workspaceMembers);
                    this.timelineQuickDates.set(this.pickTimelineQuickDates(snap));

                    const profileByUserId = this.buildWorkspaceProfiles(workspaceMembers);
                    const projects = snap?.projects || [];
                    if (projects.length === 0) {
                        this.projects.set([]);
                        this.isLoading.set(false);
                        return;
                    }

                    const memberRequests = projects.map((project: any) =>
                        // Historical mode: project-level members are not available in MVP snapshot
                        of(this.toRow({ id: workspaceId, name: this.selectedWorkspaceName(), slug: "", ownerId: 0 } as M2Workspace, project as M2ProjectSummary, [], profileByUserId))
                    );

                    const memberObs = forkJoin(memberRequests) as unknown as Observable<RealProjectRow[]>;
                    memberObs.subscribe({
                        next: (rows: RealProjectRow[]) => {
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
                    if (error.status === 404) {
                        // Workspace may exist but be inactive at the selected date.
                        this.projects.set([]);
                        this.timelineQuickDates.set([]);
                        this.lastError.set(null);
                        this.isLoading.set(false);
                        return;
                    }
                    this.projects.set([]);
                    this.timelineQuickDates.set([]);
                    this.lastError.set(this.errorMessage(error));
                    this.isLoading.set(false);
                },
            });
            return;
        }

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
                this.loadTimelineHints(workspaceId);

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

    jumpToHistoricalDate(at: string): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { at },
            queryParamsHandling: "merge",
        });
    }

    clearHistorical(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { at: null },
            queryParamsHandling: "merge",
        });
    }

    private loadTimelineHints(workspaceId: string): void {
        this.workspaceService.getWorkspaceSnapshot(workspaceId, new Date().toISOString()).pipe(
            catchError(() => of(null))
        ).subscribe((snapshot: M2WorkspaceSnapshot | null) => {
            if (!snapshot) {
                this.timelineQuickDates.set([]);
                return;
            }
            this.timelineQuickDates.set(this.pickTimelineQuickDates(snapshot));
        });
    }

    private pickTimelineQuickDates(snapshot: M2WorkspaceSnapshot): M2TimelineCheckpoint[] {
        const merged = new Map<string, M2TimelineCheckpoint>();

        for (const checkpoint of snapshot.timelineCheckpoints || []) {
            if (checkpoint?.at) {
                merged.set(checkpoint.at, checkpoint);
            }
        }

        for (const at of snapshot.suggestedDates || []) {
            if (!at || merged.has(at)) {
                continue;
            }
            merged.set(at, {
                at,
                kind: "SUGGESTED",
                label: "Recommended checkpoint",
            });
        }

        return Array.from(merged.values())
            .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
            .slice(0, 7);
    }

    private mapSnapshotMembers(members?: M2WorkspaceSnapshot["members"]): M2WorkspaceMember[] {
        return (members || []).map((member) => ({
            id: member.id,
            userId: member.userId,
            role: member.workspaceRole || "MEMBER",
            joinedAt: member.joinedAt,
            user: {
                fullName: member.fullName || `User #${member.userId}`,
                email: member.email || "",
                avatarUrl: member.avatarUrl || "",
            },
        }));
    }

    private buildHistoricalQueryParams(): Record<string, string> {
        const at = this.historicalAt();
        return at ? { at } : {};
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
