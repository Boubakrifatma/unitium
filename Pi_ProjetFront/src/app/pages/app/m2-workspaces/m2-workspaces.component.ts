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
import { catchError, forkJoin, of } from "rxjs";
import { AuthService } from "../../../auth/auth.service";
import { OrganizationOption } from "../../../auth/user.model";
import {
    M2CreateWorkspaceRequest,
    M2Workspace,
    M2WorkspaceOverview,
    M2WorkspaceOverviewWorkspaceMetrics,
    M2WorkspaceService,
} from "./m2-workspace.service";
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
    activeProjectCount: number | null;
    completedProjectCount: number | null;
    memberCount: number | null;
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
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

            :host {
                --ws-teal: #0d9488;
                --ws-teal-dark: #0f766e;
                --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                --transition-fast: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .create-shell {
                background: linear-gradient(135deg, #fafafa, #f5f5f5);
                border-radius: 16px;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .workspace-stepper {
                background: transparent;
            }

            .step-card {
                border: 1px solid color-mix(in srgb, #6750a4 10%, #ccc7d0);
                border-radius: 14px;
                padding: 1.2rem;
                background: color-mix(in srgb, #6750a4 3%, #fffbfe);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 1px 4px color-mix(in srgb, #6750a4 10%, transparent);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .step-card:hover {
                border-color: color-mix(in srgb, #6750a4 30%, #ccc7d0);
                box-shadow: 0 4px 16px color-mix(in srgb, #6750a4 16%, transparent);
                background: color-mix(in srgb, #6750a4 4%, #fffbfe);
            }

            .preview-pill {
                border: 1px dashed rgba(13, 148, 136, 0.4);
                border-radius: 12px;
                background: rgba(13, 148, 136, 0.06);
                padding: 0.85rem 1rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.75rem;
                transition: var(--transition-fast);
            }

            .preview-pill:hover {
                border-color: rgba(13, 148, 136, 0.6);
                background: rgba(13, 148, 136, 0.08);
            }

            .org-shell {
                border: 1px solid rgba(15, 54, 74, 0.12);
                border-radius: 12px;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                transition: var(--transition-fast);
            }

            .org-shell:hover {
                border-color: rgba(13, 148, 136, 0.18);
                background: rgba(255, 255, 255, 0.95);
            }

            .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 0;
                border-bottom: 1px dashed rgba(15, 54, 74, 0.12);
                transition: var(--transition-fast);
            }

            .summary-row:hover {
                background: rgba(13, 148, 136, 0.02);
            }

            .summary-row:last-child {
                border-bottom: 0;
            }

            ::ng-deep mat-form-field {
                width: 100%;
            }

            ::ng-deep mat-form-field .mat-mdc-text-field-wrapper {
                padding-bottom: 0.5rem;
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
        <section class="ws-shell">

            <!-- ── Hero Panel ── -->
            <header class="ws-hero reveal">
                <div class="ws-hero__left">
                    <p class="ws-eyebrow">CMP Workspace Manager</p>
                    <h1 class="ws-page-title">My Workspaces</h1>
                    <div class="ws-breadcrumb">
                        <span class="ws-bc-link" routerLink="/app/dashboard">Home</span>
                        <mat-icon class="material-icons-outlined">chevron_right</mat-icon>
                        <span>Workspaces</span>
                    </div>
                    @if (!isLoading() && workspaces().length > 0) {
                    <div class="ws-chips-row">
                        <span class="ws-chip ws-chip--neutral">{{ workspaces().length }} total</span>
                        @if (enterpriseCount() > 0) {
                        <span class="ws-chip ws-chip--teal">{{ enterpriseCount() }} Enterprise</span>
                        }
                        @if (academicCount() > 0) {
                        <span class="ws-chip ws-chip--purple">{{ academicCount() }} Academic</span>
                        }
                        @if (overview()?.workspaces?.remaining !== null && overview()?.workspaces?.remaining !== undefined) {
                        <span class="ws-chip ws-chip--green">{{ overview()?.workspaces?.remaining }} slots free</span>
                        }
                    </div>
                    }
                </div>
                <div class="ws-hero__actions">
                    <mat-form-field appearance="outline" style="width:240px;margin:0;">
                        <mat-label>Search workspace</mat-label>
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" placeholder="Name, slug or org…" />
                    </mat-form-field>
                    <button matIconButton matTooltip="Refresh" (click)="loadWorkspaces()" class="ws-action-btn">
                        <mat-icon class="material-icons-outlined">refresh</mat-icon>
                    </button>
                    <button mat-flat-button type="button" class="ws-primary-btn" [disabled]="!permissionService.canCreateWorkspace()" (click)="openCreateWorkspaceDialog()">
                        <mat-icon class="material-icons-outlined">add</mat-icon> New Workspace
                    </button>
                </div>
            </header>

            <div class="ws-content">
            @if (!isLoading() && overview()) {
            <div class="row gx-3 gx-lg-4 mb-3 mb-lg-4">
                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-xl-0">
                    <mat-card class="metric-card metric-card--workspace h-100">
                        <mat-card-content>
                            <div class="metric-head">
                                <span class="metric-label">Workspace Capacity</span>
                                <mat-icon class="material-icons-outlined">workspaces</mat-icon>
                            </div>
                            <div class="metric-main">
                                <span class="metric-value">{{ overview()?.workspaces?.current ?? workspaces().length }}</span>
                                <span class="metric-den">/{{ overview()?.workspaces?.max ?? '∞' }}</span>
                            </div>
                            <p class="metric-note">{{ overview()?.workspaces?.remaining ?? 0 }} workspace slot{{ (overview()?.workspaces?.remaining ?? 0) !== 1 ? 's' : '' }} available</p>
                            <div class="metric-bar">
                                <div class="metric-bar__fill" [style.width.%]="workspaceCapacityPercent()"></div>
                            </div>
                            <p class="metric-foot">{{ workspaceCapacityPercent() }}% used</p>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-xl-0">
                    <mat-card class="metric-card metric-card--project h-100">
                        <mat-card-content>
                            <div class="metric-head">
                                <span class="metric-label">Active Project Quota</span>
                                <mat-icon class="material-icons-outlined">rocket_launch</mat-icon>
                            </div>
                            <div class="metric-main">
                                <span class="metric-value">{{ overview()?.projects?.currentActiveOrg ?? 0 }}</span>
                                <span class="metric-den">/{{ overview()?.projects?.maxActiveOrg ?? '∞' }}</span>
                            </div>
                            <p class="metric-note">{{ overview()?.projects?.remainingActiveOrg ?? 0 }} active project slot{{ (overview()?.projects?.remainingActiveOrg ?? 0) !== 1 ? 's' : '' }} remaining</p>
                            <div class="metric-bar">
                                <div class="metric-bar__fill metric-bar__fill--project" [style.width.%]="projectCapacityPercent()"></div>
                            </div>
                            <p class="metric-foot">{{ projectCapacityPercent() }}% used organization-wide</p>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-xl-0">
                    <mat-card class="metric-card metric-card--member h-100">
                        <mat-card-content>
                            <div class="metric-head">
                                <span class="metric-label">Member Reach</span>
                                <mat-icon class="material-icons-outlined">groups</mat-icon>
                            </div>
                            <div class="metric-main">
                                <span class="metric-value">{{ overview()?.members?.visibleUnique ?? 0 }}</span>
                                <span class="metric-den">/{{ overview()?.members?.organizationMembers ?? (overview()?.members?.visibleUnique ?? 0) }}</span>
                            </div>
                            <p class="metric-note">{{ overview()?.members?.visibleAssignments ?? 0 }} active seat assignment{{ (overview()?.members?.visibleAssignments ?? 0) !== 1 ? 's' : '' }} across visible workspaces</p>
                            <div class="metric-bar">
                                <div class="metric-bar__fill metric-bar__fill--member" [style.width.%]="memberCoveragePercent()"></div>
                            </div>
                            <p class="metric-foot">Per-workspace member cap: {{ overview()?.members?.maxPerWorkspace ?? 'N/A' }}</p>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-12 col-md-6 col-xl-3 mb-3 mb-xl-0">
                    <mat-card class="metric-card metric-card--portfolio h-100">
                        <mat-card-content>
                            <div class="metric-head">
                                <span class="metric-label">Portfolio Delivery</span>
                                <mat-icon class="material-icons-outlined">insights</mat-icon>
                            </div>
                            <div class="metric-main">
                                <span class="metric-value">{{ overview()?.projects?.visibleCompleted ?? 0 }}</span>
                                <span class="metric-den">/{{ overview()?.projects?.visibleTotal ?? 0 }}</span>
                            </div>
                            <p class="metric-note">{{ overview()?.projects?.visibleActive ?? 0 }} active · {{ overview()?.projects?.visibleOnHold ?? 0 }} on hold · {{ overview()?.projects?.visibleOther ?? 0 }} other</p>
                            <div class="metric-bar metric-bar--stacked">
                                <div class="metric-bar__fill metric-bar__fill--project" [style.width.%]="stackedWidth(overview()?.projects?.visibleActive, overview()?.projects?.visibleTotal)"></div>
                                <div class="metric-bar__fill metric-bar__fill--done" [style.width.%]="stackedWidth(overview()?.projects?.visibleCompleted, overview()?.projects?.visibleTotal)"></div>
                                <div class="metric-bar__fill metric-bar__fill--hold" [style.width.%]="stackedWidth(overview()?.projects?.visibleOnHold, overview()?.projects?.visibleTotal)"></div>
                                <div class="metric-bar__fill metric-bar__fill--other" [style.width.%]="stackedWidth(overview()?.projects?.visibleOther, overview()?.projects?.visibleTotal)"></div>
                            </div>
                            <p class="metric-foot">{{ completionPercent() }}% completed across visible workspaces</p>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>
            }

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

                            <div class="ws-stats-grid mb-2">
                                <div class="ws-stat-box">
                                    <span class="ws-stat-label">Projects</span>
                                    <strong class="ws-stat-value">{{ metricValue(workspace.projectCount) }}</strong>
                                </div>
                                <div class="ws-stat-box">
                                    <span class="ws-stat-label">Active</span>
                                    <strong class="ws-stat-value">{{ metricValue(workspace.activeProjectCount) }}</strong>
                                </div>
                                <div class="ws-stat-box">
                                    <span class="ws-stat-label">Completed</span>
                                    <strong class="ws-stat-value">{{ metricValue(workspace.completedProjectCount) }}</strong>
                                </div>
                                <div class="ws-stat-box">
                                    <span class="ws-stat-label">Members</span>
                                    <strong class="ws-stat-value">{{ metricValue(workspace.memberCount) }}</strong>
                                </div>
                            </div>

                            <div class="ws-health mb-2">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="ws-health__label">Delivery Progress</span>
                                    <span class="ws-health__pct">{{ workspaceCompletionPercent(workspace) }}%</span>
                                </div>
                                <div class="ws-health__bar">
                                    <div class="ws-health__fill" [style.width.%]="workspaceCompletionPercent(workspace)"></div>
                                </div>
                            </div>

                            <div class="ws-card__footer d-flex align-items-center gap-2">
                                <mat-icon class="material-icons-outlined text-secondary" style="font-size:14px;width:14px;height:14px;">schedule</mat-icon>
                                <span class="text-secondary" style="font-size:12px;">Created {{ workspace.createdAt }}</span>
                                <span class="ws-open-pill ms-auto">Open Workspace</span>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
                }
            </div>
            }
            </div>
        </section>
    `,
    styles: [`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

        :host {
            --primary-indigo: #667eea;
            --primary-purple: #764ba2;
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --success-teal: #10b981;
            --success-dark: #059669;
            --warning-amber: #f59e0b;
            --warning-dark: #d97706;
            --error-red: #dc2626;
            --error-dark: #ef4444;
            --info-cyan: #0ea5e9;
            --info-dark: #0369a1;
            --bg-light: #fafbfc;
            --bg-white: white;
            --border-color: #e5e7eb;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;

            display: block;
            font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
            color: var(--text-primary);
            background: linear-gradient(135deg, var(--bg-light), #f3f4f6);
        }

        /* ── Page Shell ── */
        .ws-shell {
            position: relative;
            padding: 2rem;
            background: var(--bg-light);
            border-radius: 0;
            overflow: hidden;
            min-height: 100%;
        }
        .ws-shell::before {
            content: ""; position: absolute;
            inset: -40% -20% auto auto;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.08), transparent 68%);
            pointer-events: none;
        }
        .ws-shell::after {
            content: ""; position: absolute;
            inset: auto auto -160px -100px;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(245, 158, 11, 0.06), transparent 70%);
            pointer-events: none;
        }

        /* ── Hero Panel ── */
        .ws-hero {
            position: relative; z-index: 1;
            border: none;
            border-radius: 16px;
            padding: 3rem 2rem;
            background: var(--primary-gradient);
            box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            flex-wrap: wrap;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
        }
        .ws-hero::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent 70%);
            pointer-events: none;
        }
        .ws-eyebrow {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 0.4rem;
            font-weight: 700;
            position: relative;
            z-index: 2;
        }
        .ws-page-title {
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            font-size: 2.2rem;
            margin: 0;
            color: white;
            font-weight: 700;
            letter-spacing: -0.5px;
            line-height: 1.2;
            position: relative;
            z-index: 2;
        }
        .ws-breadcrumb {
            display: flex; align-items: center; gap: 0.3rem;
            margin: 0.5rem 0 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.7);
            position: relative;
            z-index: 2;
        }
        .ws-bc-link { color: rgba(255, 255, 255, 0.95); cursor: pointer; text-decoration: none; }
        .ws-breadcrumb mat-icon { font-size: 16px; width: 16px; height: 16px; }
        .ws-chips-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; position: relative; z-index: 2; }
        .ws-chip {
            font-size: 0.7rem;
            font-weight: 600;
            padding: 0.3rem 0.8rem;
            border-radius: 999px;
            border: 1px solid transparent;
        }
        .ws-chip--neutral { background: rgba(255,255,255,0.15); color: white; border-color: rgba(255,255,255,0.3); }
        .ws-chip--teal { background: rgba(16, 185, 129, 0.2); color: white; border-color: rgba(16, 185, 129, 0.4); }
        .ws-chip--purple { background: rgba(168, 85, 247, 0.2); color: white; border-color: rgba(168, 85, 247, 0.4); }
        .ws-chip--green { background: rgba(16, 185, 129, 0.2); color: white; border-color: rgba(16, 185, 129, 0.4); }
        .ws-hero__actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; position: relative; z-index: 2; }
        .ws-action-btn {
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 999px !important;
            background: rgba(255,255,255,0.15) !important;
            color: white !important;
        }
        .ws-action-btn:hover {
            background: rgba(255,255,255,0.25) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        .ws-primary-btn {
            background: white !important;
            color: var(--primary-indigo) !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
            font-size: 0.85rem !important;
            padding: 0.6rem 1.4rem !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .ws-primary-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
        }
        .ws-primary-btn:active {
            transform: translateY(0) !important;
        }

        /* ── Content ── */
        .ws-content { position: relative; z-index: 1; }

        /* ── Metric Cards ── */
            .metric-card {
                border-radius: 16px;
                border: 1px solid var(--border-color);
                overflow: hidden;
                background: var(--bg-white);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            .metric-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
                border-color: var(--primary-indigo);
                background: var(--bg-white);
            }
            .metric-card mat-card-content {
                padding: 1.5rem;
            }
            .metric-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.8rem;
            }
            .metric-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: var(--text-muted);
                font-weight: 700;
            }
            .metric-head mat-icon {
                font-size: 24px;
                width: 24px;
                height: 24px;
                color: var(--primary-indigo);
                opacity: 0.7;
            }
            .metric-main {
                display: flex;
                align-items: baseline;
                gap: 0.5rem;
                line-height: 1;
                margin-bottom: 0.8rem;
            }
            .metric-value {
                font-size: 2rem;
                font-weight: 800;
                color: var(--text-primary);
                font-family: "Space Grotesk", sans-serif;
            }
            .metric-den {
                font-size: 1rem;
                color: var(--text-secondary);
                font-weight: 600;
            }
            .metric-note {
                margin: 0 0 0.8rem;
                font-size: 0.85rem;
                color: var(--text-secondary);
                min-height: 2rem;
                line-height: 1.4;
            }
            .metric-bar {
                height: 6px;
                border-radius: 999px;
                background: var(--border-color);
                overflow: hidden;
                display: flex;
            }
            .metric-bar--stacked { gap: 1px; }
            .metric-bar__fill {
                height: 100%;
                background: var(--primary-gradient);
                min-width: 0;
                transition: width 280ms ease;
            }
            .metric-bar__fill--project { background: linear-gradient(90deg, var(--success-teal), var(--success-dark)); }
            .metric-bar__fill--member  { background: linear-gradient(90deg, var(--primary-indigo), var(--primary-purple)); }
            .metric-bar__fill--done    { background: linear-gradient(90deg, var(--success-teal), var(--success-dark)); }
            .metric-bar__fill--hold    { background: linear-gradient(90deg, var(--warning-amber), var(--warning-dark)); }
            .metric-bar__fill--other   { background: linear-gradient(90deg, var(--text-secondary), var(--text-muted)); }
            .metric-foot {
                margin: 0.5rem 0 0;
                font-size: 0.8rem;
                color: var(--text-secondary);
                font-weight: 500;
            }

            .ws-card {
                border: 1px solid var(--border-color);
                border-radius: 12px;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                cursor: pointer;
                overflow: hidden;
                position: relative;
                background: var(--bg-white);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            .ws-card:hover {
                border-color: var(--primary-indigo);
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
                transform: translateY(-3px);
                background: var(--bg-white);
            }
            .ws-card:hover .ws-open-arrow {
                opacity: 1;
                color: var(--primary-indigo);
                transform: translateX(2px);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .ws-card--disabled { opacity: 0.5; cursor: not-allowed; }
            .ws-card--disabled:hover {
                transform: none;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                border-color: var(--border-color);
                background: var(--bg-white);
            }
            .ws-card__accent {
                height: 3px;
                background: linear-gradient(90deg, var(--success-teal), var(--success-dark));
            }
            .ws-card__accent--academic {
                background: linear-gradient(90deg, var(--primary-indigo), var(--primary-purple));
            }
            .ws-card__footer {
                border-top: 1px solid var(--border-color);
                padding-top: 0.8rem;
                margin-top: 0.8rem;
            }
            .ws-stats-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.8rem;
            }
            .ws-stat-box {
                border: 1px solid var(--border-color);
                border-radius: 12px;
                background: #fafbfc;
                padding: 0.8rem;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: space-between;
                gap: 0.4rem;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            }
            .ws-stat-box:hover {
                border-color: var(--primary-indigo);
                background: var(--bg-white);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.08);
            }
            .ws-stat-label {
                font-size: 0.75rem;
                color: var(--text-secondary);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .ws-stat-value {
                font-size: 1.25rem;
                color: var(--text-primary);
                font-weight: 700;
                font-family: "Space Grotesk", sans-serif;
            }
            .ws-health__label {
                font-size: 0.75rem;
                color: var(--text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.15em;
                font-weight: 600;
            }
            .ws-health__pct {
                font-size: 0.85rem;
                color: var(--primary-indigo);
                font-weight: 700;
            }
            .ws-health__bar {
                height: 6px;
                border-radius: 999px;
                background: var(--border-color);
                overflow: hidden;
            }
            .ws-health__fill {
                height: 100%;
                background: linear-gradient(90deg, var(--success-teal), var(--success-dark));
                transition: width 280ms ease;
            }
            .ws-open-pill {
                border: 1px solid rgba(102, 126, 234, 0.3);
                color: var(--primary-indigo);
                background: rgba(102, 126, 234, 0.1);
                border-radius: 999px;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 0.25rem 0.6rem;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .ws-card:hover .ws-open-pill {
                background: rgba(102, 126, 234, 0.15);
                border-color: var(--primary-indigo);
            }
            .ws-avatar {
                width: 40px; height: 40px; border-radius: 10px;
                background: var(--primary-gradient); color: white;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px; font-weight: 700; flex-shrink: 0;
            }
            .ws-avatar--academic { background: linear-gradient(135deg, var(--primary-indigo), var(--primary-purple)); color: white; }
            .ws-open-arrow {
                font-size: 18px; width: 18px; height: 18px;
                opacity: 0.22; transition: all 0.22s; flex-shrink: 0;
            }
            .ws-skeleton {
                border-radius: 12px;
                animation: pulse 1.5s ease-in-out infinite;
                background: linear-gradient(90deg, var(--bg-light), #f0f1f3, var(--bg-light));
                background-size: 200% 100%;
            }
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* ── Animations ── */
        .reveal { animation: rise-in 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes rise-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
        @media (max-width: 768px) {
            .ws-hero { flex-direction: column; align-items: stretch; gap: 1.5rem; }
            .ws-hero__actions { width: 100%; flex-direction: column; }
            .ws-shell::before { width: 300px; height: 300px; }
            .ws-shell::after { width: 250px; height: 250px; }
        }
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
    readonly overview = signal<M2WorkspaceOverview | null>(null);

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
    readonly workspaceCapacityPercent = computed(() =>
        this.percent(this.overview()?.workspaces?.current, this.overview()?.workspaces?.max)
    );
    readonly projectCapacityPercent = computed(() =>
        this.percent(this.overview()?.projects?.currentActiveOrg, this.overview()?.projects?.maxActiveOrg)
    );
    readonly memberCoveragePercent = computed(() =>
        this.percent(this.overview()?.members?.visibleUnique, this.overview()?.members?.organizationMembers)
    );
    readonly completionPercent = computed(() =>
        this.percent(this.overview()?.projects?.visibleCompleted, this.overview()?.projects?.visibleTotal)
    );

    ngOnInit(): void {
        this.loadOrganizationOptions();
        this.loadWorkspaces();
    }

    loadWorkspaces(): void {
        this.isLoading.set(true);
        this.lastError.set(null);
        forkJoin({
            workspaces: this.workspaceService.getWorkspaces(),
            overview: this.workspaceService.getWorkspaceOverview().pipe(catchError(() => of(null))),
        }).subscribe({
            next: ({ workspaces, overview }) => {
                const metricsByWorkspace = this.indexWorkspaceMetrics(overview);
                this.overview.set(overview);
                this.workspaces.set(workspaces.map((row) => this.toViewRow(row, metricsByWorkspace.get(row.id))));
                this.isLoading.set(false);

                // Resilience fallback for deployments without the overview endpoint.
                if (!overview) {
                    this.loadProjectCounts(workspaces.map((w) => w.id));
                }
            },
            error: (error: HttpErrorResponse) => {
                this.overview.set(null);
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
                    } else if (error.status === 409) {
                        this.snackBar.open(
                            error?.error?.message || `A ${entityLabel.toLowerCase()} with this name already exists in your organization`,
                            "Close",
                            { duration: 5000 }
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

    private toViewRow(workspace: M2Workspace, metrics?: M2WorkspaceOverviewWorkspaceMetrics): WorkspaceViewRow {
        const createdAt = workspace.createdAt ? new Date(workspace.createdAt) : null;
        return {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            ownerId: workspace.ownerId,
            createdAt: createdAt ? createdAt.toLocaleDateString() : "-",
            organizationName: workspace.organization?.name || "Organization",
            orgType: (workspace.orgType || workspace.organization?.orgType || "ENTERPRISE").toUpperCase(),
            projectCount: metrics?.projectCount ?? null,
            activeProjectCount: metrics?.activeProjects ?? null,
            completedProjectCount: metrics?.completedProjects ?? null,
            memberCount: metrics?.memberCount ?? null,
        };
    }

    private indexWorkspaceMetrics(overview: M2WorkspaceOverview | null): Map<string, M2WorkspaceOverviewWorkspaceMetrics> {
        const index = new Map<string, M2WorkspaceOverviewWorkspaceMetrics>();
        if (!overview?.byWorkspace?.length) {
            return index;
        }

        for (const row of overview.byWorkspace) {
            if (!row?.workspaceId) continue;
            index.set(row.workspaceId, row);
        }
        return index;
    }

    workspaceCompletionPercent(workspace: WorkspaceViewRow): number {
        return this.percent(workspace.completedProjectCount, workspace.projectCount);
    }

    metricValue(value: number | null | undefined): string {
        return value === null || value === undefined ? "-" : String(value);
    }

    stackedWidth(value: number | null | undefined, total: number | null | undefined): number {
        return this.percent(value, total);
    }

    private percent(value: number | null | undefined, total: number | null | undefined): number {
        const safeValue = Number(value ?? 0);
        const safeTotal = Number(total ?? 0);
        if (!Number.isFinite(safeValue) || !Number.isFinite(safeTotal) || safeTotal <= 0) {
            return 0;
        }
        const raw = Math.round((safeValue / safeTotal) * 100);
        return Math.max(0, Math.min(100, raw));
    }

    private errorMessage(error: HttpErrorResponse): string {
        return (error?.error?.message || error?.error?.error || error.message || "Request failed");
    }
}
