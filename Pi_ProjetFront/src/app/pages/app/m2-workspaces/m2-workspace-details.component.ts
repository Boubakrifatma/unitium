import { CommonModule } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTabChangeEvent, MatTabsModule } from "@angular/material/tabs";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDatepickerModule, MatDatepickerInputEvent } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { combineLatest, forkJoin, of } from "rxjs";
import { catchError, distinctUntilChanged, map, take } from "rxjs/operators";
import { AuthService } from "../../../auth/auth.service";
import { CreateProjectWorkflowDialogComponent, CreateProjectWorkflowDialogResult } from "../m2-projects/create-project-workflow-dialog.component";
import { CreateWithAiComponent, CreateWithAiDialogResult } from "../m2-projects/create-with-ai.component";
import { ProjectPermissionService } from "../m2-projects/project-permission.service";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "../m2-templates/use-template-wizard-dialog.component";
import { M2ProjectService } from "../m2-projects/m2-project.service";
import { InviteMemberModalComponent } from "./invite-member-modal.component";
import { MemberRoleEditDialogComponent, MemberRoleEditDialogResult } from "./member-role-edit-dialog.component";
import { MemberUnassignDialogComponent, MemberUnassignDialogResult } from "./member-unassign-dialog.component";
import { WorkspaceMember, WorkspaceMemberCapacity } from "./models/workspace-member.model";
import { M2ProjectSummary, M2TimelineCheckpoint, M2Workspace, M2WorkspaceCapacity, M2WorkspaceProjectCapacity, M2WorkspaceService, M2WorkspaceSnapshot } from "./m2-workspace.service";
import { WorkspaceMemberService } from "./services/workspace-member.service";
import { WorkspaceDeleteConfirmDialogComponent, WorkspaceDeleteConfirmDialogResult } from "./workspace-delete-confirm-dialog.component";
import { WorkspaceEditDialogComponent, WorkspaceEditDialogResult } from "./workspace-edit-dialog.component";
import { WorkspaceMemberCardComponent } from "./workspace-member-card.component";
import { WorkspacePermissionService } from "./workspace-permission.service";
import { IntegrationsComingSoonDialogComponent } from "./integrations-coming-soon-dialog.component";
import { WorkspaceTransferOwnerDialogComponent, WorkspaceTransferOwnerDialogResult } from "./workspace-transfer-owner-dialog.component";
import { SkeletonCardComponent } from "../../../components/skeleton-card.component";
import { ExportService } from "./export.service";

interface WorkspaceActivity {
    id: string;
    icon: string;
    user: string;
    action: string;
    target: string;
    timestamp: number;
}

