import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatSelectModule } from "@angular/material/select";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { AuthService } from "../../../auth/auth.service";
import { OrganizationOption } from "../../../auth/user.model";
import { M2CreateWorkspaceRequest, M2Workspace, M2WorkspaceService } from "./m2-workspace.service";
import { WorkspacePermissionService } from "./workspace-permission.service";

interface WorkspaceViewRow {
    id: string;
    name: string;
    slug: string;
    ownerId: number;
    createdAt: string;
    organizationName: string;
    orgType: string;
    projectCount: number | null;
}

interface M2CreateWorkspaceDialogData {
    entityLabel?: "Workspace" | "Group";
    canSelectOrganization: boolean;
    organizationOptions: OrganizationOption[];
    defaultOrganizationId?: string | null;
    defaultOrganizationName?: string | null;
    defaultOrganizationType?: string | null;
    defaultMembershipRole?: string | null;
}

@Component({
    selector: "app-m2-create-workspace-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatStepperModule],
    template: `
        <div class="create-shell p-3 p-lg-4">
            <div class="d-flex align-items-center mb-3 pb-1 border-bottom">
                <h3 class="mb-0 flex-grow-1">Create {{ entityLabel() }}</h3>
                <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
            </div>

            <mat-stepper [linear]="true" class="workspace-stepper">
                <mat-step [completed]="isBasicsValid()">
                    <ng-template matStepLabel>Basics</ng-template>

                    <div class="step-card mt-3">
                        <div class="row gx-3">
                            <div class="col-12 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>{{ entityLabel() }} Name</mat-label>
                                    <input matInput [ngModel]="name" (ngModelChange)="onNameChange(($event || '').toString())" placeholder="Ex: Data Engineering" maxlength="100" (blur)="nameTouched = true" />
                                    <mat-hint align="start">Use a clear {{ entityLabel().toLowerCase() }} name.</mat-hint>
                                    <mat-hint align="end">{{ name.length }}/100</mat-hint>
                                </mat-form-field>
                                @if (nameTouched && name.trim().length === 0) {
                                <p class="small theme-red mb-0 mt-1"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle" class="material-icons-outlined">error_outline</mat-icon> {{ entityLabel() }} name is required.</p>
                                }
                                @if (name.trim().length > 0 && name.trim().length < 3) {
                                <p class="small theme-red mb-0 mt-1"><mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle" class="material-icons-outlined">error_outline</mat-icon> {{ entityLabel() }} name must be at least 3 characters.</p>
                                }
                            </div>

                            <div class="col-12 mb-2">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>{{ entityLabel() }} Slug</mat-label>
                                    <input matInput [ngModel]="slug" (ngModelChange)="onSlugChange(($event || '').toString())" placeholder="Ex: data-engineering" />
                                    <mat-hint>Lowercase letters, numbers, and hyphens only.</mat-hint>
                                </mat-form-field>
                                @if (!isSlugValid()) {
                                <p class="small theme-red mb-0">Slug must match: lowercase letters, numbers and single hyphens.</p>
                                }
                            </div>

                            <div class="col-12">
                                <div class="preview-pill">
                                    <span class="small text-secondary">Preview URL key</span>
                                    <strong>{{ resolvedSlugPreview() || ("(enter " + entityLabel().toLowerCase() + " name)") }}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button matButton (click)="close()">Cancel</button>
                        <button matButton="filled" matStepperNext [disabled]="!isBasicsValid()">Continue</button>
                    </div>
                </mat-step>

                <mat-step [completed]="isOrganizationValid()">
                    <ng-template matStepLabel>Organization</ng-template>

                    <div class="step-card mt-3">
                        @if (data?.canSelectOrganization) {
                        <div class="row gx-3">
                            <div class="col-12 mb-3">
                                <mat-form-field appearance="outline" class="w-100">
                                    <mat-label>Organization</mat-label>
                                    <mat-select [(ngModel)]="organizationId">
                                        @for (org of data?.organizationOptions || []; track org.organizationId) {
                                        <mat-option [value]="org.organizationId">{{ org.organizationName }} ({{ org.organizationSlug }})</mat-option>
                                        }
                                    </mat-select>
                                </mat-form-field>
                                @if (!organizationId) {
                                <p class="small text-secondary mb-0">Select the organization where this workspace will be created.</p>
                                }
                            </div>
                        </div>
                        } @else {
                        <div class="org-shell">
                            <p class="mb-1 fw-medium">{{ selectedOrganizationName() }}</p>
                            <p class="small text-secondary mb-0">Creation scope is fixed to your current organization.</p>
                        </div>
                        }

                        <div class="d-flex flex-wrap gap-2 mt-3">
                            <span class="badge badge-light">Org Type: {{ selectedOrganizationType() }}</span>
                            <span class="badge badge-light">Membership: {{ selectedMembershipRole() }}</span>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button matButton matStepperPrevious>Back</button>
                        <button matButton="filled" matStepperNext [disabled]="!isOrganizationValid()">Review</button>
                    </div>
                </mat-step>

                <mat-step>
                    <ng-template matStepLabel>Review</ng-template>

                    <div class="step-card mt-3">
                        <p class="small text-secondary mb-2">Please confirm before creating:</p>
                        <div class="summary-row">
                            <span>Name</span>
                            <strong>{{ name.trim() }}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Slug</span>
                            <strong>{{ resolvedSlugPreview() }}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Organization</span>
                            <strong>{{ selectedOrganizationName() }}</strong>
                        </div>
                        <div class="summary-row">
                            <span>Organization Type</span>
                            <strong>{{ selectedOrganizationType() }}</strong>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button matButton matStepperPrevious>Back</button>
                        <button matButton="filled" [disabled]="!canSubmit()" (click)="submit()">
                            <mat-icon class="material-icons-outlined me-1">add_circle</mat-icon>
                            Create {{ entityLabel() }}
                        </button>
                    </div>
                </mat-step>
            </mat-stepper>
        </div>
    `,
    styles: [
        `
            .create-shell {
                background: radial-gradient(circle at top right, rgba(0, 136, 255, 0.08), transparent 55%);
            }

            .workspace-stepper {
                background: transparent;
            }

            .step-card {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 14px;
                padding: 14px;
                background: #fff;
            }

            .preview-pill {
                border: 1px dashed rgba(0, 136, 255, 0.4);
                border-radius: 12px;
                background: rgba(0, 136, 255, 0.06);
                padding: 10px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            .org-shell {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 12px;
                background: #fff;
            }

            .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                padding: 10px 0;
                border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
            }

            .summary-row:last-child {
                border-bottom: 0;
            }
        `,
    ],
})
export class M2CreateWorkspaceDialogComponent {
    readonly dialogRef = inject(MatDialogRef<M2CreateWorkspaceDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as M2CreateWorkspaceDialogData | null;

    name = "";
    slug = "";
    organizationId = this.data?.defaultOrganizationId || "";
    nameTouched = false;
    private slugManuallyEdited = false;

    entityLabel(): "Workspace" | "Group" {
        return this.data?.entityLabel || "Workspace";
    }

    onNameChange(value: string): void {
        this.name = value;
        if (!this.slugManuallyEdited) {
            this.slug = this.slugify(value);
        }
    }

    onSlugChange(value: string): void {
        this.slug = value;
        this.slugManuallyEdited = value.trim().length > 0;
    }

    isBasicsValid(): boolean {
        const trimmedName = this.name.trim();
        return trimmedName.length >= 3 && this.isSlugValid();
    }

    isOrganizationValid(): boolean {
        if (!this.data?.canSelectOrganization) {
            return true;
        }
        return !!this.organizationId;
    }

    canSubmit(): boolean {
        return this.isBasicsValid() && this.isOrganizationValid() && !!this.resolvedSlugPreview();
    }

    isSlugValid(): boolean {
        const candidate = this.slug.trim();
        if (!candidate) {
            return true;
        }
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate);
    }

