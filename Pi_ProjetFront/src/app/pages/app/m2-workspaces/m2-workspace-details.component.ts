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
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { forkJoin, of } from "rxjs";
import { catchError, take } from "rxjs/operators";
import { AuthService } from "../../../auth/auth.service";
import { CircleProgressBlueComponent } from "../../../components/charts/circle-progress-blue.component";
import { CreateProjectWorkflowDialogComponent, CreateProjectWorkflowDialogResult } from "../m2-projects/create-project-workflow-dialog.component";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "../m2-templates/use-template-wizard-dialog.component";
import { M2ProjectService } from "../m2-projects/m2-project.service";
import { InviteMemberModalComponent } from "./invite-member-modal.component";
import { MemberRoleEditDialogComponent, MemberRoleEditDialogResult } from "./member-role-edit-dialog.component";
import { MemberUnassignDialogComponent, MemberUnassignDialogResult } from "./member-unassign-dialog.component";
import { WorkspaceMember, WorkspaceMemberCapacity } from "./models/workspace-member.model";
import { M2ProjectSummary, M2Workspace, M2WorkspaceService } from "./m2-workspace.service";
import { WorkspaceMemberService } from "./services/workspace-member.service";
import { WorkspaceDeleteConfirmDialogComponent, WorkspaceDeleteConfirmDialogResult } from "./workspace-delete-confirm-dialog.component";
import { WorkspaceEditDialogComponent, WorkspaceEditDialogResult } from "./workspace-edit-dialog.component";
import { WorkspaceMemberCardComponent } from "./workspace-member-card.component";
import { WorkspacePermissionService } from "./workspace-permission.service";
import { IntegrationsComingSoonDialogComponent } from "./integrations-coming-soon-dialog.component";
import { WorkspaceTransferOwnerDialogComponent, WorkspaceTransferOwnerDialogResult } from "./workspace-transfer-owner-dialog.component";
import { SkeletonCardComponent } from "../../../components/skeleton-card.component";

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
        MatSelectModule,
        CircleProgressBlueComponent,
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

                    <div class="col-auto order-2 order-lg-5 mb-3 mb-xl-0">
                        <button matButton (click)="backToWorkspaces()"><mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back</button>
                        <button matButton class="ms-1" (click)="refresh()"><mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh</button>
                        @if (canEditWorkspace()) {
                        <button matButton="filled" class="ms-1" (click)="openEditWorkspaceDialog()"><mat-icon class="material-icons-outlined">edit</mat-icon> Edit</button>
                        }
                    </div>
                </div>
            </mat-card>
        </div>

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
                                <div class="row gx-3 gx-lg-4">
                                    <div class="col-12 col-lg-4">
                                        <mat-card class="mb-3 mb-lg-0">
                                            <div mat-card-image class="w-100 height-200 coverimg mb-3 bg-light-theme d-flex align-items-center justify-content-center">
                                                <mat-icon class="material-icons-outlined fs-1 text-theme">workspaces</mat-icon>
                                            </div>
                                            <mat-card-content class="pb-0">
                                                <h3 class="mb-1">{{ workspace()?.name }}</h3>
                                                <p class="text-secondary mb-2">{{ workspace()?.organization?.name || "Organization" }}</p>
                                                <div class="d-flex flex-wrap gap-2 mb-3">
                                                    <span class="badge" [ngClass]="workspaceTypeBadgeClass()">{{ workspaceTypeLabel() }}</span>
                                                    @if (isDefaultWorkspace()) {
                                                    <span class="badge theme-green">Default Workspace</span>
                                                    }
                                                    <span class="badge badge-light">Role: {{ currentWorkspaceRoleLabel() }}</span>
                                                    <span class="badge" [ngClass]="canManageWorkspace() ? 'theme-green' : 'theme-orange'">{{ canManageWorkspace() ? "Full Access" : "Read Only" }}</span>
                                                </div>

                                                <div class="row gx-3 mb-2">
                                                    <div class="col-4"><p class="text-secondary">Slug</p></div>
                                                    <div class="col-8"><p>{{ workspace()?.slug }}</p></div>
                                                </div>
                                                <div class="row gx-3 mb-2">
                                                    <div class="col-4"><p class="text-secondary">Owner</p></div>
                                                    <div class="col-8"><p>{{ ownerDisplayName() }}</p></div>
                                                </div>
                                                <div class="row gx-3 mb-2">
                                                    <div class="col-4"><p class="text-secondary">Health</p></div>
                                                    <div class="col-8">
                                                        <p class="mb-1">{{ completionPercent() }} %</p>
                                                        <mat-progress-bar class="mb-2" mode="determinate" [value]="completionPercent()"></mat-progress-bar>
                                                    </div>
                                                </div>
                                            </mat-card-content>
                                        </mat-card>
                                    </div>

                                    <div class="col-12 col-lg-8">
                                        <div class="row gx-3">
                                            <div class="col-6 col-md-3">
                                                <mat-card class="mb-3">
                                                    <mat-card-content class="pb-0">
                                                        <div class="row gx-2 align-items-center">
                                                            <div class="col-auto mb-3">
                                                                <app-circle-progress-blue class="avatar avatar-50 rounded-circle" [percent]="completionPercent()"></app-circle-progress-blue>
                                                            </div>
                                                            <div class="col-12 col-xl mb-3">
                                                                <h3 class="mb-1">{{ completionPercent() }}<span class="text-secondary">/100</span></h3>
                                                                <p class="small text-secondary">Delivery Health</p>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>

                                            <div class="col-6 col-md-3">
                                                <mat-card class="mb-3">
                                                    <mat-card-content class="pb-0">
                                                        <div class="row gx-2 align-items-center">
                                                            <div class="col-auto mb-3">
                                                                <app-circle-progress-blue class="avatar avatar-50 rounded-circle" [percent]="activeProjectPercent()"></app-circle-progress-blue>
                                                            </div>
                                                            <div class="col-12 col-xl mb-3">
                                                                <h3 class="mb-1">{{ activeProjectPercent() }}<span class="text-secondary">/100</span></h3>
                                                                <p class="small text-secondary">Active Ratio</p>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>

                                            <div class="col-6 col-md-3">
                                                <mat-card class="mb-3">
                                                    <mat-card-content class="pb-0">
                                                        <div class="row gx-2 align-items-center">
                                                            <div class="col-auto mb-3">
                                                                <app-circle-progress-blue class="avatar avatar-50 rounded-circle" [percent]="visibilityBalancePercent()"></app-circle-progress-blue>
                                                            </div>
                                                            <div class="col-12 col-xl mb-3">
                                                                <h3 class="mb-1">{{ publicProjects() }}<span class="text-secondary">/{{ totalProjects() }}</span></h3>
                                                                <p class="small text-secondary">Public Projects</p>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>

                                            <div class="col-6 col-md-3">
                                                <mat-card class="mb-3">
                                                    <mat-card-content class="pb-0">
                                                        <div class="row gx-2 align-items-center">
                                                            <div class="col-auto mb-3">
                                                                <app-circle-progress-blue class="avatar avatar-50 rounded-circle" [percent]="memberCoveragePercent()"></app-circle-progress-blue>
                                                            </div>
                                                            <div class="col-12 col-xl mb-3">
                                                                <h3 class="mb-1">{{ totalMembers() }}<span class="text-secondary">/{{ organizationMembers() }}</span></h3>
                                                                <p class="small text-secondary">Member Coverage</p>
                                                            </div>
                                                        </div>
                                                    </mat-card-content>
                                                </mat-card>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </mat-tab>

                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">groups</mat-icon>
                                Members <span class="badge badge-light ms-2">{{ totalMembers() }}</span>
                            </ng-template>

                            <div class="p-3">
                                @if (shouldShowCapacityWarning()) {
                                    @if (capacityStatus() === 'full') {
                                        <div class="mb-3 p-3 rounded d-flex align-items-start gap-3" style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.3);border-left:4px solid #dc2626;">
                                            <mat-icon class="material-icons-outlined" style="color:#dc2626;font-size:24px;width:24px;height:24px;margin-top:1px;">error</mat-icon>
                                            <div class="flex-grow-1">
                                                <p class="fw-semibold mb-1" style="color:#dc2626;font-size:14px;">Workspace capacity full</p>
                                                <p class="text-secondary small mb-2">You've reached the maximum number of members ({{ memberCapacity()!.maxMembers }}) for your plan. Upgrade to add more team members.</p>
                                                <button matButton class="py-1 px-2" style="height:auto;font-size:12px;background:#dc2626;color:white;" routerLink="/app/billing">Upgrade Plan</button>
                                            </div>
                                        </div>
                                    } @else if (capacityStatus() === 'critical') {
                                        <div class="mb-3 p-3 rounded d-flex align-items-start gap-3" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-left:4px solid #f59e0b;">
                                            <mat-icon class="material-icons-outlined" style="color:#f59e0b;font-size:24px;width:24px;height:24px;margin-top:1px;">warning</mat-icon>
                                            <div class="flex-grow-1">
                                                <p class="fw-semibold mb-1" style="color:#d97706;font-size:14px;">Workspace nearing capacity</p>
                                                <p class="text-secondary small mb-2">You're at {{ capacityPercentage() }}% capacity with only {{ memberCapacity()!.remainingMembers }} seat{{ memberCapacity()!.remainingMembers !== 1 ? 's' : '' }} remaining. Upgrade your plan soon to avoid hitting limits.</p>
                                                <button matButton class="py-1 px-2" style="height:auto;font-size:12px;background:#f59e0b;color:white;" routerLink="/app/billing">View Plans</button>
                                            </div>
                                        </div>
                                    }
                                }

                                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                    <div class="flex-grow-1" style="max-width:380px;">
                                        @if (memberCapacity()) {
                                        <div class="mb-2 p-3 rounded" style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);">
                                            <div class="d-flex justify-content-between align-items-center mb-1">
                                                <span class="small fw-medium">Team capacity</span>
                                                <span class="badge badge-light" style="font-size:10px;">{{ memberCapacity()!.planName }}</span>
                                            </div>
                                            <mat-progress-bar mode="determinate"
                                                [value]="(memberCapacity()!.currentMembers / memberCapacity()!.maxMembers) * 100"
                                                [color]="capacityBarColor()"
                                                style="height:8px;">
                                            </mat-progress-bar>
                                            <div class="d-flex justify-content-between mt-1">
                                                <span class="text-secondary" style="font-size:11px;">{{ memberCapacity()!.currentMembers }} / {{ memberCapacity()!.maxMembers }} seats</span>
                                                <span class="text-secondary" style="font-size:11px;">{{ capacityPercentage() }}%</span>
                                            </div>
                                            <div class="mt-2 d-flex gap-2 flex-wrap">
                                                <span class="badge" style="background:rgba(16,185,129,0.2);color:#059669;font-size:10px;">Healthy</span>
                                                @if (capacityPercentage() >= 60) {
                                                    <span class="badge" style="background:rgba(234,179,8,0.2);color:#b45309;font-size:10px;">⚠ Warning Zone</span>
                                                }
                                                @if (capacityPercentage() >= 85) {
                                                    <span class="badge" style="background:rgba(220,38,38,0.2);color:#991b1b;font-size:10px;">⚠ Critical</span>
                                                }
                                            </div>
                                        </div>
                                        } @else {
                                        <p class="small mb-0 text-secondary">Plan capacity is loading...</p>
                                        }
                                    </div>
                                    @if (canInviteMember()) {
                                    <button matButton="filled" [disabled]="membersLoading() || (memberCapacity() && memberCapacity()!.remainingMembers === 0)" (click)="openInviteModal()">
                                        <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                        Invite Member
                                    </button>
                                    }
                                </div>

                                <div class="row gx-2 mb-3">
                                    <div class="col-6 col-lg-3">
                                        <mat-card class="bg-light-theme">
                                            <mat-card-content class="py-2">
                                                <p class="small text-secondary mb-1">Owners/Admins</p>
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
                                                <p class="small text-secondary mb-1">Not In Workspace</p>
                                                <h4 class="mb-0">{{ organizationMembersOutsideWorkspace() }}</h4>
                                            </mat-card-content>
                                        </mat-card>
                                    </div>
                                </div>

                                @if (membersLoading()) {
                                <div class="mb-3">
                                    @for (item of [1,2,3,4,5]; track item) {
                                    <div class="mb-3">
                                        <app-skeleton-card></app-skeleton-card>
                                    </div>
                                    }
                                </div>
                                } @else if (members().length === 0) {
                                <div class="text-center py-5 mt-2">
                                    <mat-icon class="material-icons-outlined mb-2" style="font-size:48px;width:48px;height:48px;color:#9ca3af;">person_add</mat-icon>
                                    <h4 class="mb-2">No members yet</h4>
                                    <p class="text-secondary small mb-3">Invite your team to collaborate in this workspace.</p>
                                    @if (canInviteMember()) {
                                        <button matButton color="primary" (click)="openInviteModal()">Invite Members</button>
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

                                @if (isBulkMode() && selectedMembersCount() > 0) {
                                <div class="bulk-action-bar mb-3 p-3 d-flex align-items-center gap-3 rounded">
                                    <span class="selected-count fw-semibold">{{ selectedMembersCount() }} selected</span>
                                    <mat-form-field appearance="outline" class="flex-grow-1">
                                        <mat-label>New Role</mat-label>
                                        <mat-select [(ngModel)]="bulkRoleSelection">
                                            @for (option of getRoleOptions(); track option.value) {
                                            <mat-option [value]="option.value">{{ option.label }}</mat-option>
                                            }
                                        </mat-select>
                                    </mat-form-field>
                                    <button matButton [disabled]="!bulkRoleSelection() || bulkActionProcessing()" (click)="bulkChangeMemberRole()">
                                        {{ bulkActionProcessing() ? "Updating..." : "Change Role" }}
                                    </button>
                                    <button matButton color="warn" [disabled]="bulkActionProcessing()" (click)="bulkRemoveMembers()">
                                        {{ bulkActionProcessing() ? "Removing..." : "Remove" }}
                                    </button>
                                    <button matButton (click)="clearSelection()" [disabled]="bulkActionProcessing()">Clear</button>
                                </div>
                                }

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
                            </div>
                        </mat-tab>

                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">assignment</mat-icon>
                                Projects <span class="badge badge-light ms-2">{{ totalProjects() }}</span>
                            </ng-template>

                            <div class="p-3">
                                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                                    <div>
                                        <p class="small text-secondary mb-0">{{ totalProjects() }} project{{ totalProjects() !== 1 ? 's' : '' }} · {{ activeProjects() }} active · {{ completedProjects() }} completed</p>
                                    </div>
                                    <div class="d-flex gap-2 flex-wrap">
                                        <button matButton (click)="goToRealProjects()">
                                            <mat-icon class="material-icons-outlined">open_in_new</mat-icon> Full View
                                        </button>
                                        <button matButton [disabled]="!canManageWorkspace()" (click)="openTemplateWizard(route.snapshot.paramMap.get('workspaceId') || '')">
                                            <mat-icon class="material-icons-outlined">layers</mat-icon> From Template
                                        </button>
                                        <button matButton="filled" [disabled]="!canManageWorkspace()" (click)="openCreateProjectDialog()">
                                            <mat-icon class="material-icons-outlined">add</mat-icon> New Project
                                        </button>
                                    </div>
                                </div>

                                @if (projects().length === 0) {
                                <div class="text-center py-5">
                                    <div class="avatar avatar-60 rounded-circle bg-light-theme text-theme d-inline-flex align-items-center justify-content-center mb-3">
                                        <mat-icon class="material-icons-outlined fs-2">assignment</mat-icon>
                                    </div>
                                    <h4 class="mb-2">No projects yet</h4>
                                    <p class="text-secondary mb-3 small">Start a new project from a template to save time, or create a blank project to customize from scratch.</p>
                                    <div class="d-flex gap-2 justify-content-center flex-wrap">
                                        <button matButton [disabled]="!canManageWorkspace()" (click)="openCreateProjectDialog()" class="gap-2">
                                            <mat-icon class="material-icons-outlined">add</mat-icon> Create Project
                                        </button>
                                        <button matButton [disabled]="!canManageWorkspace()" (click)="openTemplateWizard(route.snapshot.paramMap.get('workspaceId') || '')" class="gap-2">
                                            <mat-icon class="material-icons-outlined">layers</mat-icon> Browse Templates
                                        </button>
                                    </div>
                                </div>
                                } @else {
                                <div class="row gx-3">
                                    @for (project of projects(); track project.id) {
                                    <div class="col-12 col-md-6 col-xl-4 mb-3">
                                        <mat-card class="proj-card h-100" (click)="openProjectDetails(project.id)">
                                            <div class="proj-card__bar" [class.proj-card__bar--active]="normalizeStatus(project.status) === 'ACTIVE'"
                                                 [class.proj-card__bar--done]="normalizeStatus(project.status) === 'COMPLETED' || normalizeStatus(project.status) === 'ARCHIVED'"
                                                 [class.proj-card__bar--hold]="normalizeStatus(project.status) === 'ON_HOLD'"></div>
                                            <mat-card-content class="pb-2">
                                                <h4 class="mb-1 text-truncate">{{ project.name }}</h4>
                                                <p class="text-secondary small mb-2 text-truncate">{{ project.description || 'No description' }}</p>
                                                <div class="d-flex flex-wrap gap-1 align-items-center mb-2">
                                                    <span class="badge" [ngClass]="projectStatusBadge(project.status)">{{ project.status || 'UNKNOWN' }}</span>
                                                    <span class="badge" [ngClass]="project.visibility === 'PRIVATE' ? 'theme-orange' : 'theme-green'">{{ project.visibility || 'PRIVATE' }}</span>
                                                </div>
                                                @if (project.createdAt) {
                                                <p class="text-secondary mb-0" style="font-size:11px;">
                                                    <mat-icon class="material-icons-outlined align-middle" style="font-size:12px;width:12px;height:12px;">schedule</mat-icon>
                                                    Created {{ project.createdAt | date:'mediumDate' }}
                                                </p>
                                                }
                                            </mat-card-content>
                                        </mat-card>
                                    </div>
                                    }
                                </div>
                                }
                            </div>
                        </mat-tab>

                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">settings</mat-icon>
                                Settings
                            </ng-template>

                            <div class="p-3">
                                @if (!canManageWorkspace()) {
                                <mat-card class="mb-3 border theme-orange">
                                    <mat-card-content>
                                        <div class="d-flex align-items-start">
                                            <mat-icon class="material-icons-outlined me-2 theme-orange">lock</mat-icon>
                                            <div>
                                                <p class="fw-medium mb-1">Read-only access</p>
                                                <p class="small mb-0">Students and employees can view this workspace but cannot change settings.</p>
                                            </div>
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                                }

                                <div class="d-flex flex-wrap gap-2">
                                    <button matButton="filled" [disabled]="!canEditWorkspace()" (click)="openEditWorkspaceDialog()">
                                        <mat-icon class="material-icons-outlined">edit</mat-icon>
                                        Rename
                                    </button>
                                    <button matButton="filled" (click)="openIntegrationsDialog()">
                                        <mat-icon class="material-icons-outlined">hub</mat-icon>
                                        Integrations
                                    </button>
                                    <button matButton="filled" [disabled]="!canEditWorkspace()" (click)="openDeleteWorkspaceDialog()">
                                        <mat-icon class="material-icons-outlined">delete</mat-icon>
                                        Delete Workspace
                                    </button>
                                </div>
                            </div>
                        </mat-tab>

                        <mat-tab>
                            <ng-template mat-tab-label>
                                <mat-icon class="me-2">history</mat-icon>
                                Activity
                            </ng-template>

                            <div class="p-3">
                                @if (activityLoading()) {
                                    <p class="text-secondary mb-0">Loading activity...</p>
                                } @else if (activityLogs().length === 0) {
                                    <div class="text-center py-5">
                                        <mat-icon class="material-icons-outlined text-secondary" style="font-size:48px;width:48px;height:48px;">history</mat-icon>
                                        <h4 class="mt-3 mb-2">No activity yet</h4>
                                        <p class="text-secondary small">Activity updates will appear here as your team collaborates on projects.</p>
                                    </div>
                                } @else {
                                <ul class="activity">
                                    @for (log of activityLogs(); track $index) {
                                    <li>
                                        <div class="row gx-3">
                                            <div class="col-auto">
                                                <div class="avatar avatar-40 rounded-circle bg-light-theme text-theme d-flex align-items-center justify-content-center">
                                                    <mat-icon class="material-icons-outlined">{{ activityIcon(strVal(log['action_type'])) }}</mat-icon>
                                                </div>
                                            </div>
                                            <div class="col">
                                                <p class="text-secondary small mb-1">{{ strVal(log['created_at']) | date : "MMM d, y, h:mm a" }}</p>
                                                <p class="mb-0">
                                                    <span class="fw-semibold text-theme">{{ log['full_name'] || ('User #' + log['user_id']) }}</span>
                                                    <span class="ms-1">{{ activityLine(log) }}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                    }
                                </ul>
                                }
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
    `],
})
export class M2WorkspaceDetailsComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly workspaceMemberService = inject(WorkspaceMemberService);
    private readonly projectService = inject(M2ProjectService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly permissionService = inject(WorkspacePermissionService);
    private readonly http = inject(HttpClient);

    readonly workspace = signal<M2Workspace | null>(null);
    readonly members = signal<WorkspaceMember[]>([]);
    readonly memberCapacity = signal<WorkspaceMemberCapacity | null>(null);
    readonly projects = signal<M2ProjectSummary[]>([]);
    readonly isLoading = signal(true);
    readonly membersLoading = signal(false);
    readonly error = signal<string | null>(null);
    readonly activityLogs = signal<Record<string, unknown>[]>([]);
    readonly activityLoading = signal(false);

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
        this.route.paramMap.subscribe((params) => {
            const workspaceId = params.get("workspaceId");
            if (!workspaceId) {
                this.error.set("Missing workspace id in route");
                this.isLoading.set(false);
                return;
            }
            this.loadWorkspaceDetails(workspaceId);
        });
    }

    refresh(): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId) {
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

    openTransferOwnerDialog(member: WorkspaceMember): void {
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
                            .subscribe(() => this.router.navigate(["/app/real-projects"], { queryParams: { workspaceId } }));
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
                            .subscribe(() => this.router.navigate(["/app/real-projects"], { queryParams: { workspaceId } }));
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

    openTemplateWizard(workspaceId: string): void {
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
        this.router.navigate(["/app/real-projects"], { queryParams: { workspaceId } });
    }

    openProjectDetails(projectId: string): void {
        const workspaceId = this.route.snapshot.paramMap.get("workspaceId");
        if (!workspaceId || !projectId) {
            return;
        }
        this.router.navigate(["/app/real-projects", workspaceId, projectId]);
    }

    openEditWorkspaceDialog(): void {
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

        forkJoin({
            workspace: this.workspaceService.getWorkspaceById(workspaceId),
            projectsPage: this.workspaceService.getWorkspaceProjects(workspaceId),
        }).subscribe({
            next: ({ workspace, projectsPage }) => {
                this.workspace.set(workspace);
                this.projects.set(projectsPage?.content || []);
                this.isLoading.set(false);
                this.loadMembers(workspaceId);
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
}