@Component({
    selector: "app-m2-workspace-details",
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        FormsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressBarModule,
        MatTabsModule,
        MatSnackBarModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        WorkspaceMemberCardComponent,
        SkeletonCardComponent,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1 order-lg-1">
                        <h3 class="mb-1">Workspace: {{ workspace()?.name || "Details" }}</h3>
                        <p class="small mb-0">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            <span routerLink="/app/workspaces" class="me-2 text-theme style-none">Workspaces</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Workspace Details
                        </p>
                    </div>

                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0 d-flex align-items-center">
                        <mat-form-field appearance="outline" style="width:220px;margin-right:8px;">
                            <input matInput [matDatepicker]="asOfPicker" placeholder="View as of" [value]="historicalAsDate()" (dateChange)="onDateSelected($event)" [min]="pickerMinDate()" [max]="pickerMaxDate()" [matDatepickerFilter]="dateFilter">
                            <mat-datepicker-toggle matSuffix [for]="asOfPicker"></mat-datepicker-toggle>
                            <mat-datepicker #asOfPicker></mat-datepicker>
                        </mat-form-field>
                        <button matButton (click)="backToWorkspaces()"><mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back</button>
                        <button matButton class="ms-1" (click)="refresh()"><mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh</button>
                        @if (canEditWorkspace()) {
                        <button matButton="filled" class="ms-1" (click)="openEditWorkspaceDialog()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                        <button matButton class="ms-1" [disabled]="exporting()" (click)="exportPdf()">
                            <mat-icon class="material-icons-outlined">download</mat-icon>
                            {{ exporting() ? 'Exporting...' : 'Export PDF' }}
                        </button>
                        }
                    </div>
                </div>
            </mat-card>
        </div>

        @if (historicalMode()) {
        <div class="container fade-in mb-3">
            <mat-card class="mb-3" style="background:#fff7ed;border-left:4px solid #f59e0b;">
                <mat-card-content>
                    <div class="d-flex align-items-center">
                        <mat-icon style="color:#b45309">history_toggle_off</mat-icon>
                        <div style="margin-left:12px">
                            <div style="font-weight:600">Viewing workspace as of {{ historicalDisplay() }}</div>
                            <div class="small text-secondary">Read-only historical mode</div>
                        </div>
                        <div style="margin-left:auto">
                            <button matButton class="me-1" (click)="goToRealProjects()">Open Projects</button>
                            <button matButton (click)="clearHistorical()">Exit</button>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        }

        @if (timelineQuickDates().length > 0) {
        <div class="container fade-in mb-3">
            <mat-card class="mb-3" style="background:#eff6ff;border-left:4px solid #2563eb;">
                <mat-card-content>
                    <div class="d-flex align-items-start align-items-lg-center gap-2 flex-column flex-lg-row">
                        <div class="d-flex align-items-center">
                            <mat-icon style="color:#1d4ed8">event_available</mat-icon>
                            <div style="margin-left:12px">
                                <div style="font-weight:600">Time Machine checkpoints</div>
                                <div class="small text-secondary">Pick a date with meaningful member or project changes.</div>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-1 ms-lg-auto">
                            @for (checkpoint of timelineQuickDates(); track checkpoint.at + '-' + $index) {
                                <button
                                    matButton
                                    class="badge-light"
                                    [matTooltip]="checkpoint.label || checkpoint.kind || checkpoint.at"
                                    (click)="jumpToTimelineDate(checkpoint.at)">
                                    {{ checkpoint.at | date:'yyyy-MM-dd' }}
                                </button>
                            }
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
                    <p class="mb-0">Loading workspace details...</p>
                </mat-card-content>
            </mat-card>
            }

            @if (error()) {
            <mat-card class="mb-3 mb-lg-4 border theme-red">
                <mat-card-content>
                    <div class="d-flex align-items-start">
                        <mat-icon class="material-icons-outlined me-2 theme-red">error</mat-icon>
                        <div>
                            <p class="fw-medium mb-1">Workspace details error</p>
                            <p class="small mb-0">{{ error() }}</p>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
            }

            @if (workspace()) {
            <div class="row gx-3 gx-lg-4 mb-3">
                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ totalMembers() }}</h1>
                            <p class="small text-secondary">Members</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">In Org:</p></div>
                                <div class="col"><h3>{{ organizationMembers() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ totalProjects() }}</h1>
                            <p class="small text-secondary">Projects</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Active:</p></div>
                                <div class="col"><h3>{{ activeProjects() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ completionPercent() }}%</h1>
                            <p class="small text-secondary">Completion</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Completed:</p></div>
                                <div class="col"><h3>{{ completedProjects() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>

                <div class="col-6 col-md-3 col-xl">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <h1 class="mb-1">{{ workspaceTypeLabel() }}</h1>
                            <p class="small text-secondary">Workspace Type</p>
                            <br />
                            <div class="row gx-3 align-items-center mb-3">
                                <div class="col-6"><p class="text-secondary">Created:</p></div>
                                <div class="col"><h3>{{ createdDateLabel() }}</h3></div>
                            </div>
                        </mat-card-content>
                    </mat-card>
                </div>
            </div>

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="p-0">
                    <mat-tab-group animationDuration="300ms" (selectedTabChange)="onTabChange($event)">
                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">overview</mat-icon>
                                Overview
                            </ng-template>

                            <div class="p-3">
                                <div class="ov-grid">

                                    <!-- ── IDENTITY CARD ────────────────────────────── -->
                                    <div class="ov-identity">
                                        <mat-card class="h-100">
                                            <div class="ov-id-banner">
                                                <mat-icon class="material-icons-outlined ov-id-icon">workspaces</mat-icon>
                                                @if (isDefaultWorkspace()) {
                                                    <span class="ov-default-chip">Default</span>
                                                }
                                            </div>
                                            <mat-card-content class="px-3 pb-3 pt-2">
                                                <h4 class="mb-0 fw-semibold">{{ workspace()?.name }}</h4>
                                                <p class="text-secondary mb-2" style="font-size:12px">{{ workspace()?.organization?.name || 'Organization' }}</p>

                                                <div class="d-flex flex-wrap gap-1 mb-3">
                                                    <span class="ov-badge" [ngClass]="workspaceTypeBadgeClass()">{{ workspaceTypeLabel() }}</span>
                                                    <span class="ov-badge badge-light">{{ currentWorkspaceRoleLabel() }}</span>
                                                    <span class="ov-badge" [ngClass]="canManageWorkspace() ? 'theme-green' : 'theme-orange'">
                                                        <mat-icon style="font-size:11px;width:11px;height:11px;vertical-align:middle">{{ canManageWorkspace() ? 'lock_open' : 'lock' }}</mat-icon>
                                                        {{ canManageWorkspace() ? 'Full Access' : 'Read Only' }}
                                                    </span>
                                                </div>

                                                <div class="ov-meta-list">
                                                    <div class="ov-meta-row">
                                                        <mat-icon class="ov-meta-icon">tag</mat-icon>
                                                        <span class="ov-meta-val">{{ workspace()?.slug }}</span>
                                                    </div>
                                                    <div class="ov-meta-row">
                                                        <mat-icon class="ov-meta-icon">person</mat-icon>
                                                        <span class="ov-meta-val">{{ ownerDisplayName() }}</span>
                                                    </div>
                                                    <div class="ov-meta-row">
                                                        <mat-icon class="ov-meta-icon">calendar_today</mat-icon>
                                                        <span class="ov-meta-val">{{ createdDateLabel() }}</span>
                                                    </div>
                                                    <div class="ov-meta-row">
                                                        <mat-icon class="ov-meta-icon">category</mat-icon>
                                                        <span class="ov-meta-val">{{ workspaceTypeLabel() }}</span>
                                                    </div>
                                                </div>

                                                <div class="ov-health-section">
                                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                                        <span style="font-size:11px;font-weight:600;color:var(--text-color-secondary)">DELIVERY HEALTH</span>
                                                        <span style="font-size:13px;font-weight:700;" [style.color]="ovHealthColor()">{{ completionPercent() }}%</span>
                                                    </div>
                                                    <div class="ov-health-track">
                                                        <div class="ov-health-fill" [style.width]="completionPercent() + '%'" [style.background]="ovHealthColor()"></div>
                                                    </div>
                                                    <p style="font-size:11px;color:var(--text-color-secondary);margin:4px 0 0">{{ completedProjects() }} of {{ totalProjects() }} projects completed</p>
                                                </div>

                                                <button matButton class="ov-pulse-btn w-100 mt-3" (click)="navigateToWarRoom()">
                                                    <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px">dashboard</mat-icon>
                                                    Open Workspace Pulse
                                                </button>
                                            </mat-card-content>
                                        </mat-card>
                                    </div>

                                    <!-- ── METRICS PANEL ────────────────────────────── -->
                                    <div class="ov-metrics">

                                        <!-- KPI strip -->
                                        <mat-card class="ov-kpi-card mb-3">
                                            <mat-card-content class="py-0 px-3">
                                                <div class="ov-kpi-strip">
                                                    <div class="ov-kpi" matTooltip="Total projects in this workspace" matTooltipPosition="above">
                                                        <mat-icon class="ov-kpi-icon" style="color:#3B82F6">folder_open</mat-icon>
                                                        <span class="ov-kpi-num">{{ totalProjects() }}</span>
                                                        <span class="ov-kpi-lbl">Projects</span>
                                                        <span class="ov-kpi-sub">{{ activeProjects() }} active · {{ completedProjects() }} done</span>
                                                    </div>
                                                    <div class="ov-kpi-sep"></div>
                                                    <div class="ov-kpi" matTooltip="% of projects in ACTIVE or COMPLETED status" matTooltipPosition="above">
                                                        <mat-icon class="ov-kpi-icon" style="color:#1D9E75">trending_up</mat-icon>
                                                        <span class="ov-kpi-num">{{ completionPercent() }}<span class="ov-kpi-unit">%</span></span>
                                                        <span class="ov-kpi-lbl">On Track</span>
                                                        <span class="ov-kpi-sub">{{ completedProjects() }} completed</span>
                                                    </div>
                                                    <div class="ov-kpi-sep"></div>
                                                    <div class="ov-kpi" matTooltip="Members assigned to this workspace" matTooltipPosition="above">
                                                        <mat-icon class="ov-kpi-icon" style="color:#7F77DD">group</mat-icon>
                                                        <span class="ov-kpi-num">{{ totalMembers() }}</span>
                                                        <span class="ov-kpi-lbl">Members</span>
                                                        <span class="ov-kpi-sub">{{ leadershipCount() }} leads · {{ contributorCount() }} contrib.</span>
                                                    </div>
                                                    <div class="ov-kpi-sep"></div>
                                                    <div class="ov-kpi" matTooltip="Members who joined in the last 7 days" matTooltipPosition="above">
                                                        <mat-icon class="ov-kpi-icon" style="color:#EF9F27">person_add</mat-icon>
                                                        <span class="ov-kpi-num">{{ joinedLast7DaysCount() }}</span>
                                                        <span class="ov-kpi-lbl">New This Week</span>
                                                        <span class="ov-kpi-sub">{{ organizationMembersOutsideWorkspace() }} in org not here</span>
                                                    </div>
                                                </div>
                                            </mat-card-content>
                                        </mat-card>

                                        <!-- Capacity gauges -->
                                        <div class="row gx-3 mb-3">
                                            <div class="col-12 col-md-6">
                                                <mat-card class="h-100 ov-cap-card">
                                                    <mat-card-content class="p-3">
                                                        <div class="ov-cap-header mb-3">
                                                            <span class="ov-cap-title">Active Projects Capacity</span>
                                                            <span class="ov-status-pill" [class]="ovCapClass(projectCapacityPercentage())">{{ ovCapLabel(projectCapacityPercentage()) }}</span>
                                                        </div>
                                                        <div class="d-flex align-items-center gap-3">
                                                            <div class="ov-ring-wrap" matTooltip="{{ projectCapacityPercentage() }}% of active project slots used" matTooltipPosition="above">
                                                                <svg viewBox="0 0 80 80" width="76" height="76">
                                                                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--surface-border,#e2e8f0)" stroke-width="9"/>
                                                                    <circle cx="40" cy="40" r="30" fill="none"
                                                                        [attr.stroke]="ovCapColor(projectCapacityPercentage())"
                                                                        stroke-width="9" stroke-linecap="round"
                                                                        [attr.stroke-dasharray]="ovCapArc(projectCapacityPercentage())"
                                                                        transform="rotate(-90 40 40)"
                                                                        style="transition:stroke-dasharray .6s ease"/>
                                                                </svg>
                                                                <div class="ov-ring-center">
                                                                    <span class="ov-ring-num" [style.color]="ovCapColor(projectCapacityPercentage())">{{ projectCapacity()?.currentActiveProjects ?? 0 }}</span>
                                                                    <span class="ov-ring-den">/{{ projectCapacity()?.maxActiveProjects ?? '∞' }}</span>
                                                                </div>
                                                            </div>
                                                            <div style="flex:1;min-width:0">
                                                                <div class="ov-cap-bar-wrap">
                                                                    <div class="ov-cap-bar">
                                                                        <div class="ov-cap-fill"
                                                                             [style.width]="projectCapacityPercentage() + '%'"
                                                                             [style.background]="ovCapColor(projectCapacityPercentage())"></div>
                                                                    </div>
                                                                    <span class="ov-cap-pct" [style.color]="ovCapColor(projectCapacityPercentage())">{{ projectCapacityPercentage() }}%</span>
                                                                </div>
                                                                <div class="ov-cap-detail">
                                                                    <span>{{ projectCapacity()?.currentActiveProjects ?? 0 }} used · {{ (projectCapacity()?.maxActiveProjects ?? 0) - (projectCapacity()?.currentActiveProjects ?? 0) }} free</span>
                                                                    <span class="ov-plan-badge">{{ projectCapacity()?.planName ?? 'Plan' }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                            <div class="col-12 col-md-6">
                                                <mat-card class="h-100 ov-cap-card">
                                                    <mat-card-content class="p-3">
                                                        <div class="ov-cap-header mb-3">
                                                            <span class="ov-cap-title">Team Seat Capacity</span>
                                                            <span class="ov-status-pill" [class]="ovCapClass(capacityPercentage())">{{ ovCapLabel(capacityPercentage()) }}</span>
                                                        </div>
                                                        <div class="d-flex align-items-center gap-3">
                                                            <div class="ov-ring-wrap" matTooltip="{{ capacityPercentage() }}% of team seats used" matTooltipPosition="above">
                                                                <svg viewBox="0 0 80 80" width="76" height="76">
                                                                    <circle cx="40" cy="40" r="30" fill="none" stroke="var(--surface-border,#e2e8f0)" stroke-width="9"/>
                                                                    <circle cx="40" cy="40" r="30" fill="none"
                                                                        [attr.stroke]="ovCapColor(capacityPercentage())"
                                                                        stroke-width="9" stroke-linecap="round"
                                                                        [attr.stroke-dasharray]="ovCapArc(capacityPercentage())"
                                                                        transform="rotate(-90 40 40)"
                                                                        style="transition:stroke-dasharray .6s ease"/>
                                                                </svg>
                                                                <div class="ov-ring-center">
                                                                    <span class="ov-ring-num" [style.color]="ovCapColor(capacityPercentage())">{{ memberCapacity()?.currentMembers ?? 0 }}</span>
                                                                    <span class="ov-ring-den">/{{ memberCapacity()?.maxMembers ?? '∞' }}</span>
                                                                </div>
                                                            </div>
                                                            <div style="flex:1;min-width:0">
                                                                <div class="ov-cap-bar-wrap">
                                                                    <div class="ov-cap-bar">
                                                                        <div class="ov-cap-fill"
                                                                             [style.width]="capacityPercentage() + '%'"
                                                                             [style.background]="ovCapColor(capacityPercentage())"></div>
                                                                    </div>
                                                                    <span class="ov-cap-pct" [style.color]="ovCapColor(capacityPercentage())">{{ capacityPercentage() }}%</span>
                                                                </div>
                                                                <div class="ov-cap-detail">
                                                                    <span>{{ memberCapacity()?.currentMembers ?? 0 }} used · {{ memberCapacity()?.remainingMembers ?? 0 }} available</span>
                                                                    <span class="ov-plan-badge">{{ memberCapacity()?.planName ?? 'Plan' }}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                        </div>

                                        <!-- Breakdown row -->
                                        <div class="row gx-3">
                                            <div class="col-12 col-md-4 mb-3 mb-md-0">
                                                <mat-card class="h-100">
                                                    <mat-card-content class="p-3">
                                                        <div class="ov-breakdown-title">
                                                            <mat-icon class="ov-breakdown-icon">donut_small</mat-icon>
                                                            Project Status
                                                        </div>
                                                        <div class="ov-mix-bar">
                                                            @if (totalProjects() > 0) {
                                                                <div class="ov-mix-seg" [style.flex]="activeProjects()" style="background:#1D9E75" [matTooltip]="activeProjects() + ' Active'" matTooltipPosition="above"></div>
                                                                <div class="ov-mix-seg" [style.flex]="completedProjects()" style="background:#3B82F6" [matTooltip]="completedProjects() + ' Completed'" matTooltipPosition="above"></div>
                                                                <div class="ov-mix-seg" [style.flex]="ovPausedProjects()" style="background:#EF9F27" [matTooltip]="ovPausedProjects() + ' On Hold'" matTooltipPosition="above"></div>
                                                                <div class="ov-mix-seg" [style.flex]="ovOtherProjects()" style="background:#94a3b8" [matTooltip]="ovOtherProjects() + ' Other'" matTooltipPosition="above"></div>
                                                            } @else {
                                                                <div class="ov-mix-seg" style="flex:1;background:var(--surface-border)"></div>
                                                            }
                                                        </div>
                                                        <div class="ov-legend">
                                                            <div class="ov-legend-item"><span style="background:#1D9E75"></span>Active ({{ activeProjects() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#3B82F6"></span>Completed ({{ completedProjects() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#EF9F27"></span>On Hold ({{ ovPausedProjects() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#94a3b8"></span>Other ({{ ovOtherProjects() }})</div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                            <div class="col-12 col-md-4 mb-3 mb-md-0">
                                                <mat-card class="h-100">
                                                    <mat-card-content class="p-3">
                                                        <div class="ov-breakdown-title">
                                                            <mat-icon class="ov-breakdown-icon">manage_accounts</mat-icon>
                                                            Team Composition
                                                        </div>
                                                        <div class="ov-mix-bar">
                                                            @if (totalMembers() > 0) {
                                                                <div class="ov-mix-seg" [style.flex]="leadershipCount()" style="background:#7F77DD" [matTooltip]="leadershipCount() + ' Leadership'" matTooltipPosition="above"></div>
                                                                <div class="ov-mix-seg" [style.flex]="contributorCount()" style="background:#3B82F6" [matTooltip]="contributorCount() + ' Contributors'" matTooltipPosition="above"></div>
                                                            } @else {
                                                                <div class="ov-mix-seg" style="flex:1;background:var(--surface-border)"></div>
                                                            }
                                                        </div>
                                                        <div class="ov-legend">
                                                            <div class="ov-legend-item"><span style="background:#7F77DD"></span>Leadership ({{ leadershipCount() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#3B82F6"></span>Contributors ({{ contributorCount() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#22c55e"></span>Joined this week ({{ joinedLast7DaysCount() }})</div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                            <div class="col-12 col-md-4">
                                                <mat-card class="h-100">
                                                    <mat-card-content class="p-3">
                                                        <div class="ov-breakdown-title">
                                                            <mat-icon class="ov-breakdown-icon">visibility</mat-icon>
                                                            Project Visibility
                                                        </div>
                                                        <div class="ov-mix-bar">
                                                            @if (totalProjects() > 0) {
                                                                <div class="ov-mix-seg" [style.flex]="publicProjects()" style="background:#3B82F6" [matTooltip]="publicProjects() + ' Public'" matTooltipPosition="above"></div>
                                                                <div class="ov-mix-seg" [style.flex]="totalProjects() - publicProjects()" style="background:#64748b" [matTooltip]="(totalProjects() - publicProjects()) + ' Private'" matTooltipPosition="above"></div>
                                                            } @else {
                                                                <div class="ov-mix-seg" style="flex:1;background:var(--surface-border)"></div>
                                                            }
                                                        </div>
                                                        <div class="ov-legend">
                                                            <div class="ov-legend-item"><span style="background:#3B82F6"></span>Public ({{ publicProjects() }})</div>
                                                            <div class="ov-legend-item"><span style="background:#64748b"></span>Private ({{ totalProjects() - publicProjects() }})</div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                        </div>

                                    </div><!-- /ov-metrics -->
                                </div><!-- /ov-grid -->
                            </div>
                        </mat-tab>

                        <!-- ══════════════════════════════ MEMBERS ══ -->
                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">groups</mat-icon>
                                Members <span class="badge badge-light ms-2">{{ totalMembers() }}</span>
                            </ng-template>

                            <div class="p-3">
                                @if (shouldShowCapacityWarning()) {
                                    @if (capacityStatus() === 'full') {
                                        <div class="capacity-banner critical mb-3">
                                            <mat-icon class="material-icons-outlined capacity-icon">error</mat-icon>
                                            <div class="capacity-content">
                                                <p class="capacity-label mb-0">Workspace capacity full</p>
                                                <p class="capacity-details mb-2">You've reached the maximum number of members ({{ memberCapacity()!.maxMembers }}) for your plan.</p>
                                                <button matButton class="py-1 px-2" style="height:auto;font-size:12px;background:#dc2626;color:white;" routerLink="/app/billing">Upgrade Plan</button>
                                            </div>
                                        </div>
                                    } @else if (capacityStatus() === 'critical') {
                                        <div class="capacity-banner warning mb-3">
                                            <mat-icon class="material-icons-outlined capacity-icon">warning</mat-icon>
                                            <div class="capacity-content">
                                                <p class="capacity-label mb-0">Workspace nearing capacity</p>
                                                <p class="capacity-details mb-2">You're at {{ capacityPercentage() }}% capacity — only {{ memberCapacity()!.remainingMembers }} seat{{ memberCapacity()!.remainingMembers !== 1 ? 's' : '' }} remaining.</p>
                                                <button matButton class="py-1 px-2" style="height:auto;font-size:12px;background:#f59e0b;color:white;" routerLink="/app/billing">View Plans</button>
                                            </div>
                                        </div>
                                    }
                                }

                                <!-- ── MEMBERS DASHBOARD ────────────────────────────── -->
                                <div class="mb-dashboard mb-4">
                                    <!-- Header with capacity and invite -->
                                    <div class="mb-header mb-3">
                                        <div class="mb-header__left">
                                            <div class="mb-title-section">
                                                <mat-icon class="mb-title-icon">groups</mat-icon>
                                                <div>
                                                    <h3 class="mb-title">Team Dashboard</h3>
                                                    <p class="mb-subtitle">Manage your workspace members and roles</p>
                                                </div>
                                            </div>
                                            @if (memberCapacity()) {
                                                <div class="mb-capacity-card">
                                                    <div class="mb-cap-header">
                                                        <span class="mb-cap-title">Team Capacity</span>
                                                        <span class="ov-status-pill" [class]="ovCapClass(capacityPercentage())">{{ ovCapLabel(capacityPercentage()) }}</span>
                                                    </div>
                                                    <div class="mb-cap-bar-wrap">
                                                        <div class="mb-cap-bar">
                                                            <div class="mb-cap-fill"
                                                                 [style.width]="capacityPercentage() + '%'"
                                                                 [style.background]="ovCapColor(capacityPercentage())"></div>
                                                        </div>
                                                        <span class="mb-cap-text" [style.color]="ovCapColor(capacityPercentage())">
                                                            {{ memberCapacity()!.currentMembers }}/{{ memberCapacity()!.maxMembers }}
                                                        </span>
                                                    </div>
                                                    <p class="mb-cap-detail">{{ memberCapacity()!.remainingMembers }} seats available</p>
                                                </div>
                                            }
                                        </div>
                                        @if (canInviteMember()) {
                                            <button matButton="filled" class="mb-invite-btn" [disabled]="membersLoading() || (memberCapacity() && memberCapacity()!.remainingMembers === 0)" (click)="openInviteModal()">
                                                <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                                Invite Member
                                            </button>
                                        }
                                    </div>

                                    <!-- Team Analytics Cards -->
                                    <div class="row gx-3 mb-3">
                                        <div class="col-12 col-md-6 col-xl-3 mb-3">
                                            <mat-card class="mb-analytics-card h-100">
                                                <mat-card-content class="p-3">
                                                    <div class="mb-card-header mb-3">
                                                        <div class="mb-card-icon-wrap" style="background:rgba(127,119,221,0.12)">
                                                            <mat-icon style="color:#7F77DD;font-size:20px;width:20px;height:20px">shield</mat-icon>
                                                        </div>
                                                        <div class="mb-card-metric">
                                                            <span class="mb-card-num">{{ leadershipCount() }}</span>
                                                            <span class="mb-card-lbl">Leadership</span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-card-desc">Owners, Admins & Managers</div>
                                                    <div class="mb-card-progress">
                                                        <div class="mb-progress-bar">
                                                            <div class="mb-progress-fill" style="width:{{ totalMembers() > 0 ? (leadershipCount() / totalMembers() * 100) : 0 }}%;background:#7F77DD"></div>
                                                        </div>
                                                        <span class="mb-progress-pct">{{ totalMembers() > 0 ? Math.round(leadershipCount() / totalMembers() * 100) : 0 }}%</span>
                                                    </div>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                        <div class="col-12 col-md-6 col-xl-3 mb-3">
                                            <mat-card class="mb-analytics-card h-100">
                                                <mat-card-content class="p-3">
                                                    <div class="mb-card-header mb-3">
                                                        <div class="mb-card-icon-wrap" style="background:rgba(59,130,246,0.12)">
                                                            <mat-icon style="color:#3B82F6;font-size:20px;width:20px;height:20px">group</mat-icon>
                                                        </div>
                                                        <div class="mb-card-metric">
                                                            <span class="mb-card-num">{{ contributorCount() }}</span>
                                                            <span class="mb-card-lbl">Contributors</span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-card-desc">Active team members</div>
                                                    <div class="mb-card-progress">
                                                        <div class="mb-progress-bar">
                                                            <div class="mb-progress-fill" style="width:{{ totalMembers() > 0 ? (contributorCount() / totalMembers() * 100) : 0 }}%;background:#3B82F6"></div>
                                                        </div>
                                                        <span class="mb-progress-pct">{{ totalMembers() > 0 ? Math.round(contributorCount() / totalMembers() * 100) : 0 }}%</span>
                                                    </div>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                        <div class="col-12 col-md-6 col-xl-3 mb-3">
                                            <mat-card class="mb-analytics-card h-100">
                                                <mat-card-content class="p-3">
                                                    <div class="mb-card-header mb-3">
                                                        <div class="mb-card-icon-wrap" style="background:rgba(29,158,117,0.12)">
                                                            <mat-icon style="color:#1D9E75;font-size:20px;width:20px;height:20px">person_add</mat-icon>
                                                        </div>
                                                        <div class="mb-card-metric">
                                                            <span class="mb-card-num">{{ joinedLast7DaysCount() }}</span>
                                                            <span class="mb-card-lbl">New This Week</span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-card-desc">Recent additions</div>
                                                    <div class="mb-growth-indicator" [class.positive]="joinedLast7DaysCount() > 0">
                                                        <mat-icon class="mb-growth-icon">{{ joinedLast7DaysCount() > 0 ? 'trending_up' : 'trending_flat' }}</mat-icon>
                                                        <span class="mb-growth-text">{{ joinedLast7DaysCount() > 0 ? '+' + joinedLast7DaysCount() : 'No new' }}</span>
                                                    </div>
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                        <div class="col-12 col-md-6 col-xl-3 mb-3">
                                            <mat-card class="mb-analytics-card h-100">
                                                <mat-card-content class="p-3">
                                                    <div class="mb-card-header mb-3">
                                                        <div class="mb-card-icon-wrap" style="background:rgba(148,163,184,0.12)">
                                                            <mat-icon style="color:#94a3b8;font-size:20px;width:20px;height:20px">group_off</mat-icon>
                                                        </div>
                                                        <div class="mb-card-metric">
                                                            <span class="mb-card-num">{{ organizationMembersOutsideWorkspace() }}</span>
                                                            <span class="mb-card-lbl">Available</span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-card-desc">In org, not in workspace</div>
                                                    @if (organizationMembersOutsideWorkspace() > 0 && canInviteMember()) {
                                                        <button matButton class="mb-invite-small" (click)="openInviteModal()">
                                                            <mat-icon class="material-icons-outlined">add</mat-icon>
                                                            Invite
                                                        </button>
                                                    }
                                                </mat-card-content>
                                            </mat-card>
                                        </div>
                                    </div>

                                    <!-- Team Composition Chart -->
                                    <mat-card class="mb-composition-card mb-3">
                                        <mat-card-content class="p-3">
                                            <div class="mb-comp-header mb-3">
                                                <div class="mb-comp-title-section">
                                                    <mat-icon class="mb-comp-icon">donut_small</mat-icon>
                                                    <div>
                                                        <h4 class="mb-comp-title">Team Composition</h4>
                                                        <p class="mb-comp-subtitle">Role distribution across your workspace</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mb-comp-chart">
                                                <div class="mb-comp-visual">
                                                    <div class="mb-comp-pie">
                                                        @if (totalMembers() > 0) {
                                                            <svg viewBox="0 0 120 120" width="120" height="120">
                                                                <circle cx="60" cy="60" r="45" fill="none" stroke="#e2e8f0" stroke-width="15"/>
                                                                <circle cx="60" cy="60" r="45" fill="none" stroke="#7F77DD" stroke-width="15"
                                                                        stroke-linecap="round"
                                                                        [attr.stroke-dasharray]="leadershipCount() > 0 ? (leadershipCount() / totalMembers() * 283) + ' 283' : '0 283'"
                                                                        transform="rotate(-90 60 60)"/>
                                                                <circle cx="60" cy="60" r="45" fill="none" stroke="#3B82F6" stroke-width="15"
                                                                        stroke-linecap="round"
                                                                        [attr.stroke-dasharray]="contributorCount() > 0 ? (contributorCount() / totalMembers() * 283) + ' 283' : '0 283'"
                                                                        [attr.transform]="'rotate(' + (leadershipCount() > 0 ? (-90 + (leadershipCount() / totalMembers() * 360)) : -90) + ' 60 60)'"/>
                                                            </svg>
                                                        } @else {
                                                            <div class="mb-comp-empty">
                                                                <mat-icon>groups</mat-icon>
                                                            </div>
                                                        }
                                                    </div>
                                                    <div class="mb-comp-center">
                                                        <span class="mb-comp-total">{{ totalMembers() }}</span>
                                                        <span class="mb-comp-label">Total</span>
                                                    </div>
                                                </div>
                                                <div class="mb-comp-legend">
                                                    <div class="mb-comp-legend-item">
                                                        <span class="mb-comp-dot" style="background:#7F77DD"></span>
                                                        <div class="mb-comp-legend-info">
                                                            <span class="mb-comp-legend-name">Leadership</span>
                                                            <span class="mb-comp-legend-count">{{ leadershipCount() }} ({{ totalMembers() > 0 ? Math.round(leadershipCount() / totalMembers() * 100) : 0 }}%)</span>
                                                        </div>
                                                    </div>
                                                    <div class="mb-comp-legend-item">
                                                        <span class="mb-comp-dot" style="background:#3B82F6"></span>
                                                        <div class="mb-comp-legend-info">
                                                            <span class="mb-comp-legend-name">Contributors</span>
                                                            <span class="mb-comp-legend-count">{{ contributorCount() }} ({{ totalMembers() > 0 ? Math.round(contributorCount() / totalMembers() * 100) : 0 }}%)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </mat-card-content>
                                    </mat-card>
                                </div>

                                <!-- Member Management Section -->
                                <mat-card class="mb-management-card">
                                    <mat-card-content class="p-3">
                                        <div class="mb-mgmt-header mb-3">
                                            <h4 class="mb-mgmt-title">Member Management</h4>
                                            <div class="mb-mgmt-actions">
                                                <button matIconButton (click)="toggleBulkMode()" [class.active]="isBulkMode()" title="Toggle bulk selection mode">
                                                    <mat-icon class="material-icons-outlined">{{ isBulkMode() ? "done_all" : "check_circle_outline" }}</mat-icon>
                                                </button>
                                            </div>
                                        </div>
                                        @if (membersLoading()) {
                                            <div class="mb-loading-state">
                                                @for (item of [1,2,3,4,5]; track item) {
                                                    <div class="mb-3"><app-skeleton-card></app-skeleton-card></div>
                                                }
                                            </div>
                                        } @else if (members().length === 0) {
                                            <div class="text-center py-5">
                                                <div class="mb-empty-icon">
                                                    <mat-icon class="material-icons-outlined">group_add</mat-icon>
                                                </div>
                                                <h4 class="mt-3 mb-2">No members yet</h4>
                                                <p class="text-secondary small mb-3">Invite your team to start collaborating in this workspace.</p>
                                                @if (canInviteMember()) {
                                                    <button matButton="filled" (click)="openInviteModal()">
                                                        <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                                        Invite Members
                                                    </button>
                                                }
                                            </div>
                                        } @else {
                                            <div class="mb-3 d-flex align-items-center gap-2">
                                                <button matIconButton (click)="toggleBulkMode()" [class.active]="isBulkMode()" title="Toggle bulk selection mode">
                                                    <mat-icon class="material-icons-outlined">{{ isBulkMode() ? "done_all" : "check_circle_outline" }}</mat-icon>
                                                </button>
                                                <p class="small mb-0 text-secondary flex-grow-1">
                                                    @if (isBulkMode()) {<strong>Bulk mode:</strong> Select members to perform actions}
                                                    @else {Click checkbox icon to enter bulk selection mode}
                                                </p>
                                            </div>

                                            @for (member of members(); track member.userId) {
                                                <div class="d-flex align-items-center gap-2">
                                                    <div class="flex-grow-1">
                                                        <app-workspace-member-card
                                                            [member]="member"
                                                            [orgType]="normalizedOrgType()"
                                                            [showCheckbox]="isBulkMode()"
                                                            [isSelected]="selectedMemberIds().includes(member.userId)"
                                                            [canEditRole]="canEditMemberRole(member) && !isBulkMode()"
                                                            [canRemoveMember]="canRemoveMember(member) && !isBulkMode()"
                                                            (removeMember)="openMemberUnassignDialog($event)"
                                                            (editRole)="openMemberRoleEditDialog($event)"
                                                            (toggleSelection)="toggleMemberSelection($event)"></app-workspace-member-card>
                                                    </div>
                                                    @if (canManageWorkspace() && (member.workspaceRole || '').toUpperCase() !== 'OWNER' && member.userId !== currentUserId() && !isBulkMode()) {
                                                        <button matIconButton matTooltip="Transfer ownership to this member"
                                                            style="flex-shrink:0;"
                                                            (click)="openTransferOwnerDialog(member)">
                                                            <mat-icon class="material-icons-outlined text-secondary" style="font-size:18px;">transfer_within_a_station</mat-icon>
                                                        </button>
                                                    }
                                                </div>
                                            }
                                        }
                                    </mat-card-content>
                                </mat-card>
                            </div>
                        </mat-tab>

                        <!-- ══════════════════════════════ PROJECTS ══ -->
                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">assignment</mat-icon>
                                Projects <span class="badge badge-light ms-2">{{ totalProjects() }}</span>
                            </ng-template>

                            <div class="p-3">
                                <div class="proj-dashboard mb-4">
                                    <div class="proj-header">
                                        <div class="proj-header__left">
                                            <div class="proj-title-section">
                                                <mat-icon class="proj-title-icon">assignment</mat-icon>
                                                <div>
                                                    <h3 class="proj-title">Projects Dashboard</h3>
                                                    <p class="proj-subtitle">Track project progress, capacity, and delivery health</p>
                                                </div>
                                            </div>

                                            @if (projectCapacity()) {
                                                <div class="proj-capacity-card">
                                                    <div class="proj-cap-header">
                                                        <span class="proj-cap-title">Active Project Capacity</span>
                                                        <span class="ov-status-pill" [class]="ovCapClass(projectCapacityPercentage())">{{ ovCapLabel(projectCapacityPercentage()) }}</span>
                                                    </div>
                                                    <div class="proj-cap-bar-wrap">
                                                        <div class="proj-cap-bar">
                                                            <div class="proj-cap-fill"
                                                                 [style.width]="projectCapacityPercentage() + '%'"
                                                                 [style.background]="ovCapColor(projectCapacityPercentage())"></div>
                                                        </div>
                                                        <span class="proj-cap-text" [style.color]="ovCapColor(projectCapacityPercentage())">
                                                            {{ projectCapacity()!.currentActiveProjects }}/{{ projectCapacity()!.maxActiveProjects }}
                                                        </span>
                                                    </div>
                                                    <p class="proj-cap-detail">{{ projectCapacity()!.remainingActiveProjects }} slot{{ projectCapacity()!.remainingActiveProjects !== 1 ? 's' : '' }} available</p>
                                                </div>
                                            }
                                        </div>

                                        <div class="proj-action-buttons projects-action-wrap">
                                            <button matButton (click)="goToRealProjects()">
                                                <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                                Open All
                                            </button>
                                            @if (canManageWorkspace()) {
                                                <button matButton="filled" (click)="openCreateProjectDialog()">
                                                    <mat-icon class="material-icons-outlined">add</mat-icon>
                                                    Create Project
                                                </button>
                                                <button matButton (click)="openTemplateWizard(workspace()!.id)">
                                                    <mat-icon class="material-icons-outlined">view_module</mat-icon>
                                                    Use Template
                                                </button>
                                            }
                                            @if (canShowCreateWithAi()) {
                                                <button matButton="filled" class="ai-pill-btn" (click)="openCreateWithAiDialog()">
                                                    <mat-icon class="material-icons-outlined">auto_awesome</mat-icon>
                                                    Create with AI
                                                </button>
                                            }
                                        </div>
                                    </div>

                                    <div class="proj-analytics-grid">
                                        <div class="proj-analytics-card">
                                            <div class="proj-card-header">
                                                <div class="proj-card-icon-wrap" style="background:rgba(59,130,246,0.12)">
                                                    <mat-icon style="color:#3B82F6;font-size:24px;width:24px;height:24px">folder_open</mat-icon>
                                                </div>
                                                <div class="proj-card-metric">
                                                    <span class="proj-card-num">{{ totalProjects() }}</span>
                                                    <span class="proj-card-lbl">Total</span>
                                                </div>
                                            </div>
                                            <div class="proj-card-desc">All tracked workspace projects</div>
                                            <div class="proj-card-progress">
                                                <div class="proj-progress-bar">
                                                    <div class="proj-progress-fill" style="width:100%;background:#3B82F6"></div>
                                                </div>
                                                <span class="proj-progress-pct">100%</span>
                                            </div>
                                        </div>

                                        <div class="proj-analytics-card">
                                            <div class="proj-card-header">
                                                <div class="proj-card-icon-wrap" style="background:rgba(29,158,117,0.12)">
                                                    <mat-icon style="color:#1D9E75;font-size:24px;width:24px;height:24px">play_circle</mat-icon>
                                                </div>
                                                <div class="proj-card-metric">
                                                    <span class="proj-card-num">{{ activeProjects() }}</span>
                                                    <span class="proj-card-lbl">Active</span>
                                                </div>
                                            </div>
                                            <div class="proj-card-desc">Projects currently in execution</div>
                                            <div class="proj-card-progress">
                                                <div class="proj-progress-bar">
                                                    <div class="proj-progress-fill"
                                                         [style.width]="(totalProjects() > 0 ? (activeProjects() / totalProjects() * 100) : 0) + '%'"
                                                         style="background:#1D9E75"></div>
                                                </div>
                                                <span class="proj-progress-pct">{{ totalProjects() > 0 ? Math.round(activeProjects() / totalProjects() * 100) : 0 }}%</span>
                                            </div>
                                        </div>

                                        <div class="proj-analytics-card">
                                            <div class="proj-card-header">
                                                <div class="proj-card-icon-wrap" style="background:rgba(148,163,184,0.12)">
                                                    <mat-icon style="color:#64748b;font-size:24px;width:24px;height:24px">check_circle</mat-icon>
                                                </div>
                                                <div class="proj-card-metric">
                                                    <span class="proj-card-num">{{ completedProjects() }}</span>
                                                    <span class="proj-card-lbl">Completed</span>
                                                </div>
                                            </div>
                                            <div class="proj-card-desc">Delivered and archived work</div>
                                            <div class="proj-card-progress">
                                                <div class="proj-progress-bar">
                                                    <div class="proj-progress-fill"
                                                         [style.width]="completionPercent() + '%'"
                                                         style="background:#64748b"></div>
                                                </div>
                                                <span class="proj-progress-pct">{{ completionPercent() }}%</span>
                                            </div>
                                        </div>

                                        <div class="proj-analytics-card">
                                            <div class="proj-card-header">
                                                <div class="proj-card-icon-wrap" style="background:rgba(127,119,221,0.12)">
                                                    <mat-icon style="color:#7F77DD;font-size:24px;width:24px;height:24px">public</mat-icon>
                                                </div>
                                                <div class="proj-card-metric">
                                                    <span class="proj-card-num">{{ publicProjects() }}</span>
                                                    <span class="proj-card-lbl">Public</span>
                                                </div>
                                            </div>
                                            <div class="proj-card-desc">Visible across your organization</div>
                                            <div class="proj-card-progress">
                                                <div class="proj-progress-bar">
                                                    <div class="proj-progress-fill"
                                                         [style.width]="(totalProjects() > 0 ? (publicProjects() / totalProjects() * 100) : 0) + '%'"
                                                         style="background:#7F77DD"></div>
                                                </div>
                                                <span class="proj-progress-pct">{{ totalProjects() > 0 ? Math.round(publicProjects() / totalProjects() * 100) : 0 }}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="proj-status-overview">
                                        <div class="proj-status-header">
                                            <mat-icon class="proj-status-icon">insights</mat-icon>
                                            <div>
                                                <h4 class="proj-status-title">Status Distribution</h4>
                                                <p class="proj-status-subtitle">How project load is distributed by lifecycle state</p>
                                            </div>
                                        </div>

                                        <div class="proj-status-chart">
                                            <div class="proj-status-bars">
                                                <div class="proj-status-bar-item">
                                                    <span class="proj-status-bar-label">Active</span>
                                                    <div class="proj-status-bar-track">
                                                        <div class="proj-status-bar-fill"
                                                             style="background:#1D9E75"
                                                             [style.width]="(totalProjects() > 0 ? (activeProjects() / totalProjects() * 100) : 0) + '%'">
                                                        </div>
                                                    </div>
                                                    <span class="proj-status-bar-value">{{ activeProjects() }}</span>
                                                </div>

                                                <div class="proj-status-bar-item">
                                                    <span class="proj-status-bar-label">Completed</span>
                                                    <div class="proj-status-bar-track">
                                                        <div class="proj-status-bar-fill"
                                                             style="background:#64748b"
                                                             [style.width]="(totalProjects() > 0 ? (completedProjects() / totalProjects() * 100) : 0) + '%'">
                                                        </div>
                                                    </div>
                                                    <span class="proj-status-bar-value">{{ completedProjects() }}</span>
                                                </div>

                                                <div class="proj-status-bar-item">
                                                    <span class="proj-status-bar-label">On Hold</span>
                                                    <div class="proj-status-bar-track">
                                                        <div class="proj-status-bar-fill"
                                                             style="background:#EF9F27"
                                                             [style.width]="(totalProjects() > 0 ? (ovPausedProjects() / totalProjects() * 100) : 0) + '%'">
                                                        </div>
                                                    </div>
                                                    <span class="proj-status-bar-value">{{ ovPausedProjects() }}</span>
                                                </div>

                                                <div class="proj-status-bar-item">
                                                    <span class="proj-status-bar-label">Other</span>
                                                    <div class="proj-status-bar-track">
                                                        <div class="proj-status-bar-fill"
                                                             style="background:#94a3b8"
                                                             [style.width]="(totalProjects() > 0 ? (ovOtherProjects() / totalProjects() * 100) : 0) + '%'">
                                                        </div>
                                                    </div>
                                                    <span class="proj-status-bar-value">{{ ovOtherProjects() }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="proj-management-section">
                                    <div class="proj-mgmt-header mb-3">
                                        <h4 class="proj-mgmt-title">Project Management</h4>
                                        <div class="proj-mgmt-actions">
                                            <button matIconButton (click)="refresh()" title="Refresh projects">
                                                <mat-icon class="material-icons-outlined">refresh</mat-icon>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="proj-filter-section">
                                        <div class="proj-filter-bar">
                                            <button class="proj-filter-pill" [class.active]="projectFilter() === 'ALL'" (click)="projectFilter.set('ALL')">
                                                All <span class="proj-filter-count">{{ totalProjects() }}</span>
                                            </button>
                                            <button class="proj-filter-pill" [class.active]="projectFilter() === 'ACTIVE'" (click)="projectFilter.set('ACTIVE')">
                                                Active <span class="proj-filter-count">{{ activeProjects() }}</span>
                                            </button>
                                            <button class="proj-filter-pill" [class.active]="projectFilter() === 'COMPLETED'" (click)="projectFilter.set('COMPLETED')">
                                                Completed <span class="proj-filter-count">{{ completedProjects() }}</span>
                                            </button>
                                            <button class="proj-filter-pill" [class.active]="projectFilter() === 'ON_HOLD'" (click)="projectFilter.set('ON_HOLD')">
                                                On Hold <span class="proj-filter-count">{{ ovPausedProjects() }}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="proj-projects-grid">
                                        @if (filteredProjects().length === 0) {
                                            <div class="proj-empty-state">
                                                <div class="proj-empty-icon">
                                                    <mat-icon class="material-icons-outlined">assignment_late</mat-icon>
                                                </div>
                                                <h4 class="mb-2">No projects in this view</h4>
                                                <p class="text-secondary small mb-3">Try another filter or create a new project for this workspace.</p>
                                                @if (canManageWorkspace()) {
                                                    <button matButton="filled" (click)="openCreateProjectDialog()">
                                                        <mat-icon class="material-icons-outlined">add</mat-icon>
                                                        Create Project
                                                    </button>
                                                }
                                            </div>
                                        } @else {
                                            <div class="row gx-3 gy-3">
                                                @for (project of filteredProjects(); track project.id) {
                                                    <div class="col-12 col-md-6 col-xl-4">
                                                        <mat-card class="proj-project-card h-100" (click)="openProjectDetails(project.id)">
                                                            <div class="proj-project-bar"
                                                                [ngClass]="{
                                                                    'proj-project-bar--active': normalizeStatus(project.status) === 'ACTIVE',
                                                                    'proj-project-bar--done': normalizeStatus(project.status) === 'COMPLETED' || normalizeStatus(project.status) === 'ARCHIVED',
                                                                    'proj-project-bar--hold': normalizeStatus(project.status) === 'ON_HOLD' || normalizeStatus(project.status) === 'CANCELLED'
                                                                }">
                                                            </div>

                                                            <mat-card-content class="p-3">
                                                                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                                                                    <h5 class="mb-0 text-truncate" style="max-width:75%">{{ project.name }}</h5>
                                                                    <span class="badge" [ngClass]="projectStatusBadge(project.status)">
                                                                        {{ normalizeStatus(project.status) || 'PLANNING' }}
                                                                    </span>
                                                                </div>

                                                                <p class="small text-secondary mb-3" style="min-height:36px;">
                                                                    {{ project.description || 'No project description provided yet.' }}
                                                                </p>

                                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                                    <span class="small text-secondary">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;vertical-align:middle">visibility</mat-icon>
                                                                        {{ (project.visibility || '').toUpperCase() === 'PUBLIC' ? 'Public' : 'Private' }}
                                                                    </span>
                                                                    <span class="small text-secondary">
                                                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;vertical-align:middle">calendar_today</mat-icon>
                                                                        {{ project.createdAt ? (project.createdAt | date: 'mediumDate') : 'Unknown' }}
                                                                    </span>
                                                                </div>

                                                                <div class="d-flex justify-content-end">
                                                                    <button matButton (click)="openProjectDetails(project.id); $event.stopPropagation()">
                                                                        <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                                                                        Open
                                                                    </button>
                                                                </div>
                                                            </mat-card-content>
                                                        </mat-card>
                                                    </div>
                                                }
                                            </div>
                                        }
                                    </div>
                                </div>
                            </div>
                        </mat-tab>

                        <!-- ══════════════════════════════ SETTINGS ══ -->
                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">settings</mat-icon>
                                Settings
                            </ng-template>

                            <div class="p-3">
                                <!-- ── SETTINGS DASHBOARD ────────────────────────────── -->
                                <div class="settings-dashboard mb-4">
                                    <div class="settings-header">
                                        <mat-icon class="settings-title-icon">settings</mat-icon>
                                        <div>
                                            <h3 class="settings-title">Workspace Settings</h3>
                                            <p class="settings-subtitle">Manage workspace configuration and preferences</p>
                                        </div>
                                    </div>

                                    @if (!canManageWorkspace()) {
                                        <div class="settings-readonly-banner mb-4">
                                            <mat-icon class="material-icons-outlined">lock</mat-icon>
                                            <div>
                                                <p class="fw-semibold mb-0" style="font-size:13px;">Read-only access</p>
                                                <p class="mb-0" style="font-size:11px;">You can view settings but cannot make changes to this workspace.</p>
                                            </div>
                                        </div>
                                    }

                                    <!-- Settings Sections -->
                                    <div class="settings-sections">
                                        <p class="settings-section-label">General</p>
                                        <mat-card class="settings-card mb-4">
                                            <mat-card-content class="p-0">
                                                <div class="settings-row">
                                                    <div class="settings-row__icon" style="background:rgba(59,130,246,0.1)">
                                                        <mat-icon class="material-icons-outlined" style="color:#3B82F6">drive_file_rename_outline</mat-icon>
                                                    </div>
                                                    <div class="settings-row__info">
                                                        <p class="settings-row__title">Rename Workspace</p>
                                                        <p class="settings-row__desc">Change the display name and URL slug of this workspace</p>
                                                    </div>
                                                    <button matButton [disabled]="!canEditWorkspace()" (click)="openEditWorkspaceDialog()">Rename</button>
                                                </div>
                                            </mat-card-content>
                                        </mat-card>

                                        <p class="settings-section-label">Integrations</p>
                                        <mat-card class="settings-card mb-4">
                                            <mat-card-content class="p-0">
                                                <div class="settings-row">
                                                    <div class="settings-row__icon" style="background:rgba(139,92,246,0.1)">
                                                        <mat-icon class="material-icons-outlined" style="color:#8B5CF6">hub</mat-icon>
                                                    </div>
                                                    <div class="settings-row__info">
                                                        <p class="settings-row__title">Third-party Integrations</p>
                                                        <p class="settings-row__desc">Connect external tools, services and webhooks to this workspace</p>
                                                    </div>
                                                    <button matButton (click)="openIntegrationsDialog()">Configure</button>
                                                </div>
                                            </mat-card-content>
                                        </mat-card>

                                        <p class="settings-section-label">Export</p>
                                        <mat-card class="settings-card mb-4">
                                            <mat-card-content class="p-0">
                                                <div class="settings-row">
                                                    <div class="settings-row__icon" style="background:rgba(16,185,129,0.1)">
                                                        <mat-icon class="material-icons-outlined" style="color:#10B981">picture_as_pdf</mat-icon>
                                                    </div>
                                                    <div class="settings-row__info">
                                                        <p class="settings-row__title">Export PDF Report</p>
                                                        <p class="settings-row__desc">Download a comprehensive analytics and activity report for the last 30 days</p>
                                                    </div>
                                                    @if (canManageWorkspace()) {
                                                        <button matButton [disabled]="exporting()" (click)="exportPdf()">
                                                            <mat-icon class="material-icons-outlined">{{ exporting() ? 'hourglass_empty' : 'download' }}</mat-icon>
                                                            {{ exporting() ? 'Exporting...' : 'Export PDF' }}
                                                        </button>
                                                    } @else {
                                                        <span class="settings-row__locked">
                                                            <mat-icon style="font-size:13px;width:13px;height:13px">lock</mat-icon>
                                                            Owners / Admins only
                                                        </span>
                                                    }
                                                </div>
                                            </mat-card-content>
                                        </mat-card>

                                        <p class="settings-section-label settings-section-label--danger">Danger Zone</p>
                                        <mat-card class="settings-card settings-danger-card">
                                            <mat-card-content class="p-0">
                                                <div class="settings-row">
                                                    <div class="settings-row__icon" style="background:rgba(239,68,68,0.1)">
                                                        <mat-icon class="material-icons-outlined" style="color:#EF4444">delete_forever</mat-icon>
                                                    </div>
                                                    <div class="settings-row__info">
                                                        <p class="settings-row__title" style="color:#EF4444">Delete Workspace</p>
                                                        <p class="settings-row__desc">Permanently remove this workspace and all its data. This cannot be undone.</p>
                                                    </div>
                                                    <button matButton style="color:#EF4444;border:1.5px solid rgba(239,68,68,0.3)" [disabled]="!canEditWorkspace()" (click)="openDeleteWorkspaceDialog()">Delete</button>
                                                </div>
                                            </mat-card-content>
                                        </mat-card>
                                    </div>
                                </div>
                            </div>
                        </mat-tab>

                        <!-- ══════════════════════════════ ACTIVITY ══ -->
                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">history</mat-icon>
                                Activity
                            </ng-template>

                            <div class="p-3">
                                <p>Activity content temporarily removed for debugging</p>
                            </div>
                        </mat-tab>
                    </mat-tab-group>
                </mat-card-content>
            </mat-card>
            }
        </div>
    `,
    styles: [`
            .proj-card {
                border: 1.5px solid rgba(0,0,0,0.07);
                border-radius: 14px;
                cursor: pointer;
                overflow: hidden;
                transition: all 0.18s ease;
            }
            .proj-card:hover {
                border-color: rgba(0,136,255,0.25);
                box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                transform: translateY(-1px);
            }
            .proj-card__bar { height: 3px; background: #e2e8f0; }
            .proj-card__bar--active { background: linear-gradient(90deg, #22c55e, #4ade80); }
            .proj-card__bar--done { background: linear-gradient(90deg, #94a3b8, #cbd5e1); }
            .proj-card__bar--hold { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

            .bulk-action-bar {
                border: 1px solid rgba(0, 136, 255, 0.3);
                background: rgba(0, 136, 255, 0.06);
                border-radius: 12px;
            }

            .selected-count {
                min-width: 120px;
                color: #0088ff;
            }

            button[matIconButton].active {
                border: 1px solid rgba(0, 136, 255, 0.5);
                background: rgba(0, 136, 255, 0.1);
            }

            .projects-action-wrap .ai-pill-btn {
                background: linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%);
                color: #ffffff;
                border: 0;
                box-shadow: 0 8px 18px rgba(15, 118, 110, 0.32);
            }

            .projects-action-wrap .ai-pill-btn:hover {
                filter: brightness(1.05);
                transform: translateY(-1px);
            }

            .ai-pill-btn {
                transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
            }

            .ai-pill-btn mat-icon {
                margin-right: 4px;
                font-size: 19px;
                width: 19px;
                height: 19px;
            }
            
            /* ── Overview tab layout ─────────────────────────────────── */
            .ov-grid {
                display: grid;
                grid-template-columns: 240px 1fr;
                grid-template-rows: auto;
                gap: 16px;
                align-items: start;
            }
            .ov-identity { grid-column: 1; }
            .ov-metrics  { grid-column: 2; }
            @media (max-width: 900px) {
                .ov-grid { grid-template-columns: 1fr; }
                .ov-identity, .ov-metrics { grid-column: 1; }
            }

            /* Identity card */
            .ov-id-banner {
                height: 72px;
                background: linear-gradient(135deg, #1e3a5f 0%, #0f6fa8 60%, #0ea5e9 100%);
                border-radius: 8px 8px 0 0;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            .ov-id-icon { font-size: 32px; width: 32px; height: 32px; color: rgba(255,255,255,0.9); }
            .ov-default-chip {
                position: absolute;
                top: 8px; right: 8px;
                background: rgba(255,255,255,0.18);
                color: #fff;
                font-size: 10px;
                font-weight: 600;
                padding: 2px 7px;
                border-radius: 20px;
                letter-spacing: .4px;
            }

            /* Badges */
            .ov-badge {
                font-size: 10px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 20px;
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }
            .ov-badge.badge-light {
                background: var(--surface-card, #f1f5f9);
                color: var(--text-color, #334155);
                border: 1px solid var(--surface-border, #e2e8f0);
            }

            /* Meta list */
            .ov-meta-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
            .ov-meta-row  { display: flex; align-items: center; gap: 6px; }
            .ov-meta-icon { font-size: 14px; width: 14px; height: 14px; color: var(--text-color-secondary, #64748b); flex-shrink: 0; }
            .ov-meta-val  { font-size: 12px; color: var(--text-color, #334155); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* Delivery health bar */
            .ov-health-section { margin-top: 4px; }
            .ov-health-track { height: 6px; border-radius: 4px; background: var(--surface-border, #e2e8f0); overflow: hidden; }
            .ov-health-fill  { height: 100%; border-radius: 4px; transition: width .5s ease; }

            /* Pulse button */
            .ov-pulse-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                font-size: 12px;
                font-weight: 600;
                padding: 6px 0;
                border-radius: 8px;
                border: 1.5px solid rgba(14, 165, 233, 0.4);
                color: #0ea5e9;
                background: rgba(14, 165, 233, 0.06);
                cursor: pointer;
                transition: background .2s, border-color .2s;
            }
            .ov-pulse-btn:hover {
                background: rgba(14, 165, 233, 0.12);
                border-color: rgba(14, 165, 233, 0.7);
            }

            /* KPI strip */
            .ov-kpi-card mat-card-content { padding-top: 0 !important; padding-bottom: 0 !important; }
            .ov-kpi-strip {
                display: flex;
                align-items: stretch;
                min-height: 88px;
            }
            .ov-kpi {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 14px 8px;
                text-align: center;
                gap: 1px;
            }
            .ov-kpi-sep {
                width: 1px;
                background: var(--surface-border, #e2e8f0);
                margin: 14px 0;
            }
            .ov-kpi-icon { font-size: 18px; width: 18px; height: 18px; margin-bottom: 3px; }
            .ov-kpi-num  { font-size: 22px; font-weight: 700; line-height: 1; color: var(--text-color, #1e293b); }
            .ov-kpi-unit { font-size: 13px; font-weight: 600; }
            .ov-kpi-lbl  { font-size: 11px; font-weight: 600; color: var(--text-color-secondary, #64748b); text-transform: uppercase; letter-spacing: .4px; }
            .ov-kpi-sub  { font-size: 10px; color: var(--text-color-secondary, #94a3b8); margin-top: 1px; }

            /* Capacity cards */
            .ov-cap-card mat-card-content { height: 100%; }
            .ov-cap-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ov-cap-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--text-color-secondary, #64748b); }

            /* Status pills */
            .ov-status-pill {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 20px;
                color: #fff;
            }
            .ov-status--healthy  { background: #1D9E75; }
            .ov-status--warning  { background: #EF9F27; }
            .ov-status--critical { background: #E24B4A; }

            /* SVG ring */
            .ov-ring-wrap {
                position: relative;
                flex-shrink: 0;
            }
            .ov-ring-center {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            }
            .ov-ring-num { font-size: 16px; font-weight: 700; line-height: 1; }
            .ov-ring-den { font-size: 10px; color: var(--text-color-secondary, #94a3b8); line-height: 1; }

            /* Capacity linear bar */
            .ov-cap-bar-wrap { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
            .ov-cap-bar {
                flex: 1;
                height: 8px;
                border-radius: 4px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
            }
            .ov-cap-fill { height: 100%; border-radius: 4px; transition: width .5s ease, background .3s; }
            .ov-cap-pct  { font-size: 11px; font-weight: 700; flex-shrink: 0; }
            .ov-cap-detail {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: var(--text-color-secondary, #94a3b8);
            }
            .ov-plan-badge {
                font-size: 9px;
                font-weight: 600;
                padding: 1px 5px;
                border-radius: 10px;
                background: var(--surface-card, #f1f5f9);
                color: var(--text-color-secondary, #64748b);
                border: 1px solid var(--surface-border, #e2e8f0);
                text-transform: uppercase;
                letter-spacing: .3px;
            }

            /* Breakdown cards */
            .ov-breakdown-title {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .4px;
                color: var(--text-color-secondary, #64748b);
                margin-bottom: 12px;
            }
            .ov-breakdown-icon { font-size: 15px; width: 15px; height: 15px; }
            .ov-mix-bar {
                display: flex;
                height: 10px;
                border-radius: 6px;
                overflow: hidden;
                background: var(--surface-border, #e2e8f0);
                margin-bottom: 10px;
                gap: 1px;
            }
            .ov-mix-seg { min-width: 2px; transition: flex .4s ease; border-radius: 0; }
            .ov-legend  { display: flex; flex-direction: column; gap: 4px; }
            .ov-legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                color: var(--text-color, #334155);
            }
            .ov-legend-item span {
                width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
            }

            /* ── MEMBERS TAB STYLES ─────────────────────────────────── */
            .mb-dashboard {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .mb-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 20px;
            }
            .mb-header__left { flex: 1; }
            .mb-title-section {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .mb-title-icon {
                font-size: 28px;
                width: 28px;
                height: 28px;
                color: #3B82F6;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mb-title {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .mb-subtitle {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
            }

            .mb-capacity-card {
                background: white;
                border-radius: 8px;
                padding: 12px;
                border: 1px solid var(--surface-border, #e2e8f0);
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .mb-cap-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .mb-cap-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .4px;
                color: var(--text-color-secondary, #64748b);
            }
            .mb-cap-bar-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            .mb-cap-bar {
                flex: 1;
                height: 6px;
                border-radius: 3px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
            }
            .mb-cap-fill {
                height: 100%;
                border-radius: 3px;
                transition: width .5s ease;
            }
            .mb-cap-text {
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
            }
            .mb-cap-detail {
                font-size: 10px;
                color: var(--text-color-secondary, #94a3b8);
                margin: 0;
            }

            .mb-invite-btn {
                background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
                color: white;
                border: 0;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .mb-invite-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
            }

            .mb-analytics-card {
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                background: white;
            }
            .mb-analytics-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            .mb-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .mb-card-icon-wrap {
                width: 40px;
                height: 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .mb-card-metric {
                text-align: right;
            }
            .mb-card-num {
                font-size: 24px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                line-height: 1;
                display: block;
            }
            .mb-card-lbl {
                font-size: 11px;
                font-weight: 600;
                color: var(--text-color-secondary, #64748b);
                text-transform: uppercase;
                letter-spacing: .4px;
            }
            .mb-card-desc {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin-bottom: 12px;
            }
            .mb-card-progress {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .mb-progress-bar {
                flex: 1;
                height: 4px;
                border-radius: 2px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
            }
            .mb-progress-fill {
                height: 100%;
                border-radius: 2px;
                transition: width .4s ease;
            }
            .mb-progress-pct {
                font-size: 11px;
                font-weight: 700;
                color: var(--text-color-secondary, #64748b);
                flex-shrink: 0;
            }

            .mb-growth-indicator {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
            }
            .mb-growth-indicator.positive {
                color: #1D9E75;
            }
            .mb-growth-indicator .mb-growth-icon {
                font-size: 14px;
                width: 14px;
                height: 14px;
            }

            .mb-invite-small {
                font-size: 11px;
                padding: 4px 8px;
                height: auto;
                background: rgba(59, 130, 246, 0.1);
                color: #3B82F6;
                border: 1px solid rgba(59, 130, 246, 0.2);
            }

            .mb-composition-card {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .mb-comp-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .mb-comp-title-section {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .mb-comp-icon {
                font-size: 20px;
                width: 20px;
                height: 20px;
                color: #7F77DD;
            }
            .mb-comp-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .mb-comp-subtitle {
                font-size: 11px;
                color: var(--text-color-secondary, #64748b);
                margin: 2px 0 0;
            }

            .mb-comp-chart {
                display: flex;
                align-items: center;
                gap: 24px;
            }
            .mb-comp-visual {
                position: relative;
                flex-shrink: 0;
            }
            .mb-comp-pie {
                position: relative;
            }
            .mb-comp-center {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            }
            .mb-comp-total {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                line-height: 1;
            }
            .mb-comp-label {
                font-size: 10px;
                color: var(--text-color-secondary, #64748b);
                text-transform: uppercase;
                letter-spacing: .3px;
            }
            .mb-comp-empty {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: var(--surface-border, #e2e8f0);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
            }
            .mb-comp-empty mat-icon {
                font-size: 32px;
                width: 32px;
                height: 32px;
            }

            .mb-comp-legend {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .mb-comp-legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .mb-comp-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .mb-comp-legend-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .mb-comp-legend-name {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-color, #1e293b);
            }
            .mb-comp-legend-count {
                font-size: 10px;
                color: var(--text-color-secondary, #64748b);
            }

            .mb-management-card {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .mb-mgmt-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .mb-mgmt-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .mb-mgmt-actions {
                display: flex;
                gap: 8px;
            }

            .mb-loading-state, .mb-empty-state, .mb-members-list {
                margin-top: 16px;
            }

            .mb-empty-icon {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(148, 163, 184, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                color: #94a3b8;
            }
            .mb-empty-icon mat-icon {
                font-size: 32px;
                width: 32px;
                height: 32px;
            }

            .mb-member-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 0;
                border-bottom: 1px solid var(--surface-border, #e2e8f0);
            }
            .mb-member-row:last-child {
                border-bottom: none;
            }

            /* ── PROJECTS TAB STYLES ─────────────────────────────────── */
            .proj-dashboard {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .proj-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 20px;
                margin-bottom: 20px;
            }
            .proj-header__left { flex: 1; }
            .proj-title-section {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .proj-title-icon {
                font-size: 28px;
                width: 28px;
                height: 28px;
                color: #3B82F6;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .proj-title {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .proj-subtitle {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
            }

            .proj-capacity-card {
                background: white;
                border-radius: 8px;
                padding: 12px;
                border: 1px solid var(--surface-border, #e2e8f0);
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .proj-cap-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .proj-cap-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .4px;
                color: var(--text-color-secondary, #64748b);
            }
            .proj-cap-bar-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            .proj-cap-bar {
                flex: 1;
                height: 6px;
                border-radius: 3px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
            }
            .proj-cap-fill {
                height: 100%;
                border-radius: 3px;
                transition: width .5s ease;
            }
            .proj-cap-text {
                font-size: 12px;
                font-weight: 700;
                flex-shrink: 0;
            }
            .proj-cap-detail {
                font-size: 10px;
                color: var(--text-color-secondary, #94a3b8);
                margin: 0;
            }

            .proj-action-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .proj-analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .proj-analytics-card {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                overflow: hidden;
            }
            .proj-analytics-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            .proj-card-header {
                padding: 16px 16px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .proj-card-icon-wrap {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .proj-card-metric {
                text-align: right;
            }
            .proj-card-num {
                font-size: 28px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                line-height: 1;
                display: block;
            }
            .proj-card-lbl {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-color-secondary, #64748b);
                text-transform: uppercase;
                letter-spacing: .4px;
            }
            .proj-card-desc {
                padding: 0 16px;
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin-bottom: 12px;
            }
            .proj-card-progress {
                padding: 0 16px 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .proj-progress-bar {
                flex: 1;
                height: 6px;
                border-radius: 3px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
            }
            .proj-progress-fill {
                height: 100%;
                border-radius: 3px;
                transition: width .4s ease;
            }
            .proj-progress-pct {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-color-secondary, #64748b);
                flex-shrink: 0;
            }

            .proj-status-overview {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .proj-status-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .proj-status-icon {
                font-size: 20px;
                width: 20px;
                height: 20px;
                color: #7F77DD;
            }
            .proj-status-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .proj-status-subtitle {
                font-size: 11px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
            }

            .proj-status-chart {
                display: flex;
                align-items: center;
                gap: 24px;
            }
            .proj-status-bars {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .proj-status-bar-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .proj-status-bar-label {
                min-width: 80px;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-color, #334155);
            }
            .proj-status-bar-track {
                flex: 1;
                height: 8px;
                border-radius: 4px;
                background: var(--surface-border, #e2e8f0);
                overflow: hidden;
                position: relative;
            }
            .proj-status-bar-fill {
                height: 100%;
                border-radius: 4px;
                transition: width .5s ease;
            }
            .proj-status-bar-value {
                font-size: 11px;
                font-weight: 700;
                color: var(--text-color-secondary, #64748b);
                min-width: 35px;
                text-align: right;
            }

            .proj-management-section {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .proj-mgmt-header {
                padding: 20px 20px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .proj-mgmt-title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .proj-mgmt-actions {
                display: flex;
                gap: 8px;
            }

            .proj-filter-section {
                padding: 0 20px;
                border-bottom: 1px solid var(--surface-border, #e2e8f0);
            }
            .proj-filter-bar {
                display: flex;
                gap: 8px;
                padding: 16px 0;
            }
            .proj-filter-pill {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                background: var(--surface-card, #f1f5f9);
                color: var(--text-color-secondary, #64748b);
                border: 1px solid var(--surface-border, #e2e8f0);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .proj-filter-pill:hover {
                background: rgba(59, 130, 246, 0.05);
                border-color: rgba(59, 130, 246, 0.2);
            }
            .proj-filter-pill.active {
                background: rgba(59, 130, 246, 0.1);
                color: #3B82F6;
                border-color: rgba(59, 130, 246, 0.3);
            }
            .proj-filter-count {
                background: rgba(255,255,255,0.5);
                padding: 1px 6px;
                border-radius: 10px;
                font-size: 10px;
                margin-left: 4px;
            }

            .proj-projects-grid {
                padding: 20px;
            }
            .proj-project-card {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                cursor: pointer;
                overflow: hidden;
            }
            .proj-project-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            .proj-project-bar {
                height: 4px;
                background: #e2e8f0;
            }
            .proj-project-bar--active { background: linear-gradient(90deg, #22c55e, #4ade80); }
            .proj-project-bar--done { background: linear-gradient(90deg, #94a3b8, #cbd5e1); }
            .proj-project-bar--hold { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

            .proj-empty-state {
                text-align: center;
                padding: 40px 20px;
            }
            .proj-empty-icon {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(148, 163, 184, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                color: #94a3b8;
            }
            .proj-empty-icon mat-icon {
                font-size: 32px;
                width: 32px;
                height: 32px;
            }

            /* ── SETTINGS TAB STYLES ─────────────────────────────────── */
            .settings-dashboard {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .settings-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            .settings-title-icon {
                font-size: 28px;
                width: 28px;
                height: 28px;
                color: #7F77DD;
                background: rgba(127, 119, 221, 0.1);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .settings-title {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .settings-subtitle {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
            }

            .settings-readonly-banner {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(239, 159, 39, 0.1);
                border: 1px solid rgba(239, 159, 39, 0.2);
                border-radius: 8px;
                padding: 12px;
                color: #EF9F27;
            }
            .settings-readonly-banner mat-icon {
                font-size: 20px;
                width: 20px;
                height: 20px;
            }

            .settings-section-label {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .4px;
                color: var(--text-color-secondary, #64748b);
                margin-bottom: 12px;
                margin-top: 24px;
            }
            .settings-section-label--danger {
                color: #EF4444;
            }

            .settings-card {
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .settings-card:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            .settings-danger-card {
                border-color: rgba(239, 68, 68, 0.2);
                background: rgba(239, 68, 68, 0.02);
            }

            .settings-row {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                transition: background 0.2s ease;
            }
            .settings-row:hover {
                background: rgba(0,0,0,0.02);
            }

            .settings-row__icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .settings-row__icon mat-icon {
                font-size: 20px;
                width: 20px;
                height: 20px;
            }

            .settings-row__info {
                flex: 1;
                min-width: 0;
            }
            .settings-row__title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-color, #1e293b);
                margin: 0 0 4px;
            }
            .settings-row__desc {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 0;
                line-height: 1.4;
            }

            .settings-row__locked {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--text-color-secondary, #64748b);
                background: rgba(0,0,0,0.05);
                padding: 6px 12px;
                border-radius: 16px;
            }

            /* ── ACTIVITY TAB STYLES ─────────────────────────────────── */
            .activity-dashboard {
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .activity-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            .activity-title-icon {
                font-size: 28px;
                width: 28px;
                height: 28px;
                color: #3B82F6;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .activity-title {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .activity-subtitle {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
            }

            .activity-analytics {
                margin-bottom: 20px;
            }
            .activity-analytics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }
            .activity-analytics-card {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                overflow: hidden;
            }
            .activity-analytics-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            .activity-analytics-card__header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .activity-analytics-card__icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                flex-shrink: 0;
            }
            .activity-analytics-card__value {
                font-size: 28px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                line-height: 1;
                margin: 0;
            }
            .activity-analytics-card__label {
                font-size: 12px;
                font-weight: 600;
                color: var(--text-color-secondary, #64748b);
                text-transform: uppercase;
                letter-spacing: .4px;
                margin: 4px 0 0;
            }
            .activity-analytics-card__change {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 600;
                margin-top: 8px;
            }
            .activity-analytics-card__change--positive {
                color: #10B981;
            }
            .activity-analytics-card__change--negative {
                color: #EF4444;
            }
            .activity-analytics-card__change--neutral {
                color: var(--text-color-secondary, #64748b);
            }

            .activity-timeline {
                background: white;
                border: 1px solid rgba(0,0,0,0.08);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .activity-timeline__header {
                padding: 20px 20px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--surface-border, #e2e8f0);
            }
            .activity-timeline__title {
                font-size: 16px;
                font-weight: 700;
                color: var(--text-color, #1e293b);
                margin: 0;
            }
            .activity-timeline__filters {
                display: flex;
                gap: 8px;
            }

            .activity-timeline__content {
                padding: 20px;
            }

            .activity-item {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                padding: 16px 0;
                border-bottom: 1px solid var(--surface-border, #e2e8f0);
            }
            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-item__avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                overflow: hidden;
                flex-shrink: 0;
            }
            .activity-item__avatar-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .activity-item__content {
                flex: 1;
                min-width: 0;
            }
            .activity-item__header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 4px;
            }
            .activity-item__text {
                font-size: 14px;
                color: var(--text-color, #334155);
                margin: 0;
            }
            .activity-item__user {
                font-weight: 600;
                color: var(--text-color, #1e293b);
            }
            .activity-item__action {
                color: var(--text-color-secondary, #64748b);
            }
            .activity-item__target {
                font-weight: 600;
                color: #3B82F6;
            }
            .activity-item__time {
                font-size: 11px;
                color: var(--text-color-secondary, #64748b);
                flex-shrink: 0;
            }
            .activity-item__description {
                font-size: 12px;
                color: var(--text-color-secondary, #64748b);
                margin: 4px 0 0;
                line-height: 1.4;
            }

            .activity-empty-state {
                text-align: center;
                padding: 40px 20px;
            }
            .activity-empty-state__icon {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(148, 163, 184, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                color: #94a3b8;
                font-size: 32px;
            }
            .activity-empty-state__text {
                font-size: 14px;
                color: var(--text-color-secondary, #64748b);
                margin: 0;
            }
    `],
})
export class M2WorkspaceDetailsComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly workspaceMemberService = inject(WorkspaceMemberService);
    private readonly projectService = inject(M2ProjectService);
    private readonly projectPermissionService = inject(ProjectPermissionService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly permissionService = inject(WorkspacePermissionService);
    private readonly http = inject(HttpClient);
    private readonly exportService = inject(ExportService);
    readonly Math = Math;

    readonly exporting = signal(false);
    readonly workspace = signal<M2Workspace | null>(null);
    readonly members = signal<WorkspaceMember[]>([]);
    readonly memberCapacity = signal<WorkspaceMemberCapacity | null>(null);
    readonly workspaceCapacity = signal<M2WorkspaceCapacity | null>(null);
    readonly projectCapacity = signal<M2WorkspaceProjectCapacity | null>(null);
    readonly projects = signal<M2ProjectSummary[]>([]);
    readonly isLoading = signal(true);
    readonly membersLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly activityLogs = signal<Record<string, unknown>[]>([]);
    readonly activityLoading = signal(false);
    readonly activityFilter = signal<string>('all');

    // Historical (Time Machine) signals
    readonly historicalAt = signal<string | null>(null);
    readonly historicalMode = computed(() => !!this.historicalAt());
    readonly historicalDisplay = computed(() => this.historicalAt() ? new Date(this.historicalAt()!).toLocaleString() : '');
    // Date object for MatDatepicker value binding (avoid `new` in template expressions)
    readonly historicalAsDate = computed(() => this.historicalAt() ? new Date(this.historicalAt()!) : null);
    readonly timelineQuickDates = signal<M2TimelineCheckpoint[]>([]);
    // Datepicker bounds and filter to prevent selecting unavailable snapshot dates
    readonly pickerMinDate = signal<Date | null>(null);
    readonly pickerMaxDate = signal<Date | null>(null);
    readonly dateFilter = (d: Date | null): boolean => {
        if (!d) return false;
        const min = this.pickerMinDate();
        const max = this.pickerMaxDate();
        // normalize to start of day for comparisons
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        if (min) {
            const m = new Date(min); m.setHours(0, 0, 0, 0);
            if (day.getTime() < m.getTime()) return false;
        }
        if (max) {
            const M = new Date(max); M.setHours(0, 0, 0, 0);
            if (day.getTime() > M.getTime()) return false;
        }
        return true;
    };

    // Bulk operation signals
    readonly selectedMemberIds = signal<number[]>([]);
    readonly isBulkMode = signal(false);
    readonly bulkRoleSelection = signal("");
    readonly bulkActionProcessing = signal(false);

    readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 0);
    readonly totalMembers = computed(() => this.members().length);
    readonly selectedMembersCount = computed(() => this.selectedMemberIds().length);
    readonly selectedMembers = computed(() => {
        const selected = new Set(this.selectedMemberIds());
        return this.members().filter((m) => selected.has(m.userId));
    });
    readonly ownerCount = computed(() => this.members().filter((m) => (m.workspaceRole || "").toUpperCase() === "OWNER").length);
    readonly organizationMembers = computed(() => Math.max(this.memberCapacity()?.organizationMembers ?? 0, this.totalMembers()));
    readonly organizationMembersOutsideWorkspace = computed(() => Math.max(0, this.organizationMembers() - this.totalMembers()));
    readonly leadershipCount = computed(() => this.members().filter((m) => {
        const role = (m.workspaceRole || "").toUpperCase();
        return role === "OWNER" || role === "ADMIN" || role === "MANAGER" || role === "TA";
    }).length);
    readonly contributorCount = computed(() => Math.max(0, this.totalMembers() - this.leadershipCount()));
    readonly joinedLast7DaysCount = computed(() => this.members().filter((m) => this.isJoinedWithinDays(m.joinedAt, 7)).length);
    readonly totalProjects = computed(() => this.projects().length);
    readonly activeProjects = computed(() => this.projects().filter((p) => this.normalizeStatus(p.status) === "ACTIVE").length);
    readonly activeProjectsForDisplay = computed(() => this.projectCapacity()?.currentActiveProjects ?? this.activeProjects());
    readonly completedProjects = computed(() => this.projects().filter((p) => {
        const status = this.normalizeStatus(p.status);
        return status === "COMPLETED" || status === "ARCHIVED";
    }).length);
    readonly publicProjects = computed(() => this.projects().filter((p) => this.normalizeVisibility(p.visibility) === "PUBLIC").length);

    readonly completionPercent = computed(() => {
        const total = this.totalProjects();
        if (total === 0) {
            return 0;
        }
        return Math.round((this.completedProjects() / total) * 100);
    });

    readonly activeProjectPercent = computed(() => {
        const total = this.totalProjects();
        if (total === 0) {
            return 0;
        }
        return Math.round((this.activeProjects() / total) * 100);
    });

    readonly visibilityBalancePercent = computed(() => {
        const total = this.totalProjects();
        if (total === 0) {
            return 0;
        }
        return Math.round((this.publicProjects() / total) * 100);
    });

    readonly memberCoveragePercent = computed(() => {
        const base = Math.max(1, this.organizationMembers());
        return Math.min(100, Math.round((this.totalMembers() / base) * 100));
    });

    readonly workspaceTypeLabel = computed(() => {
        const value = (this.workspace()?.orgType || this.workspace()?.organization?.orgType || "ENTERPRISE").toUpperCase();
        return value === "ACADEMIC" ? "Academic" : "Enterprise";
    });

    readonly workspaceTypeBadgeClass = computed(() => {
        return this.workspaceTypeLabel() === "Academic" ? "theme-violet" : "theme-blue";
    });

    readonly normalizedOrgType = computed(() => {
        const raw = this.workspace()?.orgType || this.workspace()?.organization?.orgType || "enterprise";
        return raw.toLowerCase();
    });

    readonly currentWorkspaceRoleLabel = computed(() => {
        return this.permissionService.getWorkspaceRoleForCurrentUser(this.members()) || "GLOBAL_ADMIN";
    });

    readonly ownerDisplayName = computed(() => {
        const ownerMember = this.members().find((row) => (row.workspaceRole || "").toUpperCase() === "OWNER");
        if (ownerMember?.fullName) {
            return ownerMember.fullName;
        }
        return `User #${this.workspace()?.ownerId || "-"}`;
    });

    readonly isSameOrganizationAsWorkspace = computed(() => {
        const currentOrgId = (this.authService.currentOrganization()?.organizationId || "").toLowerCase();
        if (!currentOrgId) return false;
        // Prefer the direct organizationId field (always serialized); fall back to nested organization.id
        const ws = this.workspace();
        const workspaceOrgId = (ws?.organizationId || ws?.organization?.id || "").toLowerCase();
        if (!workspaceOrgId) return true; // org id not in response → let backend enforce security
        return currentOrgId === workspaceOrgId;
    });

    readonly isCurrentUserGlobalAdmin = computed(() => {
        const role = this.currentUserPlatformRole();
        return role === "ADMIN" || role === "SUPER_ADMIN";
    });

    readonly isCurrentUserOrgAdmin = computed(() => {
        const membershipRole = (this.authService.currentOrganization()?.membershipRole || "").toUpperCase();
        return membershipRole === "ADMIN" || membershipRole === "OWNER";
    });

    readonly isCurrentUserAcademicTutor = computed(() => {
        return this.currentUserPlatformRole() === "TUTOR" && this.normalizedOrgType() === "academic";
    });

    readonly isCurrentUserManager = computed(() => {
        return this.currentUserPlatformRole() === "MANAGER";
    });

    readonly canEditWorkspace = computed(() => {
        if (this.isCurrentUserGlobalAdmin()) {
            return true;
        }
        if (this.isSameOrganizationAsWorkspace()) {
            return this.isCurrentUserOrgAdmin() || this.isCurrentUserManager() || this.isCurrentUserAcademicTutor();
        }
        // Fallback: workspace OWNER or ADMIN can manage their own workspace
        // even when org data is temporarily unavailable (e.g. org signal not yet populated)
        const wsRole = this.currentUserWorkspaceRole();
        return wsRole === "OWNER" || wsRole === "ADMIN";
    });

    readonly canManageWorkspace = computed(() => {
        return this.canEditWorkspace();
    });

    readonly canShowCreateWithAi = computed(() => {
        return this.canManageWorkspace();
    });

    readonly currentUserOrgRole = computed(() => {
        return (this.authService.currentOrganization()?.membershipRole || "").toUpperCase();
    });

    readonly currentUserPlatformRole = computed(() => {
        return (this.authService.currentUser()?.role || "").toUpperCase();
    });

    readonly currentUserWorkspaceRole = computed(() => {
        const userId = this.authService.currentUser()?.id;
        if (!userId) {
            return "";
        }
        const member = this.members().find((row) => row.userId === userId);
        return (member?.workspaceRole || "").toUpperCase();
    });

    readonly isCurrentUserWorkspaceMember = computed(() => {
        const userId = this.authService.currentUser()?.id;
        if (!userId) {
            return false;
        }
        return this.members().some((row) => row.userId === userId);
    });

    readonly canInviteMember = computed(() => {
        if (this.isCurrentUserGlobalAdmin()) {
            return true;
        }
        if (this.isSameOrganizationAsWorkspace()) {
            return this.isCurrentUserOrgAdmin() || this.isCurrentUserAcademicTutor() || this.isCurrentUserManager();
        }
        // Fallback: workspace OWNER or ADMIN can invite members
        const wsRole = this.currentUserWorkspaceRole();
        return wsRole === "OWNER" || wsRole === "ADMIN";
    });

    readonly canEditMemberRoles = computed(() => {
        if (this.isCurrentUserGlobalAdmin()) {
            return true;
        }
        if (this.isSameOrganizationAsWorkspace()) {
            return this.isCurrentUserOrgAdmin() || this.isCurrentUserAcademicTutor();
        }
        // Fallback: workspace OWNER can always manage roles
        return this.currentUserWorkspaceRole() === "OWNER";
    });

    readonly capacityPercentage = computed(() => {
        const c = this.memberCapacity();
        if (!c || c.maxMembers === 0) return 0;
        return Math.round((c.currentMembers / c.maxMembers) * 100);
    });

    readonly capacityStatus = computed(() => {
        const pct = this.capacityPercentage();
        if (pct >= 100) return 'full';
        if (pct >= 85) return 'critical';
        if (pct >= 60) return 'warning';
        return 'healthy';
    });

    readonly capacityStatusColor = computed(() => {
        const status = this.capacityStatus();
        switch (status) {
            case 'full': return '#dc2626'; // red-600
            case 'critical': return '#f59e0b'; // amber-500
            case 'warning': return '#eab308'; // yellow-400
            default: return '#10b981'; // green-600
        }
    });

    readonly shouldShowCapacityWarning = computed(() => {
        return this.capacityPercentage() >= 85;
    });

    readonly capacityBarColor = computed(() => {
        const c = this.memberCapacity();
        if (!c || c.maxMembers === 0) return 'primary';
        const ratio = c.currentMembers / c.maxMembers;
        return ratio >= 1 ? 'warn' : ratio >= 0.8 ? 'accent' : 'primary';
    });

    readonly workspaceCapacityPercentage = computed(() => {
        const c = this.workspaceCapacity();
        if (!c || c.maxWorkspaces === 0) return 0;
        return Math.round((c.currentWorkspaces / c.maxWorkspaces) * 100);
    });

    readonly workspaceCapacityBarColor = computed(() => {
        const c = this.workspaceCapacity();
        if (!c || c.maxWorkspaces === 0) return 'primary';
        const ratio = c.currentWorkspaces / c.maxWorkspaces;
        return ratio >= 1 ? 'warn' : ratio >= 0.8 ? 'accent' : 'primary';
    });

    readonly projectCapacityPercentage = computed(() => {
        const c = this.projectCapacity();
        if (!c || c.maxActiveProjects === 0) return 0;
        return Math.round((c.currentActiveProjects / c.maxActiveProjects) * 100);
    });

    readonly projectCapacityBarColor = computed(() => {
        const c = this.projectCapacity();
        if (!c || c.maxActiveProjects === 0) return 'primary';
        const ratio = c.currentActiveProjects / c.maxActiveProjects;
        return ratio >= 1 ? 'warn' : ratio >= 0.8 ? 'accent' : 'primary';
    });

    // ── Overview tab helpers ──────────────────────────────────────────
    readonly ovPausedProjects = computed(() =>
        this.projects().filter(p => this.normalizeStatus(p.status) === 'ON_HOLD').length);

    readonly ovOtherProjects = computed(() =>
        this.projects().filter(p => {
            const s = this.normalizeStatus(p.status);
            return s !== 'ACTIVE' && s !== 'COMPLETED' && s !== 'ON_HOLD';
        }).length);

    // ── Projects tab filter ───────────────────────────────────────────
    readonly projectFilter = signal<string>('ALL');

    readonly filteredProjects = computed(() => {
        const f = this.projectFilter();
        if (f === 'ALL') return this.projects();
        return this.projects().filter(p => {
            const s = this.normalizeStatus(p.status);
            if (f === 'COMPLETED') return s === 'COMPLETED' || s === 'ARCHIVED';
            return s === f;
        });
    });

    // ── Activity tab ──────────────────────────────────────────────────
    readonly groupedActivityLogs = computed(() => {
        const logs = this.activityLogs();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const map = new Map<string, Record<string, unknown>[]>();
        for (const log of logs) {
            const raw = log['created_at'];
            const d = raw ? new Date(String(raw)) : new Date(0);
            const label = d >= today ? 'Today'
                        : d >= yesterday ? 'Yesterday'
                        : d >= weekAgo ? 'This Week'
                        : 'Older';
            if (!map.has(label)) map.set(label, []);
            map.get(label)!.push(log);
        }
        return ['Today', 'Yesterday', 'This Week', 'Older']
            .filter(l => map.has(l))
            .map(l => ({ label: l, logs: map.get(l)! }));
    });

    readonly activityStats = computed(() => {
        const logs = this.activityLogs();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentLogs = logs.filter(log => {
            const createdAt = log['created_at'];
            const logDate = createdAt ? new Date(String(createdAt)) : new Date(0);
            return logDate >= weekAgo;
        });

        const newMembers = new Set(recentLogs
            .filter(log => log['action_type'] === 'ADD_WORKSPACE_MEMBER')
            .map(log => log['user_id'])
        ).size;

        const completedTasks = recentLogs.filter(log =>
            ['APPROVE_TEMPLATE', 'PUBLISH_TEMPLATE'].includes(String(log['action_type']))
        ).length;

        const comments = recentLogs.filter(log =>
            ['RATE_TEMPLATE', 'FAVORITE_TEMPLATE'].includes(String(log['action_type']))
        ).length;

        return {
            totalActivities: logs.length,
            newMembers,
            completedTasks,
            comments
        };
    });

    readonly filteredActivities = computed(() => {
        const filter = this.activityFilter();
        const logs = this.activityLogs();

        if (filter === 'all') return logs;

        const filterMap: Record<string, string[]> = {
            'members': ['ADD_WORKSPACE_MEMBER', 'REMOVE_WORKSPACE_MEMBER', 'UPDATE_WORKSPACE_MEMBER_ROLE', 'TRANSFER_OWNER'],
            'projects': ['CREATE_PROJECT'],
            'tasks': ['APPROVE_TEMPLATE', 'PUBLISH_TEMPLATE', 'RATE_TEMPLATE', 'FAVORITE_TEMPLATE', 'REJECT_TEMPLATE']
        };

        const actionTypes = filterMap[filter] || [];
        return logs.filter(log => actionTypes.includes(String(log['action_type'])));
    });

    ovHealthColor(): string {
        const pct = this.completionPercent();
        if (pct >= 75) return '#1D9E75';
        if (pct >= 40) return '#EF9F27';
        return '#E24B4A';
    }

    ovCapColor(pct: number): string {
        if (pct >= 85) return '#E24B4A';
        if (pct >= 60) return '#EF9F27';
        return '#1D9E75';
    }

    ovCapClass(pct: number): string {
        if (pct >= 85) return 'ov-status--critical';
        if (pct >= 60) return 'ov-status--warning';
        return 'ov-status--healthy';
    }

    ovCapLabel(pct: number): string {
        if (pct >= 100) return 'Full';
        if (pct >= 85) return 'Critical';
        if (pct >= 60) return 'Warning';
        return 'Healthy';
    }

    ovCapArc(pct: number): string {
        const r = 30;
        const c = 2 * Math.PI * r;
        return `${Math.min(pct, 100) / 100 * c} ${c}`;
    }

    activityColor(actionType: string): string {
        if (['ADD_WORKSPACE_MEMBER', 'APPROVE_TEMPLATE', 'FAVORITE_TEMPLATE', 'RATE_TEMPLATE'].includes(actionType)) return '#1D9E75';
        if (['REMOVE_WORKSPACE_MEMBER', 'DELETE_WORKSPACE', 'REJECT_TEMPLATE', 'UNFAVORITE_TEMPLATE'].includes(actionType)) return '#E24B4A';
        if (['CREATE_PROJECT', 'CREATE_WORKSPACE', 'CREATE_TEMPLATE'].includes(actionType)) return '#3B82F6';
        if (['TRANSFER_OWNER', 'UPDATE_WORKSPACE_MEMBER_ROLE'].includes(actionType)) return '#7F77DD';
        if (['UPDATE_WORKSPACE', 'PUBLISH_TEMPLATE'].includes(actionType)) return '#EF9F27';
        return '#64748b';
    }

    readonly createdDateLabel = computed(() => {
        const createdAt = this.workspace()?.createdAt;
        return createdAt ? new Date(createdAt).toLocaleDateString() : "-";
    });

    readonly isDefaultWorkspace = computed(() => {
        const slug = (this.workspace()?.slug || "").toLowerCase();
        const name = (this.workspace()?.name || "").toLowerCase();
        return slug === "default-team" || slug === "default-course" || name === "default team" || name === "default course";
    });

    readonly activityItems = computed<WorkspaceActivity[]>(() => {
        const activities: WorkspaceActivity[] = [];

        for (const project of this.projects()) {
            activities.push({
                id: `project-${project.id}`,
                icon: "assignment",
                user: "Workspace",
                action: "project is tracked",
                target: project.name,
                timestamp: this.toTimestamp(project.createdAt),
            });
        }

        for (const member of this.members()) {
            activities.push({
                id: `member-${member.userId}`,
                icon: (member.workspaceRole || "").toUpperCase() === "OWNER" ? "verified" : "person_add",
                user: member.fullName || `User #${member.userId}`,
                action: (member.workspaceRole || "").toUpperCase() === "OWNER" ? "owns" : "joined",
                target: this.workspace()?.name || "Workspace",
                timestamp: this.toTimestamp(member.joinedAt),
            });
        }

        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);
    });

    ngOnInit(): void {
        combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
            map(([params, query]) => ({
                workspaceId: params.get("workspaceId"),
                asOf: query.get("at"),
            })),
            distinctUntilChanged((a, b) => a.workspaceId === b.workspaceId && a.asOf === b.asOf)
        ).subscribe(({ workspaceId, asOf }) => {
            if (!workspaceId) {
                this.error.set("Missing workspace id in route");
                this.isLoading.set(false);
                return;
            }

            if (asOf) {
                this.historicalAt.set(asOf);
                this.ensurePickerBounds(workspaceId, () => this.loadSnapshot(workspaceId, asOf));
                return;
            }

            this.historicalAt.set(null);
            this.loadWorkspaceDetails(workspaceId);
        });
    }

    refresh(): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }

        const asOf = this.historicalAt();
        if (asOf) {
            this.ensurePickerBounds(workspaceId, () => this.loadSnapshot(workspaceId, asOf));
            return;
        }

        this.loadWorkspaceDetails(workspaceId);
    }

    onTabChange(event: MatTabChangeEvent): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) return;
        if (event.index === 1) this.loadMembers(workspaceId);
        if (event.index === 4) this.loadActivity(workspaceId);
    }

    loadActivity(workspaceId: string): void {
        if (this.activityLoading()) return;
        this.activityLoading.set(true);
        this.http.get<Record<string, unknown>[]>(`http://localhost:8084/api/v1/workspaces/${workspaceId}/activity?limit=50`)
            .pipe(catchError(() => of([])))
            .subscribe(logs => {
                this.activityLogs.set(logs || []);
                this.activityLoading.set(false);
            });
    }

    filterActivities(): void {
        // This method is called when the activity filter changes
        // The filteredActivities computed signal will automatically update
    }

    openTransferOwnerDialog(member: WorkspaceMember): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        if (!this.canManageWorkspace()) return;
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) return;

        const ref = this.dialog.open(WorkspaceTransferOwnerDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            autoFocus: false,
            panelClass: "rounded-dialog",
            data: {
                newOwnerName: member.fullName || `User #${member.userId}`,
                newOwnerEmail: member.email || "",
                workspaceName: this.workspace()?.name || "",
            },
        });

        ref.afterClosed().subscribe((result?: WorkspaceTransferOwnerDialogResult) => {
            if (!result?.confirm) return;
            this.workspaceMemberService.transferOwner(workspaceId, member.userId).subscribe({
                next: () => {
                    this.snackBar.open("Ownership transferred successfully.", "Close", { duration: 3500 });
                    this.loadMembers(workspaceId);
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to transfer ownership: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                },
            });
        });
    }

    openInviteModal(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }

        const dialogRef = this.dialog.open(InviteMemberModalComponent, {
            width: "700px",
            maxWidth: "95vw",
            data: {
                workspaceId,
                orgType: this.normalizedOrgType(),
                currentUserWorkspaceRole: this.currentUserWorkspaceRole(),
                currentUserOrgRole: this.currentUserOrgRole(),
            },
        });

        const instance = dialogRef.componentInstance;
        if (instance) {
            instance.memberAdded.pipe(take(1)).subscribe(() => {
                this.loadMembers(workspaceId);
            });
        }
    }

    openCreateProjectDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        if (!this.canManageWorkspace()) {
            return;
        }

        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }

        const ref = this.dialog.open(CreateProjectWorkflowDialogComponent, {
            width: "760px",
            maxWidth: "95vw",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.workspace()?.name || "Workspace",
                orgType: this.normalizedOrgType(),
                members: this.members().map((member) => ({
                    userId: member.userId,
                    fullName: member.fullName,
                    email: member.email,
                    avatarUrl: member.avatarUrl,
                    workspaceRole: member.workspaceRole,
                })),
            },
        });

        ref.afterClosed().pipe(take(1)).subscribe((result?: CreateProjectWorkflowDialogResult) => {
            if (result?.useTemplate) {
                setTimeout(() => this.openTemplateWizard(workspaceId), 150);
                return;
            }
            if (!result?.payload || !(result.payload["name"] as string | undefined)?.trim()) {
                return;
            }

            this.projectService.createProject(workspaceId, result.payload).subscribe({
                next: (created) => {
                    const assignments = (result.assignments || []).filter((row) => row.userId !== this.authService.currentUser()?.id);
                    if (assignments.length === 0) {
                        this.projects.update((rows) => [created, ...rows]);
                        this.snackBar.open("Project created successfully.", "Open", { duration: 3500 })
                            .onAction()
                            .pipe(take(1))
                            .subscribe(() => this.router.navigate(["/app/real-projects"], { queryParams: this.buildProjectsQueryParams(workspaceId) }));
                        return;
                    }

                    const assignRequests = assignments.map((assignment) =>
                        this.projectService.addProjectMember(workspaceId, created.id, assignment.userId, assignment.role).pipe(
                            catchError(() => of(null))
                        )
                    );

                    forkJoin(assignRequests).subscribe(() => {
                        this.projects.update((rows) => [created, ...rows]);
                        this.snackBar.open("Project and members created successfully.", "Open", { duration: 3500 })
                            .onAction()
                            .pipe(take(1))
                            .subscribe(() => this.router.navigate(["/app/real-projects"], { queryParams: this.buildProjectsQueryParams(workspaceId) }));
                    });
                },
                error: (error: HttpErrorResponse) => {
                    const msg = (error?.error?.message || error?.error?.error || error.message || "").toLowerCase();
                    const isQuota = error.status === 403 && (msg.includes("limit") || msg.includes("quota") || msg.includes("plan"));
                    this.snackBar.open(
                        isQuota
                            ? `⚠ Project limit reached — your plan does not allow more projects in this workspace.`
                            : `Failed to create project: ${error?.error?.message || "Unexpected error"}`,
                        "Close",
                        { duration: 5500 }
                    );
                },
            });
        });
    }

    openCreateWithAiDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        if (!this.canShowCreateWithAi()) {
            this.snackBar.open("You need workspace management access to use AI bootstrap.", "Close", { duration: 3500 });
            return;
        }

        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }

        const ref = this.dialog.open(CreateWithAiComponent, {
            width: "1080px",
            maxWidth: "98vw",
            maxHeight: "92vh",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.workspace()?.name || "Workspace",
                orgType: this.normalizedOrgType(),
            },
        });

        ref.afterClosed().pipe(take(1)).subscribe((result?: CreateWithAiDialogResult) => {
            if (!result?.createdProjectId) {
                return;
            }
            this.snackBar.open("Project created with AI successfully.", "Open", { duration: 3500 })
                .onAction()
                .pipe(take(1))
                .subscribe(() => this.router.navigate(["/app/real-projects", workspaceId, result.createdProjectId], { queryParams: this.buildHistoricalQueryParams() }));

            this.loadWorkspaceDetails(workspaceId);
        });
    }

    openTemplateWizard(workspaceId: string): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const ref = this.dialog.open(UseTemplateWizardDialogComponent, {
            width: "820px",
            maxWidth: "96vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: { workspaceId, workspaceName: this.workspace()?.name || "Workspace" },
        });
        ref.afterClosed().pipe(take(1)).subscribe((result: UseTemplateWizardResult) => {
            if (result?.projectId) {
                this.loadWorkspaceDetails(workspaceId);
            }
        });
    }

    goToRealProjects(): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }
        this.router.navigate(["/app/real-projects"], { queryParams: this.buildProjectsQueryParams(workspaceId) });
    }

    openProjectDetails(projectId: string): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId || !projectId) {
            return;
        }
        this.router.navigate(["/app/real-projects", workspaceId, projectId], { queryParams: this.buildHistoricalQueryParams() });
    }

    private buildProjectsQueryParams(workspaceId: string): Record<string, string> {
        return {
            workspaceId,
            ...this.buildHistoricalQueryParams(),
        };
    }

    private buildHistoricalQueryParams(): Record<string, string> {
        const at = this.historicalAt();
        return at ? { at } : {};
    }

    openEditWorkspaceDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const workspace = this.workspace();
        if (!workspace || !this.canEditWorkspace()) {
            return;
        }

        const ref = this.dialog.open(WorkspaceEditDialogComponent, {
            width: "540px",
            maxWidth: "95vw",
            data: {
                name: workspace.name,
                slug: workspace.slug,
            },
        });

        ref.afterClosed().subscribe((result?: WorkspaceEditDialogResult) => {
            if (!result) {
                return;
            }

            this.workspaceService.updateWorkspace(workspace.id, {
                name: result.name,
                slug: result.slug,
            }).subscribe({
                next: (updated) => {
                    this.workspace.set(updated);
                    this.snackBar.open("Workspace updated successfully.", "Close", { duration: 3000 });
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to update workspace: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                },
            });
        });
    }

    openDeleteWorkspaceDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const workspace = this.workspace();
        if (!workspace || !this.canEditWorkspace()) {
            return;
        }

        const ref = this.dialog.open(WorkspaceDeleteConfirmDialogComponent, {
            width: "540px",
            maxWidth: "95vw",
            data: {
                workspaceName: workspace.name,
            },
        });

        ref.afterClosed().subscribe((result?: WorkspaceDeleteConfirmDialogResult) => {
            if (!result?.confirmName) {
                return;
            }

            this.workspaceService.deleteWorkspace(workspace.id, result.confirmName).subscribe({
                next: () => {
                    const deletedWorkspaceId = workspace.id;
                    this.router.navigate(["/app/workspaces"]);

                    const snackRef = this.snackBar.open("Workspace deleted.", "Undo", { duration: 10000 });
                    snackRef.onAction().pipe(take(1)).subscribe(() => {
                        this.workspaceService.restoreWorkspace(deletedWorkspaceId).subscribe({
                            next: () => {
                                this.snackBar.open("Workspace restored.", "Close", { duration: 3500 });
                                this.router.navigate(["/app/workspaces", deletedWorkspaceId]);
                            },
                            error: (restoreError: HttpErrorResponse) => {
                                this.snackBar.open(`Undo failed: ${this.errorMessage(restoreError)}`, "Close", { duration: 4500 });
                            },
                        });
                    });

                    // Phase 5.1: Show downgrade suggestion after deletion
                    setTimeout(() => {
                        this.snackBar.open(
                            "You may be able to downgrade your plan now.",
                            "Review Plans",
                            { duration: 8000 }
                        ).onAction().pipe(take(1)).subscribe(() => {
                            this.router.navigate(["/app/billing"]);
                        });
                    }, 1200);
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to delete workspace: ${this.errorMessage(error)}`, "Close", { duration: 5000 });
                },
            });
        });
    }

    openMemberRoleEditDialog(member: WorkspaceMember): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        if (!this.canEditMemberRoles()) {
            return;
        }

        if (!this.canEditMemberRole(member)) {
            this.snackBar.open("You cannot change your own workspace role.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
            return;
        }

        const ref = this.dialog.open(MemberRoleEditDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: {
                memberName: member.fullName,
                orgType: this.normalizedOrgType(),
                currentRole: member.workspaceRole,
            },
        });

        ref.afterClosed().subscribe((result?: MemberRoleEditDialogResult) => {
            if (!result?.role) {
                return;
            }
            if ((result.role || "").toUpperCase() === (member.workspaceRole || "").toUpperCase()) {
                return;
            }

            this.workspaceMemberService.updateMemberRole(workspaceId, member.userId, result.role).subscribe({
                next: () => {
                    this.snackBar.open("Member role updated.", "Close", { duration: 3000 });
                    this.loadMembers(workspaceId);
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to update member role: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                },
            });
        });
    }

    openMemberUnassignDialog(member: WorkspaceMember): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        if (!this.canRemoveMember(member)) {
            return;
        }

        const workspace = this.workspace();
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspace || !workspaceId) {
            return;
        }

        const ref = this.dialog.open(MemberUnassignDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: {
                memberName: member.fullName,
                memberEmail: member.email,
                workspaceName: workspace.name,
                isBulk: false,
                affectedProjectCount: 0, // Could query projects filter by member, but keeping simple for now
            },
        });

        ref.afterClosed().subscribe((result?: MemberUnassignDialogResult) => {
            if (!result?.confirm) {
                return;
            }

            this.workspaceMemberService.removeMember(workspaceId, member.userId, member.workspaceRole).subscribe({
                next: () => {
                    this.loadMembers(workspaceId);
                    
                    // Show undo snackbar for 30 seconds
                    const snackBarRef = this.snackBar.open("Member unassigned from workspace.", "Undo", { duration: 30000 });
                    snackBarRef.onAction().subscribe(() => {
                        this.workspaceMemberService.undoRemoveMember(workspaceId, member.userId).subscribe({
                            next: () => {
                                this.snackBar.open("Member restored to workspace.", "Close", { duration: 3000 });
                                this.loadMembers(workspaceId);
                            },
                            error: (error: HttpErrorResponse) => {
                                this.snackBar.open(`Failed to restore member: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                            },
                        });
                    });
                },
                error: (error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to unassign member: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                },
            });
        });
    }

    canRemoveMember(member: WorkspaceMember): boolean {
        if (!this.canInviteMember()) {
            return false;
        }

        const currentUserId = this.authService.currentUser()?.id;
        if (currentUserId && member.userId === currentUserId) {
            return false;
        }

        const targetRole = (member.workspaceRole || "").toUpperCase();
        if (targetRole === "OWNER") {
            if (!this.isCurrentUserGlobalAdmin() && !this.isCurrentUserOrgAdmin()) {
                return false;
            }
            if (this.ownerCount() <= 1) {
                return false;
            }
        }

        return true;
    }

    canEditMemberRole(member: WorkspaceMember): boolean {
        if (!this.canEditMemberRoles()) {
            return false;
        }

        const currentUserId = this.authService.currentUser()?.id;
        if (currentUserId && member.userId === currentUserId) {
            return false;
        }

        return true;
    }

    // Bulk member operations
    toggleMemberSelection(member: WorkspaceMember): void {
        const current = this.selectedMemberIds();
        if (current.includes(member.userId)) {
            this.selectedMemberIds.set(current.filter((id) => id !== member.userId));
        } else {
            this.selectedMemberIds.set([...current, member.userId]);
        }
    }

    toggleBulkMode(): void {
        const newMode = !this.isBulkMode();
        this.isBulkMode.set(newMode);
        if (!newMode) {
            this.selectedMemberIds.set([]);
            this.bulkRoleSelection.set("");
        }
    }

    clearSelection(): void {
        this.selectedMemberIds.set([]);
    }

    getRoleOptions(): Array<{ value: string; label: string }> {
        const isAcademic = this.normalizedOrgType() === "academic";
        return isAcademic
            ? [
                  { value: "TA", label: "Teaching Assistant" },
                  { value: "STUDENT", label: "Student" },
                  { value: "VIEWER", label: "Viewer" },
              ]
            : [
                  { value: "MANAGER", label: "Manager" },
                  { value: "EMPLOYEE", label: "Employee" },
                  { value: "VIEWER", label: "Viewer" },
              ];
    }

    bulkChangeMemberRole(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId || !this.bulkRoleSelection() || this.selectedMembers().length === 0) {
            return;
        }

        this.bulkActionProcessing.set(true);
        const newRole = this.bulkRoleSelection();
        const requests = this.selectedMembers()
            .filter((m) => this.canEditMemberRole(m))
            .map((member) =>
                this.workspaceMemberService.updateMemberRole(workspaceId, member.userId, newRole).pipe(
                    catchError((error) => {
                        console.error("Failed to update member role:", error);
                        return of(null);
                    })
                )
            );

        if (requests.length === 0) {
            this.snackBar.open("No members can be updated with this role.", "Close", { duration: 3000 });
            this.bulkActionProcessing.set(false);
            return;
        }

        forkJoin(requests).subscribe({
            next: () => {
                this.snackBar.open(`Successfully changed role for ${requests.length} member(s).`, "Close", { duration: 3000 });
                this.bulkActionProcessing.set(false);
                this.selectedMemberIds.set([]);
                this.bulkRoleSelection.set("");
                this.loadMembers(workspaceId);
            },
            error: (error) => {
                this.snackBar.open(`Failed to bulk update roles: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                this.bulkActionProcessing.set(false);
            },
        });
    }

    bulkRemoveMembers(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view — edits are disabled.", "Close", { duration: 4000 });
            return;
        }
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        const workspace = this.workspace();
        if (!workspaceId || !workspace || this.selectedMembers().length === 0) {
            return;
        }

        const ref = this.dialog.open(MemberUnassignDialogComponent, {
            width: "520px",
            maxWidth: "95vw",
            data: {
                memberName: `${this.selectedMembers().length} members`,
                memberEmail: this.selectedMembers().map((m) => m.email).join(", "),
                workspaceName: workspace.name,
                isBulk: true,
            },
        });

        ref.afterClosed().subscribe((result?: MemberUnassignDialogResult) => {
            if (!result?.confirm) {
                return;
            }

            this.bulkActionProcessing.set(true);
            const membersToRemove = this.selectedMembers()
                .filter((m) => this.canRemoveMember(m));

            const requests = membersToRemove
                .map((member) =>
                    this.workspaceMemberService.removeMember(workspaceId, member.userId, member.workspaceRole).pipe(
                        catchError((error) => {
                            console.error("Failed to remove member:", error);
                            return of(null);
                        })
                    )
                );

            if (requests.length === 0) {
                this.snackBar.open("No members can be removed.", "Close", { duration: 3000 });
                this.bulkActionProcessing.set(false);
                return;
            }

            forkJoin(requests).subscribe({
                next: () => {
                    this.loadMembers(workspaceId);
                    
                    // Show undo snackbar for bulk removal
                    const snackBarRef = this.snackBar.open(
                        `Successfully removed ${requests.length} member(s) from workspace.`,
                        "Undo",
                        { duration: 30000 }
                    );
                    snackBarRef.onAction().subscribe(() => {
                        const undoRequests = membersToRemove.map((member) =>
                            this.workspaceMemberService.undoRemoveMember(workspaceId, member.userId).pipe(
                                catchError((error) => {
                                    console.error("Failed to undo removal:", error);
                                    return of(null);
                                })
                            )
                        );

                        forkJoin(undoRequests).subscribe({
                            next: () => {
                                this.snackBar.open(`Restored ${membersToRemove.length} member(s) to workspace.`, "Close", { duration: 3000 });
                                this.loadMembers(workspaceId);
                            },
                            error: (error) => {
                                this.snackBar.open(`Failed to restore members: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                            },
                        });
                    });

                    this.bulkActionProcessing.set(false);
                    this.selectedMemberIds.set([]);
                },
                error: (error) => {
                    this.snackBar.open(`Failed to bulk remove members: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                    this.bulkActionProcessing.set(false);
                },
            });
        });
    }

    strVal(v: unknown): string { return v == null ? '' : String(v); }

    private parseDetails(log: Record<string, unknown>): Record<string, string> {
        const raw = log['details_json'];
        if (!raw || typeof raw !== 'string') return {};
        try { return JSON.parse(raw) as Record<string, string>; }
        catch { return {}; }
    }

    activityLine(log: Record<string, unknown>): string {
        const action = this.strVal(log['action_type']);
        const name = this.parseDetails(log)['name'] || '';
        const n = name ? ` "${name}"` : '';
        const m = name ? ` ${name}` : '';
        const map: Record<string, string> = {
            CREATE_WORKSPACE:             `created workspace${n}`,
            UPDATE_WORKSPACE:             `updated workspace${n}`,
            DELETE_WORKSPACE:             `deleted workspace${n}`,
            ADD_WORKSPACE_MEMBER:         `added member${m}`,
            REMOVE_WORKSPACE_MEMBER:      `removed member${m}`,
            UPDATE_WORKSPACE_MEMBER_ROLE: `updated role for${m}`,
            TRANSFER_OWNER:               `transferred ownership to${m}`,
            CREATE_PROJECT:               `created project${n}`,
            CREATE_TEMPLATE:              `created template${n}`,
            PUBLISH_TEMPLATE:             `submitted template${n} for review`,
            APPROVE_TEMPLATE:             `approved template${n}`,
            REJECT_TEMPLATE:              `rejected template${n}`,
            RATE_TEMPLATE:                `rated template${n}`,
            FAVORITE_TEMPLATE:            `favorited template${n}`,
            UNFAVORITE_TEMPLATE:          `removed favorite on template${n}`,
        };
        return map[action] ?? action.replace(/_/g, ' ').toLowerCase();
    }

    activityIcon(actionType: string): string {
        const map: Record<string, string> = {
            CREATE_WORKSPACE:             'domain_add',
            UPDATE_WORKSPACE:             'edit',
            DELETE_WORKSPACE:             'delete',
            ADD_WORKSPACE_MEMBER:         'person_add',
            REMOVE_WORKSPACE_MEMBER:      'person_remove',
            UPDATE_WORKSPACE_MEMBER_ROLE: 'manage_accounts',
            TRANSFER_OWNER:               'transfer_within_a_station',
            CREATE_PROJECT:               'create_new_folder',
            CREATE_TEMPLATE:              'note_add',
            PUBLISH_TEMPLATE:             'publish',
            APPROVE_TEMPLATE:             'verified',
            REJECT_TEMPLATE:              'cancel',
            RATE_TEMPLATE:                'star',
            FAVORITE_TEMPLATE:            'favorite',
            UNFAVORITE_TEMPLATE:          'heart_broken',
        };
        return map[actionType] || 'history';
    }

    backToWorkspaces(): void {
        this.router.navigate(["/app/workspaces"]);
    }

    openIntegrationsDialog(): void {
        this.dialog.open(IntegrationsComingSoonDialogComponent, {
            width: "500px",
            maxWidth: "95vw",
            autoFocus: false,
            panelClass: "rounded-dialog",
        });
    }

    private loadWorkspaceDetails(workspaceId: string): void {
        this.isLoading.set(true);
        this.error.set(null);
        this.members.set([]);
        this.memberCapacity.set(null);
        this.workspaceCapacity.set(null);
        this.projectCapacity.set(null);
        this.timelineQuickDates.set([]);

        forkJoin({
            workspace: this.workspaceService.getWorkspaceById(workspaceId),
            projectsPage: this.workspaceService.getWorkspaceProjects(workspaceId),
            workspaceCapacity: this.workspaceService.getWorkspaceCapacity(workspaceId).pipe(
                catchError(() => of(null))
            ),
            projectCapacity: this.workspaceService.getWorkspaceProjectCapacity(workspaceId).pipe(
                catchError(() => of(null))
            ),
        }).subscribe({
            next: ({ workspace, projectsPage, workspaceCapacity, projectCapacity }) => {
                this.workspace.set(workspace);
                this.applyPickerBounds(workspace?.createdAt);

                this.projects.set(projectsPage?.content || []);
                this.workspaceCapacity.set(workspaceCapacity);
                this.projectCapacity.set(projectCapacity);
                this.isLoading.set(false);
                this.loadMembers(workspaceId);
                this.loadTimelineHints(workspaceId);
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading.set(false);

                if (error.status === 403) {
                    this.snackBar.open("You do not have access to this workspace.", "Close", { duration: 5000 });
                    this.router.navigate(["/app/workspaces"]);
                    return;
                }

                this.error.set(this.errorMessage(error));
            },
        });
    }

    private applyPickerBounds(createdAt?: string): void {
        if (createdAt) {
            const created = new Date(createdAt);
            created.setHours(0, 0, 0, 0);
            created.setDate(created.getDate() - 1);
            this.pickerMinDate.set(created);
        } else {
            this.pickerMinDate.set(null);
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        this.pickerMaxDate.set(now);
    }

    private ensurePickerBounds(workspaceId: string, onReady: () => void): void {
        const current = this.workspace();
        if (current?.id === workspaceId && current.createdAt) {
            this.applyPickerBounds(current.createdAt);
            onReady();
            return;
        }

        this.workspaceService.getWorkspaceById(workspaceId).pipe(
            catchError(() => of(null))
        ).subscribe((workspace) => {
            this.applyPickerBounds(workspace?.createdAt);
            onReady();
        });
    }

    private normalizeSnapshotAt(at: string | null): string | null {
        if (!at) {
            return null;
        }

        const parsed = new Date(at);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        const min = this.pickerMinDate();
        if (min) {
            const minEnd = new Date(min);
            minEnd.setHours(23, 59, 59, 999);
            if (parsed.getTime() < minEnd.getTime()) {
                return minEnd.toISOString();
            }
        }

        const max = this.pickerMaxDate();
        if (max) {
            const maxEnd = new Date(max);
            maxEnd.setHours(23, 59, 59, 999);
            if (parsed.getTime() > maxEnd.getTime()) {
                return maxEnd.toISOString();
            }
        }

        return parsed.toISOString();
    }

    private loadMembers(workspaceId: string): void {
        this.membersLoading.set(true);
        forkJoin({
            members: this.workspaceMemberService.getWorkspaceMembers(workspaceId).pipe(
                catchError((error: HttpErrorResponse) => {
                    this.snackBar.open(`Failed to load members: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
                    return of([] as WorkspaceMember[]);
                })
            ),
            capacity: this.workspaceMemberService.getMemberCapacity(workspaceId).pipe(
                catchError(() => of(null))
            ),
        }).subscribe({
            next: ({ members, capacity }) => {
                this.members.set(members || []);
                this.memberCapacity.set(capacity);
                this.membersLoading.set(false);
            },
            error: () => {
                this.membersLoading.set(false);
            },
        });
    }

    private loadSnapshot(workspaceId: string, at: string | null): void {
        const asOf = this.normalizeSnapshotAt(at);
        if (!asOf) {
            this.error.set("Invalid historical timestamp.");
            this.isLoading.set(false);
            return;
        }

        if (asOf !== at) {
            this.historicalAt.set(asOf);
        }

        this.isLoading.set(true);
        this.error.set(null);
        this.members.set([]);
        this.projects.set([]);
        this.timelineQuickDates.set([]);

        this.workspaceService.getWorkspaceSnapshot(workspaceId, asOf).pipe(
            catchError((error: HttpErrorResponse) => {
                this.snackBar.open(`Failed to load historical snapshot: ${this.errorMessage(error)}`, 'Close', { duration: 4500 });
                return of(null);
            })
        ).subscribe((snapshot: M2WorkspaceSnapshot | null) => {
            if (!snapshot) {
                this.isLoading.set(false);
                return;
            }

            // Map minimal workspace info
            this.workspace.set({
                id: workspaceId,
                name: snapshot.workspaceName || this.workspace()?.name || 'Workspace',
                slug: this.workspace()?.slug || '',
                ownerId: this.workspace()?.ownerId || 0,
                createdAt: snapshot.workspaceCreatedAt || this.workspace()?.createdAt,
            });

            // Projects and members are simple DTOs from backend
            this.projects.set(snapshot.projects || []);
            const mappedMembers: WorkspaceMember[] = (snapshot.members || []).map((m) => ({
                userId: m.userId,
                workspaceRole: m.workspaceRole || "MEMBER",
                fullName: m.fullName || `User #${m.userId}`,
                email: m.email || "",
                avatarUrl: m.avatarUrl || "",
                orgRole: "",
                joinedAt: m.joinedAt || snapshot.asOf,
                status: "ACTIVE",
            }));
            this.members.set(mappedMembers);
            this.timelineQuickDates.set(this.pickTimelineQuickDates(snapshot));
            this.isLoading.set(false);
        });
    }

    private loadTimelineHints(workspaceId: string): void {
        const now = this.normalizeSnapshotAt(new Date().toISOString());
        if (!now) {
            this.timelineQuickDates.set([]);
            return;
        }

        this.workspaceService.getWorkspaceSnapshot(workspaceId, now).pipe(
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
            if (!at) {
                continue;
            }
            if (!merged.has(at)) {
                merged.set(at, {
                    at,
                    kind: "SUGGESTED",
                    label: "Recommended checkpoint",
                });
            }
        }

        const sorted = Array.from(merged.values()).sort((a, b) => {
            const left = new Date(a.at).getTime();
            const right = new Date(b.at).getTime();
            return left - right;
        });

        return sorted.slice(0, 7);
    }

    normalizeStatus(value?: string): string {
        return (value || "").toUpperCase().trim();
    }

    projectStatusBadge(status?: string): string {
        const s = this.normalizeStatus(status);
        if (s === 'ACTIVE') return 'theme-green';
        if (s === 'COMPLETED' || s === 'ARCHIVED') return 'badge-light';
        if (s === 'ON_HOLD' || s === 'CANCELLED') return 'theme-orange';
        return 'theme-blue';
    }

    private normalizeVisibility(value?: string): string {
        return (value || "").toUpperCase().trim();
    }

    private toTimestamp(value?: string): number {
        if (!value) {
            return Date.now();
        }
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? Date.now() : parsed;
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
        return (error?.error?.message || error?.error?.error || error.message || "Request failed");
    }

    exportPdf(): void {
        const workspaceId = this.route.snapshot.paramMap.get('workspaceId');
        const workspace = this.workspace();
        if (!workspaceId) return;
        this.exporting.set(true);
        this.exportService.exportWorkspacePdf(workspaceId).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${workspace?.name || 'workspace'}-report.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                this.exporting.set(false);
            },
            error: () => {
                this.snackBar.open('Failed to export PDF. You may not have permission.', 'Close', { duration: 4500 });
                this.exporting.set(false);
            }
        });
    }

    onDateSelected(event: MatDatepickerInputEvent<Date>): void {
        const d = event.value;
        if (!d) return;
        // Use end-of-day UTC so selecting a day includes entities created during that day.
        const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)).toISOString();
        this.router.navigate([], { relativeTo: this.route, queryParams: { at: iso }, queryParamsHandling: 'merge' });
    }

    jumpToTimelineDate(at: string): void {
        const normalized = this.normalizeSnapshotAt(at);
        if (!normalized) {
            return;
        }
        this.router.navigate([], { relativeTo: this.route, queryParams: { at: normalized }, queryParamsHandling: 'merge' });
    }

    clearHistorical(): void {
        this.router.navigate([], { relativeTo: this.route, queryParams: { at: null }, queryParamsHandling: 'merge' });
    }

    navigateToWarRoom(): void {
        const workspaceId = this.route.snapshot.paramMap.get('workspaceId');
        if (workspaceId) {
            this.router.navigate(['/app/workspaces', workspaceId, 'war-room']);
        }
    }
}