    resolvedSlugPreview(): string {
        const custom = this.slugify(this.slug);
        if (custom) {
            return custom;
        }
        return this.slugify(this.name);
    }

    selectedOrganizationName(): string {
        const selected = this.selectedOrganization();
        return selected?.organizationName || this.data?.defaultOrganizationName || "Current organization";
    }

    selectedOrganizationType(): string {
        const selected = this.selectedOrganization();
        return (selected?.organizationType || this.data?.defaultOrganizationType || "ENTERPRISE").toUpperCase();
    }

    selectedMembershipRole(): string {
        const selected = this.selectedOrganization();
        return (selected?.membershipRole || this.data?.defaultMembershipRole || "MEMBER").toUpperCase();
    }

    submit(): void {
        if (!this.canSubmit()) {
            return;
        }

        const payload: M2CreateWorkspaceRequest = {
            name: this.name.trim(),
            slug: this.resolvedSlugPreview() || undefined,
            organizationId: this.data?.canSelectOrganization ? this.organizationId || undefined : undefined,
        };
        this.dialogRef.close(payload);
    }

    close(): void {
        this.dialogRef.close();
    }

    private selectedOrganization(): OrganizationOption | undefined {
        const selectedOrgId = this.data?.canSelectOrganization ? this.organizationId : this.data?.defaultOrganizationId || "";
        return (this.data?.organizationOptions || []).find((org) => org.organizationId === selectedOrgId);
    }

