import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSnackBar } from "@angular/material/snack-bar";
import { forkJoin, of, Observable } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { M2ProjectMember, M2ProjectService, M2ProjectSummary } from "./m2-project.service";
import { M2TimelineCheckpoint, M2Workspace, M2WorkspaceMember, M2WorkspaceService, M2WorkspaceSnapshot } from "../m2-workspaces/m2-workspace.service";
import { ProjectsCardsComponent, TableItem as ProjectCardItem } from "./projects-cards.component";
import { ProjectsGridComponent } from "./projects-grid.component";
import { CreateProjectWorkflowDialogComponent, CreateProjectWorkflowDialogResult } from "./create-project-workflow-dialog.component";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "../m2-templates/use-template-wizard-dialog.component";
import { WorkspaceSelectorDialogComponent } from "./workspace-selector-dialog.component";
import { ProjectPermissionService } from "./project-permission.service";
import { CreateWithAiComponent, CreateWithAiDialogResult } from "./create-with-ai.component";
import { register } from "swiper/element/bundle";

register();

interface RealProjectRow {
    workspaceId: string;
    id: string;
    name: string;
    company: string;
    description: string;
    visibility: string;
    status: string;
    priority: "High" | "Medium" | "Low";
    manager: string;
    managerAvatarUrl: string;
    dueDate: string;
    dueDateSort: string;
    progress: number;
    image: string;
    // list of team members (lightweight profile)
    members?: Array<{ userId: number; fullName: string; avatarUrl?: string }>;
}

