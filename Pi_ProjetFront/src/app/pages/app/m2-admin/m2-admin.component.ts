import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { HttpErrorResponse } from "@angular/common/http";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";

import { AuthService } from "../../../auth/auth.service";
import {
    M2AdminService,
    AdminStats,
    AdminWorkspaceRow,
    AdminProjectRow,
    OrgQuotaRow,
    TemplateRatingRow,
} from "./m2-admin.service";
import { M2TemplateService, M2TemplateSummary } from "../m2-templates/m2-template.service";
import {
    TemplateRejectDialogComponent,
    TemplateRejectDialogResult,
} from "./template-reject-dialog.component";

@Component({
    standalone: true,
    selector: "app-m2-admin",
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatTableModule,
        MatChipsModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatSlideToggleModule,
        MatSnackBarModule,
        MatDialogModule,
    ],
    template: `
<!-- ═══════════════════════════════════════════════════════════════
     MODULE 2 — ADMIN DASHBOARD
═══════════════════════════════════════════════════════════════ -->
<div class="container-fluid fade-in mb-3 mb-lg-4">

    <!-- Header -->
    <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3 mb-3">
        <div class="row gx-3 align-items-center">
            <div class="col-auto">
                <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-violet d-flex align-items-center justify-content-center">
                    <mat-icon class="material-icons-outlined">admin_panel_settings</mat-icon>
                </div>
            </div>
            <div class="col">
                <h4 class="mb-0 fw-bold">Admin Dashboard</h4>
                <p class="small text-secondary mb-0">Platform-wide visibility — all organizations, workspaces, projects &amp; templates</p>
            </div>
            <div class="col-auto">
                <button matButton (click)="reload()" [disabled]="loading()">
                    <mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh
                </button>
            </div>
        </div>
    </mat-card>

    <!-- Loading / error -->
    @if (loading()) {
    <div class="text-center py-5">
        <mat-progress-spinner mode="indeterminate" diameter="48" class="mx-auto"></mat-progress-spinner>
        <p class="small text-secondary mt-3">Loading admin data…</p>
    </div>
    } @else {

    <!-- ── Stats Bar ──────────────────────────────────────────── -->
    @if (stats()) {
    <div class="row gx-3 gx-lg-4 mb-3">
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-blue d-flex align-items-center justify-content-center">
                                <mat-icon class="material-icons-outlined">workspaces</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Workspaces</p>
                            <h3 class="mb-0">{{ stats()!.totalWorkspaces }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-green d-flex align-items-center justify-content-center">
                                <mat-icon class="material-icons-outlined">assignment</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Projects</p>
                            <h3 class="mb-0">{{ stats()!.totalProjects }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-violet d-flex align-items-center justify-content-center">
                                <mat-icon class="material-icons-outlined">widgets</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Templates</p>
                            <h3 class="mb-0">{{ stats()!.publishedTemplates }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-orange d-flex align-items-center justify-content-center">
                                <mat-icon class="material-icons-outlined">pending_actions</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Pending</p>
                            <h3 class="mb-0">{{ stats()!.pendingTemplates }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded theme-azure d-flex align-items-center justify-content-center">
                                <mat-icon class="material-icons-outlined">domain</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Organizations</p>
                            <h3 class="mb-0">{{ stats()!.totalOrgs }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
        <div class="col-12 col-md-6 col-lg-2 mb-3">
            <mat-card class="h-100" [class.border]="stats()!.quotaAlerts > 0" [class.theme-red]="stats()!.quotaAlerts > 0">
                <mat-card-content>
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <div class="avatar avatar-50 bg-light-theme text-theme rounded d-flex align-items-center justify-content-center"
                                 [class.theme-red]="stats()!.quotaAlerts > 0" [class.theme-green]="stats()!.quotaAlerts === 0">
                                <mat-icon class="material-icons-outlined">{{ stats()!.quotaAlerts > 0 ? 'warning' : 'check_circle' }}</mat-icon>
                            </div>
                        </div>
                        <div class="col">
                            <p class="small text-secondary mb-1">Quota Alerts</p>
                            <h3 class="mb-0">{{ stats()!.quotaAlerts }}</h3>
                        </div>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>
    </div>
    }

    <!-- ── Main tabs ──────────────────────────────────────────── -->
    <mat-card class="shadow-none">
        <mat-card-content class="p-0">
            <mat-tab-group animationDuration="200ms" class="admin-tabs">

                <!-- ─ Tab 1: Workspaces ─────────────────────────────── -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        <mat-icon class="material-icons-outlined me-1">workspaces</mat-icon>
                        Workspaces
                        <span class="badge badge-light ms-2">{{ filteredWorkspaces().length }}</span>
                    </ng-template>
                    <div class="p-3">
                        <!-- Toolbar -->
                        <div class="row gx-3 align-items-center mb-3">
                            <div class="col-12 col-md-5">
                                <mat-form-field appearance="outline" class="w-100 search-field">
                                    <mat-label>Search workspace or org…</mat-label>
                                    <mat-icon matPrefix class="material-icons-outlined">search</mat-icon>
                                    <input matInput [(ngModel)]="wsSearch" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-7">
                                <mat-chip-listbox>
                                    @for (f of wsFilters; track f.value) {
                                    <mat-chip-option [selected]="wsFilter() === f.value" (click)="wsFilter.set(f.value)">{{ f.label }}</mat-chip-option>
                                    }
                                </mat-chip-listbox>
                            </div>
                        </div>
                        <!-- Table -->
                        <div class="table-responsive">
                            <table mat-table [dataSource]="filteredWorkspaces()" class="w-100">
                                <ng-container matColumnDef="name">
                                    <th mat-header-cell *matHeaderCellDef>Workspace</th>
                                    <td mat-cell *matCellDef="let row">
                                        <div class="fw-medium">{{ row.name }}</div>
                                        <div class="small text-secondary">{{ row.slug }}</div>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="org">
                                    <th mat-header-cell *matHeaderCellDef>Organization</th>
                                    <td mat-cell *matCellDef="let row">{{ row.org_name }}</td>
                                </ng-container>
                                <ng-container matColumnDef="orgType">
                                    <th mat-header-cell *matHeaderCellDef>Type</th>
                                    <td mat-cell *matCellDef="let row">
                                        <span class="badge badge-light" [class.theme-blue]="row.organization_type === 'ENTERPRISE'" [class.theme-violet]="row.organization_type === 'ACADEMIC'">
                                            {{ row.organization_type }}
                                        </span>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="plan">
                                    <th mat-header-cell *matHeaderCellDef>Plan</th>
                                    <td mat-cell *matCellDef="let row">
                                        <span class="badge badge-light theme-azure">{{ row.plan_name }}</span>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="quota">
                                    <th mat-header-cell *matHeaderCellDef>WS Quota</th>
                                    <td mat-cell *matCellDef="let row">
                                        <span [class.text-danger]="row.org_ws_count >= row.max_workspaces"
                                              [class.text-warning]="row.org_ws_count / row.max_workspaces >= 0.8 && row.org_ws_count < row.max_workspaces"
                                              class="fw-medium">
                                            {{ row.org_ws_count }}/{{ row.max_workspaces }}
                                        </span>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="members">
                                    <th mat-header-cell *matHeaderCellDef>Members</th>
                                    <td mat-cell *matCellDef="let row">{{ row.member_count }}</td>
                                </ng-container>
                                <ng-container matColumnDef="projects">
                                    <th mat-header-cell *matHeaderCellDef>Projects</th>
                                    <td mat-cell *matCellDef="let row">{{ row.project_count }}</td>
                                </ng-container>
                                <ng-container matColumnDef="status">
                                    <th mat-header-cell *matHeaderCellDef>Status</th>
                                    <td mat-cell *matCellDef="let row">
                                        <span class="badge badge-light" [class.theme-green]="!row.deleted_at" [class.theme-red]="row.deleted_at">
                                            {{ row.deleted_at ? 'Deleted' : 'Active' }}
                                        </span>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="created">
                                    <th mat-header-cell *matHeaderCellDef>Created</th>
                                    <td mat-cell *matCellDef="let row" class="small text-secondary">{{ formatDate(row.created_at) }}</td>
                                </ng-container>
                                <ng-container matColumnDef="actions">
                                    <th mat-header-cell *matHeaderCellDef></th>
                                    <td mat-cell *matCellDef="let row">
                                        @if (!row.deleted_at) {
                                        <button matButton class="text-danger small" (click)="deleteWorkspace(row)" matTooltip="Soft-delete workspace">
                                            <mat-icon class="material-icons-outlined" style="font-size:18px">delete</mat-icon>
                                        </button>
                                        } @else {
                                        <button matButton class="text-success small" (click)="restoreWorkspace(row)" matTooltip="Restore workspace">
                                            <mat-icon class="material-icons-outlined" style="font-size:18px">restore</mat-icon>
                                        </button>
                                        }
                                    </td>
                                </ng-container>
                                <tr mat-header-row *matHeaderRowDef="wsColumns"></tr>
                                <tr mat-row *matRowDef="let row; columns: wsColumns;"
                                    [class.opacity-50]="row.deleted_at"></tr>
                                @if (filteredWorkspaces().length === 0) {
                                <tr class="mat-mdc-no-data-row">
                                    <td [attr.colspan]="wsColumns.length" class="text-center py-4 text-secondary small">No workspaces match the current filter.</td>
                                </tr>
                                }
                            </table>
                        </div>
                    </div>
                </mat-tab>

                <!-- ─ Tab 2: Projects ───────────────────────────────── -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        <mat-icon class="material-icons-outlined me-1">assignment</mat-icon>
                        Projects
                        <span class="badge badge-light ms-2">{{ filteredProjects().length }}</span>
                    </ng-template>
                    <div class="p-3">
                        <!-- Toolbar -->
                        <div class="row gx-3 align-items-center mb-3">
                            <div class="col-12 col-md-5">
                                <mat-form-field appearance="outline" class="w-100 search-field">
                                    <mat-label>Search project or workspace…</mat-label>
                                    <mat-icon matPrefix class="material-icons-outlined">search</mat-icon>
                                    <input matInput [(ngModel)]="projSearch" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-7">
                                <mat-chip-listbox>
                                    @for (f of projFilters; track f.value) {
                                    <mat-chip-option [selected]="projFilter() === f.value" (click)="projFilter.set(f.value)">{{ f.label }}</mat-chip-option>
                                    }
                                </mat-chip-listbox>
                            </div>
                        </div>
                        <!-- Table -->
                        <div class="table-responsive">
                            <table mat-table [dataSource]="filteredProjects()" class="w-100">
                                <ng-container matColumnDef="name">
                                    <th mat-header-cell *matHeaderCellDef>Project</th>
                                    <td mat-cell *matCellDef="let row" class="fw-medium">{{ row.name }}</td>
                                </ng-container>
                                <ng-container matColumnDef="workspace">
                                    <th mat-header-cell *matHeaderCellDef>Workspace</th>
                                    <td mat-cell *matCellDef="let row" class="small">{{ row.workspace_name }}</td>
                                </ng-container>
                                <ng-container matColumnDef="org">
                                    <th mat-header-cell *matHeaderCellDef>Organization</th>
                                    <td mat-cell *matCellDef="let row" class="small">{{ row.org_name }}</td>
                                </ng-container>
                                <ng-container matColumnDef="status">
                                    <th mat-header-cell *matHeaderCellDef>Status</th>
                                    <td mat-cell *matCellDef="let row">
                                        <span class="badge badge-light" [ngClass]="projectStatusClass(row.status)">{{ row.status }}</span>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="visibility">
                                    <th mat-header-cell *matHeaderCellDef>Visibility</th>
                                    <td mat-cell *matCellDef="let row">
                                        <button matButton class="small" (click)="toggleVisibility(row)" [matTooltip]="'Toggle to ' + (row.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')">
                                            <mat-icon class="material-icons-outlined" style="font-size:18px">{{ row.visibility === 'PUBLIC' ? 'public' : 'lock' }}</mat-icon>
                                            {{ row.visibility }}
                                        </button>
                                    </td>
                                </ng-container>
                                <ng-container matColumnDef="members">
                                    <th mat-header-cell *matHeaderCellDef>Members</th>
                                    <td mat-cell *matCellDef="let row">{{ row.member_count }}</td>
                                </ng-container>
                                <ng-container matColumnDef="created">
                                    <th mat-header-cell *matHeaderCellDef>Created</th>
                                    <td mat-cell *matCellDef="let row" class="small text-secondary">{{ formatDate(row.created_at) }}</td>
                                </ng-container>
                                <ng-container matColumnDef="actions">
                                    <th mat-header-cell *matHeaderCellDef></th>
                                    <td mat-cell *matCellDef="let row">
                                        @if (!row.deleted_at) {
                                        <button matButton class="text-danger small" (click)="deleteProject(row)" matTooltip="Soft-delete project">
                                            <mat-icon class="material-icons-outlined" style="font-size:18px">delete</mat-icon>
                                        </button>
                                        } @else {
                                        <span class="badge badge-light theme-red small">Deleted</span>
                                        }
                                    </td>
                                </ng-container>
                                <tr mat-header-row *matHeaderRowDef="projColumns"></tr>
                                <tr mat-row *matRowDef="let row; columns: projColumns;" [class.opacity-50]="row.deleted_at"></tr>
                            </table>
                        </div>
                    </div>
                </mat-tab>

                <!-- ─ Tab 3: Template Moderation ───────────────────── -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        <mat-icon class="material-icons-outlined me-1">pending_actions</mat-icon>
                        Templates
                        @if (pendingTemplates().length > 0) {
                        <span class="badge badge-light theme-orange ms-2">{{ pendingTemplates().length }}</span>
                        }
                    </ng-template>
                    <div class="p-3">
                        <mat-tab-group animationDuration="150ms">
                            <!-- Pending sub-tab -->
                            <mat-tab label="Pending ({{ pendingTemplates().length }})">
                                <div class="pt-3">
                                    @if (pendingTemplates().length === 0) {
                                    <div class="text-center py-5">
                                        <mat-icon class="material-icons-outlined fs-1 text-secondary">check_circle</mat-icon>
                                        <p class="text-secondary mt-2">No templates awaiting approval.</p>
                                    </div>
                                    }
                                    <div class="row gx-3">
                                        @for (t of pendingTemplates(); track t.id) {
                                        <div class="col-12 col-md-6 col-lg-4 mb-3">
                                            <mat-card class="h-100 border">
                                                <mat-card-content>
                                                    <div class="d-flex gap-2 mb-2 flex-wrap">
                                                        <span class="badge badge-light theme-blue">{{ t.templateType }}</span>
                                                        @if (t.difficultyLevel) {
                                                        <span class="badge badge-light" [ngClass]="difficultyClass(t.difficultyLevel)">{{ t.difficultyLevel }}</span>
                                                        }
                                                    </div>
                                                    <h6 class="fw-bold mb-1">{{ t.name }}</h6>
                                                    <p class="small text-secondary mb-2">{{ t.useCaseDescription || 'No description' }}</p>
                                                    @if (t.tags) {
                                                    <p class="small text-secondary mb-2"><mat-icon class="material-icons-outlined" style="font-size:14px;vertical-align:middle">label</mat-icon> {{ t.tags }}</p>
                                                    }
                                                </mat-card-content>
                                                <mat-card-actions class="d-flex gap-2 px-3 pb-3">
                                                    <button matButton="filled" class="flex-fill" style="background-color:var(--mat-sys-tertiary)" (click)="approveTemplate(t)">
                                                        <mat-icon class="material-icons-outlined">check_circle</mat-icon> Approve
                                                    </button>
                                                    <button matButton class="flex-fill text-danger" (click)="openRejectDialog(t)">
                                                        <mat-icon class="material-icons-outlined">cancel</mat-icon> Reject
                                                    </button>
                                                </mat-card-actions>
                                            </mat-card>
                                        </div>
                                        }
                                    </div>
                                </div>
                            </mat-tab>

                            <!-- Published sub-tab -->
                            <mat-tab label="Published">
                                <div class="pt-3 table-responsive">
                                    <table mat-table [dataSource]="publishedTemplates()" class="w-100">
                                        <ng-container matColumnDef="name">
                                            <th mat-header-cell *matHeaderCellDef>Template</th>
                                            <td mat-cell *matCellDef="let t">
                                                <div class="fw-medium">{{ t.name }}</div>
                                                <span class="badge badge-light theme-blue small">{{ t.templateType }}</span>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="org">
                                            <th mat-header-cell *matHeaderCellDef>Org</th>
                                            <td mat-cell *matCellDef="let t" class="small text-secondary">{{ t.organizationId ? 'Org-scoped' : 'Global' }}</td>
                                        </ng-container>
                                        <ng-container matColumnDef="usage">
                                            <th mat-header-cell *matHeaderCellDef>Usage</th>
                                            <td mat-cell *matCellDef="let t">{{ t.usageCount }}</td>
                                        </ng-container>
                                        <ng-container matColumnDef="rating">
                                            <th mat-header-cell *matHeaderCellDef>Rating</th>
                                            <td mat-cell *matCellDef="let t">
                                                <span class="small">{{ starsDisplay(t.rating) }} <span class="text-secondary">({{ t.ratingCount }})</span></span>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="featured">
                                            <th mat-header-cell *matHeaderCellDef>Featured</th>
                                            <td mat-cell *matCellDef="let t">
                                                <button matButton [class.theme-orange]="t.isFeatured" (click)="toggleFeatured(t)" matTooltip="Toggle featured">
                                                    <mat-icon class="material-icons-outlined" style="font-size:20px">{{ t.isFeatured ? 'star' : 'star_border' }}</mat-icon>
                                                </button>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="trending">
                                            <th mat-header-cell *matHeaderCellDef>Trending</th>
                                            <td mat-cell *matCellDef="let t">
                                                <button matButton [class.theme-red]="t.isTrending" (click)="toggleTrending(t)" matTooltip="Toggle trending">
                                                    <mat-icon class="material-icons-outlined" style="font-size:20px">{{ t.isTrending ? 'trending_up' : 'trending_flat' }}</mat-icon>
                                                </button>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="recommended">
                                            <th mat-header-cell *matHeaderCellDef>Recommended</th>
                                            <td mat-cell *matCellDef="let t">
                                                <button matButton [class.theme-green]="t.isRecommended" (click)="toggleRecommended(t)" matTooltip="Toggle recommended">
                                                    <mat-icon class="material-icons-outlined" style="font-size:20px">{{ t.isRecommended ? 'thumb_up' : 'thumb_up_off_alt' }}</mat-icon>
                                                </button>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="actions">
                                            <th mat-header-cell *matHeaderCellDef></th>
                                            <td mat-cell *matCellDef="let t">
                                                <button matButton class="text-danger small" (click)="deleteTemplate(t)" matTooltip="Delete template">
                                                    <mat-icon class="material-icons-outlined" style="font-size:18px">delete</mat-icon>
                                                </button>
                                            </td>
                                        </ng-container>
                                        <tr mat-header-row *matHeaderRowDef="tmplColumns"></tr>
                                        <tr mat-row *matRowDef="let row; columns: tmplColumns;"></tr>
                                    </table>
                                </div>
                            </mat-tab>

                            <!-- Rejected sub-tab -->
                            <mat-tab label="Rejected">
                                <div class="pt-3 table-responsive">
                                    <table mat-table [dataSource]="rejectedTemplates()" class="w-100">
                                        <ng-container matColumnDef="name">
                                            <th mat-header-cell *matHeaderCellDef>Template</th>
                                            <td mat-cell *matCellDef="let t" class="fw-medium">{{ t.name }}</td>
                                        </ng-container>
                                        <ng-container matColumnDef="type">
                                            <th mat-header-cell *matHeaderCellDef>Type</th>
                                            <td mat-cell *matCellDef="let t"><span class="badge badge-light theme-blue">{{ t.templateType }}</span></td>
                                        </ng-container>
                                        <ng-container matColumnDef="reason">
                                            <th mat-header-cell *matHeaderCellDef>Rejection Reason</th>
                                            <td mat-cell *matCellDef="let t" class="small text-secondary">{{ t.rejectionReason || '—' }}</td>
                                        </ng-container>
                                        <ng-container matColumnDef="created">
                                            <th mat-header-cell *matHeaderCellDef>Submitted</th>
                                            <td mat-cell *matCellDef="let t" class="small text-secondary">{{ formatDate(t.createdAt) }}</td>
                                        </ng-container>
                                        <tr mat-header-row *matHeaderRowDef="['name','type','reason','created']"></tr>
                                        <tr mat-row *matRowDef="let row; columns: ['name','type','reason','created'];"></tr>
                                    </table>
                                    @if (rejectedTemplates().length === 0) {
                                    <p class="text-center text-secondary py-4 small">No rejected templates.</p>
                                    }
                                </div>
                            </mat-tab>

                            <!-- All sub-tab -->
                            <mat-tab label="All">
                                <div class="pt-3">
                                    <p class="small text-secondary mb-2">{{ allTemplates().length }} total templates (all statuses)</p>
                                    <div class="table-responsive">
                                        <table mat-table [dataSource]="allTemplates()" class="w-100">
                                            <ng-container matColumnDef="name">
                                                <th mat-header-cell *matHeaderCellDef>Template</th>
                                                <td mat-cell *matCellDef="let t" class="fw-medium">{{ t.name }}</td>
                                            </ng-container>
                                            <ng-container matColumnDef="type">
                                                <th mat-header-cell *matHeaderCellDef>Type</th>
                                                <td mat-cell *matCellDef="let t"><span class="badge badge-light theme-blue">{{ t.templateType }}</span></td>
                                            </ng-container>
                                            <ng-container matColumnDef="status">
                                                <th mat-header-cell *matHeaderCellDef>Status</th>
                                                <td mat-cell *matCellDef="let t">
                                                    <span class="badge badge-light" [ngClass]="templateStatusClass(t.status)">{{ t.status }}</span>
                                                </td>
                                            </ng-container>
                                            <ng-container matColumnDef="scope">
                                                <th mat-header-cell *matHeaderCellDef>Scope</th>
                                                <td mat-cell *matCellDef="let t" class="small">{{ t.organizationId ? 'Org' : 'Global' }}</td>
                                            </ng-container>
                                            <ng-container matColumnDef="created">
                                                <th mat-header-cell *matHeaderCellDef>Created</th>
                                                <td mat-cell *matCellDef="let t" class="small text-secondary">{{ formatDate(t.createdAt) }}</td>
                                            </ng-container>
                                            <tr mat-header-row *matHeaderRowDef="['name','type','status','scope','created']"></tr>
                                            <tr mat-row *matRowDef="let row; columns: ['name','type','status','scope','created'];"></tr>
                                        </table>
                                    </div>
                                </div>
                            </mat-tab>
                        </mat-tab-group>
                    </div>
                </mat-tab>

                <!-- ─ Tab 4: Quota Monitor ──────────────────────────── -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        <mat-icon class="material-icons-outlined me-1">monitor_heart</mat-icon>
                        Quota Monitor
                    </ng-template>
                    <div class="p-3">
                        <div class="row gx-3 gx-lg-4">
                            @for (org of sortedQuotaOrgs(); track org.id) {
                            <div class="col-12 col-md-6 col-lg-3 mb-3">
                                <mat-card class="h-100 border" [class.border-danger]="isAtQuota(org)" [class.border-warning]="isNearQuota(org) && !isAtQuota(org)">
                                    <mat-card-content>
                                        <div class="d-flex align-items-start justify-content-between mb-2">
                                            <div>
                                                <h6 class="fw-bold mb-0">{{ org.name }}</h6>
                                                <span class="badge badge-light small" [class.theme-blue]="org.org_type === 'ENTERPRISE'" [class.theme-violet]="org.org_type === 'ACADEMIC'">{{ org.org_type }}</span>
                                            </div>
                                            <span class="badge badge-light theme-azure small">{{ org.plan_name }}</span>
                                        </div>
                                        <!-- Workspace quota -->
                                        <div class="mb-2">
                                            <div class="d-flex justify-content-between small mb-1">
                                                <span class="text-secondary">Workspaces</span>
                                                <span [class.text-danger]="org.ws_count >= org.max_workspaces" class="fw-medium">{{ org.ws_count }}/{{ org.max_workspaces }}</span>
                                            </div>
                                            <mat-progress-bar mode="determinate"
                                                [value]="pct(org.ws_count, org.max_workspaces)"
                                                [color]="org.ws_count >= org.max_workspaces ? 'warn' : org.ws_count / org.max_workspaces >= 0.8 ? 'accent' : 'primary'">
                                            </mat-progress-bar>
                                        </div>
                                        <!-- Project quota -->
                                        <div class="mb-2">
                                            <div class="d-flex justify-content-between small mb-1">
                                                <span class="text-secondary">Projects</span>
                                                <span [class.text-danger]="org.project_count >= org.max_active_projects" class="fw-medium">{{ org.project_count }}/{{ org.max_active_projects }}</span>
                                            </div>
                                            <mat-progress-bar mode="determinate"
                                                [value]="pct(org.project_count, org.max_active_projects)"
                                                [color]="org.project_count >= org.max_active_projects ? 'warn' : org.project_count / org.max_active_projects >= 0.8 ? 'accent' : 'primary'">
                                            </mat-progress-bar>
                                        </div>
                                        <!-- Member limit reference -->
                                        <div class="small text-secondary">
                                            <mat-icon class="material-icons-outlined" style="font-size:14px;vertical-align:middle">group</mat-icon>
                                            Max {{ org.max_members_per_ws }} members/workspace
                                        </div>
                                    </mat-card-content>
                                </mat-card>
                            </div>
                            }
                        </div>
                    </div>
                </mat-tab>

                <!-- ─ Tab 5: Ratings & Favorites ───────────────────── -->
                <mat-tab>
                    <ng-template mat-tab-label>
                        <mat-icon class="material-icons-outlined me-1">star</mat-icon>
                        Ratings &amp; Favorites
                    </ng-template>
                    <div class="p-3">
                        <div class="row gx-3 gx-lg-4">
                            <!-- Top Rated -->
                            <div class="col-12 col-lg-6 mb-3">
                                <h6 class="fw-bold mb-3">
                                    <mat-icon class="material-icons-outlined me-1 theme-orange" style="vertical-align:middle">star</mat-icon>
                                    Top Rated Templates
                                </h6>
                                <div class="table-responsive">
                                    <table mat-table [dataSource]="topRatedTemplates()" class="w-100">
                                        <ng-container matColumnDef="name">
                                            <th mat-header-cell *matHeaderCellDef>Template</th>
                                            <td mat-cell *matCellDef="let t">
                                                <div class="fw-medium small">{{ t.name }}</div>
                                                <div class="small text-secondary">{{ t.org_name }}</div>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="rating">
                                            <th mat-header-cell *matHeaderCellDef>Rating</th>
                                            <td mat-cell *matCellDef="let t">
                                                <span class="small theme-orange">{{ starsDisplay(t.rating) }}</span><br>
                                                <span class="small text-secondary">{{ t.rating | number:'1.1-1' }} ({{ t.rating_count }} votes)</span>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="usage">
                                            <th mat-header-cell *matHeaderCellDef>Usage</th>
                                            <td mat-cell *matCellDef="let t">{{ t.usage_count }}</td>
                                        </ng-container>
                                        <tr mat-header-row *matHeaderRowDef="['name','rating','usage']"></tr>
                                        <tr mat-row *matRowDef="let row; columns: ['name','rating','usage'];"></tr>
                                    </table>
                                </div>
                            </div>
                            <!-- Most Favorited -->
                            <div class="col-12 col-lg-6 mb-3">
                                <h6 class="fw-bold mb-3">
                                    <mat-icon class="material-icons-outlined me-1 theme-red" style="vertical-align:middle">favorite</mat-icon>
                                    Most Favorited Templates
                                </h6>
                                <div class="table-responsive">
                                    <table mat-table [dataSource]="mostFavoritedTemplates()" class="w-100">
                                        <ng-container matColumnDef="name">
                                            <th mat-header-cell *matHeaderCellDef>Template</th>
                                            <td mat-cell *matCellDef="let t">
                                                <div class="fw-medium small">{{ t.name }}</div>
                                                <div class="small text-secondary">{{ t.org_name }}</div>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="favorites">
                                            <th mat-header-cell *matHeaderCellDef>Favorites</th>
                                            <td mat-cell *matCellDef="let t">
                                                <span class="theme-red">♥ {{ t.favorite_count }}</span>
                                            </td>
                                        </ng-container>
                                        <ng-container matColumnDef="rating">
                                            <th mat-header-cell *matHeaderCellDef>Rating</th>
                                            <td mat-cell *matCellDef="let t" class="small text-secondary">{{ starsDisplay(t.rating) }}</td>
                                        </ng-container>
                                        <tr mat-header-row *matHeaderRowDef="['name','favorites','rating']"></tr>
                                        <tr mat-row *matRowDef="let row; columns: ['name','favorites','rating'];"></tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </mat-tab>

            </mat-tab-group>
        </mat-card-content>
    </mat-card>

    } <!-- end @else -->
</div>
    `,
    styles: [`
        .search-field { margin-bottom: -1.25em; }
        .admin-tabs .mat-mdc-tab-body-wrapper { min-height: 400px; }
        .table-responsive table { min-width: 600px; }
    `],
})
export class M2AdminComponent implements OnInit {
    private readonly adminService = inject(M2AdminService);
    private readonly templateService = inject(M2TemplateService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);