    private slugify(value: string): string {
        return (value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
}

@Component({
    selector: "app-m2-workspaces",
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
        MatTableModule,
        MatSnackBarModule,
        MatDialogModule,
        MatMenuModule,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">My Workspaces</h3>
                        <p class="small mb-1">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Workspaces
                        </p>
                        @if (!isLoading() && workspaces().length > 0) {
                        <div class="d-flex flex-wrap gap-2 mt-2">
                            <span class="badge badge-light">{{ workspaces().length }} total</span>
                            @if (enterpriseCount() > 0) {
                            <span class="badge theme-blue">{{ enterpriseCount() }} Enterprise</span>
                            }
                            @if (academicCount() > 0) {
                            <span class="badge theme-violet">{{ academicCount() }} Academic</span>
                            }
                        </div>
                        }
                    </div>

                    <div class="col-12 col-lg-4 mb-3 mb-xl-0 order-3 order-lg-2">
                        <mat-form-field appearance="outline" class="w-100 inline-small">
                            <mat-label>Search workspace</mat-label>
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" placeholder="Name, slug or org…" />
                        </mat-form-field>
                    </div>

                    <div class="col-auto order-2 order-lg-3 mb-3 mb-xl-0">
                        <button matButton (click)="loadWorkspaces()"><mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh</button>
                        <button matButton="filled" class="ms-1" [disabled]="!permissionService.canCreateWorkspace()" (click)="openCreateWorkspaceDialog()">
                            <mat-icon class="material-icons-outlined">add</mat-icon> New Workspace
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">
            @if (lastError()) {
            <mat-card class="mb-3 mb-lg-4 border theme-red">
                <mat-card-content>
                    <div class="d-flex align-items-start">
                        <mat-icon class="material-icons-outlined me-2 theme-red">error</mat-icon>
                        <div>
                            <p class="fw-medium mb-1">Failed to load workspaces</p>
                            <p class="small mb-0">{{ lastError() }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            @if (isLoading()) {
            <div class="row gx-3 gx-lg-4 mb-3">
                @for (i of [1,2,3]; track i) {
                <div class="col-12 col-sm-6 col-xl-4 mb-3 mb-lg-4">
                    <mat-card class="ws-skeleton"><mat-card-content style="height:160px;"></mat-card-content></mat-card>
                </div>
                }
            </div>
            }

            @if (!isLoading() && filteredWorkspaces().length === 0) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="text-center py-5">
                    <div class="avatar avatar-80 rounded-circle bg-light-theme text-theme d-inline-flex align-items-center justify-content-center mb-3">
                        <mat-icon class="material-icons-outlined fs-1">workspaces</mat-icon>
                    </div>
                    <h3 class="mb-2">No workspaces yet</h3>
                    <p class="text-secondary mb-3">You can only see workspaces where you are explicitly a member.</p>
                    <button matButton="filled" [disabled]="!permissionService.canCreateWorkspace()" (click)="openCreateWorkspaceDialog()">
                        <mat-icon class="material-icons-outlined">add_circle</mat-icon> Create Workspace
                    </button>
                </mat-card-content>
            </mat-card>
            }

            @if (!isLoading() && filteredWorkspaces().length > 0) {
            <div class="row gx-3 gx-lg-4 mb-3">
                @for (workspace of filteredWorkspaces(); track workspace.id) {
                <div class="col-12 col-sm-6 col-xl-4 mb-3 mb-lg-4">
                    <mat-card class="ws-card h-100"
                              [class.ws-card--disabled]="!canOpenWorkspace(workspace)"
                              (click)="openWorkspaceDetails(workspace)">
                        <div class="ws-card__accent" [class.ws-card__accent--academic]="workspace.orgType === 'ACADEMIC'"></div>
                        <mat-card-content class="pb-2">
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <div class="ws-avatar" [class.ws-avatar--academic]="workspace.orgType === 'ACADEMIC'">
                                    {{ workspace.name.charAt(0).toUpperCase() }}
                                </div>
                                <div class="flex-grow-1 overflow-hidden">
                                    <h4 class="mb-0 text-truncate">{{ workspace.name }}</h4>
                                    <p class="text-secondary small mb-0 text-truncate">{{ workspace.slug }}</p>
                                </div>
                                <mat-icon class="ws-open-arrow material-icons-outlined">arrow_forward</mat-icon>
                            </div>

                            <div class="d-flex align-items-center gap-2 mb-3">
                                <mat-icon class="material-icons-outlined text-secondary" style="font-size:15px;width:15px;height:15px;">business</mat-icon>
                                <p class="text-secondary small mb-0 text-truncate">{{ workspace.organizationName }}</p>
                            </div>

                            <div class="d-flex flex-wrap gap-1 mb-3">
                                <span class="badge" [ngClass]="workspace.orgType === 'ACADEMIC' ? 'theme-violet' : 'theme-blue'">
                                    {{ workspace.orgType === 'ACADEMIC' ? 'Academic' : 'Enterprise' }}
                                </span>
                                @if (isDefaultWorkspace(workspace)) {
                                <span class="badge theme-green">Default</span>
                                }
                            </div>

                            <div class="ws-card__footer d-flex align-items-center gap-3">
                                <div class="d-flex align-items-center gap-1">
                                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:14px;width:14px;height:14px;">folder_open</mat-icon>
                                    <span class="text-secondary" style="font-size:12px;">
                                        @if (workspace.projectCount === null) { <span style="opacity:.5;">…</span> }
                                        @else { {{ workspace.projectCount }} project{{ workspace.projectCount !== 1 ? 's' : '' }} }
                                    </span>
                                </div>
                                <div class="d-flex align-items-center gap-1 ms-auto">
                                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:14px;width:14px;height:14px;">schedule</mat-icon>
                                    <span class="text-secondary" style="font-size:12px;">{{ workspace.createdAt }}</span>
                                </div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>
            }
        </div>
    `,
    styles: [`
            .ws-card {
                border: 1.5px solid rgba(0, 0, 0, 0.07);
                border-radius: 16px;
                transition: all 0.22s ease;
                cursor: pointer;
                overflow: hidden;
                position: relative;
            }
            .ws-card:hover {
                border-color: rgba(0, 136, 255, 0.3);
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.09);
                transform: translateY(-2px);
            }
            .ws-card:hover .ws-open-arrow { opacity: 1; color: #0088ff; }
            .ws-card--disabled { opacity: 0.5; cursor: not-allowed; }
            .ws-card--disabled:hover { transform: none; box-shadow: none; border-color: rgba(0,0,0,0.07); }
            .ws-card__accent {
                height: 4px;
                background: linear-gradient(90deg, #0088ff, #00ccff);
            }
            .ws-card__accent--academic {
                background: linear-gradient(90deg, #7c3aed, #a78bfa);
            }
            .ws-card__footer {
                border-top: 1px solid rgba(0, 0, 0, 0.06);
                padding-top: 10px;
                margin-top: 4px;
            }
            .ws-avatar {
                width: 46px; height: 46px; border-radius: 12px;
                background: rgba(0, 136, 255, 0.1); color: #0088ff;
                display: flex; align-items: center; justify-content: center;
                font-size: 18px; font-weight: 700; flex-shrink: 0;
            }
            .ws-avatar--academic { background: rgba(124, 58, 237, 0.1); color: #7c3aed; }
            .ws-open-arrow {
                font-size: 18px; width: 18px; height: 18px;
                opacity: 0.25; transition: all 0.2s; flex-shrink: 0;
            }
            .ws-skeleton { border-radius: 16px; animation: pulse 1.5s ease-in-out infinite; }
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    `],
})
export class M2WorkspacesComponent implements OnInit {
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly permissionService = inject(WorkspacePermissionService);

    readonly isLoading = signal(false);
    readonly lastError = signal<string | null>(null);
    readonly searchTerm = signal("");
    readonly workspaces = signal<WorkspaceViewRow[]>([]);
    readonly organizationOptions = signal<OrganizationOption[]>([]);

    readonly displayedColumns = ["name", "organization", "default", "createdAt", "actions"];

    readonly filteredWorkspaces = computed(() => {
        const query = this.searchTerm().trim().toLowerCase();
        if (!query) {
            return this.workspaces();
        }

        return this.workspaces().filter((w) =>
            w.name.toLowerCase().includes(query)
            || w.slug.toLowerCase().includes(query)
            || w.organizationName.toLowerCase().includes(query)
        );
    });

    readonly enterpriseCount = computed(() => this.workspaces().filter(w => w.orgType !== 'ACADEMIC').length);
    readonly academicCount = computed(() => this.workspaces().filter(w => w.orgType === 'ACADEMIC').length);

    ngOnInit(): void {
        this.loadOrganizationOptions();
        this.loadWorkspaces();
    }

    loadWorkspaces(): void {
        this.isLoading.set(true);
        this.lastError.set(null);
        this.workspaceService.getWorkspaces().subscribe({
            next: (rows) => {
                this.workspaces.set(rows.map((row) => this.toViewRow(row)));
                this.isLoading.set(false);
                this.loadProjectCounts(rows.map(r => r.id));
            },
            error: (error: HttpErrorResponse) => {
                this.workspaces.set([]);
                this.isLoading.set(false);
                this.lastError.set(this.errorMessage(error));
            },
        });
    }

    private loadProjectCounts(ids: string[]): void {
        ids.forEach(id => {
            this.workspaceService.getWorkspaceProjects(id, 0, 1).subscribe({
                next: (page) => this.workspaces.update(rows => rows.map(w => w.id === id ? { ...w, projectCount: page.totalElements ?? 0 } : w)),
                error: () => this.workspaces.update(rows => rows.map(w => w.id === id ? { ...w, projectCount: 0 } : w)),
            });
        });
    }

    canOpenWorkspace(workspace: WorkspaceViewRow): boolean {
        return this.permissionService.canOpenWorkspaceFromList(workspace.id);
    }

    openWorkspaceDetails(workspace: WorkspaceViewRow, event?: Event): void {
        event?.stopPropagation();
        if (!this.canOpenWorkspace(workspace)) {
            return;
        }
        this.router.navigate(["/app/workspaces", workspace.id]);
    }

    openCreateWorkspaceDialog(): void {
        this.openCreateEntityDialog("Workspace");
    }

    openCreateGroupDialog(): void {
        this.openCreateEntityDialog("Group");
    }

    private openCreateEntityDialog(entityLabel: "Workspace" | "Group"): void {
        if (!this.permissionService.canCreateWorkspace()) {
            this.snackBar.open("You do not have permission to create workspaces.", "Close", { duration: 4000 });
            return;
        }

        const currentOrg = this.authService.currentOrganization();
        const isGlobalAdmin = this.permissionService.isGlobalAdmin();
        const defaultOrgId = currentOrg?.organizationId || null;
        const defaultOrgName = currentOrg?.organizationName || null;
        const defaultOrgType = currentOrg?.organizationType || null;
        const defaultMembershipRole = currentOrg?.membershipRole || null;

        const ref = this.dialog.open(M2CreateWorkspaceDialogComponent, {
            width: "620px",
            maxWidth: "95vw",
            autoFocus: false,
            data: {
                entityLabel,
                canSelectOrganization: isGlobalAdmin,
                organizationOptions: this.organizationOptions(),
                defaultOrganizationId: defaultOrgId,
                defaultOrganizationName: defaultOrgName,
                defaultOrganizationType: defaultOrgType,
                defaultMembershipRole: defaultMembershipRole,
            } as M2CreateWorkspaceDialogData,
        });

        ref.afterClosed().subscribe((result?: M2CreateWorkspaceRequest) => {
            if (!result || !result.name?.trim()) {
                return;
            }

            const payload: M2CreateWorkspaceRequest = {
                ...result,
                organizationId: isGlobalAdmin ? result.organizationId : defaultOrgId || undefined,
            };

            if (isGlobalAdmin && !payload.organizationId) {
                this.snackBar.open("Select an organization before creating a workspace.", "Close", { duration: 4000 });
                return;
            }

            this.workspaceService.createWorkspace(payload).subscribe({
                next: () => {
                    this.snackBar.open(`${entityLabel} created successfully`, "Close", { duration: 3000 });
                    this.loadWorkspaces();
                },
                error: (error: HttpErrorResponse) => {
                    const msg = (error?.error?.message || error?.error?.error || error.message || "").toLowerCase();
                    const isQuota = error.status === 403 && (msg.includes("limit") || msg.includes("quota") || msg.includes("plan"));
                    if (isQuota) {
                        this.snackBar.open(
                            `⚠ ${entityLabel} limit reached — your current plan does not allow more ${entityLabel.toLowerCase()}s. Upgrade your plan to create more.`,
                            "Upgrade",
                            { duration: 8000, panelClass: ["snackbar-warn"] }
                        );
                    } else {
                        this.snackBar.open(
                            `Failed to create ${entityLabel.toLowerCase()}: ${error?.error?.message || "Unexpected error"}`,
                            "Close",
                            { duration: 5000 }
                        );
                    }
                },
            });
        });
    }

    isDefaultWorkspace(workspace: WorkspaceViewRow): boolean {
        const slug = workspace.slug.toLowerCase();
        const name = workspace.name.toLowerCase();
        return slug === "default-team" || slug === "default-course" || name === "default team" || name === "default course";
    }

    private loadOrganizationOptions(): void {
        this.authService.fetchOrganizationOptions().subscribe({
            next: (rows) => this.organizationOptions.set(rows),
            error: () => this.organizationOptions.set([]),
        });
    }

    private toViewRow(workspace: M2Workspace): WorkspaceViewRow {
        const createdAt = workspace.createdAt ? new Date(workspace.createdAt) : null;
        return {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            ownerId: workspace.ownerId,
            createdAt: createdAt ? createdAt.toLocaleDateString() : "-",
            organizationName: workspace.organization?.name || "Organization",
            orgType: (workspace.orgType || workspace.organization?.orgType || "ENTERPRISE").toUpperCase(),
            projectCount: null,
        };
    }

    private errorMessage(error: HttpErrorResponse): string {
        return (error?.error?.message || error?.error?.error || error.message || "Request failed");
    }
}