@Component({
    selector: "app-real-projects",
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
        MatSelectModule,
        MatTooltipModule,
        MatSnackBarModule,
        ProjectsCardsComponent,
        ProjectsGridComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    styles: [`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

        :host {
            --rp-primary: #667eea;
            --rp-secondary: #764ba2;
            --rp-completed: #10b981;
            --rp-active: #6366f1;
            --rp-on-hold: #f97316;
            --rp-planning: #64748b;
            --rp-cancelled: #ef4444;
            display: block;
            font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
            color: #1f2937;
            background: #fafbfc;
        }

        /* ── Page Shell ── */
        .page-shell {
            position: relative;
            padding: 0;
            background: #fafbfc;
            overflow: hidden;
            min-height: 100%;
        }

        /* ── Hero Panel ── */
        .hero-panel {
            position: relative;
            z-index: 1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2.5rem 2rem;
            margin-bottom: 0;
            border: none;
            border-radius: 0;
            box-shadow: 0 8px 32px rgba(102,126,234,0.2);
            overflow: hidden;
        }
        .hero-panel::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%);
            pointer-events: none;
        }
        .hero-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            flex-wrap: wrap;
            position: relative;
            z-index: 2;
        }
        .eyebrow {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: rgba(255,255,255,0.8);
            margin: 0 0 0.4rem;
            font-weight: 700;
            word-spacing: 0.2em;
        }
        .page-title {
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            font-size: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
            margin: 0 0 0.6rem 0;
            color: white;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: -0.5px;
        }
        .breadcrumb-row {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin: 0.6rem 0 0;
            font-size: 0.8rem;
            color: rgba(255,255,255,0.8);
            font-weight: 500;
        }
        .breadcrumb-row .bc-link {
            color: white;
            cursor: pointer;
            text-decoration: none;
        }
        .breadcrumb-row mat-icon {
            font-size: 13px;
            width: 13px;
            height: 13px;
        }
        .hero-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
            position: relative;
            z-index: 2;
        }

        /* ── Workspace Badge ── */
        .workspace-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.7rem 1.3rem;
            background: rgba(255,255,255,0.15);
            border: 1.5px solid rgba(255,255,255,0.25);
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-size: 0.85rem;
            font-weight: 600;
            color: white;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        .workspace-badge:hover {
            background: rgba(255,255,255,0.2);
            border-color: rgba(255,255,255,0.35);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        .workspace-badge mat-icon { color: white; font-size: 18px; width: 18px; height: 18px; }
        .workspace-name-text { font-weight: 700; color: white; font-size: 0.9rem; }

        /* ── Filters Row ── */
        .filters-row {
            margin-top: 1.6rem;
            padding-top: 1.6rem;
            border-top: 1px solid rgba(255,255,255,0.12);
            display: flex;
            align-items: center;
            gap: 0.8rem;
            flex-wrap: wrap;
            position: relative;
            z-index: 2;
        }
        .filter-label {
            font-size: 0.68rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(255,255,255,0.65);
            font-weight: 800;
            margin-right: 0.4rem;
        }
        .filter-divider {
            width: 1px;
            height: 20px;
            background: rgba(255,255,255,0.15);
            margin: 0 2px;
        }

        /* ── Status Chips ── */
        .status-chip {
            border: 1.5px solid #d1d5db;
            background: white;
            padding: 0.5rem 1rem;
            border-radius: 22px;
            cursor: pointer;
            font-size: 0.78rem;
            color: #6b7280;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-family: inherit;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .status-chip:hover {
            border-color: #667eea;
            color: #667eea;
            box-shadow: 0 4px 12px rgba(102,126,234,0.12);
            transform: translateY(-1px);
        }
        .status-chip.active {
            border-color: #667eea;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 700;
            box-shadow: 0 6px 20px rgba(102,126,234,0.25);
        }
        .status-count {
            font-size: 0.68rem;
            opacity: 0.8;
            background: rgba(0,0,0,0.08);
            padding: 2px 6px;
            border-radius: 9px;
            font-weight: 600;
        }

        /* ── Content Panels ── */
        .content-wrap {
            position: relative;
            z-index: 1;
            padding: 2rem 2.5rem;
            max-width: 1420px;
            margin: 0 auto;
        }
        .panel {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background: white;
            padding: 1.5rem 1.8rem;
            margin-bottom: 1rem;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .panel:hover {
            border-color: #667eea;
            box-shadow: 0 12px 32px rgba(102,126,234,0.15);
            transform: translateY(-3px);
        }

        /* ── Historical Banner ── */
        .hist-banner {
            border: 1px solid rgba(217,119,6,0.32);
            background: rgba(255,242,214,0.88);
            border-radius: 12px;
            padding: 0.8rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.7rem;
            margin-bottom: 0.8rem;
            flex-wrap: wrap;
            position: relative; z-index: 1;
        }
        .hist-banner mat-icon { color: #f97316; }

        /* ── Error Banner ── */
        .error-banner {
            border: 1px solid rgba(239,68,68,0.3);
            border-radius: 12px;
            background: #fee2e2;
            color: #991b1b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            margin-bottom: 0.8rem;
            position: relative; z-index: 1;
        }

        /* ── Loading ── */
        .loading-shell {
            min-height: 200px;
            display: grid;
            place-items: center;
            gap: 0.7rem;
            color: #6b7280;
            text-align: center;
        }

        /* ── Empty State ── */
        .empty-state-wrap {
            text-align: center;
            padding: 4rem 2rem;
            color: #6b7280;
            animation: fadeIn 0.6s ease-out;
        }
        .empty-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-bottom: 1.5rem;
            box-shadow: 0 8px 24px rgba(102,126,234,0.25);
        }
        .empty-icon mat-icon {
            font-size: 40px;
            width: 40px;
            height: 40px;
        }

        /* ── Promo Card ── */
        .promo-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            padding: 1.8rem 2rem;
            color: #fff;
            margin-bottom: 1rem;
            position: relative;
            overflow: hidden;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 8px 24px rgba(102,126,234,0.3);
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .promo-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 48px rgba(102,126,234,0.4);
        }
        .promo-card::before {
            content: "";
            position: absolute;
            top: -40px; right: -40px;
            width: 160px; height: 160px;
            background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }
        .promo-card h2 {
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            font-size: 1.1rem;
            margin: 0 0 0.5rem;
            position: relative; z-index: 1;
        }
        .promo-card p { margin: 0 0 0.9rem; opacity: 0.85; font-size: 0.83rem; position: relative; z-index: 1; }
        .promo-actions { display: flex; flex-wrap: wrap; gap: 8px; position: relative; z-index: 1; }
        .promo-btn {
            background: rgba(255,255,255,0.16) !important;
            color: #fff !important;
            border-radius: 999px !important;
            border: 1px solid rgba(255,255,255,0.28) !important;
            transition: background 0.2s ease !important;
        }
        .promo-btn:hover { background: rgba(255,255,255,0.26) !important; }
        .promo-btn-ghost { color: rgba(255,255,255,0.88) !important; }

        /* ── Bulk Action Bar ── */
        .bulk-bar {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.96);
            border-radius: 14px;
            box-shadow: 0 14px 42px rgba(15,47,58,0.2);
            padding: 0.9rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            z-index: 1000;
            min-width: 360px;
            border: 1px solid #e5e7eb;
            animation: slideUp 0.28s cubic-bezier(0.4,0,0.2,1);
            backdrop-filter: blur(10px);
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(18px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ── Action Buttons ── */
        .action-btn {
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 11px !important;
            color: white !important;
            opacity: 0.9;
        }
        .action-btn:hover {
            background: rgba(255,255,255,0.2) !important;
            opacity: 1;
        }
        .primary-btn {
            background: white !important;
            color: #667eea !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
            font-size: 0.85rem !important;
            padding: 0.6rem 1.4rem !important;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .primary-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15) !important;
        }

        /* ── Animations ── */
        .reveal {
            animation: revealIn 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes revealIn {
            from {
                opacity: 0;
                transform: translateY(12px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }

        /* ── KPI Strip ── */
        .kpi-strip {
            display: flex;
            gap: 16px;
            align-items: stretch;
            flex-wrap: wrap;
            margin-bottom: 2.5rem;
            position: relative;
            z-index: 1;
            animation: slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-16px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .kpi-box {
            flex: 1;
            min-width: 110px;
            border-radius: 14px;
            padding: 18px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 1px solid rgba(0,0,0,0.05);
        }

        .kpi-box:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.12);
        }

        .kpi-num {
            font-size: 2.2rem;
            font-weight: 900;
            line-height: 1;
            letter-spacing: -1px;
        }

        .kpi-label {
            font-size: 0.73rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            opacity: 0.8;
        }

        .kpi-total { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); color: #6d28d9; }
        .kpi-planning { background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%); color: #4f46e5; }
        .kpi-active { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; }
        .kpi-on-hold { background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%); color: #b45309; }
        .kpi-completed { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; }
        .kpi-cancelled { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
            .content-wrap { padding: 1.8rem 2rem; }
            .hero-panel { padding: 2rem; }
        }

        @media (max-width: 768px) {
            .hero-top {
                flex-direction: column;
                gap: 1.2rem;
            }
            .page-title {
                font-size: clamp(1.4rem, 1rem + 1vw, 1.8rem);
            }
            .workspace-badge {
                padding: 0.6rem 1rem;
                font-size: 0.8rem;
            }
            .bulk-bar {
                min-width: auto;
                width: calc(100% - 32px);
                left: 16px;
                transform: none;
                padding: 0.8rem 1.2rem;
            }
            .content-wrap {
                padding: 1.5rem 1.2rem;
            }
            .kpi-strip {
                gap: 10px;
                margin-bottom: 1.8rem;
            }
            .kpi-box {
                min-width: 90px;
                padding: 14px 16px;
            }
            .kpi-num {
                font-size: 1.8rem;
            }
            .kpi-label {
                font-size: 0.68rem;
            }
            .filters-row {
                margin-top: 1rem;
                padding-top: 1rem;
                gap: 0.6rem;
            }
        }

        @media (max-width: 480px) {
            :host {
                font-size: 0.95rem;
            }
            .hero-panel {
                padding: 1.5rem;
            }
            .page-title {
                font-size: 1.3rem;
            }
            .kpi-strip {
                flex-direction: column;
                gap: 8px;
            }
            .kpi-box {
                width: 100%;
                flex: auto;
            }
            .hero-actions {
                flex-direction: column;
                width: 100%;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .reveal, .bulk-bar, .kpi-strip { animation: none !important; }
            * { transition: none !important; }
        }
    `],
    template: `
        <section class="page-shell">

            <!-- ── Hero Panel ── -->
            <header class="hero-panel reveal">
                <div class="hero-top">
                    <div>
                        <p class="eyebrow">CMP Project Portfolio</p>
                        <h1 class="page-title">Real Projects</h1>
                        <div class="breadcrumb-row">
                            <span class="bc-link" routerLink="/app/dashboard">Home</span>
                            <mat-icon class="material-icons-outlined">chevron_right</mat-icon>
                            <span>Real Projects</span>
                        </div>
                    </div>
                    <div class="hero-actions">
                        @if (selectedWorkspaceName()) {
                            <div class="workspace-badge" (click)="openWorkspaceSwitcher()" matTooltip="Click to switch workspace">
                                <mat-icon class="material-icons-outlined">business</mat-icon>
                                <span class="workspace-name-text">{{ selectedWorkspaceName() }}</span>
                                <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">unfold_more</mat-icon>
                            </div>
                        } @else {
                            <button mat-flat-button type="button" class="primary-btn" (click)="openWorkspaceSwitcher()">
                                <mat-icon class="material-icons-outlined">language</mat-icon>
                                Choose Workspace
                            </button>
                        }
                        <mat-form-field appearance="outline" style="width:240px;margin:0;--mdc-theme-primary:white;">
                            <mat-label style="color:rgba(255,255,255,0.8)!important;">Search projects</mat-label>
                            <mat-icon matPrefix style="color:white;">search</mat-icon>
                            <input matInput placeholder="Name, workspace, manager…" (input)="onSearch($event)" style="color:white;" />
                        </mat-form-field>
                        <button matIconButton matTooltip="Refresh" (click)="loadRealProjects()" class="action-btn">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                        </button>
                        @if (selectedWorkspaceId()) {
                            <span class="filter-divider"></span>
                            <button matButton class="action-btn" (click)="showAllWorkspaces()" matTooltip="Clear workspace filter">
                                <mat-icon class="material-icons-outlined">close</mat-icon>
                                Clear Filter
                            </button>
                        }
                        <button matIconButton
                            [class.text-theme]="bulkMode()"
                            matTooltip="{{ bulkMode() ? 'Exit select mode' : 'Multi-select' }}"
                            (click)="toggleBulkMode()"
                            class="action-btn">
                            <mat-icon class="material-icons-outlined">{{ bulkMode() ? 'check_box' : 'check_box_outline_blank' }}</mat-icon>
                        </button>
                    </div>
                </div>

                @if (projectCardsData().length > 0) {
                    <div class="filters-row">
                        <span class="filter-label">Filter:</span>
                        @for (opt of statusOptions; track opt.value) {
                            <button class="status-chip" [class.active]="statusFilter() === opt.value"
                                (click)="statusFilter.set(opt.value)">
                                <span>{{ opt.label }}</span>
                                <span class="status-count">{{ countByStatus(opt.value) }}</span>
                            </button>
                        }
                    </div>
                }
            </header>

            <!-- ── KPI Strip ── -->
            @if (projectCardsData().length > 0) {
                <div class="content-wrap" style="padding-top: 0; padding-bottom: 0;">
                    <div class="kpi-strip">
                        <div class="kpi-box kpi-total">
                            <span class="kpi-num">{{ projectCardsData().length }}</span>
                            <span class="kpi-label">Total</span>
                        </div>
                        <div class="kpi-box kpi-planning">
                            <span class="kpi-num">{{ countByStatus('PLANNING') }}</span>
                            <span class="kpi-label">Planning</span>
                        </div>
                        <div class="kpi-box kpi-active">
                            <span class="kpi-num">{{ countByStatus('ACTIVE') }}</span>
                            <span class="kpi-label">Active</span>
                        </div>
                        <div class="kpi-box kpi-on-hold">
                            <span class="kpi-num">{{ countByStatus('ON_HOLD') }}</span>
                            <span class="kpi-label">On Hold</span>
                        </div>
                        <div class="kpi-box kpi-completed">
                            <span class="kpi-num">{{ countByStatus('COMPLETED') }}</span>
                            <span class="kpi-label">Completed</span>
                        </div>
                        <div class="kpi-box kpi-cancelled">
                            <span class="kpi-num">{{ countByStatus('CANCELLED') }}</span>
                            <span class="kpi-label">Cancelled</span>
                        </div>
                    </div>
                </div>
            }

            <!-- ── Content ── -->
            <div class="content-wrap">

                @if (historicalMode()) {
                <div class="hist-banner reveal">
                    <mat-icon class="material-icons-outlined">history_toggle_off</mat-icon>
                    <div>
                        <div style="font-weight:600;font-size:0.88rem;">Viewing projects as of {{ historicalDisplay() }}</div>
                        <div style="font-size:0.76rem;color:var(--rp-muted);">Read-only historical mode</div>
                    </div>
                    <div style="margin-left:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                        @for (checkpoint of timelineQuickDates(); track checkpoint.at + '-' + $index) {
                            <button matButton class="action-btn"
                                [matTooltip]="checkpoint.label || checkpoint.kind || checkpoint.at"
                                (click)="jumpToHistoricalDate(checkpoint.at)">
                                {{ checkpoint.at | date:'yyyy-MM-dd' }}
                            </button>
                        }
                        <button matButton (click)="clearHistorical()">Exit</button>
                    </div>
                </div>
                }

                @if (lastError()) {
                <div class="error-banner reveal">
                    <mat-icon class="material-icons-outlined">error_outline</mat-icon>
                    <div>
                        <p style="font-weight:600;margin:0;font-size:0.88rem;">Failed to load real projects</p>
                        <p style="margin:0;font-size:0.78rem;">{{ lastError() }}</p>
                    </div>
                </div>
                }

                @if (isLoading()) {
                <div class="panel reveal">
                    <div class="loading-shell">
                        <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
                        <p style="margin:0;font-size:0.88rem;">Loading real projects…</p>
                    </div>
                </div>
                }

                @if (!isLoading() && projectCardsData().length === 0) {
                <div class="panel reveal">
                    <div class="empty-state-wrap">
                        <div class="empty-icon">
                            <mat-icon class="material-icons-outlined">dataset</mat-icon>
                        </div>
                        <h3 style="font-family:'Space Grotesk',sans-serif;margin:0 0 0.5rem;color:var(--rp-ink);">No real projects found</h3>
                        <p style="margin:0;font-size:0.85rem;">Create a project in the workspace first, then it will appear here as a real card.</p>
                    </div>
                </div>
                }

                @if (selectedWorkspaceId()) {
                <div class="row gx-3 gx-lg-4">
                    <div class="col-12 col-lg-6 col-xl-4">
                        <div class="promo-card reveal">
                            <h2>Let's create a project<br />for your workspace</h2>
                            <p>Start fresh, use AI scaffolding, or pick a proven template to launch in seconds.</p>
                            <div class="promo-actions">
                                <button mat-flat-button type="button" class="promo-btn" [disabled]="historicalMode()" (click)="openCreateProjectDialog()">
                                    <mat-icon class="material-icons-outlined">add_circle</mat-icon> New Project
                                </button>
                                @if (canShowCreateWithAi()) {
                                <button mat-flat-button type="button" class="promo-btn" [disabled]="historicalMode()" (click)="openCreateWithAiDialog()">
                                    <mat-icon class="material-icons-outlined">auto_awesome</mat-icon> AI Bootstrap
                                </button>
                                }
                                <button mat-button type="button" class="promo-btn-ghost" [disabled]="historicalMode()" (click)="openTemplatePickerDialog()">
                                    <mat-icon class="material-icons-outlined">layers</mat-icon> From Template
                                </button>
                            </div>
                        </div>
                    </div>

                    @if (highlightProjects().length > 0) {
                    <div class="col-12 col-lg-6 col-xl-4">
                        <div class="panel reveal" style="padding:0.7rem;">
                            <swiper-container slides-per-view="1" space-between="20px" autoplay="false" navigation="true" class="swiper small-nav-v50">
                                @for (highlight of highlightProjects(); track highlight.id) {
                                <swiper-slide>
                                    <div style="padding:0.4rem;cursor:pointer;" (click)="openProjectByCard(highlight)">
                                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                                            <div style="width:60px;height:60px;border-radius:10px;overflow:hidden;flex-shrink:0;">
                                                <img [src]="highlight.image" alt="" style="width:100%;height:100%;object-fit:cover;" />
                                            </div>
                                            <div>
                                                <p style="font-weight:600;margin:0;color:var(--rp-teal);font-size:0.88rem;">{{ highlight.company }}</p>
                                                <p style="margin:2px 0;font-size:0.84rem;color:var(--rp-ink);">{{ highlight.name }}</p>
                                                <p style="margin:0;font-size:0.74rem;color:var(--rp-muted);">Due {{ highlight.dueDate }}</p>
                                            </div>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:var(--rp-muted);">
                                            <span>{{ progressNumerator(highlight.progress) }}/{{ progressDenominator(highlight.progress) }} tasks done</span>
                                            <span>{{ teamMembersCount(highlight) }} members</span>
                                        </div>
                                    </div>
                                </swiper-slide>
                                }
                            </swiper-container>
                        </div>
                    </div>

                    <div class="col-12 col-lg-6 col-xl-4">
                        <div class="panel reveal">
                            <div style="margin-bottom:0.7rem;">
                                <h4 style="font-family:'Space Grotesk',sans-serif;margin:0 0 2px;font-size:0.93rem;color:var(--rp-ink);">Document Updates</h4>
                                <p style="margin:0;font-size:0.74rem;color:var(--rp-muted);">Stay tuned with recent changes</p>
                            </div>
                            <div style="position:relative;">
                                <swiper-container slides-per-view="1" space-between="0px" autoplay="false" pagination='{"el":".pagination-v"}' pagination-clickable="true" direction="vertical" class="swiper height-160">
                                    @for (doc of documentProjects(); track doc.id) {
                                    <swiper-slide>
                                        <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
                                            <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;">
                                                <img [src]="doc.image" alt="" style="width:100%;height:100%;object-fit:cover;" />
                                            </div>
                                            <div>
                                                <p style="margin:0;font-size:0.84rem;font-weight:500;color:var(--rp-ink);">{{ doc.company }}</p>
                                                <p style="margin:0;font-size:0.74rem;color:var(--rp-muted);">{{ doc.name }}</p>
                                            </div>
                                        </div>
                                    </swiper-slide>
                                    }
                                </swiper-container>
                                <div class="pagination-v position-absolute end-0 bottom-0 m-3"></div>
                            </div>
                        </div>
                    </div>
                    }
                </div>
                }

                @if (filteredProjectCardsData().length > 0) {
                    <app-projects-cards [projectsData]="filteredProjectCardsData()" [useRealRouting]="true" [historicalAt]="historicalAt()"></app-projects-cards>
                    <app-projects-grid [projectsData]="filteredProjectCardsData()" [useRealRouting]="true" [historicalAt]="historicalAt()" (projectEdited)="onProjectEdited($event)"></app-projects-grid>
                }

                @if (!isLoading() && projectCardsData().length > 0 && filteredProjectCardsData().length === 0) {
                <div class="panel reveal">
                    <div class="empty-state-wrap">
                        <mat-icon class="material-icons-outlined" style="font-size:52px;width:52px;height:52px;color:var(--rp-muted);">search_off</mat-icon>
                        <h3 style="font-family:'Space Grotesk',sans-serif;margin:0.7rem 0 0.4rem;color:var(--rp-ink);">No projects match your search</h3>
                        <p style="margin:0;font-size:0.85rem;">Try a different project name, workspace, or manager.</p>
                    </div>
                </div>
                }
            </div>

            <!-- ── Bulk Action Bar ── -->
            @if (bulkMode() && selectedProjectIds().length > 0) {
                <div class="bulk-bar">
                    <mat-icon class="material-icons-outlined" style="color:var(--rp-teal);">checklist</mat-icon>
                    <span style="font-size:0.84rem;font-weight:600;color:var(--rp-ink);">{{ selectedProjectIds().length }} selected</span>
                    <mat-form-field appearance="outline" class="inline-small mb-0" style="min-width:160px;">
                        <mat-label>Change status to</mat-label>
                        <mat-select [(ngModel)]="bulkTargetStatus">
                            @for (s of changeableStatuses; track s.value) {
                                <mat-option [value]="s.value">{{ s.label }}</mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                    <button matButton style="color:var(--rp-teal);" [disabled]="!bulkTargetStatus" (click)="applyBulkStatus()">Apply</button>
                    <button matButton (click)="clearBulkSelection()">Cancel</button>
                </div>
            }
        </section>
    `,
})
export class RealProjectsComponent implements OnInit {
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly projectService = inject(M2ProjectService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly projectPermissionService = inject(ProjectPermissionService);

    readonly isLoading = signal(false);
    readonly lastError = signal<string | null>(null);
    readonly selectedWorkspaceId = signal("");
    readonly selectedWorkspaceName = signal("");
    readonly selectedWorkspaceOrgType = signal("enterprise");
    readonly searchQuery = signal("");
    readonly statusFilter = signal("");
    readonly bulkMode = signal(false);
    readonly selectedProjectIds = signal<string[]>([]);
    bulkTargetStatus = "";
    readonly selectedWorkspaceMembers = signal<M2WorkspaceMember[]>([]);
    readonly canShowCreateWithAi = computed(() => {
        const workspaceId = this.selectedWorkspaceId();
        return !!workspaceId;
    });

    readonly statusOptions = [
        { value: "",          label: "All" },
        { value: "PLANNING",  label: "Planning" },
        { value: "ACTIVE",    label: "Active" },
        { value: "ON_HOLD",   label: "On Hold" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
    ];
    readonly changeableStatuses = [
        { value: "ACTIVE",    label: "Active" },
        { value: "ON_HOLD",   label: "On Hold" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
    ];

    readonly projects = signal<RealProjectRow[]>([]);
    readonly historicalAt = signal<string | null>(null);
    readonly timelineQuickDates = signal<M2TimelineCheckpoint[]>([]);
    readonly historicalMode = computed(() => !!this.historicalAt());
    readonly historicalDisplay = computed(() => this.historicalAt() ? new Date(this.historicalAt()!).toLocaleString() : "");
    readonly projectCardsData = computed<ProjectCardItem[]>(() =>
        this.projects().map((row, index) => ({
            id: index + 1,
            image: row.image,
            name: row.name,
            company: row.company,
            status: row.status,
            priority: row.priority,
            managerimage: row.managerAvatarUrl,
            manager: row.manager,
            dueDate: row.dueDate,
            progress: row.progress,
            workspaceId: row.workspaceId,
            projectUuid: row.id,
            // forward lightweight member profiles and team size
            teamMembers: row.members || [],
            teamSize: (row.members || []).length,
        }))
    );

    readonly filteredProjectCardsData = computed<ProjectCardItem[]>(() => {
        let list = this.projectCardsData();
        const q = this.searchQuery().trim().toLowerCase();
        const statusF = this.statusFilter();
        if (q) list = list.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.company.toLowerCase().includes(q) ||
            (p.manager || "").toLowerCase().includes(q)
        );
        if (statusF) list = list.filter(p => p.status === statusF);
        return list;
    });

    readonly highlightProjects = computed(() => this.projectCardsData());

    readonly documentProjects = computed(() => {
        const rows = this.projectCardsData();
        return rows.length >= 3 ? rows.slice(0, 3) : rows;
    });

    ngOnInit(): void {
        this.route.queryParamMap.subscribe((params) => {
            const workspaceId = (params.get("workspaceId") || "").trim();
            const at = params.get('at');
            this.selectedWorkspaceId.set(workspaceId);
            this.historicalAt.set(at);
            this.timelineQuickDates.set([]);
            this.loadRealProjects();
        });
    }

    onSearch(event: Event): void {
        const value = (event.target as HTMLInputElement).value || "";
        this.searchQuery.set(value);
    }

    openCreateProjectDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to create a real project.", "Close", { duration: 3500 });
            return;
        }

        const ref = this.dialog.open(CreateProjectWorkflowDialogComponent, {
            width: "760px",
            maxWidth: "95vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.selectedWorkspaceName() || "Workspace",
                orgType: this.selectedWorkspaceOrgType(),
                members: this.selectedWorkspaceMembers().map((member) => ({
                    userId: member.userId,
                    fullName: member.user?.fullName || `User #${member.userId}`,
                    email: member.user?.email || "",
                    avatarUrl: member.user?.avatarUrl || "",
                    workspaceRole: member.role,
                })),
            },
        });

