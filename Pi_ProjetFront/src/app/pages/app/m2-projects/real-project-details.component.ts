import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";
import { M2AvailableWorkspaceMember, M2ProjectMember, M2ProjectService, M2ProjectSummary } from "./m2-project.service";
import { ProjectAddMemberModalComponent } from "./project-add-member-modal.component";
import { ProjectDeleteConfirmDialogComponent } from "./project-delete-confirm-dialog.component";
import { ProjectMemberCardComponent } from "./project-member-card.component";
import { ProjectMemberRoleEditDialogComponent, ProjectMemberRoleEditDialogResult } from "./project-member-role-edit-dialog.component";
import { ProjectMemberUnassignDialogComponent, ProjectMemberUnassignDialogResult } from "./project-member-unassign-dialog.component";
import { ProjectPermissionService } from "./project-permission.service";
import { M2WorkspaceMember, M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { AuthService } from "../../../auth/auth.service";

interface ProjectMemberView {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    role: string;
    assignedAt: string;
}

@Component({
    selector: "app-project-details",
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSnackBarModule,
        ProjectMemberCardComponent,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Real Project: {{ project()?.name || "Details" }}</h3>
                        <p class="small mb-0">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            <span [routerLink]="['/app/real-projects']" [queryParams]="workspaceId() ? { workspaceId: workspaceId(), ...historicalQueryParams() } : historicalQueryParams()" class="me-2 text-theme style-none">Real Projects</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Project Details
                        </p>
                    </div>

                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matButton (click)="backToRealProjects()"><mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back</button>
                        <button matButton class="ms-1" (click)="refresh()"><mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh</button>
                        <button matButton="filled" class="ms-1" [disabled]="!canManageProjects()" (click)="openAddMemberDialog()">
                            <mat-icon class="material-icons-outlined">person_add</mat-icon>
                            Add Member
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>

        @if (historicalAt()) {
        <div class="container fade-in mb-3">
            <mat-card class="mb-3" style="background:#fff7ed;border-left:4px solid #f59e0b;">
                <mat-card-content>
                    <div class="d-flex align-items-center">
                        <mat-icon style="color:#b45309">history_toggle_off</mat-icon>
                        <div style="margin-left:12px">
                            <div style="font-weight:600">Viewing project as of {{ historicalDisplay() }}</div>
                            <div class="small text-secondary">Opened from Time Machine context</div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        }

        <div class="container fade-in">
            @if (isLoading()) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <p class="mb-0">Loading project details...</p>
                </mat-card-content>
            </mat-card>
            }

            @if (error()) {
            <mat-card class="mb-3 mb-lg-4 border theme-red">
                <mat-card-content>
                    <div class="d-flex align-items-start">
                        <mat-icon class="material-icons-outlined me-2 theme-red">error</mat-icon>
                        <div>
                            <p class="fw-medium mb-1">Project details error</p>
                            <p class="small mb-0">{{ error() }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            @if (project()) {
            <div class="row gx-3 gx-lg-4 mb-3">
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ startDateLabel() }}</h1>
                            <p class="small text-secondary">Start Date</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Running:</p></div>
                                <div class="col"><h3>{{ projectDurationLabel() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ statusLabel(projectStatus()) }}</h1>
                            <p class="small text-secondary">Project Status</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Visibility:</p></div>
                                <div class="col"><h3>{{ projectVisibility() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ endDateLabel() }}</h1>
                            <p class="small text-secondary">End Date</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Timeline:</p></div>
                                <div class="col"><h3>{{ daysRemainingLabel() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ createdAtLabel() }}</h1>
                            <p class="small text-secondary">Created</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Members:</p></div>
                                <div class="col"><h3>{{ members().length }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <!-- ── Project Timeline ── -->
            @if (project()?.startDate || project()?.endDate) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content>
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div>
                            <h4 class="mb-0">Project Timeline</h4>
                            <p class="text-secondary small mb-0">
                                {{ startDateLabel() }} → {{ endDateLabel() }}
                                @if (daysRemaining() !== null) {
                                    &nbsp;·&nbsp;
                                    @if (daysRemaining()! < 0) { <span style="color:#ef4444;">Overdue by {{ -daysRemaining()! }} day{{ -daysRemaining()! !== 1 ? 's' : '' }}</span> }
                                    @else if (daysRemaining()! === 0) { <span style="color:#f59e0b;">Ends today</span> }
                                    @else { <span style="color:#22c55e;">{{ daysRemaining() }} day{{ daysRemaining() !== 1 ? 's' : '' }} remaining</span> }
                                }
                            </p>
                        </div>
                        <div class="text-end flex-shrink-0">
                            <p class="mb-0 fw-semibold" style="font-size:22px;color:#6366f1;">{{ timelineProgressPercent() }}%</p>
                            <p class="text-secondary small mb-0">elapsed</p>
                        </div>
                    </div>
                    <!-- Progress bar -->
                    <div style="position:relative;height:10px;border-radius:6px;background:rgba(0,0,0,0.07);overflow:hidden;">
                        <div style="height:100%;border-radius:6px;transition:width .4s ease;"
                             [style.width]="timelineProgressPercent() + '%'"
                             [style.background]="daysRemaining() !== null && daysRemaining()! < 0 ? 'linear-gradient(90deg,#ef4444,#f87171)' : daysRemaining() === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#6366f1,#818cf8)'">
                        </div>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span class="text-secondary" style="font-size:11px;">{{ startDateLabel() }}</span>
                        <span class="text-secondary" style="font-size:11px;">{{ endDateLabel() }}</span>
                    </div>
                    @if (!project()?.startDate || !project()?.endDate) {
                    <p class="text-secondary small mb-0 mt-2">
                        <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">info</mat-icon>
                        Set both start and end dates to see the full timeline.
                    </p>
                    }
                </mat-card-content>
            </mat-card>
            }

            <!-- ── Phases ── -->
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="py-3">
                    <div class="d-flex align-items-center gap-2 mb-3">
                        <div style="width:36px;height:36px;border-radius:10px;background:rgba(99,102,241,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <mat-icon class="material-icons-outlined" style="color:#6366f1;font-size:20px;width:20px;height:20px;">account_tree</mat-icon>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="mb-0">
                                Phases
                                @if (parsedProjectPhases().length > 0) {
                                    <span class="badge badge-light ms-1" style="font-size:11px;">{{ parsedProjectPhases().length }}</span>
                                }
                            </h5>
                            @if (parsedProjectPhases().length === 0) {
                                <p class="text-secondary small mb-0">No phase structure defined for this project.</p>
                            }
                        </div>
                        @if (project()?.templateId) {
                            <span class="badge badge-light flex-shrink-0" style="font-size:10px;">
                                <mat-icon class="material-icons-outlined align-middle" style="font-size:11px;width:11px;height:11px;">layers</mat-icon>
                                From template
                            </span>
                        }
                    </div>

                    @if (parsedProjectPhases().length > 0) {
                        <!-- Phase flow chips -->
                        <div class="d-flex align-items-center flex-wrap gap-1 mb-3">
                            @for (phase of parsedProjectPhases(); track $index; let i = $index) {
                                <div class="d-flex align-items-center">
                                    <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;border:1.5px solid;"
                                         [style.background]="phaseColor(i) + '14'"
                                         [style.borderColor]="phaseColor(i) + '40'"
                                         [style.color]="phaseColor(i)">
                                        <span style="width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;"
                                              [style.background]="phaseColor(i) + '25'">{{ i + 1 }}</span>
                                        {{ phase.name || 'Phase ' + (i + 1) }}
                                        @if (phase.durationDays && phase.durationDays > 0) {
                                            <span style="opacity:0.65;font-size:10px;">{{ phase.durationDays }}d</span>
                                        }
                                    </div>
                                    @if (i < parsedProjectPhases().length - 1) {
                                        <mat-icon style="font-size:14px;width:14px;height:14px;color:#94a3b8;flex-shrink:0;margin:0 2px;">chevron_right</mat-icon>
                                    }
                                </div>
                            }
                        </div>

                        <!-- Visual timeline bar -->
                        @if (parsedProjectPhases().length > 1) {
                            <div class="d-flex gap-1" style="height:6px;border-radius:3px;overflow:hidden;">
                                @for (phase of parsedProjectPhases(); track $index; let i = $index) {
                                    <div style="flex:1;border-radius:2px;" [style.background]="phaseColor(i)"></div>
                                }
                            </div>
                        }
                    } @else {
                        <div style="border:1.5px dashed rgba(0,0,0,0.1);border-radius:10px;padding:16px;text-align:center;">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:28px;width:28px;height:28px;">timeline</mat-icon>
                            <p class="text-secondary small mb-1">No phases defined for this project.</p>
                            <p class="text-secondary small mb-0" style="font-size:11px;">Projects created from templates will show the template's phase structure here.</p>
                        </div>
                    }
                </mat-card-content>
            </mat-card>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12 col-lg-4">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            @if (!editMode()) {
                            <h3 class="mb-1">{{ project()?.name }}</h3>
                            <p class="text-secondary small mb-2">Workspace: {{ workspaceName() }}</p>

                            <div class="d-flex gap-2 align-items-center mb-3">
                                <span class="badge" [ngClass]="visibilityClass(projectVisibility())">{{ projectVisibility() }}</span>
                                <span class="badge" [ngClass]="statusClass(projectStatus())">{{ statusLabel(projectStatus()) }}</span>
                            </div>

                            <p class="small mb-3">{{ project()?.description || "No description available." }}</p>

                            @if (canManageProjects()) {
                            <div class="d-flex gap-2 flex-wrap mb-3">
                                <button matButton="filled" (click)="startEdit()">
                                    <mat-icon class="material-icons-outlined">edit</mat-icon>
                                    Edit Project
                                </button>
                                <button matButton (click)="openArchiveDialog()" style="color:#f57c00;">
                                    <mat-icon class="material-icons-outlined">archive</mat-icon>
                                    Archive
                                </button>
                                <button matButton class="theme-red" (click)="openHardDeleteDialog()">
                                    <mat-icon class="material-icons-outlined">delete_forever</mat-icon>
                                    Delete
                                </button>
                            </div>

                            @if (validStatusTransitions().length > 0) {
                            <mat-form-field appearance="outline" class="w-100 inline-small mb-2">
                                <mat-label>Change Status</mat-label>
                                <mat-select [ngModel]="null" (ngModelChange)="changeStatus($event)">
                                    @for (opt of validStatusTransitions(); track opt.value) {
                                        <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>
                            }
                            }
                            }

                            @if (editMode()) {
                            <form #editForm="ngForm">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Project Name</mat-label>
                                <input matInput name="editName" [(ngModel)]="editName" required minlength="3" maxlength="150" #nameCtrl="ngModel" />
                                <mat-hint align="end">{{ editName.length }}/150</mat-hint>
                                @if (nameCtrl.errors?.['required']) {
                                <mat-error>Project name is required.</mat-error>
                                }
                                @if (nameCtrl.errors?.['minlength']) {
                                <mat-error>Name must be at least 3 characters long.</mat-error>
                                }
                            </mat-form-field>
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Description <span class="text-secondary">(optional)</span></mat-label>
                                <textarea matInput rows="3" name="editDescription" [(ngModel)]="editDescription" maxlength="500"></textarea>
                                <mat-hint align="end">{{ editDescription.length }}/500</mat-hint>
                            </mat-form-field>
                            <div class="row gx-2">
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Visibility</mat-label>
                                        <mat-select name="editVisibility" [(ngModel)]="editVisibility">
                                            <mat-option value="PRIVATE">Private</mat-option>
                                            <mat-option value="PUBLIC">Public</mat-option>
                                        </mat-select>
                                    </mat-form-field>
                                </div>
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Start Date</mat-label>
                                        <input matInput type="date" name="editStartDate" [(ngModel)]="editStartDate" />
                                    </mat-form-field>
                                </div>
                                <div class="col-6">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>End Date</mat-label>
                                        <input matInput type="date" name="editEndDate" [(ngModel)]="editEndDate" #endDateCtrl="ngModel" [min]="editStartDate || ''" />
                                        @if (editEndDate && editStartDate && editEndDate < editStartDate) {
                                        <mat-error>End date must be after the start date.</mat-error>
                                        }
                                    </mat-form-field>
                                </div>
                            </div>
                            @if (editEndDate && editStartDate && editEndDate < editStartDate) {
                            <div class="d-flex align-items-center gap-2 mb-3 px-2 py-2 rounded" style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);">
                                <mat-icon class="material-icons-outlined theme-red" style="font-size:18px;width:18px;height:18px;">error_outline</mat-icon>
                                <span class="small" style="color:#dc3545">End date cannot be before the start date.</span>
                            </div>
                            }
                            <div class="d-flex gap-2 mb-3">
                                <button matButton="filled" type="button" (click)="saveEdit(editForm)">
                                    <mat-icon class="material-icons-outlined">save</mat-icon>
                                    Save Changes
                                </button>
                                <button matButton type="button" (click)="cancelEdit()">Cancel</button>
                            </div>
                            </form>
                            }
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-lg-8">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h3 class="mb-1">Members</h3>
                                    <p class="text-secondary small mb-0">Live project members with workspace-style management</p>
                                </div>
                                <button matButton="filled" [disabled]="!canManageProjects() || availableMembers().length === 0" (click)="openAddMemberDialog()">
                                    <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                    Add Member
                                </button>
                            </div>

                            <div class="row gx-2 mb-3">
                                <div class="col-6 col-lg-3">
                                    <mat-card class="bg-light-theme">
                                        <mat-card-content class="py-2">
                                            <p class="small text-secondary mb-1">Leads</p>
                                            <h4 class="mb-0">{{ leadershipCount() }}</h4>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                                <div class="col-6 col-lg-3">
                                    <mat-card class="bg-light-theme">
                                        <mat-card-content class="py-2">
                                            <p class="small text-secondary mb-1">Contributors</p>
                                            <h4 class="mb-0">{{ contributorCount() }}</h4>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                                <div class="col-6 col-lg-3">
                                    <mat-card class="bg-light-theme">
                                        <mat-card-content class="py-2">
                                            <p class="small text-secondary mb-1">Joined Last 7d</p>
                                            <h4 class="mb-0">{{ joinedLast7DaysCount() }}</h4>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                                <div class="col-6 col-lg-3">
                                    <mat-card class="bg-light-theme">
                                        <mat-card-content class="py-2">
                                            <p class="small text-secondary mb-1">Available to Add</p>
                                            <h4 class="mb-0">{{ availableMembers().length }}</h4>
                                        </mat-card-content>
                                    </mat-card>
                                </div>
                            </div>

                            @if (members().length === 0) {
                            <p class="text-secondary mb-3">No members assigned to this project yet.</p>
                            } @else {
                            @for (member of members(); track member.userId) {
                            <app-project-member-card
                                [member]="member"
                                [canEditRole]="canEditMemberRole(member)"
                                [canRemoveMember]="canRemoveMember(member)"
                                (editRole)="openRoleEditDialog($event)"
                                (removeMember)="openRemoveMemberDialog($event)"></app-project-member-card>
                            }
                            }
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            }
        </div>
    `,
})
export class ProjectDetailsComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectService = inject(M2ProjectService);
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly permissionService = inject(ProjectPermissionService);
    private readonly authService = inject(AuthService);

    readonly isLoading = signal(true);
    readonly error = signal<string | null>(null);
    readonly editMode = signal(false);

    readonly workspaceId = signal("");
    readonly projectId = signal("");
    readonly historicalAt = signal<string | null>(null);
    readonly historicalDisplay = computed(() => this.historicalAt() ? new Date(this.historicalAt()!).toLocaleString() : "");

    // edit form fields (two-way bound via ngModel)
    editName = "";
    editDescription = "";
    editVisibility: "PUBLIC" | "PRIVATE" = "PRIVATE";
    editStartDate = "";
    editEndDate = "";

    readonly project = signal<M2ProjectSummary | null>(null);
    readonly workspaceName = signal("-");
    readonly workspaceOrgType = signal("enterprise");

    readonly members = signal<ProjectMemberView[]>([]);
    readonly availableMembers = signal<M2AvailableWorkspaceMember[]>([]);

    readonly canManageProjects = computed(() => this.permissionService.canManageProject());
    readonly projectStatus = computed(() => (this.project()?.status || "PLANNING").toUpperCase());

    private readonly statusTransitions: Record<string, { value: string; label: string }[]> = {
        PLANNING:  [{ value: "ACTIVE", label: "Active" }, { value: "CANCELLED", label: "Cancelled" }],
        ACTIVE:    [{ value: "ON_HOLD", label: "On Hold" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }],
        ON_HOLD:   [{ value: "ACTIVE", label: "Active" }, { value: "CANCELLED", label: "Cancelled" }],
        COMPLETED: [{ value: "ARCHIVED", label: "Archived" }],
        CANCELLED: [{ value: "PLANNING", label: "Re-open (Planning)" }],
        ARCHIVED:  [],
    };

    readonly validStatusTransitions = computed(() =>
        this.statusTransitions[this.projectStatus()] ?? []
    );
    readonly projectVisibility = computed(() => (this.project()?.visibility || "PRIVATE").toUpperCase());
    readonly leadershipCount = computed(() => this.members().filter((m) => this.isManageRole(m.role)).length);
    readonly contributorCount = computed(() => Math.max(0, this.members().length - this.leadershipCount()));
    readonly joinedLast7DaysCount = computed(() => this.members().filter((m) => this.isJoinedWithinDays(m.assignedAt, 7)).length);
    readonly createdAtLabel = computed(() => {
        const createdAt = this.project()?.createdAt;
        return createdAt ? new Date(createdAt).toLocaleDateString() : "-";
    });

    readonly startDateLabel = computed(() => {
        const startDate = this.project()?.startDate;
        return startDate ? new Date(startDate).toLocaleDateString() : "-";
    });

    readonly endDateLabel = computed(() => {
        const endDate = this.project()?.endDate;
        return endDate ? new Date(endDate).toLocaleDateString() : "-";
    });

    readonly daysRunning = computed(() => {
        const startDate = this.project()?.startDate;
        if (!startDate) return 0;
        const start = new Date(startDate).getTime();
        const now = Date.now();
        if (now < start) return 0;
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
    });

    readonly daysRemaining = computed(() => {
        const endDate = this.project()?.endDate;
        if (!endDate) return null;
        const end = new Date(endDate).getTime();
        const now = Date.now();
        const days = Math.floor((end - now) / (1000 * 60 * 60 * 24));
        return days;
    });

    readonly projectDurationLabel = computed(() => {
        const days = this.daysRunning();
        if (days === 0) return "Starting soon";
        if (days === 1) return "1 day";
        return `${days} days`;
    });

    readonly daysRemainingLabel = computed(() => {
        const days = this.daysRemaining();
        if (days === null) return "No end date";
        if (days < 0) return "Completed";
        if (days === 0) return "Ends today";
        if (days === 1) return "1 day left";
        return `${days} days left`;
    });

    readonly timelineProgressPercent = computed(() => {
        const start = this.project()?.startDate ? new Date(this.project()!.startDate!).getTime() : null;
        const end = this.project()?.endDate ? new Date(this.project()!.endDate!).getTime() : null;
        if (!start || !end || end <= start) return 0;
        const now = Date.now();
        if (now <= start) return 0;
        if (now >= end) return 100;
        return Math.round(((now - start) / (end - start)) * 100);
    });

    readonly parsedProjectPhases = computed((): Array<{ name?: string; durationDays?: number }> => {
        const json = this.project()?.phasesJson;
        if (!json) return [];
        try {
            const a = JSON.parse(json);
            return Array.isArray(a) ? a as Array<{ name?: string; durationDays?: number }> : [];
        } catch { return []; }
    });

    phaseColor(index: number): string {
        const colors = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#f97316"];
        return colors[index % colors.length];
    }

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const workspaceId = params.get("workspaceId") || "";
            const projectId = params.get("projectId") || "";
            const at = this.route.snapshot.queryParamMap.get("at");

            if (!workspaceId || !projectId) {
                this.error.set("Missing workspaceId or projectId in route.");
                this.isLoading.set(false);
                return;
            }

            this.workspaceId.set(workspaceId);
            this.projectId.set(projectId);
            this.historicalAt.set(at);
            this.loadData();
        });
    }

    refresh(): void {
        this.loadData();
    }

    backToRealProjects(): void {
        const wsId = this.workspaceId();
        this.router.navigate(["/app/real-projects"], {
            queryParams: wsId
                ? { workspaceId: wsId, ...this.historicalQueryParams() }
                : this.historicalQueryParams(),
        });
    }

    historicalQueryParams(): Record<string, string> {
        const at = this.historicalAt();
        return at ? { at } : {};
    }

    openAddMemberDialog(): void {
        if (!this.canManageProjects()) {
            return;
        }

        const available = this.availableMembers();
        if (available.length === 0) {
            this.snackBar.open("No workspace members are available to add.", "Close", { duration: 3200 });
            return;
        }

        const ref = this.dialog.open(ProjectAddMemberModalComponent, {
            width: "560px",
            maxWidth: "95vw",
            data: {
                workspaceId: this.workspaceId(),
                projectId: this.projectId(),
                orgType: this.workspaceOrgType(),
                members: available,
            },
        });

        ref.afterClosed().subscribe((result?: true) => {
            if (result) {
                this.loadData();
            }
        });
    }

    openRoleEditDialog(member: ProjectMemberView): void {
        if (!this.canEditMemberRole(member)) {
            return;
        }

        const ref = this.dialog.open(ProjectMemberRoleEditDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: {
                memberName: member.fullName,
                currentRole: member.role,
                orgType: this.workspaceOrgType(),
            },
        });

        ref.afterClosed().subscribe((result?: ProjectMemberRoleEditDialogResult) => {
            if (!result?.role) {
                return;
            }

            this.projectService.updateProjectMemberRole(this.workspaceId(), this.projectId(), member.userId, result.role).subscribe({
                next: () => {
                    this.snackBar.open("Project member role updated.", "Close", { duration: 3000 });
                    this.loadData();
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to update project member role: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                },
            });
        });
    }

    openRemoveMemberDialog(member: ProjectMemberView): void {
        if (!this.canRemoveMember(member)) {
            return;
        }

        const ref = this.dialog.open(ProjectMemberUnassignDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: {
                memberName: member.fullName,
                projectName: this.project()?.name || "Project",
            },
        });

        ref.afterClosed().subscribe((result?: ProjectMemberUnassignDialogResult) => {
            if (!result?.confirm) {
                return;
            }

            this.projectService.removeProjectMember(this.workspaceId(), this.projectId(), member.userId).subscribe({
                next: () => {
                    this.snackBar.open("Project member removed.", "Close", { duration: 3000 });
                    this.loadData();
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to remove project member: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                },
            });
        });
    }


    openArchiveDialog(): void {
        const ref = this.dialog.open(ProjectDeleteConfirmDialogComponent, {
            width: "480px",
            maxWidth: "95vw",
            data: { projectName: this.project()?.name || "", permanent: false },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.projectService.archiveProject(this.workspaceId(), this.projectId()).subscribe({
                next: () => {
                    this.snackBar.open("Project archived and removed from view.", "Close", { duration: 3500 });
                    this.backToRealProjects();
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to archive project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                },
            });
        });
    }

    openHardDeleteDialog(): void {
        const ref = this.dialog.open(ProjectDeleteConfirmDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: { projectName: this.project()?.name || "", permanent: true },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.projectService.hardDeleteProject(this.workspaceId(), this.projectId()).subscribe({
                next: () => {
                    this.snackBar.open("Project permanently deleted.", "Close", { duration: 3500 });
                    this.backToRealProjects();
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to delete project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                },
            });
        });
    }

    startEdit(): void {
        const p = this.project();
        if (!p) return;
        this.editName = p.name || "";
        this.editDescription = p.description || "";
        this.editVisibility = (p.visibility as "PUBLIC" | "PRIVATE") || "PRIVATE";
this.editStartDate = p.startDate || "";
        this.editEndDate = p.endDate || "";
        this.editMode.set(true);
    }

    cancelEdit(): void {
        const p = this.project();
        if (p) {
            this.editName = p.name || "";
            this.editDescription = p.description || "";
            this.editVisibility = (p.visibility as "PUBLIC" | "PRIVATE") || "PRIVATE";
            this.editStartDate = p.startDate || "";
            this.editEndDate = p.endDate || "";
        }
        this.editMode.set(false);
    }

    saveEdit(form: NgForm): void {
        form.form.markAllAsTouched();
        if (form.invalid) return;
        if (this.editStartDate && this.editEndDate && this.editEndDate < this.editStartDate) return;

        const body: Record<string, unknown> = {
            name: this.editName.trim(),
            description: this.editDescription.trim() || null,
            visibility: this.editVisibility,
        };
        if (this.editStartDate) body["startDate"] = this.editStartDate;
        if (this.editEndDate) body["endDate"] = this.editEndDate;

        this.projectService.updateProject(this.workspaceId(), this.projectId(), body).subscribe({
            next: (updated) => {
                this.project.set(updated);
                this.editMode.set(false);
                this.snackBar.open("Project updated.", "Close", { duration: 3000 });
            },
            error: (error: HttpErrorResponse) => {
                this.snackBar.open(`Failed to update project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
            },
        });
    }

    changeStatus(newStatus: string): void {
        if (!this.canManageProjects() || !newStatus) return;

        this.projectService.changeProjectStatus(this.workspaceId(), this.projectId(), newStatus).subscribe({
            next: (updated) => {
                this.project.set(updated);
                this.snackBar.open(`Status changed to ${this.statusLabel(newStatus)}.`, "Close", { duration: 3000 });
            },
            error: (error: HttpErrorResponse) => {
                this.snackBar.open(`Failed to change status: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
            },
        });
    }

    statusLabel(status: string): string {
        const map: Record<string, string> = {
            PLANNING: "Planning",
            ACTIVE: "Active",
            ON_HOLD: "On Hold",
            COMPLETED: "Completed",
            CANCELLED: "Cancelled",
            ARCHIVED: "Archived",
        };
        return map[(status || "").toUpperCase()] || status;
    }

    statusClass(status: string): string {
        const normalized = (status || "").toUpperCase();
        if (normalized === "ACTIVE") {
            return "theme-green";
        }
        if (normalized === "ON_HOLD") {
            return "theme-orange";
        }
        if (normalized === "COMPLETED" || normalized === "ARCHIVED") {
            return "theme-blue";
        }
        return "badge-light";
    }

    visibilityClass(visibility: string): string {
        return visibility === "PRIVATE" ? "theme-orange" : "theme-green";
    }

    canEditMemberRole(member: ProjectMemberView): boolean {
        if (!this.canManageProjects()) {
            return false;
        }
        const currentUserId = this.authService.currentUser()?.id;
        return !(currentUserId && member.userId === currentUserId);
    }

    canRemoveMember(member: ProjectMemberView): boolean {
        if (!this.canManageProjects()) {
            return false;
        }
        const currentUserId = this.authService.currentUser()?.id;
        return !(currentUserId && member.userId === currentUserId);
    }

    private loadData(): void {
        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) {
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);

        forkJoin({
            project: this.projectService.getProjectById(workspaceId, projectId),
            projectMembers: this.projectService.getProjectMembers(workspaceId, projectId),
            availableMembers: this.projectService.getAvailableWorkspaceMembers(workspaceId, projectId).pipe(catchError(() => of([]))),
            workspace: this.workspaceService.getWorkspaceById(workspaceId).pipe(catchError(() => of(null))),
            workspaceMembers: this.workspaceService.getWorkspaceMembers(workspaceId).pipe(catchError(() => of([]))),
        }).subscribe({
            next: (payload) => {
                this.project.set(payload.project);
                this.availableMembers.set(payload.availableMembers);

                this.workspaceName.set(payload.workspace?.name || "Workspace");
                this.workspaceOrgType.set(((payload.workspace?.orgType || "enterprise") + "").toLowerCase());

                this.members.set(this.mapProjectMembers(payload.projectMembers, payload.workspaceMembers));
                this.isLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.project.set(null);
                this.members.set([]);
                this.availableMembers.set([]);
                this.error.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    private mapProjectMembers(projectMembers: M2ProjectMember[], workspaceMembers: M2WorkspaceMember[]): ProjectMemberView[] {
        const profileByUserId = new Map<number, M2WorkspaceMember>();
        for (const member of workspaceMembers || []) {
            profileByUserId.set(member.userId, member);
        }

        return (projectMembers || []).map((member) => {
            const profile = profileByUserId.get(member.userId);
            return {
                userId: member.userId,
                fullName: profile?.user?.fullName || `User #${member.userId}`,
                email: profile?.user?.email || "",
                avatarUrl: profile?.user?.avatarUrl || "",
                role: (member.role || "DEVELOPER").toUpperCase(),
                assignedAt: member.assignedAt || "",
            };
        });
    }

    private isManageRole(role: string): boolean {
        const normalized = (role || "").toUpperCase();
        return normalized === "PROJECT_MANAGER" || normalized === "PROFESSOR";
    }

    private isJoinedWithinDays(value: string | undefined, days: number): boolean {
        if (!value) {
            return false;
        }
        const ts = Date.parse(value);
        if (Number.isNaN(ts)) {
            return false;
        }
        const diff = Date.now() - ts;
        return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
    }

    private errorMessage(error: HttpErrorResponse): string {
        const message = (error?.error && (error.error.message || error.error.error)) || error.message || "Request failed";
        return `status=${error.status || 0} message=${message}`;
    }
}