    // ── Data signals ───────────────────────────────────────────

    readonly loading = signal(true);
    readonly stats = signal<AdminStats | null>(null);
    readonly workspaces = signal<AdminWorkspaceRow[]>([]);
    readonly projects = signal<AdminProjectRow[]>([]);
    readonly quotaOrgs = signal<OrgQuotaRow[]>([]);
    readonly ratingRows = signal<TemplateRatingRow[]>([]);
    readonly allTemplates = signal<M2TemplateSummary[]>([]);

    // ── Filter state ───────────────────────────────────────────

    wsSearch = "";
    wsFilter = signal<string>("all");
    wsFilters = [
        { label: "All", value: "all" },
        { label: "Enterprise", value: "ENTERPRISE" },
        { label: "Academic", value: "ACADEMIC" },
        { label: "At Quota", value: "quota" },
        { label: "Deleted", value: "deleted" },
    ];

    projSearch = "";
    projFilter = signal<string>("all");
    projFilters = [
        { label: "All", value: "all" },
        { label: "Active", value: "ACTIVE" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Deleted", value: "deleted" },
    ];

    // ── Table column defs ──────────────────────────────────────

    wsColumns = ["name", "org", "orgType", "plan", "quota", "members", "projects", "status", "created", "actions"];
    projColumns = ["name", "workspace", "org", "status", "visibility", "members", "created", "actions"];
    tmplColumns = ["name", "org", "usage", "rating", "featured", "trending", "recommended", "actions"];

    // ── Computed filtered lists ────────────────────────────────

    readonly filteredWorkspaces = computed(() => {
        const search = this.wsSearch.toLowerCase();
        const filter = this.wsFilter();
        return this.workspaces().filter(w => {
            const matchSearch = !search || w.name.toLowerCase().includes(search) || (w.org_name || "").toLowerCase().includes(search);
            const matchFilter =
                filter === "all" ? true :
                filter === "deleted" ? !!w.deleted_at :
                filter === "quota" ? w.org_ws_count >= w.max_workspaces :
                (w.organization_type || "").toUpperCase() === filter.toUpperCase();
            return matchSearch && matchFilter;
        });
    });

    readonly filteredProjects = computed(() => {
        const search = this.projSearch.toLowerCase();
        const filter = this.projFilter();
        return this.projects().filter(p => {
            const matchSearch = !search || p.name.toLowerCase().includes(search) || (p.workspace_name || "").toLowerCase().includes(search);
            const matchFilter =
                filter === "all" ? true :
                filter === "deleted" ? !!p.deleted_at :
                (p.status || "").toUpperCase() === filter.toUpperCase();
            return matchSearch && matchFilter;
        });
    });

    readonly pendingTemplates = computed(() =>
        this.allTemplates().filter(t => t.status === "PENDING_APPROVAL")
    );
    readonly publishedTemplates = computed(() =>
        this.allTemplates().filter(t => t.status === "APPROVED")
    );
    readonly rejectedTemplates = computed(() =>
        this.allTemplates().filter(t => t.status === "REJECTED")
    );

    readonly sortedQuotaOrgs = computed(() =>
        [...this.quotaOrgs()].sort((a, b) => {
            const aScore = (a.ws_count / Math.max(a.max_workspaces, 1)) + (a.project_count / Math.max(a.max_active_projects, 1));
            const bScore = (b.ws_count / Math.max(b.max_workspaces, 1)) + (b.project_count / Math.max(b.max_active_projects, 1));
            return bScore - aScore;
        })
    );

    readonly topRatedTemplates = computed(() =>
        [...this.ratingRows()].sort((a, b) => b.rating - a.rating).slice(0, 10)
    );
    readonly mostFavoritedTemplates = computed(() =>
        [...this.ratingRows()].sort((a, b) => b.favorite_count - a.favorite_count).slice(0, 10)
    );

    // ── Lifecycle ──────────────────────────────────────────────

    ngOnInit(): void {
        this.loadAll();
    }

    reload(): void {
        this.loadAll();
    }

    private loadAll(): void {
        this.loading.set(true);
        forkJoin({
            stats: this.adminService.getStats().pipe(catchError(() => of(null))),
            workspaces: this.adminService.getWorkspaces().pipe(catchError(() => of([]))),
            projects: this.adminService.getProjects().pipe(catchError(() => of([]))),
            quota: this.adminService.getOrgQuota().pipe(catchError(() => of([]))),
            ratings: this.adminService.getTemplateRatings().pipe(catchError(() => of([]))),
            templates: this.templateService.getAll(0, 200).pipe(catchError(() => of({ content: [] }))),
        }).subscribe(({ stats, workspaces, projects, quota, ratings, templates }) => {
            this.stats.set(stats);
            this.workspaces.set((workspaces as AdminWorkspaceRow[]) || []);
            this.projects.set((projects as AdminProjectRow[]) || []);
            this.quotaOrgs.set((quota as OrgQuotaRow[]) || []);
            this.ratingRows.set((ratings as TemplateRatingRow[]) || []);
            this.allTemplates.set(templates?.content || []);
            this.loading.set(false);
        });
    }

    // ── Workspace actions ──────────────────────────────────────

    deleteWorkspace(row: AdminWorkspaceRow): void {
        this.adminService.deleteWorkspace(row.id).subscribe({
            next: () => {
                this.workspaces.update(list => list.map(w => w.id === row.id ? { ...w, deleted_at: new Date().toISOString() } : w));
                this.snackBar.open(`Workspace "${row.name}" deleted.`, "Close", { duration: 4000 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Delete failed", "Close", { duration: 4000 }),
        });
    }

    restoreWorkspace(row: AdminWorkspaceRow): void {
        this.adminService.restoreWorkspace(row.id).subscribe({
            next: () => {
                this.workspaces.update(list => list.map(w => w.id === row.id ? { ...w, deleted_at: null } : w));
                this.snackBar.open(`Workspace "${row.name}" restored.`, "Close", { duration: 4000 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Restore failed", "Close", { duration: 4000 }),
        });
    }

    // ── Project actions ────────────────────────────────────────

    toggleVisibility(row: AdminProjectRow): void {
        this.adminService.toggleProjectVisibility(row.id).subscribe({
            next: (res: Record<string, unknown>) => {
                this.projects.update(list => list.map(p => p.id === row.id ? { ...p, visibility: String(res["visibility"] || (row.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC")) } : p));
                this.snackBar.open(`Visibility updated.`, "Close", { duration: 3000 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Update failed", "Close", { duration: 4000 }),
        });
    }

    deleteProject(row: AdminProjectRow): void {
        this.adminService.deleteProject(row.id).subscribe({
            next: () => {
                this.projects.update(list => list.map(p => p.id === row.id ? { ...p, deleted_at: new Date().toISOString() } : p));
                this.snackBar.open(`Project "${row.name}" deleted.`, "Close", { duration: 4000 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Delete failed", "Close", { duration: 4000 }),
        });
    }

    // ── Template actions ───────────────────────────────────────

    approveTemplate(t: M2TemplateSummary): void {
        this.templateService.approve(t.id).subscribe({
            next: updated => {
                this.allTemplates.update(list => list.map(x => x.id === t.id ? { ...x, status: updated.status } : x));
                this.snackBar.open(`"${t.name}" approved.`, "Close", { duration: 3500 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Approve failed", "Close", { duration: 4000 }),
        });
    }

    openRejectDialog(t: M2TemplateSummary): void {
        const ref = this.dialog.open(TemplateRejectDialogComponent, {
            width: "480px",
            data: { templateName: t.name, templateId: t.id },
        });
        ref.afterClosed().subscribe((result: TemplateRejectDialogResult | undefined) => {
            if (result?.reason) {
                this.templateService.reject(t.id, result.reason).subscribe({
                    next: updated => {
                        this.allTemplates.update(list => list.map(x => x.id === t.id ? { ...x, status: updated.status, rejectionReason: result.reason } : x));
                        this.snackBar.open(`"${t.name}" rejected.`, "Close", { duration: 3500 });
                    },
                    error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Reject failed", "Close", { duration: 4000 }),
                });
            }
        });
    }

    toggleFeatured(t: M2TemplateSummary): void {
        this.templateService.setFeatured(t.id, !t.isFeatured).subscribe({
            next: updated => this.allTemplates.update(list => list.map(x => x.id === t.id ? { ...x, isFeatured: updated.isFeatured } : x)),
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Update failed", "Close", { duration: 4000 }),
        });
    }

    toggleTrending(t: M2TemplateSummary): void {
        this.templateService.setTrending(t.id, !t.isTrending).subscribe({
            next: updated => this.allTemplates.update(list => list.map(x => x.id === t.id ? { ...x, isTrending: updated.isTrending } : x)),
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Update failed", "Close", { duration: 4000 }),
        });
    }

    toggleRecommended(t: M2TemplateSummary): void {
        this.templateService.setRecommended(t.id, !t.isRecommended).subscribe({
            next: updated => this.allTemplates.update(list => list.map(x => x.id === t.id ? { ...x, isRecommended: updated.isRecommended } : x)),
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Update failed", "Close", { duration: 4000 }),
        });
    }

    deleteTemplate(t: M2TemplateSummary): void {
        this.templateService.delete(t.id).subscribe({
            next: () => {
                this.allTemplates.update(list => list.filter(x => x.id !== t.id));
                this.snackBar.open(`"${t.name}" deleted.`, "Close", { duration: 3500 });
            },
            error: (e: HttpErrorResponse) => this.snackBar.open(e?.error?.message || "Delete failed", "Close", { duration: 4000 }),
        });
    }

    // ── Helpers ────────────────────────────────────────────────

    isAtQuota(org: OrgQuotaRow): boolean {
        return org.ws_count >= org.max_workspaces || org.project_count >= org.max_active_projects;
    }

    isNearQuota(org: OrgQuotaRow): boolean {
        return (org.ws_count / Math.max(org.max_workspaces, 1) >= 0.8) ||
               (org.project_count / Math.max(org.max_active_projects, 1) >= 0.8);
    }

    pct(used: number, max: number): number {
        return max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
    }

    starsDisplay(rating: number): string {
        const filled = Math.round(rating);
        return "★".repeat(filled) + "☆".repeat(Math.max(0, 5 - filled));
    }

    formatDate(val: string | null | undefined): string {
        if (!val) return "—";
        try { return new Date(val).toLocaleDateString(); } catch { return val; }
    }

    projectStatusClass(status: string): string {
        const map: Record<string, string> = {
            ACTIVE: "theme-green",
            PLANNING: "theme-azure",
            ON_HOLD: "theme-orange",
            COMPLETED: "theme-blue",
            CANCELLED: "theme-red",
            ARCHIVED: "theme-orange",
        };
        return map[(status || "").toUpperCase()] || "";
    }

    templateStatusClass(status: string): string {
        const map: Record<string, string> = {
            APPROVED: "theme-green",
            PENDING_APPROVAL: "theme-orange",
            REJECTED: "theme-red",
            DRAFT: "theme-azure",
        };
        return map[(status || "").toUpperCase()] || "";
    }

    difficultyClass(level: string): string {
        const map: Record<string, string> = {
            BEGINNER: "theme-green",
            INTERMEDIATE: "theme-orange",
            ADVANCED: "theme-red",
        };
        return map[(level || "").toUpperCase()] || "";
    }
}
