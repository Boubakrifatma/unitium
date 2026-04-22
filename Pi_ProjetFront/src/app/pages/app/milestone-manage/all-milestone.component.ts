import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatListModule } from "@angular/material/list";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatTabsModule } from "@angular/material/tabs";
import { MatDialog } from "@angular/material/dialog";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { trigger, transition, style, animate, query, stagger } from "@angular/animations";
import { Chart, registerables } from "chart.js";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService, Project } from "../../../services/project-service";
import { CreateEditMilestoneComponent } from "./create-edit-milestone.component";
import { ConfirmDeleteDialogComponent } from "./confirm-delete-dialog.component";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";
import { SmartMilestonePanelComponent } from "../analytics/smart-milestone-panel.component";

Chart.register(...registerables);

@Component({
    selector: "app-all-milestone",
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatMenuModule,
        MatButtonModule,
        MatFormFieldModule,
        FormsModule,
        ReactiveFormsModule,
        MatListModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatProgressBarModule,
        MatTabsModule,
        SmartMilestonePanelComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- ===== HEADER ===== -->
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <mat-card class="header-card shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1">
                        <h2 class="header-title mb-1">Milestones</h2>
                        <p class="breadcrumb-text">
                            <span routerLink="/app/dashboard" class="breadcrumb-link">
                                <mat-icon class="material-icons-outlined">home</mat-icon>
                                Dashboard
                            </span>
                            <mat-icon class="material-icons-outlined">chevron_right</mat-icon>
                            <span>All Milestones</span>
                        </p>
                    </div>
                    <div class="col-auto order-2 mb-3 mb-xl-0">
                        <button mat-raised-button color="primary" class="create-btn" (click)="createMilestone()">
                            <mat-icon class="material-icons-outlined">add</mat-icon>
                            New Milestone
                        </button>
                    </div>
                </div>
            </mat-card>
        </div>

        <div class="container fade-in">

            <!-- ===== KPI STRIP ===== -->
            <div class="kpi-strip mb-4">
                <div class="kpi-box kpi-total">
                    <span class="kpi-num">{{ donutStats().total }}</span>
                    <span class="kpi-label">Total</span>
                </div>
                <div class="kpi-box kpi-completed">
                    <span class="kpi-num">{{ donutStats().completed }}</span>
                    <span class="kpi-label">Completed</span>
                </div>
                <div class="kpi-box kpi-in-progress">
                    <span class="kpi-num">{{ donutStats().in_progress }}</span>
                    <span class="kpi-label">In Progress</span>
                </div>
                <div class="kpi-box kpi-at-risk">
                    <span class="kpi-num">{{ donutStats().at_risk }}</span>
                    <span class="kpi-label">At Risk</span>
                </div>
                <div class="kpi-box kpi-missed">
                    <span class="kpi-num">{{ donutStats().missed }}</span>
                    <span class="kpi-label">Missed</span>
                </div>
                <div class="kpi-donut-wrapper">
                    <canvas #donutCanvas width="120" height="120"></canvas>
                </div>
            </div>

            <!-- ===== SEARCH AND FILTER ===== -->
            <div class="search-section mb-3">
                <div class="filter-row">
                    <mat-form-field appearance="outline" class="search-field">
                        <mat-icon matPrefix class="search-icon">search</mat-icon>
                        <input matInput
                            (keyup)="applyFilter($event)"
                            placeholder="Search milestones by name, status..."
                            #input />
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="filter-field">
                        <mat-label>Filter by Project</mat-label>
                        <mat-select [value]="selectedProjectId()" (selectionChange)="onProjectFilterChange($event.value)">
                            <mat-option [value]="null">All Projects</mat-option>
                            <mat-option *ngFor="let project of projects()" [value]="project.id">
                                {{ project.name }}
                            </mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>
            </div>

            <!-- ===== STATUS FILTER CHIPS ===== -->
            <div class="filter-chips mb-4">
                <button class="chip" [class.chip-active]="statusFilter() === 'all'" (click)="setStatusFilter('all')">
                    All
                </button>
                <button class="chip" [class.chip-active]="statusFilter() === 'pending'" (click)="setStatusFilter('pending')">
                    Pending
                </button>
                <button class="chip" [class.chip-active]="statusFilter() === 'in_progress'" (click)="setStatusFilter('in_progress')">
                    In Progress
                </button>
                <button class="chip" [class.chip-active]="statusFilter() === 'at_risk'" (click)="setStatusFilter('at_risk')">
                    At Risk
                </button>
                <button class="chip" [class.chip-active]="statusFilter() === 'completed'" (click)="setStatusFilter('completed')">
                    Completed
                </button>
                <button class="chip" [class.chip-active]="statusFilter() === 'missed'" (click)="setStatusFilter('missed')">
                    Missed
                </button>

                <!-- View mode switcher -->
                <div class="view-switcher">
                    <button class="view-btn" [class.view-btn-active]="viewMode() === 'cards'" (click)="viewMode.set('cards')">
                        <mat-icon>grid_view</mat-icon>
                        Cards
                    </button>
                    <button class="view-btn" [class.view-btn-active]="viewMode() === 'timeline'" (click)="viewMode.set('timeline')">
                        <mat-icon>timeline</mat-icon>
                        Timeline
                    </button>
                </div>
            </div>

            <!-- ===== TIMELINE VIEW (Horizontal Pseudo-3D) ===== -->
            <div class="tl3d-wrapper mb-4" *ngIf="viewMode() === 'timeline' && displayedMilestones().length > 0">

                <!-- Header row -->
                <div class="tl3d-header-row">
                    <div class="tl3d-label-col">
                        <span class="tl3d-title">Milestone Timeline</span>
                        <span class="tl3d-legend">
                            <span class="tl3d-dot" style="background:#10b981"></span>Completed
                            <span class="tl3d-dot" style="background:#6366f1"></span>In Progress
                            <span class="tl3d-dot" style="background:#f97316"></span>At Risk
                            <span class="tl3d-dot" style="background:#64748b"></span>Pending
                            <span class="tl3d-dot" style="background:#ef4444"></span>Missed
                        </span>
                    </div>
                    <div class="tl3d-chart-col">
                        <!-- Month axis -->
                        <div class="tl3d-month-axis">
                            <span class="tl3d-month-label"
                                *ngFor="let m of timelineMonthLabels()"
                                [style.left.%]="m.pct">
                                {{ m.label }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Scrollable chart body -->
                <div class="tl3d-body">
                    <ng-container *ngFor="let row of timelineRows(); let ri = index">
                        <div class="tl3d-row">
                            <!-- Left label column -->
                            <div class="tl3d-row-label">
                                <span class="tl3d-row-name" [title]="row.name">{{ row.name }}</span>
                                <span class="tl3d-row-date">{{ row.dueDate | date:'MMM d' }}</span>
                            </div>

                            <!-- Chart area -->
                            <div class="tl3d-row-chart">
                                <!-- Today line -->
                                <div class="tl3d-today-line"
                                    *ngIf="timelineTodayPct() >= 0 && timelineTodayPct() <= 100"
                                    [style.left.%]="timelineTodayPct()">
                                    <span class="tl3d-today-label" *ngIf="ri === 0">Today</span>
                                </div>

                                <!-- 3D pill bar -->
                                <div class="tl3d-pill"
                                    [class]="'tl3d-pill-' + row.status"
                                    [class.tl3d-pill-selected]="selectedMilestone()?.id === row.id"
                                    [style.left.%]="row.leftPct"
                                    [style.width.%]="row.widthPct"
                                    [title]="row.name + ' · ' + row.status + ' · ' + (row.completionPct || 0) + '%'"
                                    (click)="onTimelineMilestoneClick(row)"
                                    (mouseenter)="showTooltip($event, row)"
                                    (mouseleave)="hideTooltip()">
                                    <span class="tl3d-pill-text">{{ row.name }}</span>
                                </div>
                            </div>
                        </div>
                    </ng-container>
                </div>

                <!-- Tooltip -->
                <div class="tl3d-tooltip"
                    *ngIf="tooltipVisible() && tooltipData()"
                    [style.top.px]="tooltipY()"
                    [style.left.px]="tooltipX()">
                    <div class="tt-name">{{ tooltipData()!.name }}</div>
                    <div class="tt-row">
                        <span class="tt-label">Status:</span>
                        <span class="tt-val tt-status" [class]="'tt-s-' + tooltipData()!.status">{{ tooltipData()!.status | titlecase }}</span>
                    </div>
                    <div class="tt-row">
                        <span class="tt-label">Completion:</span>
                        <span class="tt-val">{{ tooltipData()!.completionPct || 0 }}%</span>
                    </div>
                    <div class="tt-row">
                        <span class="tt-label">Due Date:</span>
                        <span class="tt-val">{{ tooltipData()!.dueDate | date:'MMM d, yyyy' }}</span>
                    </div>
                    <div class="tt-row" *ngIf="tooltipData()!.riskScore != null">
                        <span class="tt-label">Risk Score:</span>
                        <span class="tt-val">{{ tooltipData()!.riskScore }}</span>
                    </div>
                </div>

                <!-- Detail panel at bottom -->
                <div class="tl3d-detail-panel" *ngIf="selectedMilestone() as sm">
                    <div class="tdp-header">
                        <div class="tdp-title">
                            <span class="tdp-id-badge">{{ sm.id }}</span>
                            <span class="tdp-name">{{ sm.name }}</span>
                            <span class="tdp-status-badge" [class]="'tdp-s-' + sm.status">{{ sm.status | titlecase }}</span>
                        </div>
                        <button class="tdp-close" (click)="selectedMilestone.set(null)">
                            <mat-icon>close</mat-icon>
                        </button>
                    </div>
                    <div class="tdp-body">
                        <div class="tdp-meta-item">
                            <mat-icon>calendar_today</mat-icon>
                            <span>Due: {{ sm.dueDate | date:'MMM dd, yyyy' }}</span>
                        </div>
                        <div class="tdp-meta-item">
                            <mat-icon>donut_large</mat-icon>
                            <span>Completion: {{ sm.completionPct || 0 }}%</span>
                        </div>
                        <div class="tdp-meta-item" *ngIf="sm.riskScore != null">
                            <mat-icon>warning</mat-icon>
                            <span>Risk Score: {{ sm.riskScore }}</span>
                        </div>
                        <div class="tdp-meta-item" *ngIf="sm.predictedDueDate && sm.predictedDueDate !== sm.dueDate">
                            <mat-icon>update</mat-icon>
                            <span>Predicted: {{ sm.predictedDueDate | date:'MMM dd, yyyy' }}</span>
                        </div>
                        <div class="tdp-meta-item" *ngIf="sm.description">
                            <mat-icon>notes</mat-icon>
                            <span>{{ sm.description }}</span>
                        </div>
                    </div>
                    <div class="tdp-progress-bar-track">
                        <div class="tdp-progress-bar" [class]="'tdp-pb-' + sm.status"
                            [style.width.%]="sm.completionPct || 0">
                        </div>
                    </div>
                </div>
            </div>

            <!-- ===== CARDS VIEW ===== -->
            <div class="milestones-grid"
                *ngIf="viewMode() === 'cards' && displayedMilestones().length > 0; else noMilestones">
                <div class="milestone-card-wrapper"
                    *ngFor="let milestone of displayedMilestones(); let i = index"
                    [@cardAnimation]="i"
                    [attr.data-status]="milestone.status">
                    <mat-card class="milestone-card"
                        [class.expanded]="expandedMilestoneIds().has(milestone.id)"
                        [ngClass]="'border-status-' + milestone.status">

                        <!-- Card Header -->
                        <div class="card-header">
                            <div class="header-content">
                                <div class="milestone-id-badge">{{ milestone.id }}</div>
                                <div class="milestone-info">
                                    <div class="milestone-name-row">
                                        <h3 class="milestone-name">{{ milestone.name }}</h3>
                                        <span class="risk-badge" *ngIf="milestone?.riskScore != null">
                                            Risk: {{ milestone.riskScore }}
                                        </span>
                                    </div>
                                    <p class="milestone-project">{{ getProjectName(milestoneProjectId(milestone)) }}</p>
                                </div>
                            </div>
                            <div class="header-actions">
                                <span class="status-badge" [ngClass]="'status-' + milestone.status">
                                    {{ milestone.status | titlecase }}
                                </span>
                                <button mat-icon-button
                                    (click)="toggleDetails(milestone.id)"
                                    class="expand-btn"
                                    [class.rotated]="expandedMilestoneIds().has(milestone.id)">
                                    <mat-icon>expand_more</mat-icon>
                                </button>
                            </div>
                        </div>

                        <!-- Card Body -->
                        <div class="card-body">
                            <!-- Completion Progress -->
                            <div class="progress-section">
                                <div class="progress-header">
                                    <span class="progress-label">Completion</span>
                                    <span class="progress-value">{{ milestone.completionPct }}%</span>
                                </div>
                                <mat-progress-bar
                                    mode="determinate"
                                    [value]="milestone.completionPct"
                                    class="custom-progress-bar">
                                </mat-progress-bar>
                            </div>

                            <!-- Key Info -->
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">
                                        <mat-icon>calendar_today</mat-icon>
                                        Due Date
                                    </span>
                                    <span class="info-value">{{ milestone.dueDate | date: 'MMM dd, yyyy' }}</span>
                                </div>
                                <!-- Countdown -->
                                <div class="info-item" *ngIf="milestone.dueDate">
                                    <span class="info-label">
                                        <mat-icon>schedule</mat-icon>
                                        Deadline
                                    </span>
                                    <span class="info-value countdown"
                                        [class.countdown-ok]="daysUntil(milestone.dueDate) >= 0"
                                        [class.countdown-late]="daysUntil(milestone.dueDate) < 0">
                                        <ng-container *ngIf="daysUntil(milestone.dueDate) >= 0">
                                            {{ daysUntil(milestone.dueDate) }} jours restants
                                        </ng-container>
                                        <ng-container *ngIf="daysUntil(milestone.dueDate) < 0">
                                            En retard de {{ -daysUntil(milestone.dueDate) }}j
                                        </ng-container>
                                    </span>
                                </div>
                                <!-- Predicted due date if different -->
                                <div class="info-item" *ngIf="milestone?.predictedDueDate && milestone.predictedDueDate !== milestone.dueDate">
                                    <span class="info-label">
                                        <mat-icon>update</mat-icon>
                                        Predicted
                                    </span>
                                    <span class="info-value predicted-date">
                                        {{ milestone.predictedDueDate | date: 'MMM dd, yyyy' }}
                                    </span>
                                </div>
                            </div>

                            <!-- Expandable Details -->
                            <div class="expandable-content" *ngIf="expandedMilestoneIds().has(milestone.id)">
                                <div class="details-section">
                                    <h4 class="details-title">Description</h4>
                                    <p class="details-text">{{ milestone.description || 'No description provided' }}</p>
                                </div>

                                <div class="details-section">
                                    <h4 class="details-title">Additional Details</h4>
                                    <div class="details-grid">
                                        <div class="detail-item">
                                            <span class="detail-label">Status</span>
                                            <span class="detail-value">{{ milestone.status | titlecase }}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Completion</span>
                                            <span class="detail-value">{{ milestone.completionPct }}%</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Project</span>
                                            <span class="detail-value">{{ getProjectName(milestoneProjectId(milestone)) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Smart Milestone Panel -->
                                <app-smart-milestone-panel
                                    *ngIf="milestone.id != null"
                                    [milestoneId]="milestone.id!"
                                    [expanded]="false"
                                    class="d-block mb-3">
                                </app-smart-milestone-panel>

                                <!-- Action Buttons -->
                                <div class="action-buttons">
                                    <button mat-stroked-button
                                        class="action-btn view-tasks-btn"
                                        (click)="viewTasks(milestone)">
                                        <mat-icon>list</mat-icon>
                                        View Tasks
                                    </button>
                                    <button mat-stroked-button
                                        class="action-btn edit-btn"
                                        (click)="editMilestone(milestone)">
                                        <mat-icon>edit</mat-icon>
                                        Edit
                                    </button>
                                    <button mat-stroked-button
                                        class="action-btn delete-btn"
                                        (click)="deleteMilestone(milestone)">
                                        <mat-icon>delete</mat-icon>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Hover Actions (for compact view) -->
                        <div class="card-actions" *ngIf="!expandedMilestoneIds().has(milestone.id)">
                            <button mat-icon-button
                                (click)="viewTasks(milestone)"
                                matTooltip="View Tasks"
                                class="hover-action-btn">
                                <mat-icon>list</mat-icon>
                            </button>
                            <button mat-icon-button
                                [matMenuTriggerFor]="actionsMenu"
                                class="hover-action-btn">
                                <mat-icon>more_vert</mat-icon>
                            </button>
                            <mat-menu #actionsMenu="matMenu">
                                <button mat-menu-item (click)="editMilestone(milestone)">
                                    <mat-icon>edit</mat-icon>
                                    <span>Edit</span>
                                </button>
                                <button mat-menu-item (click)="deleteMilestone(milestone)">
                                    <mat-icon>delete</mat-icon>
                                    <span>Delete</span>
                                </button>
                            </mat-menu>
                        </div>
                    </mat-card>
                </div>
            </div>

            <!-- Empty State -->
            <ng-template #noMilestones>
                <div class="empty-state" *ngIf="viewMode() === 'cards' || displayedMilestones().length === 0">
                    <mat-icon class="empty-icon">flag</mat-icon>
                    <h3>No Milestones Found</h3>
                    <p>Start by creating a new milestone to track your project progress</p>
                    <button mat-raised-button color="primary" (click)="createMilestone()">
                        <mat-icon>add</mat-icon>
                        Create Milestone
                    </button>
                </div>
            </ng-template>
        </div>
    `,
    styles: [`
        .container-fluid, .container {
            max-width: 1400px;
            margin-left: auto;
            margin-right: auto;
        }

        /* ===== Header ===== */
        .header-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            border: none;
        }

        .header-title {
            color: white;
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin: 0;
        }

        .breadcrumb-text {
            color: rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            margin: 0;
        }

        .breadcrumb-link {
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            text-decoration: none;
            color: white;
            transition: opacity 0.3s;
        }

        .breadcrumb-link:hover { opacity: 0.8; }

        .breadcrumb-link mat-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
        }

        .create-btn {
            background: white;
            color: #667eea;
            font-weight: 600;
            padding: 8px 24px;
            height: auto;
        }

        /* ===== KPI Strip ===== */
        .kpi-strip {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .kpi-box {
            flex: 1;
            min-width: 100px;
            border-radius: 12px;
            padding: 14px 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .kpi-num {
            font-size: 2rem;
            font-weight: 800;
            line-height: 1;
        }

        .kpi-label {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.85;
        }

        .kpi-total    { background: #ede9fe; color: #6d28d9; }
        .kpi-completed { background: #d1fae5; color: #065f46; }
        .kpi-in-progress { background: #fef3c7; color: #92400e; }
        .kpi-at-risk  { background: #ffedd5; color: #c2410c; }
        .kpi-missed   { background: #fee2e2; color: #991b1b; }

        .kpi-donut-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
        }

        .kpi-donut-wrapper canvas {
            border-radius: 50%;
        }

        /* ===== Search Section ===== */
        .search-section { margin-bottom: 1rem; }

        .filter-row {
            display: flex;
            gap: 16px;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-field {
            flex: 1;
            min-width: 250px;
            max-width: 400px;
        }

        .filter-field {
            min-width: 200px;
            max-width: 300px;
        }

        .search-icon { color: #667eea; margin-right: 8px; }

        /* ===== Filter Chips ===== */
        .filter-chips {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }

        .chip {
            padding: 6px 16px;
            border: 1.5px solid #d1d5db;
            background: white;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
        }

        .chip:hover { border-color: #667eea; color: #667eea; }

        .chip-active {
            background: #667eea;
            border-color: #667eea;
            color: white;
        }

        .view-switcher {
            display: flex;
            gap: 4px;
            margin-left: auto;
            border: 1.5px solid #d1d5db;
            border-radius: 10px;
            overflow: hidden;
        }

        .view-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 14px;
            border: none;
            background: white;
            font-size: 0.82rem;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
        }

        .view-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

        .view-btn-active {
            background: #667eea;
            color: white;
        }

        /* ===== Timeline View (3D Horizontal) ===== */
        .tl3d-wrapper {
            background: white;
            border-radius: 14px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.07);
            border: 1px solid #e5e7eb;
            overflow: hidden;
            position: relative;
        }

        /* Header row */
        .tl3d-header-row {
            display: flex;
            border-bottom: 1px solid #f3f4f6;
            background: #fafbfc;
            padding: 14px 0;
        }

        .tl3d-label-col {
            width: 220px;
            flex-shrink: 0;
            padding: 0 16px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
        }

        .tl3d-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1f2937;
        }

        .tl3d-legend {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            font-size: 0.72rem;
            color: #6b7280;
            font-weight: 500;
        }

        .tl3d-dot {
            display: inline-block;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            margin-right: 2px;
        }

        .tl3d-chart-col {
            flex: 1;
            position: relative;
            padding: 0 8px;
            min-width: 0;
        }

        /* Month axis */
        .tl3d-month-axis {
            position: relative;
            height: 40px;
        }

        .tl3d-month-label {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 0.72rem;
            font-weight: 600;
            color: #9ca3af;
            white-space: nowrap;
            background: #fafbfc;
            padding: 2px 6px;
            border-radius: 4px;
        }

        /* Body */
        .tl3d-body {
            overflow-y: auto;
            max-height: 480px;
            padding-bottom: 8px;
        }

        .tl3d-row {
            display: flex;
            align-items: center;
            height: 60px;
            border-bottom: 1px solid #f9fafb;
        }

        .tl3d-row:hover { background: #fafbfc; }

        .tl3d-row-label {
            width: 220px;
            flex-shrink: 0;
            padding: 0 16px;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .tl3d-row-name {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1f2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 190px;
        }

        .tl3d-row-date { font-size: 0.72rem; color: #9ca3af; }

        .tl3d-row-chart {
            flex: 1;
            position: relative;
            height: 100%;
            padding: 0 8px;
            min-width: 0;
        }

        /* Today line */
        .tl3d-today-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: rgba(239,68,68,0.7);
            border: none;
            z-index: 10;
            pointer-events: none;
            background: repeating-linear-gradient(
                to bottom,
                #ef4444 0px,
                #ef4444 6px,
                transparent 6px,
                transparent 10px
            );
        }

        .tl3d-today-label {
            position: absolute;
            top: 4px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.65rem;
            font-weight: 700;
            color: #ef4444;
            background: white;
            padding: 1px 4px;
            border-radius: 4px;
            border: 1px solid #ef4444;
            white-space: nowrap;
        }

        /* 3D pill */
        .tl3d-pill {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            height: 36px;
            min-width: 40px;
            border-radius: 18px;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease;
            display: flex;
            align-items: center;
            overflow: hidden;
            z-index: 5;
        }

        .tl3d-pill:hover {
            transform: translateY(-52%) scale(1.03);
            z-index: 20;
        }

        .tl3d-pill-selected {
            outline: 3px solid #6366f1;
            outline-offset: 2px;
            z-index: 15;
        }

        .tl3d-pill-text {
            padding: 0 12px;
            font-size: 0.78rem;
            font-weight: 600;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: 0 1px 2px rgba(0,0,0,0.25);
            pointer-events: none;
        }

        /* Status colors with 3D gradient + shadow */
        .tl3d-pill-completed {
            background: linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%);
            box-shadow:
                0 4px 0 #047857,
                0 6px 8px rgba(5,150,105,0.35),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .tl3d-pill-in_progress {
            background: linear-gradient(180deg, #818cf8 0%, #6366f1 50%, #4f46e5 100%);
            box-shadow:
                0 4px 0 #3730a3,
                0 6px 8px rgba(99,102,241,0.35),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .tl3d-pill-at_risk {
            background: linear-gradient(180deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
            box-shadow:
                0 4px 0 #c2410c,
                0 6px 8px rgba(249,115,22,0.35),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .tl3d-pill-pending {
            background: linear-gradient(180deg, #94a3b8 0%, #64748b 50%, #475569 100%);
            box-shadow:
                0 4px 0 #334155,
                0 6px 8px rgba(100,116,139,0.35),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .tl3d-pill-missed {
            background: linear-gradient(180deg, #f87171 0%, #ef4444 50%, #dc2626 100%);
            box-shadow:
                0 4px 0 #b91c1c,
                0 6px 8px rgba(239,68,68,0.35),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        /* Tooltip */
        .tl3d-tooltip {
            position: absolute;
            background: #1f2937;
            color: white;
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 0.82rem;
            z-index: 100;
            pointer-events: none;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            min-width: 180px;
            transform: translateX(-50%);
        }

        .tt-name {
            font-weight: 700;
            font-size: 0.9rem;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.12);
            padding-bottom: 6px;
        }

        .tt-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 4px;
        }

        .tt-label { color: rgba(255,255,255,0.6); }
        .tt-val { font-weight: 600; }

        .tt-s-completed   { color: #34d399; }
        .tt-s-in_progress { color: #818cf8; }
        .tt-s-at_risk     { color: #fb923c; }
        .tt-s-pending     { color: #94a3b8; }
        .tt-s-missed      { color: #f87171; }

        /* Detail panel */
        .tl3d-detail-panel {
            border-top: 2px solid #6366f1;
            background: #fafbff;
            padding: 16px 20px;
            animation: slideDown 0.3s ease-out;
        }

        .tdp-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .tdp-title {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .tdp-id-badge {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            color: white;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 0.72rem;
            font-weight: 700;
        }

        .tdp-name {
            font-size: 1rem;
            font-weight: 700;
            color: #1f2937;
        }

        .tdp-status-badge {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
        }

        .tdp-s-completed  { background: #10b981; }
        .tdp-s-in_progress { background: #6366f1; }
        .tdp-s-at_risk    { background: #f97316; }
        .tdp-s-pending    { background: #64748b; }
        .tdp-s-missed     { background: #ef4444; }

        .tdp-close {
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .tdp-close:hover { background: #f3f4f6; color: #1f2937; }

        .tdp-body {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 14px;
        }

        .tdp-meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
            color: #374151;
        }

        .tdp-meta-item mat-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: #6366f1;
        }

        .tdp-progress-bar-track {
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
        }

        .tdp-progress-bar {
            height: 100%;
            border-radius: 3px;
            transition: width 0.5s ease;
        }

        .tdp-pb-completed  { background: linear-gradient(90deg, #10b981, #059669); }
        .tdp-pb-in_progress { background: linear-gradient(90deg, #818cf8, #6366f1); }
        .tdp-pb-at_risk    { background: linear-gradient(90deg, #fb923c, #f97316); }
        .tdp-pb-pending    { background: linear-gradient(90deg, #94a3b8, #64748b); }
        .tdp-pb-missed     { background: linear-gradient(90deg, #f87171, #ef4444); }

        /* ===== Milestones Grid ===== */
        .milestones-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
        }

        .milestone-card-wrapper { animation: slideIn 0.6s ease-out both; }

        /* Status badge colours driven by data-status on the wrapper */
        .milestone-card-wrapper[data-status="completed"] .status-badge {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .milestone-card-wrapper[data-status="in_progress"] .status-badge {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .milestone-card-wrapper[data-status="pending"] .status-badge {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }
        .milestone-card-wrapper[data-status="at_risk"] .status-badge {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        }
        .milestone-card-wrapper[data-status="missed"] .status-badge {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        /* Left border color by status */
        .milestone-card.border-status-completed  { border-left: 4px solid #10b981 !important; }
        .milestone-card.border-status-in_progress { border-left: 4px solid #f59e0b !important; }
        .milestone-card.border-status-pending     { border-left: 4px solid #6b7280 !important; }
        .milestone-card.border-status-at_risk     { border-left: 4px solid #f97316 !important; }
        .milestone-card.border-status-missed      { border-left: 4px solid #ef4444 !important; }

        /* ===== Card Styles ===== */
        .milestone-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .milestone-card:hover {
            border-color: #667eea;
            box-shadow: 0 8px 24px rgba(102,126,234,0.12);
            transform: translateY(-2px);
        }

        /* Card Header */
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px;
            border-bottom: 1px solid #f3f4f6;
        }

        .header-content { display: flex; gap: 12px; flex: 1; }

        .milestone-id-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 8px;
            padding: 4px 12px;
            font-size: 0.75rem;
            font-weight: 700;
            white-space: nowrap;
            align-self: flex-start;
            margin-top: 2px;
        }

        .milestone-info { flex: 1; }

        .milestone-name-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .milestone-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 4px 0;
            line-height: 1.4;
        }

        .risk-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 700;
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }

        .milestone-project { font-size: 0.85rem; color: #6b7280; margin: 0; }

        .header-actions { display: flex; gap: 12px; align-items: flex-start; }

        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
            white-space: nowrap;
            background: #6b7280;
        }

        .expand-btn { transition: transform 0.3s ease; }
        .expand-btn.rotated { transform: rotate(180deg); }

        /* Card Body */
        .card-body {
            padding: 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .progress-section { margin-bottom: 20px; }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .progress-label { font-size: 0.85rem; font-weight: 600; color: #6b7280; }

        .progress-value { font-size: 0.9rem; font-weight: 700; color: #667eea; }

        .custom-progress-bar {
            height: 6px;
            border-radius: 3px;
            background-color: #e5e7eb;
        }

        .custom-progress-bar ::ng-deep .mat-progress-bar-fill {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 16px 0;
            border-top: 1px solid #f3f4f6;
            border-bottom: 1px solid #f3f4f6;
        }

        .info-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }

        .info-label {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #6b7280;
            font-weight: 500;
        }

        .info-label mat-icon {
            font-size: 16px !important;
            width: 16px !important;
            height: 16px !important;
            color: #667eea;
        }

        .info-value { font-weight: 600; color: #1f2937; margin-left: auto; }

        .countdown { font-size: 0.82rem; }
        .countdown-ok  { color: #059669; }
        .countdown-late { color: #dc2626; }

        .predicted-date { color: #d97706; font-style: italic; }

        /* Expandable Details */
        .expandable-content {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #f3f4f6;
            animation: slideDown 0.3s ease-out;
        }

        .details-section { margin-bottom: 20px; }

        .details-title {
            font-size: 0.9rem;
            font-weight: 700;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #667eea;
        }

        .details-text { font-size: 0.9rem; color: #4b5563; line-height: 1.6; margin: 0; }

        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .detail-item { display: flex; flex-direction: column; gap: 4px; }

        .detail-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .detail-value { font-size: 0.95rem; font-weight: 600; color: #1f2937; }

        /* Action Buttons */
        .action-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #f3f4f6;
        }

        .action-btn {
            font-size: 0.85rem;
            font-weight: 600;
            border-radius: 8px;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }

        .view-tasks-btn { color: #667eea; border-color: #667eea; }
        .view-tasks-btn:hover { background: #667eea; color: white; }
        .edit-btn { color: #f59e0b; border-color: #f59e0b; }
        .edit-btn:hover { background: #f59e0b; color: white; }
        .delete-btn { color: #ef4444; border-color: #ef4444; }
        .delete-btn:hover { background: #ef4444; color: white; }

        /* Hover Actions */
        .card-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid #f3f4f6;
            background: #fafbfc;
        }

        .hover-action-btn { color: #667eea; transition: all 0.3s ease; }
        .hover-action-btn:hover { background: #667eea; color: white; }

        /* Empty State */
        .empty-state { text-align: center; padding: 60px 20px; }

        .empty-icon {
            font-size: 64px;
            width: 64px;
            height: 64px;
            color: #d1d5db;
            margin-bottom: 20px;
        }

        .empty-state h3 { font-size: 1.5rem; font-weight: 700; color: #1f2937; margin: 0 0 8px 0; }
        .empty-state p  { font-size: 0.95rem; color: #6b7280; margin: 0 0 24px 0; }

        /* Animations */
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
            from { opacity: 0; max-height: 0; transform: translateY(-10px); }
            to   { opacity: 1; max-height: 1000px; transform: translateY(0); }
        }

        .fade-in { animation: fadeIn 0.6s ease-out; }

        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .milestones-grid { grid-template-columns: 1fr; }
            .header-title { font-size: 1.5rem; }
            .filter-row { flex-direction: column; align-items: stretch; }
            .search-field, .filter-field { min-width: auto; max-width: none; }
            .action-buttons { grid-template-columns: 1fr; }
            .details-grid { grid-template-columns: 1fr; }
            .kpi-strip { gap: 8px; }
            .kpi-donut-wrapper { display: none; }
            .view-switcher { margin-left: 0; }
        }
    `],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    animations: [
        trigger('cardAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
                    style({ opacity: 1, transform: 'translateY(0)' })
                ),
            ]),
        ]),
    ],
})
export class AllMilestoneComponent implements OnInit, AfterViewInit {
    milestones = signal<Milestone[]>([]);
    projects = signal<Project[]>([]);
    filteredMilestones = signal<Milestone[]>([]);
    expandedMilestoneIds = signal<Set<string | number | null | undefined>>(new Set());
    selectedProjectId = signal<string | null>(null);

    // New signals
    statusFilter = signal<string>('all');
    viewMode = signal<'cards' | 'timeline'>('cards');

    // Input pour filtrer par projet
    projectId = input<string | null>(null);

    // ViewChild for donut chart
    @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
    private donutChart: Chart | null = null;

    // Computed donut stats from ALL milestones (not filtered)
    donutStats = computed(() => {
        const all = this.filteredMilestones();
        return {
            total:       all.length,
            completed:   all.filter(m => m.status === 'completed').length,
            in_progress: all.filter(m => m.status === 'in_progress').length,
            at_risk:     all.filter(m => m.status === 'at_risk').length,
            pending:     all.filter(m => m.status === 'pending').length,
            missed:      all.filter(m => m.status === 'missed').length,
        };
    });

    // displayedMilestones applies BOTH text search (via filteredMilestones) AND status chip filter
    displayedMilestones = computed(() => {
        const sf = this.statusFilter();
        const base = this.filteredMilestones();
        if (sf === 'all') return base;
        return base.filter(m => m.status === sf);
    });

    // ===== TIMELINE 3D computed signals =====
    selectedMilestone = signal<Milestone | null>(null);

    // Tooltip state
    tooltipVisible = signal<boolean>(false);
    tooltipData = signal<Milestone | null>(null);
    tooltipX = signal<number>(0);
    tooltipY = signal<number>(0);

    timelineStart = computed((): Date => {
        const ms = this.displayedMilestones();
        if (!ms.length) return new Date();
        const dates = ms
            .map(m => m.dueDate ? new Date(m.dueDate).getTime() : Date.now())
            .filter(d => !isNaN(d));
        const earliest = Math.min(...dates);
        const d = new Date(earliest);
        d.setDate(d.getDate() - 30); // show some margin before first due date
        return d;
    });

    timelineEnd = computed((): Date => {
        const ms = this.displayedMilestones();
        if (!ms.length) return new Date();
        const dates = ms
            .map(m => m.dueDate ? new Date(m.dueDate).getTime() : Date.now())
            .filter(d => !isNaN(d));
        const latest = Math.max(...dates);
        const d = new Date(latest);
        d.setDate(d.getDate() + 21);
        return d;
    });

    timelineTodayPct = computed((): number => {
        const start = this.timelineStart().getTime();
        const end = this.timelineEnd().getTime();
        const range = end - start;
        if (range <= 0) return -1;
        const today = new Date().getTime();
        return ((today - start) / range) * 100;
    });

    timelineRows = computed(() => {
        const ms = this.displayedMilestones();
        if (!ms.length) return [];
        const start = this.timelineStart().getTime();
        const end = this.timelineEnd().getTime();
        const range = end - start;
        if (range <= 0) return [];

        return ms.map(m => {
            // Use dueDate as the bar's right edge; start bar 30 days before or at timeline start
            const dueTs = m.dueDate ? new Date(m.dueDate).getTime() : end;

            // Estimate start: 30 days before due or timeline start (whichever is later)
            const estimatedStartTs = Math.max(start, dueTs - 30 * 86400000);

            const leftPct = Math.max(0, ((estimatedStartTs - start) / range) * 100);
            const rightPct = Math.min(100, ((dueTs - start) / range) * 100);
            const widthPct = Math.max(2, rightPct - leftPct);

            return {
                id: m.id,
                name: m.name,
                status: m.status,
                dueDate: m.dueDate,
                completionPct: m.completionPct,
                riskScore: m.riskScore,
                predictedDueDate: m.predictedDueDate,
                description: m.description,
                leftPct,
                widthPct,
            };
        });
    });

    timelineMonthLabels = computed((): { label: string; pct: number }[] => {
        const start = this.timelineStart();
        const end = this.timelineEnd();
        const range = end.getTime() - start.getTime();
        if (range <= 0) return [];

        const labels: { label: string; pct: number }[] = [];
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        cursor.setMonth(cursor.getMonth() + 1);

        while (cursor < end) {
            const pct = ((cursor.getTime() - start.getTime()) / range) * 100;
            if (pct >= 0 && pct <= 100) {
                labels.push({
                    label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                    pct,
                });
            }
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return labels;
    });

    onTimelineMilestoneClick(row: any) {
        const milestone = this.displayedMilestones().find(m => m.id === row.id) ?? null;
        this.selectedMilestone.set(
            this.selectedMilestone()?.id === row.id ? null : milestone
        );
    }

    showTooltip(event: MouseEvent, row: any) {
        const milestone = this.displayedMilestones().find(m => m.id === row.id) ?? null;
        this.tooltipData.set(milestone);
        this.tooltipVisible.set(true);
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const wrapperEl = (event.currentTarget as HTMLElement).closest('.tl3d-wrapper');
        const wrapperRect = wrapperEl?.getBoundingClientRect() ?? rect;
        this.tooltipX.set(rect.left - wrapperRect.left + rect.width / 2);
        this.tooltipY.set(rect.top - wrapperRect.top - 120);
    }

    hideTooltip() {
        this.tooltipVisible.set(false);
    }

    constructor(
        private milestoneService: MilestoneService,
        private projectService: ProjectService,
        private dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        // Récupérer le projectId depuis les query params ou l'input
        const queryProjectId = this.route.snapshot.queryParams['projectId'];
        const inputProjectId = this.projectId();

        this.selectedProjectId.set(queryProjectId || inputProjectId);

        // Charger d'abord les projets de l'utilisateur, puis les milestones
        this.loadUserProjects();
    }

    ngAfterViewInit() {
        // Initial render (may have no data yet — will re-render after load)
        setTimeout(() => this.renderDonut(), 100);
    }

    private renderDonut() {
        if (!this.donutCanvas) return;
        const ctx = this.donutCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        if (this.donutChart) {
            this.donutChart.destroy();
            this.donutChart = null;
        }

        const s = this.donutStats();
        this.donutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'At Risk', 'Pending', 'Missed'],
                datasets: [{
                    data: [s.completed, s.in_progress, s.at_risk, s.pending, s.missed],
                    backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#6b7280', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                }],
            },
            options: {
                responsive: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed}`
                        }
                    }
                },
            },
        });
    }

    /** Returns number of days until given date string; negative = overdue */
    daysUntil(dateStr: string): number {
        if (!dateStr) return 0;
        const due = new Date(dateStr);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.ceil((due.getTime() - today.getTime()) / 86400000);
    }

    setStatusFilter(s: string) {
        this.statusFilter.set(s);
    }

    loadMilestones() {
        const selectedProjectId = this.selectedProjectId();

        if (selectedProjectId) {
            this.milestoneService.getByProjectId(selectedProjectId).subscribe({
                next: (milestones: Milestone[]) => {
                    const resolvedProjectName = this.extractProjectNameFromMilestones(milestones);
                    this.ensureProjectReference(selectedProjectId, resolvedProjectName);
                    this.milestones.set(milestones || []);
                    this.filteredMilestones.set(milestones || []);
                    this.cdr.markForCheck();
                    setTimeout(() => this.renderDonut(), 50);
                },
                error: (err: any) => {
                    console.error('Error loading project milestones', err);
                    this.milestones.set([]);
                    this.filteredMilestones.set([]);
                    this.cdr.markForCheck();
                }
            });
            return;
        }

        this.milestoneService.getAll().subscribe({
            next: (milestones: Milestone[]) => {
                let filtered = milestones;
                
                // Filtrer par les projets de l'utilisateur connecté
                const userProjects = this.projects();
                if (userProjects.length > 0) {
                    const userProjectIds = userProjects.map(p => p.id);
                    filtered = milestones.filter(m => {
                        const milestoneProjectId = this.milestoneProjectId(m);
                        return milestoneProjectId && userProjectIds.includes(milestoneProjectId);
                    });
                    
                    // Appliquer le filtre de projet sélectionné si défini
                    if (this.selectedProjectId()) {
                        filtered = filtered.filter(m => this.milestoneProjectId(m) === this.selectedProjectId());
                    }
                } else {
                    // Si l'utilisateur n'a aucun projet, ne montrer aucune milestone
                    filtered = [];
                }
                
                this.milestones.set(milestones); // Garder toutes les milestones pour les autres opérations
                this.filteredMilestones.set(filtered);
                this.cdr.markForCheck();
                setTimeout(() => this.renderDonut(), 50);
            },
            error: (err: any) => {
                console.error('Error loading milestones', err);
            }
        });
    }

    loadUserProjects() {
        this.projectService.getMyProjects().subscribe({
            next: (projects: Project[]) => {
                this.projects.set(projects || []);
                this.cdr.markForCheck();
                // Charger les milestones après avoir chargé les projets
                this.loadMilestones();
            },
            error: (err: any) => {
                console.error('Error loading user projects', err);
                // Fallback legacy workspace resolution if /api/projects is unavailable
                const currentUser = this.authService.currentUser();
                if (currentUser && currentUser.id) {
                    this.projectService.getUserProjects(currentUser.id).subscribe({
                        next: (projects: Project[]) => {
                            this.projects.set(projects || []);
                            this.cdr.markForCheck();
                            this.loadMilestones();
                        },
                        error: () => {
                            this.projects.set([]);
                            this.filteredMilestones.set([]);
                            this.cdr.markForCheck();
                        }
                    });
                    return;
                }

                this.projects.set([]);
                this.filteredMilestones.set([]);
                this.cdr.markForCheck();
            }
        });
    }

    milestoneProjectId(m: Milestone): string | undefined {
        return m.projectId ?? m.project?.id;
    }

    getProjectName(projectId: string | undefined): string {
        if (!projectId) return 'No project';
        const project = this.projects().find(p => p.id === projectId);
        return project?.name?.trim() || this.projectFallbackLabel(projectId);
    }

    private extractProjectNameFromMilestones(milestones: Milestone[]): string | null {
        for (const milestone of milestones || []) {
            const name = milestone.project?.name;
            if (typeof name === 'string' && name.trim().length > 0) {
                return name.trim();
            }
        }
        return null;
    }

    private ensureProjectReference(projectId: string, projectName: string | null): void {
        const list = this.projects();
        if (list.some(project => project.id === projectId)) {
            return;
        }

        this.projects.set([
            ...list,
            {
                id: projectId,
                name: projectName || this.projectFallbackLabel(projectId),
                status: '',
                visibility: '',
            }
        ]);
    }

    private projectFallbackLabel(projectId: string): string {
        return projectId ? `Project ${projectId.slice(0, 8)}` : 'Project';
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
        
        const filtered = this.milestones().filter(milestone =>
            milestone.name.toLowerCase().includes(filterValue) ||
            milestone.description?.toLowerCase().includes(filterValue) ||
            milestone.status.toLowerCase().includes(filterValue) ||
            this.getProjectName(this.milestoneProjectId(milestone)).toLowerCase().includes(filterValue)
        );
        
        this.filteredMilestones.set(filtered);
        this.cdr.markForCheck();
    }

    onProjectFilterChange(projectId: string | null) {
        this.selectedProjectId.set(projectId);
        this.loadMilestones();
        
        // Mettre à jour l'URL avec le paramètre projectId
        if (projectId) {
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { projectId },
                queryParamsHandling: 'merge'
            });
        } else {
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { projectId: null },
                queryParamsHandling: 'merge'
            });
        }
    }

    toggleDetails(milestoneId: string | number | undefined) {
        const expanded = new Set(this.expandedMilestoneIds());
        if (expanded.has(milestoneId)) {
            expanded.delete(milestoneId);
        } else {
            expanded.add(milestoneId);
        }
        this.expandedMilestoneIds.set(expanded);
    }

    viewTasks(milestone: Milestone) {
        this.router.navigate(['/app/all-tasks'], {
            queryParams: {
                milestoneId: milestone.id,
                projectId: this.milestoneProjectId(milestone),
            },
        });
    }

    createMilestone() {
        const dialogRef = this.dialog.open(CreateEditMilestoneComponent, {
            width: '700px',
            maxWidth: '700px',
            panelClass: 'custom-dialog-container',
            autoFocus: false,
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadMilestones();
            }
        });
    }

    editMilestone(milestone: Milestone) {
        const dialogRef = this.dialog.open(CreateEditMilestoneComponent, {
            width: '700px',
            maxWidth: '700px',
            panelClass: 'custom-dialog-container',
            autoFocus: false,
            data: { milestone }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadMilestones();
            }
        });
    }

    deleteMilestone(milestone: Milestone) {
        if (!milestone.id) return;

        const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
            width: '420px',
            maxWidth: '420px',
            panelClass: 'confirm-delete-dialog',
            data: { milestoneName: milestone.name }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.milestoneService.delete(milestone.id!).subscribe({
                    next: () => {
                        this.loadMilestones();
                        this.showDeleteSuccess(milestone.name);
                    },
                    error: (err: any) => {
                        console.error('Error deleting milestone', err);
                        this.showDeleteError();
                    }
                });
            }
        });
    }

    private showDeleteSuccess(name: string) {
        // You can add a toast notification here
        console.log(`Milestone "${name}" deleted successfully`);
    }

    private showDeleteError() {
        // You can add an error toast notification here
        console.error('Failed to delete milestone');
    }
}