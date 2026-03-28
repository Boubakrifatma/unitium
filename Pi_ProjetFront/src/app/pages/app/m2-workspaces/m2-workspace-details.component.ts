import { CommonModule } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTabChangeEvent, MatTabsModule } from "@angular/material/tabs";
import { MatTooltipModule } from "@angular/material/tooltip";
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
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatProgressBarModule,
        MatTabsModule,
        MatSnackBarModule,
        MatTooltipModule,
        CircleProgressBlueComponent,
        WorkspaceMemberCardComponent,
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
                                                [color]="capacityBarColor()">
                                            </mat-progress-bar>
                                            <div class="d-flex justify-content-between mt-1">
                                                <span class="text-secondary" style="font-size:11px;">{{ memberCapacity()!.currentMembers }} / {{ memberCapacity()!.maxMembers }} seats</span>
                                                <span class="text-secondary" style="font-size:11px;">{{ memberCapacity()!.remainingMembers }} free</span>
                                            </div>
                                            @if (memberCapacity()!.remainingMembers === 0) {
                                                <p class="small mb-0 mt-1" style="color:#dc2626;">Workspace full — upgrade plan to add members</p>
                                            } @else if (memberCapacity()!.remainingMembers <= 2) {
                                                <p class="small mb-0 mt-1" style="color:#d97706;">Only {{ memberCapacity()!.remainingMembers }} seat(s) remaining</p>
                                            }
                                        </div>
                                        } @else {
                                        <p class="small mb-0 text-secondary">Plan capacity is loading...</p>
                                        }
                                    </div>
                                    @if (canInviteMember()) {
                                    <button matButton="filled" [disabled]="membersLoading()" (click)="openInviteModal()">
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
                                <p class="text-secondary mb-0">Loading members...</p>
                                } @else if (members().length === 0) {
                                <p class="text-secondary mb-0">No members found for this workspace.</p>
                                } @else {
                                @for (member of members(); track member.userId) {
                                <div class="d-flex align-items-center gap-2">
                                    <div class="flex-grow-1">
                                        <app-workspace-member-card
                                            [member]="member"
                                            [orgType]="normalizedOrgType()"
                                            [canEditRole]="canEditMemberRole(member)"
                                            [canRemoveMember]="canRemoveMember(member)"
                                            (removeMember)="openMemberUnassignDialog($event)"
                                            (editRole)="openMemberRoleEditDialog($event)"></app-workspace-member-card>
                                    </div>
                                    @if (canManageWorkspace() && (member.workspaceRole || '').toUpperCase() !== 'OWNER' && member.userId !== currentUserId()) {
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
                                    <p class="text-secondary mb-3 small">Create your first project or use a template.</p>
                                    <button matButton="filled" [disabled]="!canManageWorkspace()" (click)="openCreateProjectDialog()">
                                        <mat-icon class="material-icons-outlined">add</mat-icon> Create Project
                                    </button>
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
                                    <button matButton="filled" [disabled]="!canManageWorkspace()" (click)="showPlaceholder('Manage Integrations')">
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
                                        <p class="text-secondary mt-2">No activity recorded yet for this workspace.</p>
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
                                                    <span class="text-theme">User #{{ log['user_id'] }}</span>
                                                    <span class="ms-1">{{ humanizeAction(strVal(log['action_type'])) }}</span>
                                                    <span class="text-secondary ms-1 small">{{ log['entity_type'] }}</span>
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

    readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 0);
    readonly totalMembers = computed(() => this.members().length);
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
        const confirmed = window.confirm(`Transfer workspace ownership to ${member.fullName || 'User #' + member.userId}?\nYou will be demoted to ADMIN.`);
        if (!confirmed) return;
        this.workspaceMemberService.transferOwner(workspaceId, member.userId).subscribe({
            next: () => {
                this.snackBar.open("Ownership transferred successfully.", "Close", { duration: 3500 });
                this.loadMembers(workspaceId);
            },
            error: (error: HttpErrorResponse) => {
                this.snackBar.open(`Failed to transfer ownership: ${this.errorMessage(error)}`, "Close", { duration: 4500 });
            },
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

                    const snackRef = this.snackBar.open("Workspace deleted.", "Undo", { duration: 7000 });
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
            },
        });

        ref.afterClosed().subscribe((result?: MemberUnassignDialogResult) => {
            if (!result?.confirm) {
                return;
            }

            this.workspaceMemberService.removeMember(workspaceId, member.userId).subscribe({
                next: () => {
                    this.snackBar.open("Member unassigned from workspace.", "Close", { duration: 3200 });
                    this.loadMembers(workspaceId);
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

    strVal(v: unknown): string { return v == null ? '' : String(v); }
    humanizeAction(actionType: string): string {
        return (actionType || '').replace(/_/g, ' ').toLowerCase();
    }

    activityIcon(actionType: string): string {
        const map: Record<string, string> = {
            ADD_WORKSPACE_MEMBER: 'person_add', REMOVE_WORKSPACE_MEMBER: 'person_remove',
            UPDATE_WORKSPACE_MEMBER_ROLE: 'manage_accounts', CREATE_PROJECT: 'create_new_folder',
            UPDATE_WORKSPACE: 'edit', TRANSFER_OWNER: 'transfer_within_a_station',
        };
        return map[actionType] || 'history';
    }

    backToWorkspaces(): void {
        this.router.navigate(["/app/workspaces"]);
    }

    showPlaceholder(action: string): void {
        this.snackBar.open(`${action} will be enabled when Module 2 write endpoints are finalized.`, "Close", { duration: 3500 });
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
