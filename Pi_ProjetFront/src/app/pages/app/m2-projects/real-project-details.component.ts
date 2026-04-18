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
import { map } from "rxjs/operators";
import {
    M2AvailableWorkspaceMember,
    M2ProjectHealthResponse,
    M2ProjectMember,
    M2ProjectRepoInsightsResponse,
    M2ProjectService,
    M2ProjectSummary,
} from "./m2-project.service";
import { ProjectAddMemberModalComponent } from "./project-add-member-modal.component";
import { ProjectDeleteConfirmDialogComponent } from "./project-delete-confirm-dialog.component";
import { ProjectMemberCardComponent } from "./project-member-card.component";
import { ProjectMemberRoleEditDialogComponent, ProjectMemberRoleEditDialogResult } from "./project-member-role-edit-dialog.component";
import { ProjectMemberUnassignDialogComponent, ProjectMemberUnassignDialogResult } from "./project-member-unassign-dialog.component";
import { ProjectPermissionService } from "./project-permission.service";
import { M2WorkspaceHoliday, M2WorkspaceMember, M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { AuthService } from "../../../auth/auth.service";
import { Milestone, MilestoneService } from "../../../services/mileStoneService/milestone.service";
import { TaskResponseDto, TaskService } from "../../../services/TaskService/task.service";

interface ProjectMemberView {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string;
    role: string;
    assignedAt: string;
}

interface ProjectMilestoneSnapshot {
    id: number;
    name: string;
    status: string;
    dueDate: string | null;
    completionPct: number;
    taskCount: number;
    doneTaskCount: number;
    highPriorityTaskCount: number;
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
                        <button matButton="filled" class="ms-1" [disabled]="!canManageProjects()" (click)="startEdit()">
                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                            Edit Project
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
            <mat-card class="mb-3 mb-lg-4" style="overflow:hidden;border:1px solid rgba(15,23,42,0.08);">
                <mat-card-content class="p-0">
                    <div style="padding:18px 18px 14px;background:radial-gradient(circle at 8% 15%, rgba(16,185,129,0.18), transparent 48%), radial-gradient(circle at 92% 10%, rgba(59,130,246,0.2), transparent 44%), linear-gradient(120deg, #f8fafc 0%, #eff6ff 44%, #ecfeff 100%);">
                        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                            <div>
                                <p class="text-secondary small mb-1" style="letter-spacing:.05em;text-transform:uppercase;">Project command center</p>
                                <h3 class="mb-1" style="color:#0f172a;">{{ project()?.name }}</h3>
                                <p class="mb-0" style="color:#334155;">
                                    {{ statusLabel(projectStatus()) }}
                                    <span style="color:#94a3b8;">·</span>
                                    {{ projectVisibility() }}
                                    <span style="color:#94a3b8;">·</span>
                                    {{ projectDurationLabel() }} running
                                </p>
                            </div>
                            <div class="d-flex flex-wrap gap-1 justify-content-end">
                                <span class="badge" [class]="statusClass(projectStatus())">{{ statusLabel(projectStatus()) }}</span>
                                <span class="badge" [class]="visibilityClass(projectVisibility())">{{ projectVisibility() }}</span>
                                @if (projectRepoLabel() && project()?.githubRepoUrl) {
                                    <button matButton class="text-theme" style="padding:2px 8px;min-height:28px;line-height:1.2;background:rgba(255,255,255,0.8);" (click)="openProjectRepository()">
                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">source</mat-icon>
                                        {{ projectRepoLabel() }}
                                    </button>
                                }
                            </div>
                        </div>
                        <div style="height:7px;border-radius:999px;background:rgba(148,163,184,0.25);overflow:hidden;">
                            <div style="height:100%;transition:width .25s ease;border-radius:999px;" [style.width.%]="timelineProgressPercent()" [style.background]="daysRemaining() !== null && daysRemaining()! < 0 ? 'linear-gradient(90deg,#ef4444,#fb7185)' : 'linear-gradient(90deg,#22c55e,#0ea5e9)'"></div>
                        </div>
                        <div class="d-flex flex-wrap gap-3 mt-2" style="font-size:12px;color:#475569;">
                            <span><strong style="color:#0f172a;">{{ startDateLabel() }}</strong> start</span>
                            <span><strong style="color:#0f172a;">{{ endDateLabel() }}</strong> deadline</span>
                            <span><strong style="color:#0f172a;">{{ createdAtLabel() }}</strong> created</span>
                            <span><strong style="color:#0f172a;">{{ daysRemainingLabel() }}</strong></span>
                        </div>
                    </div>

                    <div class="row g-2 p-3">
                        <div class="col-6 col-lg-3">
                            <div style="border:1px solid rgba(15,23,42,0.08);border-radius:12px;padding:10px 12px;background:#fff;min-height:88px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Members</p>
                                <p class="fw-semibold mb-0" style="font-size:24px;color:#0f172a;line-height:1;">{{ members().length }}</p>
                                <p class="small mb-0 mt-1 text-secondary">{{ leadershipCount() }} leadership</p>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div style="border:1px solid rgba(15,23,42,0.08);border-radius:12px;padding:10px 12px;background:#fff;min-height:88px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Milestone Tasks</p>
                                <p class="fw-semibold mb-0" style="font-size:24px;color:#0f172a;line-height:1;">{{ milestoneTaskTotal() }}</p>
                                <p class="small mb-0 mt-1 text-secondary">{{ completedMilestoneTasks() }} completed</p>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div style="border:1px solid rgba(15,23,42,0.08);border-radius:12px;padding:10px 12px;background:#fff;min-height:88px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Timeline Progress</p>
                                <p class="fw-semibold mb-0" style="font-size:24px;color:#0f172a;line-height:1;">{{ timelineProgressPercent() }}%</p>
                                <p class="small mb-0 mt-1 text-secondary">elapsed</p>
                            </div>
                        </div>
                        <div class="col-6 col-lg-3">
                            <div style="border:1px solid rgba(15,23,42,0.08);border-radius:12px;padding:10px 12px;background:#fff;min-height:88px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Repo Health</p>
                                <p class="fw-semibold mb-0" style="font-size:24px;color:#0f172a;line-height:1;">{{ projectRepoInsights()?.providerStatus === 'live' ? 'Live' : 'Pending' }}</p>
                                <p class="small mb-0 mt-1 text-secondary">GitHub intelligence</p>
                            </div>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>

            @if (canManageProjects()) {
            <mat-card class="mb-3 mb-lg-4" style="border:1px solid rgba(15,23,42,0.1);overflow:hidden;">
                <mat-card-content class="py-3">
                    @if (!editMode()) {
                    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                        <div>
                            <p class="mb-0" style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Project Management</p>
                            <p class="mb-0" style="font-size:12px;color:#334155;">Update details, lifecycle status, and governance actions.</p>
                        </div>
                        <button matButton="filled" (click)="startEdit()">
                            <mat-icon class="material-icons-outlined">edit</mat-icon>
                            Edit Project
                        </button>
                    </div>

                    <div class="d-flex gap-2 flex-wrap mb-2">
                        <button matButton (click)="openArchiveDialog()" style="color:#f57c00;background:rgba(245,124,0,0.08);">
                            <mat-icon class="material-icons-outlined">archive</mat-icon>
                            Archive
                        </button>
                        <button matButton class="theme-red" style="background:rgba(239,68,68,0.08);" (click)="openHardDeleteDialog()">
                            <mat-icon class="material-icons-outlined">delete_forever</mat-icon>
                            Delete
                        </button>
                    </div>

                    @if (validStatusTransitions().length > 0) {
                    <mat-form-field appearance="outline" class="w-100 inline-small mb-0">
                        <mat-label>Change Status</mat-label>
                        <mat-select [ngModel]="null" (ngModelChange)="changeStatus($event)">
                            @for (opt of validStatusTransitions(); track opt.value) {
                                <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
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
                    <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>GitHub Repository URL <span class="text-secondary">(optional)</span></mat-label>
                        <input matInput name="editGithubRepoUrl" [(ngModel)]="editGithubRepoUrl" placeholder="https://github.com/owner/repository" />
                        <mat-hint>Accepted: github.com URL or owner/repository</mat-hint>
                    </mat-form-field>
                    <div class="row gx-2">
                        <div class="col-12 col-md-3">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Visibility</mat-label>
                                <mat-select name="editVisibility" [(ngModel)]="editVisibility">
                                    <mat-option value="PRIVATE">Private</mat-option>
                                    <mat-option value="PUBLIC">Public</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-3">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Start Date</mat-label>
                                <input matInput type="date" name="editStartDate" [(ngModel)]="editStartDate" />
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-3">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>End Date</mat-label>
                                <input matInput type="date" name="editEndDate" [(ngModel)]="editEndDate" #endDateCtrl="ngModel" [min]="editStartDate || ''" />
                                @if (editEndDate && editStartDate && editEndDate < editStartDate) {
                                <mat-error>End date must be after the start date.</mat-error>
                                }
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-3 d-flex align-items-start">
                            <button matButton class="w-100" style="min-height:40px;background:rgba(37,99,235,0.08);" [disabled]="availableMembers().length === 0" type="button" (click)="openAddMemberDialog()">
                                <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                Add Member
                            </button>
                        </div>
                    </div>
                    @if (editEndDate && editStartDate && editEndDate < editStartDate) {
                    <div class="d-flex align-items-center gap-2 mb-3 px-2 py-2 rounded" style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);">
                        <mat-icon class="material-icons-outlined theme-red" style="font-size:18px;width:18px;height:18px;">error_outline</mat-icon>
                        <span class="small" style="color:#dc3545">End date cannot be before the start date.</span>
                    </div>
                    }
                    <div class="d-flex gap-2 mb-0 flex-wrap">
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
            }

            @if (!historicalAt()) {
            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="py-3">
                    <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div>
                            <h4 class="mb-0">
                                <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">monitor_heart</mat-icon>
                                Project Health
                            </h4>
                            <p class="text-secondary small mb-0">Composite risk signal from timeline, activity, collaboration, and status freshness.</p>
                        </div>
                        <button matButton class="text-theme" (click)="loadProjectHealth()" [disabled]="projectHealthLoading()">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                            Refresh
                        </button>
                    </div>

                    @if (projectHealthLoading()) {
                        <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                            Loading project health...
                        </div>
                    } @else if (projectHealthError()) {
                        <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:#dc2626;">error_outline</mat-icon>
                            <p class="small mb-0" style="color:#991b1b;">{{ projectHealthError() }}</p>
                        </div>
                    } @else if (projectHealth(); as health) {
                        <div class="row gx-2 mb-2">
                            <div class="col-12 col-md-4 mb-2">
                                <div style="border:1px solid rgba(15,23,42,0.12);border-radius:12px;padding:12px;background:#fff;height:100%;">
                                    <p class="small text-secondary mb-1">Overall Health</p>
                                    <div class="d-flex align-items-center gap-2">
                                        <p class="mb-0 fw-semibold" style="font-size:30px;line-height:1;color:#0f172a;">{{ health.healthScore | number:'1.0-0' }}</p>
                                        <span class="badge" [style.background]="riskColor(health.riskLevel) + '1A'" [style.color]="riskColor(health.riskLevel)" [style.border]="'1px solid ' + riskColor(health.riskLevel) + '66'" style="font-size:10px;">
                                            {{ health.riskLevel }} RISK
                                        </span>
                                    </div>
                                    <div style="height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:8px;">
                                        <div style="height:100%;transition:width .25s ease;" [style.width.%]="health.healthScore" [style.background]="healthScoreColor(health.healthScore)"></div>
                                    </div>
                                    <p class="small text-secondary mb-0 mt-1" style="font-size:11px;">Generated {{ health.generatedAt | date:'short' }}</p>
                                </div>
                            </div>

                            <div class="col-12 col-md-8 mb-2">
                                <div class="row gx-2">
                                    <div class="col-6 col-lg-3 mb-2">
                                        <div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:8px 10px;">
                                            <p class="text-secondary mb-1" style="font-size:11px;">Timeline</p>
                                            <p class="fw-semibold mb-0" style="font-size:18px;" [style.color]="healthScoreColor(health.scores.timeline)">{{ health.scores.timeline | number:'1.0-0' }}</p>
                                        </div>
                                    </div>
                                    <div class="col-6 col-lg-3 mb-2">
                                        <div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:8px 10px;">
                                            <p class="text-secondary mb-1" style="font-size:11px;">Collab</p>
                                            <p class="fw-semibold mb-0" style="font-size:18px;" [style.color]="healthScoreColor(health.scores.collaboration)">{{ health.scores.collaboration | number:'1.0-0' }}</p>
                                        </div>
                                    </div>
                                    <div class="col-6 col-lg-3 mb-2">
                                        <div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:8px 10px;">
                                            <p class="text-secondary mb-1" style="font-size:11px;">Activity</p>
                                            <p class="fw-semibold mb-0" style="font-size:18px;" [style.color]="healthScoreColor(health.scores.activity)">{{ health.scores.activity | number:'1.0-0' }}</p>
                                        </div>
                                    </div>
                                    <div class="col-6 col-lg-3 mb-2">
                                        <div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:8px 10px;">
                                            <p class="text-secondary mb-1" style="font-size:11px;">Status</p>
                                            <p class="fw-semibold mb-0" style="font-size:18px;" [style.color]="healthScoreColor(health.scores.status)">{{ health.scores.status | number:'1.0-0' }}</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex flex-wrap gap-1 mb-2">
                                    <span class="badge badge-light">{{ health.signals.memberCount }} members</span>
                                    <span class="badge badge-light">{{ health.signals.eventsLast14d }} events / 14d</span>
                                    <span class="badge badge-light">Quota {{ health.signals.quotaPressurePct | number:'1.0-0' }}%</span>
                                    @if (health.signals.daysToDeadline !== null && health.signals.daysToDeadline !== undefined) {
                                        <span class="badge badge-light">Deadline in {{ health.signals.daysToDeadline }} day(s)</span>
                                    }
                                </div>

                                <div class="d-flex flex-column gap-1">
                                    @for (hint of health.hints; track $index) {
                                        <div class="d-flex align-items-start gap-1" style="font-size:12px;color:#334155;">
                                            <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;color:#64748b;">tips_and_updates</mat-icon>
                                            <span>{{ hint }}</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    } @else {
                        <p class="small text-secondary mb-0">Project health is not available for this project yet.</p>
                    }
                </mat-card-content>
            </mat-card>

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="py-3">
                    <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div>
                            <h4 class="mb-0">
                                <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">source</mat-icon>
                                GitHub Repository Intelligence
                            </h4>
                            <p class="text-secondary small mb-0">Connected to the repository URL saved in this project.</p>
                        </div>
                        <button matButton class="text-theme" (click)="refreshProjectRepoInsights()" [disabled]="projectRepoLoading()">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                            Refresh
                        </button>
                    </div>

                    @if (projectRepoLoading()) {
                        <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                            Loading repository insights...
                        </div>
                    } @else if (projectRepoError()) {
                        <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:#dc2626;">error_outline</mat-icon>
                            <p class="small mb-0" style="color:#991b1b;">{{ projectRepoError() }}</p>
                        </div>
                    } @else if (projectRepoInsights(); as repo) {
                        @if (!repo.repoLinked) {
                            <div style="border:1.5px dashed rgba(15,23,42,0.22);border-radius:10px;padding:12px;">
                                <p class="small mb-1" style="color:#0f172a;">No repository linked yet.</p>
                                <p class="small text-secondary mb-0">Edit this project and set a GitHub repository URL to enable insights.</p>
                            </div>
                        } @else {
                            @if (repo.warning) {
                                <div class="small mb-2" style="color:#92400e;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:7px 9px;">{{ repo.warning }}</div>
                            }

                            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                                <p class="fw-semibold mb-0" style="font-size:14px;color:#0f172a;">{{ repo.name || projectRepoLabel() }}</p>
                                @if (repo.topLanguage) {
                                    <span class="badge badge-light">Top language: {{ repo.topLanguage }}</span>
                                }
                                <span class="badge badge-light">{{ repo.visibility || 'public' }}</span>
                                @if (repo.htmlUrl) {
                                    <button matButton class="text-theme" style="padding:2px 8px;min-height:28px;line-height:1.2;" (click)="openExternal(repo.htmlUrl)">
                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">open_in_new</mat-icon>
                                        Open Repo
                                    </button>
                                }
                            </div>

                            <div class="row gx-2 mb-2">
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Stars</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.stars ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Forks</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.forks ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Watchers</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.watchers ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Open Issues</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.openIssues ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Open PRs</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.openPullRequests ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Contributor Sample</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.contributorsSampleCount ?? 0 }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Recent Commits</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ (repo.recentCommits || []).length }}</p>
                                    </div>
                                </div>
                                <div class="col-6 col-md-3 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#fff;">
                                        <p class="text-secondary mb-1" style="font-size:11px;">Last Push</p>
                                        <p class="fw-semibold mb-0" style="font-size:18px;color:#0f172a;">{{ repo.daysSinceLastPush ?? '—' }}</p>
                                        <p class="small mb-0 text-secondary" style="font-size:10px;">days ago</p>
                                    </div>
                                </div>
                            </div>

                            <div class="row gx-2 mb-2">
                                <div class="col-12 col-xl-5 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:12px;padding:10px 12px;background:#fff;">
                                        <div class="d-flex align-items-center justify-content-between mb-2">
                                            <p class="fw-semibold mb-0" style="font-size:13px;color:#0f172a;">Top Contributors</p>
                                            <span class="small text-secondary">Latest sampled contributors</span>
                                        </div>

                                        @if ((repo.topContributors || []).length === 0) {
                                            <p class="small text-secondary mb-0">No contributor data available.</p>
                                        } @else {
                                            @for (contributor of (repo.topContributors || []); track contributor.login; let i = $index) {
                                                <div class="d-flex align-items-center justify-content-between gap-2" [style.marginBottom.px]="i < (repo.topContributors || []).length - 1 ? 8 : 0">
                                                    <div class="d-flex align-items-center gap-2 overflow-hidden">
                                                        <div style="width:28px;height:28px;border-radius:999px;overflow:hidden;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#334155;">
                                                            @if (contributor.avatarUrl) {
                                                                <img [src]="contributor.avatarUrl" [alt]="contributor.login || 'contributor'" style="width:100%;height:100%;object-fit:cover;" />
                                                            } @else {
                                                                {{ ((contributor.login || '?').charAt(0) || '?').toUpperCase() }}
                                                            }
                                                        </div>
                                                        <button matButton class="text-theme" style="padding:0;min-width:0;line-height:1.1;" (click)="openExternal(contributor.profileUrl)">
                                                            {{ contributor.login || 'unknown' }}
                                                        </button>
                                                    </div>
                                                    <span class="badge badge-light">{{ contributor.contributions || 0 }} commits</span>
                                                </div>
                                            }
                                        }
                                    </div>
                                </div>

                                <div class="col-12 col-xl-7 mb-2">
                                    <div style="border:1px solid rgba(15,23,42,0.1);border-radius:12px;padding:10px 12px;background:#fff;">
                                        <div class="d-flex align-items-center justify-content-between mb-2">
                                            <p class="fw-semibold mb-0" style="font-size:13px;color:#0f172a;">Recent Commit Activity</p>
                                            <span class="small text-secondary">Latest push history sample</span>
                                        </div>

                                        @if ((repo.recentCommits || []).length === 0) {
                                            <p class="small text-secondary mb-0">No commit history available.</p>
                                        } @else {
                                            @for (commit of (repo.recentCommits || []); track commit.sha; let i = $index) {
                                                <div class="d-flex justify-content-between gap-2" [style.marginBottom.px]="i < (repo.recentCommits || []).length - 1 ? 10 : 0">
                                                    <div class="overflow-hidden">
                                                        <button matButton class="text-theme" style="padding:0;min-width:0;line-height:1.25;text-align:left;white-space:normal;display:inline;" (click)="openExternal(commit.url)">
                                                            {{ (commit.title || commit.message || 'Commit') | slice:0:92 }}
                                                        </button>
                                                        <p class="small text-secondary mb-0" style="font-size:11px;">{{ commit.authorName || commit.authorLogin || 'Unknown author' }}</p>
                                                    </div>
                                                    <span class="small text-secondary flex-shrink-0">{{ commit.authorDate ? (commit.authorDate | date:'MMM d') : 'n/a' }}</span>
                                                </div>
                                            }
                                        }
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex flex-wrap gap-1">
                                @if (repo.defaultBranch) {
                                    <span class="badge badge-light">Branch: {{ repo.defaultBranch }}</span>
                                }
                                @if (repo.lastPushAt) {
                                    <span class="badge badge-light">Last push {{ repo.lastPushAt | date:'mediumDate' }}</span>
                                }
                                @if (repo.providerStatus) {
                                    <span class="badge badge-light">Provider: {{ repo.providerStatus }}</span>
                                }
                            </div>
                        }
                    } @else {
                        <p class="small text-secondary mb-0">Repository insights are not available yet.</p>
                    }
                </mat-card-content>
            </mat-card>
            }

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

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="py-3">
                    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                        <div>
                            <h4 class="mb-0">
                                <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">event_upcoming</mat-icon>
                                Holidays During Project Duration
                            </h4>
                            <p class="text-secondary small mb-0">Only holidays between project start and end dates are included.</p>
                        </div>
                        <button matButton class="text-theme" (click)="refreshProjectDurationHolidays()" [disabled]="projectDurationHolidaysLoading()">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                            Refresh
                        </button>
                    </div>

                    <div class="row gx-2 mb-2">
                        <div class="col-8 col-md-4">
                            <mat-form-field appearance="outline" class="w-100 inline-small" style="margin:0;">
                                <mat-label>Country</mat-label>
                                <input matInput [(ngModel)]="projectHolidayCountry" maxlength="2" placeholder="TN" />
                            </mat-form-field>
                        </div>
                        <div class="col-4 col-md-2 d-flex align-items-center">
                            <button matButton="filled" class="text-theme w-100" (click)="refreshProjectDurationHolidays()" [disabled]="projectDurationHolidaysLoading()">Load</button>
                        </div>
                        <div class="col-12 col-md-6 d-flex align-items-center gap-1 flex-wrap">
                            @if (projectDurationSpanDays() !== null) {
                                <span class="badge badge-light">{{ projectDurationSpanDays() }} day range</span>
                            }
                            <span class="badge badge-light">{{ projectDurationHolidays().length }} holidays in range</span>
                            <span class="badge badge-light">{{ projectDurationUpcomingCount() }} upcoming</span>
                        </div>
                    </div>

                    @if (!project()?.startDate || !project()?.endDate) {
                        <div style="border:1.5px dashed rgba(15,23,42,0.2);border-radius:10px;padding:12px;">
                            <p class="small text-secondary mb-0">
                                Set both start and end dates to calculate holidays during the project window.
                            </p>
                        </div>
                    } @else if (projectDurationHolidaysLoading()) {
                        <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                            Loading project-range holidays...
                        </div>
                    } @else if (projectDurationHolidaysError()) {
                        <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:#dc2626;">error_outline</mat-icon>
                            <p class="small mb-0" style="color:#991b1b;">{{ projectDurationHolidaysError() }}</p>
                        </div>
                    } @else if (projectDurationHolidays().length === 0) {
                        <div style="border:1.5px dashed rgba(14,165,233,0.3);border-radius:10px;padding:12px;background:rgba(14,165,233,0.06);">
                            <p class="small mb-0" style="color:#0c4a6e;">No holidays found inside this project duration for {{ projectHolidayCountry.toUpperCase() }}.</p>
                        </div>
                    } @else {
                        @if (nextProjectDurationHoliday(); as nextHoliday) {
                            <div class="mb-2" style="border:1px solid rgba(34,197,94,0.35);border-radius:10px;padding:8px 10px;background:linear-gradient(90deg,rgba(34,197,94,0.12),rgba(16,185,129,0.07));">
                                <p class="mb-0" style="font-size:11px;font-weight:600;color:#166534;">Closest upcoming holiday in this project timeline</p>
                                <div class="d-flex align-items-center justify-content-between gap-2">
                                    <p class="mb-0 fw-semibold text-truncate" style="font-size:13px;color:#14532d;">{{ nextHoliday.localName || nextHoliday.name }}</p>
                                    <span class="badge" style="background:rgba(21,128,61,0.15);color:#166534;border:1px solid rgba(21,128,61,0.35);font-size:10px;">
                                        @if (projectHolidayRelativeDays(nextHoliday) === 0) {
                                            Today
                                        } @else if (projectHolidayRelativeDays(nextHoliday) === 1) {
                                            Tomorrow
                                        } @else {
                                            In {{ projectHolidayRelativeDays(nextHoliday) }} days
                                        }
                                    </span>
                                </div>
                                <p class="mb-0" style="font-size:11px;color:#166534;">{{ nextHoliday.date | date:'fullDate' }}</p>
                            </div>
                        } @else {
                            <div class="mb-2" style="border:1px solid rgba(14,165,233,0.25);border-radius:10px;padding:8px 10px;background:rgba(14,165,233,0.07);">
                                <p class="mb-0" style="font-size:11px;color:#075985;">All holidays in this project duration are already passed.</p>
                            </div>
                        }

                        <div class="d-flex flex-column gap-1" style="max-height:230px;overflow:auto;">
                            @for (holiday of projectDurationHolidays(); track holiday.date + holiday.name) {
                                <div
                                    class="d-flex align-items-center justify-content-between gap-2"
                                    [style.border]="isNextProjectDurationHoliday(holiday) ? '1px solid rgba(22,163,74,0.4)' : '1px solid rgba(15,23,42,0.1)'"
                                    [style.background]="isNextProjectDurationHoliday(holiday) ? 'linear-gradient(90deg,rgba(34,197,94,0.12),rgba(34,197,94,0.05))' : '#fff'"
                                    style="border-radius:8px;padding:6px 8px;">
                                    <div class="d-flex align-items-center gap-2" style="min-width:0;">
                                        <span style="display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;background:rgba(15,23,42,0.06);font-size:10px;color:#334155;white-space:nowrap;">
                                            {{ holiday.date | date:'MMM d' }}
                                        </span>
                                        <div style="min-width:0;">
                                            <p class="mb-0 text-truncate" style="font-size:12px;color:#0f172a;">{{ holiday.localName || holiday.name }}</p>
                                            <p class="mb-0 text-secondary" style="font-size:10px;">{{ holiday.date | date:'fullDate' }}</p>
                                        </div>
                                    </div>

                                    <div class="d-flex flex-column align-items-end gap-1">
                                        @if (holiday.global) {
                                            <span class="badge badge-light" style="font-size:10px;">Global</span>
                                        }
                                        <span class="badge" style="font-size:10px;background:rgba(99,102,241,0.12);color:#4f46e5;border:1px solid rgba(99,102,241,0.25);">
                                            @if (projectHolidayRelativeDays(holiday) > 1) {
                                                In {{ projectHolidayRelativeDays(holiday) }}d
                                            } @else if (projectHolidayRelativeDays(holiday) === 1) {
                                                Tomorrow
                                            } @else if (projectHolidayRelativeDays(holiday) === 0) {
                                                Today
                                            } @else {
                                                Passed
                                            }
                                        </span>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </mat-card-content>
            </mat-card>

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

            <mat-card class="mb-3 mb-lg-4">
                <mat-card-content class="py-3">
                    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                        <div>
                            <h5 class="mb-0">
                                Milestones &amp; Tasks
                                @if (milestoneSnapshot().length > 0) {
                                    <span class="badge badge-light ms-1" style="font-size:11px;">{{ milestoneSnapshot().length }} milestones</span>
                                }
                            </h5>
                            <p class="text-secondary small mb-0">Compact execution view linked to Milestones and Task modules.</p>
                        </div>
                        <button matButton class="text-theme" (click)="openMilestonesBoard()">
                            <mat-icon class="material-icons-outlined">flag</mat-icon>
                            Open Milestones Board
                        </button>
                    </div>

                    <div class="row gx-2 mb-2">
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(14,165,233,0.25);border-radius:10px;background:rgba(14,165,233,0.07);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Milestones</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#0369a1;">{{ milestoneSnapshot().length }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(16,185,129,0.26);border-radius:10px;background:rgba(16,185,129,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Tasks in Milestones</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#047857;">{{ milestoneTaskTotal() }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(34,197,94,0.26);border-radius:10px;background:rgba(34,197,94,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Completed Tasks</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#15803d;">{{ completedMilestoneTasks() }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(239,68,68,0.25);border-radius:10px;background:rgba(239,68,68,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">High Priority Tasks</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#b91c1c;">{{ highPriorityMilestoneTasks() }}</p>
                            </div>
                        </div>
                    </div>

                    @if (milestonesLoading()) {
                        <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                            Loading milestones and tasks snapshot...
                        </div>
                    }

                    @if (milestonesError()) {
                        <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:#dc2626;">error_outline</mat-icon>
                            <div>
                                <p class="small fw-medium mb-0" style="color:#dc2626;">Milestone snapshot unavailable</p>
                                <p class="small mb-0 text-secondary">{{ milestonesError() }}</p>
                            </div>
                        </div>
                    }

                    @if (!milestonesLoading() && !milestonesError() && milestoneSnapshot().length === 0) {
                        <div style="border:1.5px dashed rgba(0,0,0,0.12);border-radius:10px;padding:14px;text-align:center;">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:24px;width:24px;height:24px;">flag</mat-icon>
                            <p class="small text-secondary mb-1">No milestones yet for this project.</p>
                            <button matButton class="text-theme" (click)="openMilestonesBoard()">
                                <mat-icon class="material-icons-outlined">add</mat-icon>
                                Create first milestone
                            </button>
                        </div>
                    }

                    @if (!milestonesLoading() && milestoneSnapshot().length > 0) {
                        <div class="d-flex flex-column gap-2">
                            @for (milestone of milestoneSnapshot(); track milestone.id) {
                                <div style="border:1px solid rgba(15,23,42,0.12);border-radius:12px;padding:10px;background:#fff;">
                                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                                        <div>
                                            <p class="fw-semibold mb-0" style="font-size:13px;color:#0f172a;">{{ milestone.name }}</p>
                                            <p class="small text-secondary mb-0" style="font-size:11px;">
                                                Due: {{ milestone.dueDate ? (milestone.dueDate | date:'mediumDate') : 'No due date' }}
                                            </p>
                                        </div>
                                        <span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;border:1px solid;"
                                            [style.color]="milestoneStatusColor(milestone.status)"
                                            [style.borderColor]="milestoneStatusColor(milestone.status) + '66'"
                                            [style.background]="milestoneStatusColor(milestone.status) + '1A'">
                                            {{ milestoneStatusLabel(milestone.status) }}
                                        </span>
                                    </div>

                                    <div class="d-flex flex-wrap gap-1 mb-2">
                                        <span class="badge badge-light" style="font-size:10px;">{{ milestone.taskCount }} tasks</span>
                                        <span class="badge badge-light" style="font-size:10px;">{{ milestone.doneTaskCount }} done</span>
                                        <span class="badge badge-light" style="font-size:10px;">{{ milestone.highPriorityTaskCount }} high priority</span>
                                        <span class="badge badge-light" style="font-size:10px;">{{ milestone.completionPct | number:'1.0-0' }}% milestone completion</span>
                                    </div>

                                    <div class="d-flex align-items-center gap-2">
                                        <div style="flex:1;height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
                                            <div style="height:100%;background:linear-gradient(90deg,#2563eb,#14b8a6);" [style.width.%]="milestone.completionPct"></div>
                                        </div>
                                        <button matButton class="text-theme" (click)="openMilestoneTasks(milestone.id)">
                                            <mat-icon class="material-icons-outlined">checklist</mat-icon>
                                            Tasks
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </mat-card-content>
            </mat-card>

            <div class="row gx-3 gx-lg-4">
                <div class="col-12">
                    <mat-card class="mb-3 mb-lg-4">
                        <mat-card-content class="pb-0">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h3 class="mb-1">Members</h3>
                                    <p class="text-secondary small mb-0">Live project members with workspace-style management</p>
                                </div>
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
    private readonly milestoneService = inject(MilestoneService);
    private readonly taskService = inject(TaskService);

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
    editGithubRepoUrl = "";
    editVisibility: "PUBLIC" | "PRIVATE" = "PRIVATE";
    editStartDate = "";
    editEndDate = "";

    readonly project = signal<M2ProjectSummary | null>(null);
    readonly workspaceName = signal("-");
    readonly workspaceOrgType = signal("enterprise");

    readonly members = signal<ProjectMemberView[]>([]);
    readonly availableMembers = signal<M2AvailableWorkspaceMember[]>([]);
    readonly milestoneSnapshot = signal<ProjectMilestoneSnapshot[]>([]);
    readonly milestonesLoading = signal(false);
    readonly milestonesError = signal<string | null>(null);
    readonly projectHealth = signal<M2ProjectHealthResponse | null>(null);
    readonly projectHealthLoading = signal(false);
    readonly projectHealthError = signal<string | null>(null);
    readonly projectRepoInsights = signal<M2ProjectRepoInsightsResponse | null>(null);
    readonly projectRepoLoading = signal(false);
    readonly projectRepoError = signal<string | null>(null);
    readonly projectDurationHolidays = signal<M2WorkspaceHoliday[]>([]);
    readonly projectDurationHolidaysLoading = signal(false);
    readonly projectDurationHolidaysError = signal<string | null>(null);

    projectHolidayCountry = "TN";

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

    readonly projectDurationSpanDays = computed(() => {
        const project = this.project();
        const start = this.parseIsoDate(project?.startDate || null);
        const end = this.parseIsoDate(project?.endDate || null);
        if (!start || !end) return null;
        const startMs = Math.min(start.getTime(), end.getTime());
        const endMs = Math.max(start.getTime(), end.getTime());
        return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    });

    readonly projectDurationUpcomingCount = computed(() =>
        this.projectDurationHolidays().filter((holiday) => this.projectHolidayRelativeDays(holiday) >= 0).length
    );

    readonly nextProjectDurationHoliday = computed(() =>
        this.projectDurationHolidays().find((holiday) => this.projectHolidayRelativeDays(holiday) >= 0) ?? null
    );

    readonly parsedProjectPhases = computed((): Array<{ name?: string; durationDays?: number }> => {
        const json = this.project()?.phasesJson;
        if (!json) return [];
        try {
            const a = JSON.parse(json);
            return Array.isArray(a) ? a as Array<{ name?: string; durationDays?: number }> : [];
        } catch { return []; }
    });

    readonly projectRepoLabel = computed(() => {
        const url = (this.project()?.githubRepoUrl || "").trim();
        if (!url) return "Repository";
        const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/i);
        if (match?.[1]) return match[1].replace(/\.git$/i, "");
        if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(url)) return url.replace(/\.git$/i, "");
        return url;
    });

    readonly milestoneTaskTotal = computed(() =>
        this.milestoneSnapshot().reduce((sum, milestone) => sum + milestone.taskCount, 0)
    );
    readonly completedMilestoneTasks = computed(() =>
        this.milestoneSnapshot().reduce((sum, milestone) => sum + milestone.doneTaskCount, 0)
    );
    readonly highPriorityMilestoneTasks = computed(() =>
        this.milestoneSnapshot().reduce((sum, milestone) => sum + milestone.highPriorityTaskCount, 0)
    );

    phaseColor(index: number): string {
        const colors = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#f97316"];
        return colors[index % colors.length];
    }

    milestoneStatusLabel(status: string): string {
        const normalized = (status || "").toLowerCase();
        if (normalized === "done" || normalized === "completed") return "Completed";
        if (normalized === "in_progress") return "In Progress";
        if (normalized === "on_hold") return "On Hold";
        if (normalized === "cancelled") return "Cancelled";
        return normalized ? normalized.replace(/[_-]+/g, " ") : "Pending";
    }

    milestoneStatusColor(status: string): string {
        const normalized = (status || "").toLowerCase();
        if (normalized === "done" || normalized === "completed") return "#16a34a";
        if (normalized === "in_progress") return "#2563eb";
        if (normalized === "on_hold") return "#f59e0b";
        if (normalized === "cancelled") return "#dc2626";
        return "#64748b";
    }

    healthScoreColor(score: number): string {
        if (score >= 80) return "#16a34a";
        if (score >= 60) return "#f59e0b";
        return "#dc2626";
    }

    riskColor(level: string): string {
        const normalized = (level || "").toUpperCase();
        if (normalized === "LOW") return "#16a34a";
        if (normalized === "MEDIUM") return "#f59e0b";
        return "#dc2626";
    }

    openMilestonesBoard(): void {
        this.router.navigate(["/app/milestones"], {
            queryParams: {
                projectId: this.projectId(),
                ...this.historicalQueryParams(),
            },
        });
    }

    openMilestoneTasks(milestoneId: number): void {
        this.router.navigate(["/app/all-tasks"], {
            queryParams: {
                milestoneId,
                projectId: this.projectId(),
                ...this.historicalQueryParams(),
            },
        });
    }

    refreshProjectRepoInsights(): void {
        this.loadProjectRepoInsights(this.workspaceId(), this.projectId());
    }

    openProjectRepository(): void {
        const url = this.project()?.githubRepoUrl;
        if (!url) return;
        this.openExternal(url);
    }

    openExternal(url?: string | null): void {
        if (!url) return;
        const trimmed = url.trim();
        const hasScheme = /^https?:\/\//i.test(trimmed);
        const githubShort = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed);
        const target = hasScheme
            ? trimmed
            : githubShort
                ? `https://github.com/${trimmed}`
                : `https://${trimmed}`;
        window.open(target, "_blank", "noopener,noreferrer");
    }

    refreshProjectDurationHolidays(): void {
        this.loadProjectDurationHolidays(this.workspaceId(), this.project());
    }

    projectHolidayRelativeDays(holiday: M2WorkspaceHoliday): number {
        const holidayDate = this.parseIsoDate(holiday.date);
        if (!holidayDate) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.floor((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    isNextProjectDurationHoliday(holiday: M2WorkspaceHoliday): boolean {
        const next = this.nextProjectDurationHoliday();
        if (!next) return false;
        return next.date === holiday.date && (next.name || "") === (holiday.name || "");
    }

    private loadProjectDurationHolidays(workspaceId: string, project: M2ProjectSummary | null): void {
        if (!workspaceId || !project?.startDate || !project?.endDate) {
            this.projectDurationHolidays.set([]);
            this.projectDurationHolidaysLoading.set(false);
            this.projectDurationHolidaysError.set(null);
            return;
        }

        const startDate = this.parseIsoDate(project.startDate);
        const endDate = this.parseIsoDate(project.endDate);
        if (!startDate || !endDate) {
            this.projectDurationHolidays.set([]);
            this.projectDurationHolidaysLoading.set(false);
            this.projectDurationHolidaysError.set("Project start/end dates are invalid for holiday range calculation.");
            return;
        }

        const rangeStart = new Date(Math.min(startDate.getTime(), endDate.getTime()));
        const rangeEnd = new Date(Math.max(startDate.getTime(), endDate.getTime()));
        const country = (this.projectHolidayCountry || "TN").trim().toUpperCase().slice(0, 2) || "TN";
        this.projectHolidayCountry = country;

        const startYear = rangeStart.getFullYear();
        const endYear = rangeEnd.getFullYear();
        const years: number[] = [];
        for (let year = startYear; year <= endYear; year++) {
            years.push(year);
        }

        this.projectDurationHolidaysLoading.set(true);
        this.projectDurationHolidaysError.set(null);

        const requests = years.map((year) =>
            this.workspaceService.getWorkspaceHolidays(workspaceId, country, year).pipe(catchError(() => of(null)))
        );

        forkJoin(requests).subscribe({
            next: (payloads) => {
                const dedup = new Map<string, M2WorkspaceHoliday>();

                for (const payload of payloads) {
                    const items = payload?.items || [];
                    for (const holiday of items) {
                        const date = this.parseIsoDate(holiday.date);
                        if (!date) continue;
                        if (date.getTime() < rangeStart.getTime() || date.getTime() > rangeEnd.getTime()) {
                            continue;
                        }
                        const key = `${holiday.date}|${holiday.localName || holiday.name || ""}`;
                        if (!dedup.has(key)) {
                            dedup.set(key, holiday);
                        }
                    }
                }

                const filtered = Array.from(dedup.values()).sort((left, right) => {
                    const leftTs = this.parseIsoDate(left.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                    const rightTs = this.parseIsoDate(right.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
                    if (leftTs !== rightTs) return leftTs - rightTs;
                    return (left.localName || left.name || "").localeCompare(right.localName || right.name || "");
                });

                this.projectDurationHolidays.set(filtered);
                this.projectDurationHolidaysLoading.set(false);
            },
            error: () => {
                this.projectDurationHolidays.set([]);
                this.projectDurationHolidaysLoading.set(false);
                this.projectDurationHolidaysError.set("Unable to load holidays for this project duration.");
            },
        });
    }

    private loadMilestoneSnapshot(projectId: string): void {
        if (!projectId) {
            this.milestoneSnapshot.set([]);
            this.milestonesLoading.set(false);
            this.milestonesError.set(null);
            return;
        }

        this.milestonesLoading.set(true);
        this.milestonesError.set(null);
        this.milestoneSnapshot.set([]);

        this.milestoneService.getAll().pipe(
            catchError(() => {
                this.milestonesError.set("Unable to load milestones for this project.");
                this.milestonesLoading.set(false);
                return of([] as Milestone[]);
            })
        ).subscribe((milestones) => {
            const related = (milestones || []).filter((milestone) => {
                const milestoneProjectId = milestone.projectId ?? milestone.project?.id;
                return milestoneProjectId === projectId && milestone.id !== undefined && milestone.id !== null;
            });

            if (related.length === 0) {
                this.milestoneSnapshot.set([]);
                this.milestonesLoading.set(false);
                return;
            }

            const calls = related.map((milestone) =>
                this.taskService.getTasksByMilestone(Number(milestone.id)).pipe(
                    catchError(() => of([] as TaskResponseDto[])),
                    map((tasks) => ({ milestone, tasks }))
                )
            );

            forkJoin(calls).subscribe({
                next: (rows) => {
                    const snapshot = rows.map((row): ProjectMilestoneSnapshot => {
                        const taskCount = row.tasks.length;
                        const doneTaskCount = row.tasks.filter((task) => {
                            const status = (task.status || "").toUpperCase();
                            return status === "DONE" || status === "COMPLETED";
                        }).length;
                        const highPriorityTaskCount = row.tasks.filter((task) => (task.priority || "").toUpperCase() === "HIGH").length;

                        return {
                            id: Number(row.milestone.id),
                            name: row.milestone.name || `Milestone #${row.milestone.id}`,
                            status: row.milestone.status || "pending",
                            dueDate: row.milestone.dueDate || null,
                            completionPct: Math.max(0, Math.min(100, Number(row.milestone.completionPct ?? 0) || 0)),
                            taskCount,
                            doneTaskCount,
                            highPriorityTaskCount,
                        };
                    }).sort((left, right) => {
                        const leftDue = left.dueDate ? Date.parse(left.dueDate) : Number.MAX_SAFE_INTEGER;
                        const rightDue = right.dueDate ? Date.parse(right.dueDate) : Number.MAX_SAFE_INTEGER;
                        if (leftDue !== rightDue) return leftDue - rightDue;
                        return left.name.localeCompare(right.name);
                    });

                    this.milestoneSnapshot.set(snapshot);
                    this.milestonesLoading.set(false);
                },
                error: () => {
                    this.milestoneSnapshot.set([]);
                    this.milestonesError.set("Unable to build milestone task snapshot.");
                    this.milestonesLoading.set(false);
                },
            });
        });
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
        this.editGithubRepoUrl = p.githubRepoUrl || "";
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
            this.editGithubRepoUrl = p.githubRepoUrl || "";
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
            githubRepoUrl: this.editGithubRepoUrl.trim() || null,
            visibility: this.editVisibility,
        };
        if (this.editStartDate) body["startDate"] = this.editStartDate;
        if (this.editEndDate) body["endDate"] = this.editEndDate;

        this.projectService.updateProject(this.workspaceId(), this.projectId(), body).subscribe({
            next: (updated) => {
                this.project.set(updated);
                this.loadProjectDurationHolidays(this.workspaceId(), updated);
                this.loadProjectRepoInsights(this.workspaceId(), this.projectId());
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
        this.projectHealthError.set(null);
        this.projectHealthLoading.set(!this.historicalAt());
        this.projectRepoError.set(null);
        this.projectRepoLoading.set(!this.historicalAt());

        const healthRequest = this.historicalAt()
            ? of(null)
            : this.projectService.getProjectHealth(workspaceId, projectId).pipe(catchError(() => of(null)));

        forkJoin({
            project: this.projectService.getProjectById(workspaceId, projectId),
            projectMembers: this.projectService.getProjectMembers(workspaceId, projectId),
            availableMembers: this.projectService.getAvailableWorkspaceMembers(workspaceId, projectId).pipe(catchError(() => of([]))),
            workspace: this.workspaceService.getWorkspaceById(workspaceId).pipe(catchError(() => of(null))),
            workspaceMembers: this.workspaceService.getWorkspaceMembers(workspaceId).pipe(catchError(() => of([]))),
            health: healthRequest,
        }).subscribe({
            next: (payload) => {
                this.project.set(payload.project);
                this.availableMembers.set(payload.availableMembers);

                this.workspaceName.set(payload.workspace?.name || "Workspace");
                this.workspaceOrgType.set(((payload.workspace?.orgType || "enterprise") + "").toLowerCase());

                this.members.set(this.mapProjectMembers(payload.projectMembers, payload.workspaceMembers));
                this.loadMilestoneSnapshot(payload.project.id);
                this.loadProjectDurationHolidays(workspaceId, payload.project);
                this.loadProjectRepoInsights(workspaceId, projectId);
                this.projectHealth.set(payload.health);
                this.projectHealthLoading.set(false);
                this.isLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.project.set(null);
                this.members.set([]);
                this.availableMembers.set([]);
                this.milestoneSnapshot.set([]);
                this.milestonesLoading.set(false);
                this.milestonesError.set(null);
                this.projectHealth.set(null);
                this.projectHealthLoading.set(false);
                this.projectHealthError.set("Unable to load project health.");
                this.projectRepoInsights.set(null);
                this.projectRepoLoading.set(false);
                this.projectRepoError.set("Unable to load repository insights.");
                this.projectDurationHolidays.set([]);
                this.projectDurationHolidaysLoading.set(false);
                this.projectDurationHolidaysError.set("Unable to load project-duration holidays.");
                this.error.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    private loadProjectRepoInsights(workspaceId: string, projectId: string): void {
        if (this.historicalAt()) {
            this.projectRepoInsights.set(null);
            this.projectRepoLoading.set(false);
            this.projectRepoError.set("Repository insights are disabled in historical mode.");
            return;
        }
        if (!workspaceId || !projectId) {
            this.projectRepoInsights.set(null);
            this.projectRepoLoading.set(false);
            this.projectRepoError.set(null);
            return;
        }

        this.projectRepoLoading.set(true);
        this.projectRepoError.set(null);

        this.projectService.getProjectRepoInsights(workspaceId, projectId).subscribe({
            next: (payload) => {
                this.projectRepoInsights.set(payload);
                this.projectRepoLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.projectRepoInsights.set(null);
                this.projectRepoLoading.set(false);
                this.projectRepoError.set(this.errorMessage(error));
            },
        });
    }

    loadProjectHealth(): void {
        if (this.historicalAt()) {
            this.projectHealth.set(null);
            this.projectHealthLoading.set(false);
            this.projectHealthError.set("Project health is disabled in historical mode.");
            return;
        }

        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) return;

        this.projectHealthLoading.set(true);
        this.projectHealthError.set(null);

        this.projectService.getProjectHealth(workspaceId, projectId).subscribe({
            next: (health) => {
                this.projectHealth.set(health);
                this.projectHealthLoading.set(false);
            },
            error: () => {
                this.projectHealth.set(null);
                this.projectHealthLoading.set(false);
                this.projectHealthError.set("Unable to refresh project health.");
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

    private parseIsoDate(rawDate: string | null | undefined): Date | null {
        if (!rawDate) return null;
        const parts = String(rawDate).split("-");
        if (parts.length < 3) return null;
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
            return null;
        }
        return new Date(year, month - 1, day);
    }
}
