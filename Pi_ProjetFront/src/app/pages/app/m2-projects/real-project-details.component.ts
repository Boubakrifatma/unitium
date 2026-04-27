import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from "@angular/forms";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
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
        ReactiveFormsModule,
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
    styles: [`
        @keyframes slideDown {
            from {
                opacity: 0;
                max-height: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                max-height: 2000px;
                transform: translateY(0);
            }
        }
    `],
    template: `
        <!-- Modern Header -->
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:3rem 2rem;box-shadow:0 12px 40px rgba(102,126,234,0.2);position:relative;overflow:hidden;">
            <div style="position:absolute;top:-50%;right:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(255,255,255,0.1),transparent 70%);pointer-events:none;"></div>
            <div style="max-width:1420px;margin:0 auto;position:relative;z-index:2;">
                <!-- Breadcrumb -->
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1.5rem;font-size:0.85rem;color:rgba(255,255,255,0.8);font-weight:500;">
                    <span style="cursor:pointer;transition:all 0.2s;" routerLink="/app/dashboard">Dashboard</span>
                    <mat-icon style="font-size:16px;width:16px;height:16px;">chevron_right</mat-icon>
                    <span style="cursor:pointer;transition:all 0.2s;" [routerLink]="['/app/real-projects']" [queryParams]="workspaceId() ? { workspaceId: workspaceId(), ...historicalQueryParams() } : historicalQueryParams()">Projects</span>
                    <mat-icon style="font-size:16px;width:16px;height:16px;">chevron_right</mat-icon>
                    <span style="color:rgba(255,255,255,0.95);">{{ project()?.name || "Project Details" }}</span>
                </div>

                <!-- Title and Actions -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:2rem;flex-wrap:wrap;">
                    <div>
                        <h1 style="margin:0;color:white;font-size:2.2rem;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">{{ project()?.name || "Project" }}</h1>
                        <p style="margin:0.8rem 0 0;color:rgba(255,255,255,0.85);font-size:0.95rem;">Workspace: <strong>{{ workspaceName() }}</strong></p>
                    </div>
                    <div style="display:flex;gap:0.8rem;flex-wrap:wrap;">
                        <button matButton (click)="backToRealProjects()" style="background:rgba(255,255,255,0.15);color:white;border-radius:10px;transition:all 0.2s;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">arrow_back</mat-icon>
                            Back
                        </button>
                        <button matButton (click)="refresh()" style="background:rgba(255,255,255,0.15);color:white;border-radius:10px;transition:all 0.2s;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">refresh</mat-icon>
                            Refresh
                        </button>
                        <button matButton [disabled]="isLoading()" (click)="openReadmePreview()" style="background:rgba(255,255,255,0.15);color:white;border-radius:10px;transition:all 0.2s;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">description</mat-icon>
                            README
                        </button>
                        <button matButton [disabled]="!canManageProjects()" (click)="startEdit()" style="background:white;color:#667eea;border-radius:10px;font-weight:700;transition:all 0.2s;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">edit</mat-icon>
                            Edit Project
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content Area -->
        <div style="background:#fafbfc;padding:2rem;min-height:100vh;">
            <div style="max-width:1420px;margin:0 auto;">
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
            <!-- Enhanced Project Command Center -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);transition:all 0.3s ease;">
                <div style="padding:2rem;background:linear-gradient(135deg,rgba(102,126,234,0.05) 0%,rgba(118,75,162,0.05) 100%);border-bottom:1px solid #e5e7eb;">
                    <!-- Header -->
                    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-1.5">
                        <div style="flex:1;min-width:0;">
                            <p style="margin:0 0 0.5rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:700;">Project Command Center</p>
                            <h2 style="margin:0 0 0.5rem;font-size:1.8rem;font-weight:700;color:#0f172a;letter-spacing:-0.5px;line-height:1.2;">{{ project()?.name }}</h2>
                            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center;font-size:0.95rem;">
                                <span style="color:#334155;">
                                    <strong style="color:#667eea;">{{ statusLabel(projectStatus()) }}</strong>
                                </span>
                                <span style="color:#cbd5e1;">·</span>
                                <span style="color:#334155;">
                                    <strong style="color:#667eea;">{{ projectVisibility() }}</strong>
                                </span>
                                <span style="color:#cbd5e1;">·</span>
                                <span style="color:#334155;">{{ projectDurationLabel() }} running</span>
                            </div>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.6rem;justify-content:flex-end;flex-shrink:0;">
                            <span style="padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;">{{ statusLabel(projectStatus()) }}</span>
                            <span style="padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;background:#f0f4ff;color:#667eea;border:1px solid #dbeafe;">{{ projectVisibility() }}</span>
                            @if (projectRepoLabel() && project()?.githubRepoUrl) {
                                <button matButton (click)="openProjectRepository()" style="padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;background:#f8fafc;color:#667eea;border:1px solid #e2e8f0;transition:all 0.2s;">
                                    <mat-icon style="font-size:14px;width:14px;height:14px;margin-right:4px;">source</mat-icon>
                                    {{ projectRepoLabel() }}
                                </button>
                            }
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div style="margin-top:1.5rem;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;">
                            <span style="font-size:0.85rem;color:#475569;font-weight:600;">Timeline Progress</span>
                            <span style="font-size:1.25rem;font-weight:800;color:#667eea;">{{ timelineProgressPercent() }}%</span>
                        </div>
                        <div style="height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                            <div style="height:100%;transition:width 0.4s cubic-bezier(0.34,1.56,0.64,1);border-radius:999px;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);box-shadow:0 0 20px rgba(102,126,234,0.4);" [style.width.%]="timelineProgressPercent()" [style.background]="daysRemaining() !== null && daysRemaining()! < 0 ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#667eea,#764ba2)'"></div>
                        </div>
                    </div>

                    <!-- Timeline Info -->
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1.2rem;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid rgba(15,23,42,0.06);">
                        <div>
                            <p style="margin:0 0 0.4rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Start Date</p>
                            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">{{ startDateLabel() }}</p>
                        </div>
                        <div>
                            <p style="margin:0 0 0.4rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Deadline</p>
                            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">{{ endDateLabel() }}</p>
                        </div>
                        <div>
                            <p style="margin:0 0 0.4rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Created</p>
                            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">{{ createdAtLabel() }}</p>
                        </div>
                        <div>
                            <p style="margin:0 0 0.4rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Time Left</p>
                            <p style="margin:0;font-size:1.1rem;font-weight:700;color:#0f172a;">{{ daysRemainingLabel() }}</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;padding:2rem;background:#fafbfc;">
                    <div style="padding:1.5rem;background:white;border-radius:12px;border:1px solid #e5e7eb;transition:all 0.3s ease;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;">
                            <p style="margin:0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Team Members</p>
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">👥</div>
                        </div>
                        <p style="margin:0 0 0.5rem;font-size:2rem;font-weight:800;color:#0f172a;line-height:1;">{{ members().length }}</p>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">{{ leadershipCount() }} leaders</p>
                    </div>

                    <div style="padding:1.5rem;background:white;border-radius:12px;border:1px solid #e5e7eb;transition:all 0.3s ease;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;">
                            <p style="margin:0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Milestone Tasks</p>
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">✓</div>
                        </div>
                        <p style="margin:0 0 0.5rem;font-size:2rem;font-weight:800;color:#0f172a;line-height:1;">{{ milestoneTaskTotal() }}</p>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">{{ completedMilestoneTasks() }} completed</p>
                    </div>

                    <div style="padding:1.5rem;background:white;border-radius:12px;border:1px solid #e5e7eb;transition:all 0.3s ease;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;">
                            <p style="margin:0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Progress</p>
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">📊</div>
                        </div>
                        <p style="margin:0 0 0.5rem;font-size:2rem;font-weight:800;color:#0f172a;line-height:1;">{{ timelineProgressPercent() }}%</p>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">Timeline elapsed</p>
                    </div>

                    <div style="padding:1.5rem;background:white;border-radius:12px;border:1px solid #e5e7eb;transition:all 0.3s ease;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.8rem;">
                            <p style="margin:0;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Repo Health</p>
                            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">💻</div>
                        </div>
                        <p style="margin:0 0 0.5rem;font-size:2rem;font-weight:800;color:#0f172a;line-height:1;">{{ projectRepoInsights()?.providerStatus === 'live' ? 'Live' : 'Pending' }}</p>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">GitHub status</p>
                    </div>
                </div>
            </div>

            @if (canManageProjects()) {
            <!-- Project Management Section -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">⚙️</div>
                    <div style="flex:1;">
                        <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">Project Management</h5>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">Update details, lifecycle status, and governance actions.</p>
                    </div>
                </div>

                <div style="padding:1.5rem;background:white;">
                    @if (!editMode()) {
                        <div style="margin-bottom:1rem;">
                            <div class="d-flex gap-2 flex-wrap">
                                <button matButton (click)="startEdit()" style="background:rgba(102,126,234,0.08);color:#667eea;">
                                    <mat-icon class="material-icons-outlined">edit</mat-icon>
                                    Edit Project
                                </button>
                                <button matButton (click)="openArchiveDialog()" style="color:#f59e0b;background:rgba(245,124,0,0.08);">
                                    <mat-icon class="material-icons-outlined">archive</mat-icon>
                                    Archive
                                </button>
                                <button matButton style="background:rgba(239,68,68,0.08);color:#dc2626;" (click)="openHardDeleteDialog()">
                                    <mat-icon class="material-icons-outlined">delete_forever</mat-icon>
                                    Delete
                                </button>
                            </div>
                        </div>

                        @if (validStatusTransitions().length > 0) {
                            <mat-form-field appearance="outline" class="w-100 mb-0">
                                <mat-label>Change Status</mat-label>
                                <mat-select [ngModel]="null" (ngModelChange)="changeStatus($any($event))">
                                    @for (opt of validStatusTransitions(); track opt.value) {
                                        <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                                    }
                                </mat-select>
                            </mat-form-field>
                        }
                    }

                    @if (editMode() && editForm()) {
                        <form [formGroup]="editForm()!" (ngSubmit)="saveEdit()">
                            <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:1rem;">Edit Project Details</p>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Project Name</mat-label>
                                <input matInput formControlName="name" maxlength="150" />
                                <mat-hint align="end">{{ editForm()!.get('name')?.value?.length || 0 }}/150</mat-hint>
                                @if (editForm()!.get('name')?.touched) {
                                    @if (editForm()!.get('name')?.errors?.['required']) {
                                        <mat-error>Project name is required.</mat-error>
                                    }
                                    @if (editForm()!.get('name')?.errors?.['minlength']) {
                                        <mat-error>Name must be at least 3 characters.</mat-error>
                                    }
                                }
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Description <span class="text-secondary">(optional)</span></mat-label>
                                <textarea matInput rows="3" formControlName="description" maxlength="500"></textarea>
                                <mat-hint align="end">{{ editForm()!.get('description')?.value?.length || 0 }}/500</mat-hint>
                            </mat-form-field>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>GitHub Repository URL <span class="text-secondary">(optional)</span></mat-label>
                                <input matInput formControlName="githubRepoUrl" placeholder="https://github.com/owner/repository" />
                                <mat-hint>Accepted: github.com URL or owner/repository</mat-hint>
                            </mat-form-field>

                            <div class="row gx-2">
                                <div class="col-12 col-md-3">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Visibility</mat-label>
                                        <mat-select formControlName="visibility">
                                            <mat-option value="PRIVATE">Private</mat-option>
                                            <mat-option value="PUBLIC">Public</mat-option>
                                        </mat-select>
                                    </mat-form-field>
                                </div>
                                <div class="col-12 col-md-3">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Start Date</mat-label>
                                        <input matInput type="date" formControlName="startDate" />
                                    </mat-form-field>
                                </div>
                                <div class="col-12 col-md-3">
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>End Date</mat-label>
                                        <input matInput type="date" formControlName="endDate" />
                                        @if (editForm()!.get('endDate')?.errors?.['dateRange']) {
                                            <mat-error>End date must be after start date.</mat-error>
                                        }
                                    </mat-form-field>
                                </div>
                                <div class="col-12 col-md-3 d-flex align-items-start">
                                    <button matButton class="w-100" style="min-height:40px;background:rgba(102,126,234,0.08);color:#667eea;" [disabled]="availableMembers().length === 0" type="button" (click)="openAddMemberDialog()">
                                        <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                        Add Member
                                    </button>
                                </div>
                            </div>

                            @if (editForm()!.errors?.['dateRange'] || editForm()!.get('endDate')?.errors?.['dateRange']) {
                                <div class="d-flex align-items-center gap-2 mb-3 px-2 py-2 rounded" style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);">
                                    <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px;color:#dc2626;">error_outline</mat-icon>
                                    <span class="small" style="color:#dc3545">End date cannot be before the start date.</span>
                                </div>
                            }

                            <div class="d-flex gap-2 mb-0 flex-wrap">
                                <button matButton style="background:rgba(102,126,234,0.08);color:#667eea;" type="submit" [disabled]="editSaving()">
                                    @if (editSaving()) {
                                        <mat-icon class="material-icons-outlined" style="animation:spin 1s linear infinite;">cached</mat-icon>
                                        Saving...
                                    } @else {
                                        <mat-icon class="material-icons-outlined">save</mat-icon>
                                        Save Changes
                                    }
                                </button>
                                <button matButton type="button" [disabled]="editSaving()" (click)="cancelEdit()">Cancel</button>
                            </div>
                        </form>
                    }
                </div>
            </div>
            }

            @if (!historicalAt()) {
            <!-- Project Health (Collapsible) -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s ease;">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s ease;" (click)="healthExpanded = !healthExpanded">
                    <div style="flex:1;display:flex;align-items:center;gap:1rem;">
                        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">💚</div>
                        <div>
                            <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                                Project Health
                            </h5>
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">Composite risk signal from timeline, activity, collaboration, and status freshness.</p>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
                        <button matButton class="text-theme" (click)="loadProjectHealth();$event.stopPropagation()" [disabled]="projectHealthLoading()" style="color:#667eea;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px;">refresh</mat-icon>
                            Refresh
                        </button>
                        <mat-icon style="font-size:24px;width:24px;height:24px;color:#667eea;transition:transform 0.3s ease;transform:rotateX({{ healthExpanded ? '180deg' : '0' }});">expand_more</mat-icon>
                    </div>
                </div>

                @if (healthExpanded) {
                <div style="padding:1.5rem;animation:slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);">

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
                </div>
                }
            </div>
            }

            <!-- GitHub Repository Intelligence (Collapsible) -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s ease;">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s ease;" (click)="repoExpanded = !repoExpanded">
                    <div style="flex:1;display:flex;align-items:center;gap:1rem;">
                        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">💻</div>
                        <div>
                            <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                                GitHub Repository Intelligence
                            </h5>
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">Connected to the repository URL saved in this project.</p>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
                        <button matButton class="text-theme" (click)="refreshProjectRepoInsights();$event.stopPropagation()" [disabled]="projectRepoLoading()" style="color:#667eea;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px;">refresh</mat-icon>
                            Refresh
                        </button>
                        <mat-icon style="font-size:24px;width:24px;height:24px;color:#667eea;transition:transform 0.3s ease;transform:rotateX({{ repoExpanded ? '180deg' : '0' }});">expand_more</mat-icon>
                    </div>
                </div>

                @if (repoExpanded) {
                <div style="padding:1.5rem;animation:slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);">

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
                </div>
                }
            </div>

            <!-- Project Timeline Section -->
            @if (project()?.startDate || project()?.endDate) {
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#6366f1 0%,#818cf8 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">⏱️</div>
                    <div style="flex:1;">
                        <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">Project Timeline</h5>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">{{ startDateLabel() }} → {{ endDateLabel() }}</p>
                    </div>
                    <div class="text-end flex-shrink-0">
                        <p class="mb-0 fw-semibold" style="font-size:22px;color:#6366f1;">{{ timelineProgressPercent() }}%</p>
                        <p style="margin:0;font-size:0.75rem;color:#64748b;">elapsed</p>
                    </div>
                </div>

                <div style="padding:1.5rem;background:white;">
                    <div style="margin-bottom:1.5rem;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;">
                            <span style="font-size:0.85rem;color:#475569;font-weight:600;">Timeline Progress</span>
                            @if (daysRemaining() !== null) {
                                <span style="font-size:0.85rem;font-weight:600;">
                                    @if (daysRemaining()! < 0) { <span style="color:#dc2626;">Overdue by {{ -daysRemaining()! }} day{{ -daysRemaining()! !== 1 ? 's' : '' }}</span> }
                                    @else if (daysRemaining()! === 0) { <span style="color:#f59e0b;">Ends today</span> }
                                    @else { <span style="color:#16a34a;">{{ daysRemaining() }} day{{ daysRemaining() !== 1 ? 's' : '' }} remaining</span> }
                                </span>
                            }
                        </div>
                        <div style="height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
                            <div style="height:100%;transition:width 0.4s cubic-bezier(0.34,1.56,0.64,1);border-radius:999px;box-shadow:0 0 20px rgba(99,102,241,0.4);"
                                 [style.width.%]="timelineProgressPercent()"
                                 [style.background]="daysRemaining() !== null && daysRemaining()! < 0 ? 'linear-gradient(90deg,#dc2626,#ef4444)' : daysRemaining() === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#6366f1,#818cf8)'">
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between">
                        <span class="text-secondary" style="font-size:11px;">{{ startDateLabel() }}</span>
                        <span class="text-secondary" style="font-size:11px;">{{ endDateLabel() }}</span>
                    </div>

                    @if (!project()?.startDate || !project()?.endDate) {
                        <div style="border:1.5px dashed rgba(0,0,0,0.1);border-radius:10px;padding:12px;margin-top:1rem;text-align:center;">
                            <mat-icon class="material-icons-outlined" style="font-size:20px;width:20px;height:20px;color:#94a3b8;margin-bottom:4px;display:block;">info</mat-icon>
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">Set both start and end dates to see the full timeline.</p>
                        </div>
                    }
                </div>
            </div>
            }

            <!-- Holidays During Project Duration (Collapsible) -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s ease;">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s ease;" (click)="holidaysExpanded = !holidaysExpanded">
                    <div style="flex:1;display:flex;align-items:center;gap:1rem;">
                        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">🏖️</div>
                        <div>
                            <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                                Holidays During Project Duration
                            </h5>
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">Only holidays between project start and end dates are included.</p>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
                        <button matButton class="text-theme" (click)="refreshProjectDurationHolidays();$event.stopPropagation()" [disabled]="projectDurationHolidaysLoading()" style="color:#667eea;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px;">refresh</mat-icon>
                            Refresh
                        </button>
                        <mat-icon style="font-size:24px;width:24px;height:24px;color:#667eea;transition:transform 0.3s ease;transform:rotateX({{ holidaysExpanded ? '180deg' : '0' }});">expand_more</mat-icon>
                    </div>
                </div>

                @if (holidaysExpanded) {
                <div style="padding:1.5rem;animation:slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);">

                    <div class="row gx-2 mb-2">
                        <div class="col-8 col-md-4">
                            <mat-form-field appearance="outline" class="w-100 inline-small" style="margin:0;">
                                <mat-label>Country</mat-label>
                                <input matInput [(ngModel)]="projectHolidayCountry" (ngModelChange)="onProjectHolidayCountryChanged($any($event))" maxlength="2" placeholder="TN" />
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

                    <div class="mb-2" style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:9px;background:#fff;">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                            <div>
                                <p class="mb-0" style="font-size:12px;font-weight:600;color:#0f172a;">Detected Location (Auto)</p>
                                @if (detectedHolidayLocationLabel()) {
                                    <p class="mb-0" style="font-size:11px;color:#475569;">{{ detectedHolidayLocationLabel() }}</p>
                                } @else {
                                    <p class="mb-0" style="font-size:11px;color:#64748b;">No location detected yet.</p>
                                }
                            </div>
                            <div class="d-flex align-items-center gap-1">
                                @if (projectHolidayCountryDetected()) {
                                    <span class="badge badge-light" style="font-size:10px;">Used for holidays: {{ projectHolidayCountryDetected() }}</span>
                                }
                                <button matButton class="text-theme" style="padding:2px 8px;min-height:28px;line-height:1.1;" (click)="detectHolidayLocation(true)" [disabled]="detectHolidayLocationLoading()">
                                    <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">my_location</mat-icon>
                                    Detect
                                </button>
                            </div>
                        </div>

                        @if (detectHolidayLocationLoading()) {
                            <div class="d-flex align-items-center gap-2 text-secondary" style="font-size:11px;">
                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;animation:spin 1s linear infinite;">cached</mat-icon>
                                Detecting location from browser GPS/locale...
                            </div>
                        }

                        @if (detectHolidayLocationError()) {
                            <p class="mb-0" style="font-size:11px;color:#b91c1c;">{{ detectHolidayLocationError() }}</p>
                        }

                        @if (detectedHolidayMapEmbedUrl()) {
                            <div class="mt-2" style="border:1px solid rgba(15,23,42,0.08);border-radius:8px;overflow:hidden;background:#f8fafc;">
                                <iframe
                                    [src]="detectedHolidayMapEmbedUrl()"
                                    title="Detected location map"
                                    width="100%"
                                    height="150"
                                    style="border:0;display:block;"
                                    loading="lazy"
                                    referrerpolicy="no-referrer-when-downgrade">
                                </iframe>
                            </div>
                        }
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
                </div>
                }
            </div>

            <!-- Phases Section -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">📊</div>
                    <div style="flex:1;">
                        <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                            Phases
                            @if (parsedProjectPhases().length > 0) {
                                <span style="margin-left:0.8rem;padding:0.25rem 0.8rem;border-radius:999px;font-size:0.75rem;font-weight:700;background:#667eea;color:white;">{{ parsedProjectPhases().length }}</span>
                            }
                        </h5>
                        @if (parsedProjectPhases().length === 0) {
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">No phase structure defined for this project.</p>
                        }
                    </div>
                    @if (project()?.templateId) {
                        <span style="padding:0.4rem 0.8rem;border-radius:8px;font-size:0.75rem;font-weight:700;background:#e0e7ff;color:#667eea;display:flex;align-items:center;gap:4px;flex-shrink:0;">
                            <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">layers</mat-icon>
                            From template
                        </span>
                    }
                </div>

                <div style="padding:1.5rem;background:white;">

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
                </div>
            </div>

            <!-- Milestones & Tasks Section (Collapsible) -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:all 0.3s ease;">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s ease;" (click)="milestonesExpanded = !milestonesExpanded">
                    <div style="flex:1;display:flex;align-items:center;gap:1rem;">
                        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">🚩</div>
                        <div>
                            <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                                Milestones &amp; Tasks
                                @if (milestoneSnapshot().length > 0) {
                                    <span style="margin-left:0.8rem;padding:0.25rem 0.8rem;border-radius:999px;font-size:0.75rem;font-weight:700;background:#667eea;color:white;">{{ milestoneSnapshot().length }}</span>
                                }
                            </h5>
                            <p style="margin:0;font-size:0.85rem;color:#64748b;">Compact execution view linked to Milestones and Task modules.</p>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:1rem;flex-shrink:0;">
                        <button matButton class="text-theme" (click)="openMilestonesBoard();$event.stopPropagation()" style="color:#667eea;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px;">flag</mat-icon>
                            Open Board
                        </button>
                        <mat-icon style="font-size:24px;width:24px;height:24px;color:#667eea;transition:transform 0.3s ease;transform:rotateX({{ milestonesExpanded ? '180deg' : '0' }});">expand_more</mat-icon>
                    </div>
                </div>

                <!-- Collapsible Content -->
                @if (milestonesExpanded) {
                <div style="padding:1.5rem;animation:slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1);">

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
                </div>
                }
            </div>

            <!-- Members Section -->
            <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="padding:1.5rem;background:#fafbfc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:1rem;">
                    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">👥</div>
                    <div style="flex:1;">
                        <h5 style="margin:0 0 0.3rem;color:#0f172a;font-weight:700;font-size:1.1rem;">
                            Members
                            @if (members().length > 0) {
                                <span style="margin-left:0.8rem;padding:0.25rem 0.8rem;border-radius:999px;font-size:0.75rem;font-weight:700;background:#667eea;color:white;">{{ members().length }}</span>
                            }
                        </h5>
                        <p style="margin:0;font-size:0.85rem;color:#64748b;">Live project members with workspace-style management</p>
                    </div>
                    @if (canManageProjects()) {
                        <button matButton (click)="openAddMemberDialog()" style="color:#667eea;flex-shrink:0;">
                            <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:4px;">person_add</mat-icon>
                            Add Member
                        </button>
                    }
                </div>

                <div style="padding:1.5rem;background:white;">
                    <div class="row gx-2 mb-3">
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(102,126,234,0.25);border-radius:10px;background:rgba(102,126,234,0.07);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Leads</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#667eea;">{{ leadershipCount() }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(16,185,129,0.26);border-radius:10px;background:rgba(16,185,129,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Contributors</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#047857;">{{ contributorCount() }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(59,130,246,0.26);border-radius:10px;background:rgba(59,130,246,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Joined Last 7d</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#1e40af;">{{ joinedLast7DaysCount() }}</p>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mb-2">
                            <div style="border:1px solid rgba(244,63,94,0.25);border-radius:10px;background:rgba(244,63,94,0.08);padding:8px 10px;">
                                <p class="text-secondary mb-1" style="font-size:11px;">Available to Add</p>
                                <p class="fw-semibold mb-0" style="font-size:18px;color:#be123c;">{{ availableMembers().length }}</p>
                            </div>
                        </div>
                    </div>

                    @if (members().length === 0) {
                        <div style="border:1.5px dashed rgba(0,0,0,0.1);border-radius:10px;padding:16px;text-align:center;">
                            <mat-icon class="material-icons-outlined" style="font-size:28px;width:28px;height:28px;color:#94a3b8;margin-bottom:8px;">people</mat-icon>
                            <p style="color:#64748b;font-size:0.85rem;margin-bottom:8px;">No members assigned to this project yet.</p>
                            @if (canManageProjects()) {
                                <button matButton (click)="openAddMemberDialog()" style="color:#667eea;">
                                    <mat-icon class="material-icons-outlined">person_add</mat-icon>
                                    Add first member
                                </button>
                            }
                        </div>
                    } @else {
                        <div class="d-flex flex-column gap-2">
                            @for (member of members(); track member.userId) {
                                <app-project-member-card
                                    [member]="member"
                                    [canEditRole]="canEditMemberRole(member)"
                                    [canRemoveMember]="canRemoveMember(member)"
                                    (editRole)="openRoleEditDialog($event)"
                                    (removeMember)="openRemoveMemberDialog($event)"></app-project-member-card>
                            }
                        </div>
                    }
                </div>
            </div>
            }
            </div>
        </div>
        </div>
    `,
})
export class ProjectDetailsComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectService = inject(M2ProjectService);
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly permissionService = inject(ProjectPermissionService);
    private readonly authService = inject(AuthService);
    private readonly milestoneService = inject(MilestoneService);
    private readonly taskService = inject(TaskService);
    private readonly fb = inject(FormBuilder);

    readonly isLoading = signal(true);
    readonly error = signal<string | null>(null);
    readonly editMode = signal(false);
    readonly editForm = signal<FormGroup | null>(null);
    readonly editSaving = signal(false);
    milestonesExpanded = false;
    repoExpanded = false;
    holidaysExpanded = false;
    healthExpanded = false;

    readonly workspaceId = signal("");
    readonly projectId = signal("");
    readonly historicalAt = signal<string | null>(null);
    readonly historicalDisplay = computed(() => this.historicalAt() ? new Date(this.historicalAt()!).toLocaleString() : "");

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
    readonly detectHolidayLocationLoading = signal(false);
    readonly detectHolidayLocationError = signal<string | null>(null);
    readonly projectHolidayCountryDetected = signal<string | null>(null);
    readonly projectHolidayLocationCity = signal<string | null>(null);
    readonly projectHolidayLocationCountryName = signal<string | null>(null);
    readonly projectHolidayLocationLat = signal<number | null>(null);
    readonly projectHolidayLocationLon = signal<number | null>(null);
    readonly detectedHolidayMapEmbedUrl = signal<SafeResourceUrl | null>(null);

    private readonly holidayDefaultCountry = "TN";
    projectHolidayCountry = this.holidayDefaultCountry;

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

    readonly detectedHolidayLocationLabel = computed(() => {
        const city = this.projectHolidayLocationCity();
        const countryName = this.projectHolidayLocationCountryName();
        const countryCode = this.projectHolidayCountryDetected();
        if (city && countryName) return `${city}, ${countryName}`;
        if (countryName) return countryCode ? `${countryName} (${countryCode})` : countryName;
        if (countryCode) return `Country code ${countryCode}`;
        return null;
    });

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

    detectHolidayLocation(refreshAfterDetect: boolean): void {
        this.detectHolidayLocationLoading.set(true);
        this.detectHolidayLocationError.set(null);

        const timezoneCountry = this.detectCountryFromTimezone();
        const fallbackCountry = this.holidayDefaultCountry;
        const cityFromTimezone = timezoneCountry === this.holidayDefaultCountry
            ? this.detectCityFromTimezone()
            : null;

        const applyWithCoordinates = (lat: number | null, lon: number | null) => {
            const countryCode = fallbackCountry;
            const countryName = this.countryNameFromCode(countryCode);
            this.applyDetectedLocation(
                {
                    countryCode,
                    city: cityFromTimezone,
                    countryName,
                    lat,
                    lon,
                },
                refreshAfterDetect
            );
        };

        if (!("geolocation" in navigator)) {
            applyWithCoordinates(null, null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const reverse = await this.reverseGeocodeCountry(lat, lon);
                const reverseCountry = String(reverse?.countryCode || "").trim().toUpperCase();
                const useReverseTunisia = reverseCountry === this.holidayDefaultCountry;
                const countryCode = fallbackCountry;
                const countryName = this.countryNameFromCode(countryCode);
                const safeLat = useReverseTunisia ? lat : null;
                const safeLon = useReverseTunisia ? lon : null;
                const safeCity = useReverseTunisia
                    ? (reverse?.city || cityFromTimezone)
                    : cityFromTimezone;

                this.applyDetectedLocation(
                    {
                        countryCode,
                        city: safeCity,
                        countryName,
                        lat: safeLat,
                        lon: safeLon,
                    },
                    refreshAfterDetect
                );
            },
            () => {
                applyWithCoordinates(null, null);
            },
            {
                enableHighAccuracy: false,
                timeout: 6000,
                maximumAge: 10 * 60 * 1000,
            }
        );
    }

    onProjectHolidayCountryChanged(value: string): void {
        const normalized = String(value || "").trim().toUpperCase().slice(0, 2);
        if (normalized.length === 2) {
            this.projectHolidayCountry = normalized;
            this.projectHolidayCountryDetected.set(normalized);
        }
    }

    private async reverseGeocodeCountry(lat: number, lon: number): Promise<{ countryCode: string; countryName: string | null; city: string | null } | null> {
        try {
            const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lon))}&localityLanguage=en`;
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            const countryCode = String(data?.countryCode || "").trim().toUpperCase();
            if (!countryCode || countryCode.length !== 2) return null;
            const countryName = String(data?.countryName || "").trim() || null;
            const city = String(data?.city || data?.locality || data?.principalSubdivision || "").trim() || null;
            return { countryCode, countryName, city };
        } catch {
            return null;
        }
    }

    private detectCountryFromTimezone(): string | null {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const map: Record<string, string> = {
            "Africa/Tunis": "TN",
            "Africa/Algiers": "DZ",
            "Africa/Casablanca": "MA",
            "Africa/Cairo": "EG",
            "Europe/Paris": "FR",
            "Europe/London": "GB",
            "Europe/Berlin": "DE",
            "Europe/Rome": "IT",
            "Europe/Madrid": "ES",
            "Europe/Istanbul": "TR",
            "Europe/Moscow": "RU",
            "America/New_York": "US",
            "America/Chicago": "US",
            "America/Denver": "US",
            "America/Los_Angeles": "US",
            "America/Toronto": "CA",
            "America/Montreal": "CA",
            "America/Sao_Paulo": "BR",
            "America/Buenos_Aires": "AR",
            "Asia/Dubai": "AE",
            "Asia/Riyadh": "SA",
            "Asia/Tokyo": "JP",
            "Asia/Seoul": "KR",
            "Asia/Shanghai": "CN",
            "Asia/Hong_Kong": "HK",
            "Asia/Singapore": "SG",
            "Australia/Sydney": "AU",
            "Australia/Melbourne": "AU",
            "Pacific/Auckland": "NZ",
        };

        return map[timeZone] || null;
    }

    private detectCityFromTimezone(): string | null {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const cityToken = timeZone.split("/").pop();
        if (!cityToken) return null;
        return cityToken.replace(/_/g, " ");
    }

    private countryNameFromCode(countryCode: string): string | null {
        if (!countryCode || countryCode.length !== 2) return null;
        try {
            const display = new Intl.DisplayNames([navigator.language || "en"], { type: "region" }).of(countryCode);
            return display ? String(display) : null;
        } catch {
            return null;
        }
    }

    private applyDetectedLocation(
        detected: { countryCode: string; city: string | null; countryName: string | null; lat: number | null; lon: number | null },
        refreshAfterDetect: boolean
    ): void {
        const countryCode = (detected.countryCode || this.holidayDefaultCountry).trim().toUpperCase().slice(0, 2) || this.holidayDefaultCountry;
        this.projectHolidayCountry = countryCode;
        this.projectHolidayCountryDetected.set(countryCode);
        this.projectHolidayLocationCity.set(detected.city);
        this.projectHolidayLocationCountryName.set(detected.countryName || this.countryNameFromCode(countryCode));
        this.projectHolidayLocationLat.set(detected.lat);
        this.projectHolidayLocationLon.set(detected.lon);
        this.detectedHolidayMapEmbedUrl.set(this.buildHolidayMapEmbedUrl(detected.lat, detected.lon));
        this.detectHolidayLocationLoading.set(false);

        this.detectHolidayLocationError.set(null);

        if (refreshAfterDetect) {
            this.refreshProjectDurationHolidays();
        }
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
        this.projectHolidayCountryDetected.set(country);

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

        this.milestoneService.getByProjectId(projectId).pipe(
            catchError(() => {
                this.milestonesError.set("Unable to load milestones for this project.");
                this.milestonesLoading.set(false);
                return of([] as Milestone[]);
            })
        ).subscribe((milestones) => {
            const related = (milestones || []).filter((milestone) => milestone.id !== undefined && milestone.id !== null);

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

    openReadmePreview(): void {
        const workspaceId = this.workspaceId();
        const projectId = this.projectId();
        if (!workspaceId || !projectId) {
            return;
        }

        this.router.navigate([
            "/app/real-projects",
            workspaceId,
            projectId,
            "readme-preview",
        ], {
            queryParams: this.historicalQueryParams(),
        });
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
        const group = this.fb.group({
            name: [p.name || '', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
            description: [p.description || '', [Validators.maxLength(500)]],
            githubRepoUrl: [p.githubRepoUrl || ''],
            visibility: [(p.visibility as 'PUBLIC' | 'PRIVATE') || 'PRIVATE', Validators.required],
            startDate: [p.startDate || ''],
            endDate: [p.endDate || ''],
        }, { validators: this.dateRangeValidator });
        this.editForm.set(group);
        this.editMode.set(true);
    }

    private dateRangeValidator(group: AbstractControl) {
        const start = group.get('startDate')?.value;
        const end = group.get('endDate')?.value;
        if (start && end && end < start) {
            group.get('endDate')?.setErrors({ dateRange: true });
            return { dateRange: true };
        }
        group.get('endDate')?.setErrors(null);
        return null;
    }

    cancelEdit(): void {
        this.editForm.set(null);
        this.editMode.set(false);
    }

    saveEdit(): void {
        const form = this.editForm();
        if (!form) return;
        form.markAllAsTouched();
        if (form.invalid) return;
        const val = form.value;
        this.editSaving.set(true);
        const body: Record<string, unknown> = {
            name: val.name.trim(),
            description: val.description?.trim() || null,
            githubRepoUrl: val.githubRepoUrl?.trim() || null,
            visibility: val.visibility,
        };
        if (val.startDate) body['startDate'] = val.startDate;
        if (val.endDate) body['endDate'] = val.endDate;
        this.projectService.updateProject(this.workspaceId(), this.projectId(), body).subscribe({
            next: (updated) => {
                this.project.set(updated);
                this.loadProjectDurationHolidays(this.workspaceId(), updated);
                this.loadProjectRepoInsights(this.workspaceId(), this.projectId());
                this.editForm.set(null);
                this.editMode.set(false);
                this.editSaving.set(false);
                this.snackBar.open('Project updated.', 'Close', { duration: 3000 });
            },
            error: (error: HttpErrorResponse) => {
                this.editSaving.set(false);
                this.snackBar.open(`Failed to update project: ${this.errorMessage(error)}`, 'Close', { duration: 4200 });
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
                if (!this.projectHolidayCountryDetected()) {
                    this.detectHolidayLocation(true);
                }
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

    private buildHolidayMapEmbedUrl(lat: number | null, lon: number | null): SafeResourceUrl | null {
        if (lat === null || lon === null) {
            return null;
        }

        const delta = 6;
        const minLon = Math.max(-180, lon - delta);
        const maxLon = Math.min(180, lon + delta);
        const minLat = Math.max(-85, lat - delta);
        const maxLat = Math.min(85, lat + delta);

        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${lat},${lon}`;
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