        ref.afterClosed().subscribe((result?: CreateProjectWorkflowDialogResult) => {
            if (result?.useTemplate) {
                // Defer to let the close animation finish before opening the next dialog
                setTimeout(() => this.openTemplatePickerDialog(), 150);
                return;
            }
            if (!result?.payload) {
                return;
            }

            this.projectService.createProject(workspaceId, result.payload).subscribe({
                next: (created) => {
                    const assignments = (result.assignments || []).filter((row) => row.userId !== 0);
                    if (assignments.length === 0) {
                        this.snackBar.open("Project created successfully.", "Close", { duration: 3000 });
                        this.loadRealProjects();
                        return;
                    }

                    const assignRequests = assignments.map((assignment) =>
                        this.projectService.addProjectMember(workspaceId, created.id, assignment.userId, assignment.role).pipe(
                            catchError(() => of(null))
                        )
                    );

                    forkJoin(assignRequests).subscribe(() => {
                        this.snackBar.open("Project and members created successfully.", "Close", { duration: 3200 });
                        this.loadRealProjects();
                    });
                },
                error: (error: HttpErrorResponse) => {
                    if (error.status === 409) {
                        this.snackBar.open(
                            error?.error?.message || "A project with this name already exists in this workspace",
                            "Close",
                            { duration: 5000 }
                        );
                    } else if (error.status === 402) {
                        this.snackBar.open(
                            "Project quota exceeded for your organization's plan. Upgrade to create more projects.",
                            "Close",
                            { duration: 6000 }
                        );
                    } else {
                        this.snackBar.open(`Failed to create project: ${this.errorMessage(error)}`, "Close", { duration: 4200 });
                    }
                },
            });
        });
    }

    openTemplatePickerDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to use a template.", "Close", { duration: 3500 });
            return;
        }
        const ref = this.dialog.open(UseTemplateWizardDialogComponent, {
            width: "820px",
            maxWidth: "96vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: { workspaceId, workspaceName: this.selectedWorkspaceName() || "Workspace" },
        });
        ref.afterClosed().subscribe((result: UseTemplateWizardResult) => {
            if (result?.projectId) {
                this.loadRealProjects();
            }
        });
    }

    openCreateWithAiDialog(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            this.snackBar.open("Open this page from a workspace to use Create with AI.", "Close", { duration: 3500 });
            return;
        }

        if (!this.canShowCreateWithAi()) {
            this.snackBar.open("Select a workspace first to use AI bootstrap.", "Close", { duration: 3500 });
            return;
        }

        const ref = this.dialog.open(CreateWithAiComponent, {
            width: "1080px",
            maxWidth: "98vw",
            maxHeight: "92vh",
            autoFocus: false,
            data: {
                workspaceId,
                workspaceName: this.selectedWorkspaceName() || "Workspace",
                orgType: this.selectedWorkspaceOrgType(),
            },
        });

        ref.afterClosed().subscribe((result?: CreateWithAiDialogResult) => {
            if (!result?.createdProjectId) {
                return;
            }
            this.snackBar.open("Project created with AI successfully.", "Close", { duration: 3200 });
            this.loadRealProjects();
        });
    }

    openProjectByCard(project: ProjectCardItem): void {
        if (!project.workspaceId || !project.projectUuid) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.projectUuid], {
            queryParams: this.buildHistoricalQueryParams(),
        });
    }

    progressNumerator(progress: number): number {
        const base = 690;
        return Math.max(0, Math.round((progress / 100) * base));
    }

    progressDenominator(progress: number): number {
        return progress >= 90 ? 750 : 690;
    }

    teamMembersCount(project: ProjectCardItem): number {
        if (project.teamSize !== undefined && project.teamSize !== null) {
            return project.teamSize;
        }
        if (!project.workspaceId) {
            return 7;
        }
        if (project.progress >= 90) {
            return 16;
        }
        return 7;
    }

    countByStatus(status: string): number {
        if (!status) return this.projectCardsData().length;
        return this.projectCardsData().filter(p => p.status === status).length;
    }

    onProjectEdited(event: { projectUuid: string; name: string; status: string }): void {
        this.projects.update(list =>
            list.map(p => p.id === event.projectUuid ? { ...p, name: event.name, status: event.status } : p)
        );
    }

    toggleBulkMode(): void {
        this.bulkMode.update(v => !v);
        if (!this.bulkMode()) this.clearBulkSelection();
    }

    toggleProjectSelection(id: string): void {
        this.selectedProjectIds.update(ids =>
            ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
        );
    }

    clearBulkSelection(): void {
        this.selectedProjectIds.set([]);
        this.bulkTargetStatus = "";
        this.bulkMode.set(false);
    }

    applyBulkStatus(): void {
        if (this.historicalMode()) {
            this.snackBar.open("Read-only historical view - edits are disabled.", "Close", { duration: 3200 });
            return;
        }

        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId || !this.bulkTargetStatus || this.selectedProjectIds().length === 0) return;
        this.projectService.bulkChangeStatus(workspaceId, this.selectedProjectIds(), this.bulkTargetStatus).subscribe({
            next: (updated) => {
                this.snackBar.open(`${updated.length} project(s) updated to ${this.bulkTargetStatus}.`, "Close", { duration: 3200 });
                this.clearBulkSelection();
                this.loadRealProjects();
            },
            error: () => this.snackBar.open("Bulk update failed.", "Close", { duration: 3500 }),
        });
    }

    loadRealProjects(): void {
        const workspaceId = this.selectedWorkspaceId();
        const at = this.historicalAt() || undefined;
        this.isLoading.set(true);
        this.lastError.set(null);
        this.projects.set([]);
        this.timelineQuickDates.set([]);

        if (workspaceId) {
            this.loadForSingleWorkspace(workspaceId, at);
            return;
        }

        this.selectedWorkspaceName.set("");

        this.workspaceService.getWorkspaces().subscribe({
            next: (workspaces) => {
                if (workspaces.length === 0) {
                    this.projects.set([]);
                    this.isLoading.set(false);
                    return;
                }

                const atParam = at;
                const workspaceRequests = workspaces.map((workspace) =>
                    atParam
                        ? this.workspaceService.getWorkspaceSnapshot(workspace.id, atParam).pipe(
                            catchError(() => of(null)),
                            map((snap: M2WorkspaceSnapshot | null) => ({
                                workspace,
                                projects: (snap?.projects || []),
                                workspaceMembers: this.mapSnapshotMembers(snap?.members),
                            }))
                        )
                        : forkJoin({
                            projectsPage: this.projectService.getProjects(workspace.id, 0, 50).pipe(
                                catchError(() => of({ content: [] as M2ProjectSummary[] }))
                            ),
                            workspaceMembers: this.workspaceService.getWorkspaceMembers(workspace.id).pipe(
                                catchError(() => of([] as M2WorkspaceMember[]))
                            ),
                        }).pipe(
                            map(({ projectsPage, workspaceMembers }) => ({
                                workspace,
                                projects: projectsPage.content || [],
                                workspaceMembers,
                            }))
                        )
                );

                forkJoin(workspaceRequests).subscribe({
                    next: (workspaceRows) => {
                        const projectContexts = workspaceRows.flatMap((row) => {
                            const profileByUserId = this.buildWorkspaceProfiles(row.workspaceMembers);
                            return row.projects.map((project: any) => ({
                                workspace: row.workspace,
                                project,
                                profileByUserId,
                            }));
                        });

                        if (projectContexts.length === 0) {
                            this.projects.set([]);
                            this.isLoading.set(false);
                            return;
                        }

                        const memberRequests = projectContexts.map((ctx) => {
                            if (at) {
                                // Historical mode: project-level member as-of is not available in snapshot MVP — fall back to empty list
                                return of(this.toRow(ctx.workspace, ctx.project, [], ctx.profileByUserId));
                            }
                            return this.projectService.getProjectMembers(ctx.workspace.id, ctx.project.id).pipe(
                                map((members) => this.toRow(ctx.workspace, ctx.project, members || [], ctx.profileByUserId)),
                                catchError(() => of(this.toRow(ctx.workspace, ctx.project, [], ctx.profileByUserId)))
                            );
                        });

                        const memberObs = forkJoin(memberRequests) as unknown as Observable<RealProjectRow[]>;
                        memberObs.subscribe({
                            next: (rows: RealProjectRow[]) => {
                                const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
                                this.projects.set(sorted);
                                this.isLoading.set(false);
                            },
                            error: (error: HttpErrorResponse) => {
                                this.projects.set([]);
                                this.lastError.set(this.errorMessage(error));
                                this.isLoading.set(false);
                            },
                        });
                    },
                    error: (error: HttpErrorResponse) => {
                        this.projects.set([]);
                        this.lastError.set(this.errorMessage(error));
                        this.isLoading.set(false);
                    },
                });
            },
            error: (error: HttpErrorResponse) => {
                this.projects.set([]);
                this.lastError.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    showAllWorkspaces(): void {
        this.router.navigate(["/app/real-projects"], { queryParams: this.buildHistoricalQueryParams() });
    }

    goBackToWorkspace(): void {
        const workspaceId = this.selectedWorkspaceId();
        if (!workspaceId) {
            return;
        }
        this.router.navigate(["/app/workspaces", workspaceId], { queryParams: this.buildHistoricalQueryParams() });
    }

    openWorkspaceSwitcher(): void {
        this.dialog.open(WorkspaceSelectorDialogComponent, {
            width: "900px",
            maxWidth: "95vw",
            disableClose: false,
        }).afterClosed().subscribe((workspace) => {
            if (workspace) {
                this.router.navigate(["/app/real-projects"], {
                    queryParams: {
                        workspaceId: workspace.id,
                        ...this.buildHistoricalQueryParams(),
                    },
                });
            }
        });
    }

    openProject(project: RealProjectRow): void {
        if (!project?.workspaceId || !project?.id) {
            return;
        }
        this.router.navigate(["/app/real-projects", project.workspaceId, project.id], {
            queryParams: this.buildHistoricalQueryParams(),
        });
    }

    statusDisplay(status: string): string {
        const map: Record<string, string> = {
            PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold",
            COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived",
        };
        return map[(status || "").toUpperCase()] || status;
    }

    statusClass(status: string): string {
        switch ((status || "").toUpperCase()) {
            case "ACTIVE":    return "theme-green";
            case "ON_HOLD":   return "theme-orange";
            case "PLANNING":  return "theme-orange";
            case "COMPLETED": return "theme-violet";
            case "CANCELLED": return "theme-red";
            case "ARCHIVED":  return "badge-light";
            default:          return "badge-light";
        }
    }

    priorityClass(priority: "High" | "Medium" | "Low"): string {
        if (priority === "High") {
            return "theme-red";
        }
        if (priority === "Medium") {
            return "theme-orange";
        }
        return "theme-green";
    }

    private toRow(
        workspace: M2Workspace,
        project: M2ProjectSummary,
        projectMembers: M2ProjectMember[],
        profileByUserId: Map<number, { fullName: string; avatarUrl: string }>
    ): RealProjectRow {
        const normalizedStatus = (project.status || "PLANNING").toUpperCase();
        const managerMember = this.pickManager(projectMembers);
        const managerProfile = managerMember?.userId ? profileByUserId.get(managerMember.userId) : undefined;
        const memberProfiles = (projectMembers || []).map((m) => ({
            userId: m.userId,
            fullName: profileByUserId.get(m.userId)?.fullName || m.user?.fullName || `User #${m.userId}`,
            avatarUrl: profileByUserId.get(m.userId)?.avatarUrl || m.user?.avatarUrl || "",
        }));

        return {
            workspaceId: workspace.id,
            id: project.id,
            name: project.name || "Unnamed project",
            company: workspace.name || "Workspace",
            description: project.description || "",
            visibility: (project.visibility || "PRIVATE").toUpperCase(),
            status: normalizedStatus,
            priority: this.derivePriority(normalizedStatus),
            manager: managerProfile?.fullName || managerMember?.user?.fullName || this.fallbackManagerLabel(managerMember?.userId),
            managerAvatarUrl: managerProfile?.avatarUrl || managerMember?.user?.avatarUrl || "",
            dueDate: this.toDateLabel(project.endDate),
            dueDateSort: project.endDate || "",
            progress: this.deriveProgress(normalizedStatus),
            image: this.cardImageFor(project.id),
            members: memberProfiles,
        };
    }

    private loadForSingleWorkspace(workspaceId: string, at?: string): void {
        if (at) {
            // Historical snapshot path
            this.workspaceService.getWorkspaceSnapshot(workspaceId, at).subscribe({
                next: (snap: M2WorkspaceSnapshot) => {
                    // Populate lightweight workspace info from snapshot
                    this.selectedWorkspaceName.set(snap?.workspaceName || "");
                    this.selectedWorkspaceOrgType.set((snap?.organization?.orgType || "enterprise").toLowerCase());
                    const workspaceMembers = this.mapSnapshotMembers(snap?.members);
                    this.selectedWorkspaceMembers.set(workspaceMembers);
                    this.timelineQuickDates.set(this.pickTimelineQuickDates(snap));

                    const profileByUserId = this.buildWorkspaceProfiles(workspaceMembers);
                    const projects = snap?.projects || [];
                    if (projects.length === 0) {
                        this.projects.set([]);
                        this.isLoading.set(false);
                        return;
                    }

                    const memberRequests = projects.map((project: any) =>
                        // Historical mode: project-level members are not available in MVP snapshot
                        of(this.toRow({ id: workspaceId, name: this.selectedWorkspaceName(), slug: "", ownerId: 0 } as M2Workspace, project as M2ProjectSummary, [], profileByUserId))
                    );

                    const memberObs = forkJoin(memberRequests) as unknown as Observable<RealProjectRow[]>;
                    memberObs.subscribe({
                        next: (rows: RealProjectRow[]) => {
                            const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
                            this.projects.set(sorted);
                            this.isLoading.set(false);
                        },
                        error: (error: HttpErrorResponse) => {
                            this.projects.set([]);
                            this.lastError.set(this.errorMessage(error));
                            this.isLoading.set(false);
                        },
                    });
                },
                error: (error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        // Workspace may exist but be inactive at the selected date.
                        this.projects.set([]);
                        this.timelineQuickDates.set([]);
                        this.lastError.set(null);
                        this.isLoading.set(false);
                        return;
                    }
                    this.projects.set([]);
                    this.timelineQuickDates.set([]);
                    this.lastError.set(this.errorMessage(error));
                    this.isLoading.set(false);
                },
            });
            return;
        }

        forkJoin({
            workspace: this.workspaceService.getWorkspaceById(workspaceId),
            projectsPage: this.projectService.getProjects(workspaceId, 0, 100),
            workspaceMembers: this.workspaceService.getWorkspaceMembers(workspaceId).pipe(catchError(() => of([] as M2WorkspaceMember[]))),
        }).subscribe({
            next: ({ workspace, projectsPage, workspaceMembers }) => {
                this.selectedWorkspaceName.set(workspace.name || "");
                this.selectedWorkspaceOrgType.set(
                    (workspace.orgType || workspace.organization?.orgType || "enterprise").toLowerCase()
                );
                this.selectedWorkspaceMembers.set(workspaceMembers || []);
                this.loadTimelineHints(workspaceId);

                const profileByUserId = this.buildWorkspaceProfiles(workspaceMembers);
                const projects = projectsPage?.content || [];
                if (projects.length === 0) {
                    this.projects.set([]);
                    this.isLoading.set(false);
                    return;
                }

                const memberRequests = projects.map((project) =>
                    this.projectService.getProjectMembers(workspaceId, project.id).pipe(
                        map((members) => this.toRow(workspace, project, members || [], profileByUserId)),
                        catchError(() => of(this.toRow(workspace, project, [], profileByUserId)))
                    )
                );

                forkJoin(memberRequests).subscribe({
                    next: (rows) => {
                        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
                        this.projects.set(sorted);
                        this.isLoading.set(false);
                    },
                    error: (error: HttpErrorResponse) => {
                        this.projects.set([]);
                        this.lastError.set(this.errorMessage(error));
                        this.isLoading.set(false);
                    },
                });
            },
            error: (error: HttpErrorResponse) => {
                this.projects.set([]);
                this.lastError.set(this.errorMessage(error));
                this.isLoading.set(false);
            },
        });
    }

    jumpToHistoricalDate(at: string): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { at },
            queryParamsHandling: "merge",
        });
    }

    clearHistorical(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { at: null },
            queryParamsHandling: "merge",
        });
    }

    private loadTimelineHints(workspaceId: string): void {
        this.workspaceService.getWorkspaceSnapshot(workspaceId, new Date().toISOString()).pipe(
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
            if (!at || merged.has(at)) {
                continue;
            }
            merged.set(at, {
                at,
                kind: "SUGGESTED",
                label: "Recommended checkpoint",
            });
        }

        return Array.from(merged.values())
            .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
            .slice(0, 7);
    }

    private mapSnapshotMembers(members?: M2WorkspaceSnapshot["members"]): M2WorkspaceMember[] {
        return (members || []).map((member) => ({
            id: member.id,
            userId: member.userId,
            role: member.workspaceRole || "MEMBER",
            joinedAt: member.joinedAt,
            user: {
                fullName: member.fullName || `User #${member.userId}`,
                email: member.email || "",
                avatarUrl: member.avatarUrl || "",
            },
        }));
    }

    private buildHistoricalQueryParams(): Record<string, string> {
        const at = this.historicalAt();
        return at ? { at } : {};
    }

    private buildWorkspaceProfiles(members: M2WorkspaceMember[]): Map<number, { fullName: string; avatarUrl: string }> {
        const mapById = new Map<number, { fullName: string; avatarUrl: string }>();
        for (const member of members || []) {
            mapById.set(member.userId, {
                fullName: member.user?.fullName || `User #${member.userId}`,
                avatarUrl: member.user?.avatarUrl || "",
            });
        }
        return mapById;
    }

    private pickManager(members: M2ProjectMember[]): M2ProjectMember | undefined {
        return (
            members.find((m) => {
                const role = (m.role || "").toUpperCase();
                return role === "PROJECT_MANAGER" || role === "PROFESSOR";
            })
            || members[0]
        );
    }

    private fallbackManagerLabel(userId?: number): string {
        if (!userId) {
            return "Unassigned";
        }
        return `User #${userId}`;
    }

    private derivePriority(status: string): "High" | "Medium" | "Low" {
        if (status === "ON_HOLD" || status === "CANCELLED") {
            return "High";
        }
        if (status === "COMPLETED" || status === "ARCHIVED") {
            return "Low";
        }
        return "Medium";
    }

    private deriveProgress(status: string): number {
        if (status === "COMPLETED" || status === "ARCHIVED") {
            return 100;
        }
        if (status === "ACTIVE") {
            return 75;
        }
        if (status === "ON_HOLD") {
            return 10;
        }
        if (status === "CANCELLED") {
            return 0;
        }
        return 50;
    }

    private toDateLabel(value?: string): string {
        if (!value) {
            return "-";
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return "-";
        }
        return parsed.toISOString().slice(0, 10);
    }

    private cardImageFor(seed: string): string {
        const images = [
            "assets/img/product1.jpg",
            "assets/img/product2.jpg",
            "assets/img/product3.jpg",
            "assets/img/product4.jpg",
            "assets/img/product5.jpg",
            "assets/img/product6.jpg",
            "assets/img/product7.jpg",
            "assets/img/product8.jpg",
        ];
        const hash = [...(seed || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return images[Math.abs(hash) % images.length];
    }

    private errorMessage(error: HttpErrorResponse): string {
        const message = (error?.error && (error.error.message || error.error.error)) || error.message || "Request failed";
        return `status=${error.status || 0} message=${message}`;
    }
}
