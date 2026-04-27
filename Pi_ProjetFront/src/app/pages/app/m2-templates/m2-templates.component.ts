import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from "@angular/core";
import { RouterLink, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBarModule, MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog } from "@angular/material/dialog";
import { forkJoin, of, Subject } from "rxjs";
import { catchError, debounceTime } from "rxjs/operators";
import {
    M2TemplateRecommendationItem,
    M2TemplateRecommendationsResponse,
    M2TemplateService,
    M2TemplateSummary,
} from "./m2-template.service";
import { TemplatesCardsComponent, TemplateCardItem } from "./templates-cards.component";
import { TemplatesGridComponent } from "./templates-grid.component";
import { CreateTemplateDialogComponent, CreateTemplateDialogResult } from "./create-template-dialog.component";
import { AuthService } from "../../../auth/auth.service";
import { register } from "swiper/element/bundle";

register();

interface QuickStarter {
    type: string;
    icon: string;
    label: string;
    tagline: string;
    color: string;
}

interface TemplateRecommendationView extends M2TemplateRecommendationItem {
    image: string;
}

const QUICK_STARTERS: QuickStarter[] = [
    { type: "SCRUM", icon: "sprint", label: "Scrum", tagline: "Iterative sprints", color: "#6366f1" },
    { type: "KANBAN", icon: "view_kanban", label: "Kanban", tagline: "Continuous flow", color: "#0ea5e9" },
    { type: "WATERFALL", icon: "water", label: "Waterfall", tagline: "Phase-gate delivery", color: "#14b8a6" },
    { type: "CUSTOM", icon: "tune", label: "Custom", tagline: "Start from scratch", color: "#f59e0b" },
];

@Component({
    selector: "app-m2-templates",
    standalone: true,
    imports: [
        CommonModule, RouterLink, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSnackBarModule,
        MatProgressSpinnerModule, MatTooltipModule,
        TemplatesCardsComponent, TemplatesGridComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
        .page-shell {
            position: relative;
            padding: 2rem;
            background: var(--bg-light);
            border-radius: 0;
            overflow: hidden;
            min-height: 100%;
        }
        .page-shell::before {
            content: "";
            position: absolute;
            inset: -40% -20% auto auto;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.08), transparent 68%);
            pointer-events: none;
        }
        .page-shell::after {
            content: "";
            position: absolute;
            inset: auto auto -160px -100px;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(245, 158, 11, 0.06), transparent 70%);
            pointer-events: none;
        }

        /* ── Hero Panel ── */
        .hero-panel {
            position: relative; z-index: 1;
            border: none;
            border-radius: 16px;
            padding: 3rem 2rem;
            background: var(--primary-gradient);
            box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 2rem;
            flex-wrap: wrap;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            overflow: hidden;
        }
        .hero-panel::before {
            content: "";
            position: absolute;
            top: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent 70%);
            pointer-events: none;
        }
        .eyebrow {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: rgba(255, 255, 255, 0.8);
            margin: 0 0 0.4rem;
            font-weight: 700;
            position: relative;
            z-index: 2;
        }
        .page-title {
            font-family: "Space Grotesk", "Segoe UI", sans-serif;
            font-size: 2.2rem;
            margin: 0;
            color: white;
            font-weight: 700;
            letter-spacing: -0.5px;
            position: relative;
            z-index: 2;
        }
        .breadcrumb-row {
            display: flex; align-items: center; gap: 0.3rem;
            margin: 0.5rem 0 0; font-size: 0.85rem; color: rgba(255, 255, 255, 0.7);
            position: relative;
            z-index: 2;
        }
        .breadcrumb-row .bc-link { color: rgba(255, 255, 255, 0.95); cursor: pointer; text-decoration: none; }
        .breadcrumb-row mat-icon { font-size: 16px; width: 16px; height: 16px; }
        .hero-actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; position: relative; z-index: 2; }
        .primary-btn {
            background: white !important;
            color: var(--primary-indigo) !important;
            border-radius: 999px !important;
            font-weight: 700 !important;
            font-size: 0.85rem !important;
            padding: 0.6rem 1.4rem !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .primary-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15) !important;
        }
        .primary-btn:active {
            transform: translateY(0) !important;
        }
        .action-btn {
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 999px !important;
            background: rgba(255,255,255,0.15) !important;
            color: white !important;
        }
        .action-btn:hover {
            background: rgba(255,255,255,0.25) !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        .icon-btn-active { color: white !important; background: rgba(255,255,255,0.25) !important; }

        /* ── Content Wrap ── */
        .content-wrap { position: relative; z-index: 1; }
        .panel {
            border: 1px solid var(--border-color);
            border-radius: 16px;
            background: var(--bg-white);
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .panel:hover {
            border-color: var(--primary-indigo);
            background: var(--bg-white);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
        }

        /* ── Quick Start Cards ── */
        .quick-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 0.8rem; margin-bottom: 1rem; }
        .quick-card {
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.2rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            background: var(--bg-white);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .quick-card:hover {
            border-color: var(--primary-indigo);
            background: var(--bg-white);
            transform: translateY(-3px);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
        }
        .quick-icon {
            width: 40px; height: 40px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-bottom: 0.8rem;
            background: linear-gradient(135deg, var(--primary-indigo), var(--primary-purple));
            color: white;
            font-weight: 700;
        }
        .quick-label {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 0.2rem;
            font-family: "Space Grotesk", sans-serif;
        }
        .quick-tagline { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }

        /* ── Tabs ── */
        .tabs-row {
            display: flex; align-items: center; gap: 0.5rem;
            margin-bottom: 1rem; flex-wrap: wrap;
        }
        .tab-btn {
            border: 1px solid transparent;
            background: transparent;
            padding: 0.6rem 1rem;
            border-radius: 10px;
            cursor: pointer;
            font-size: 0.85rem;
            color: var(--text-secondary);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: inline-flex; align-items: center; gap: 0.5rem;
            font-family: "IBM Plex Sans", sans-serif;
            font-weight: 500;
        }
        .tab-btn.active {
            background: rgba(102, 126, 234, 0.1);
            color: var(--primary-indigo);
            font-weight: 600;
            border: 1px solid rgba(102, 126, 234, 0.3);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }
        .tab-btn:hover:not(.active) {
            background: var(--bg-light);
            transform: translateY(-1px);
            color: var(--primary-indigo);
        }
        .admin-tab { border: 1px solid rgba(245, 158, 11, 0.3); }
        .admin-tab.active {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-dark);
            border-color: rgba(245, 158, 11, 0.5);
        }
        .tab-badge {
            font-size: 0.65rem;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
            background: rgba(102, 126, 234, 0.15);
            color: var(--primary-indigo);
            font-weight: 600;
        }
        .tab-badge--warn {
            background: rgba(220, 38, 38, 0.15);
            color: var(--error-dark);
        }
        .tabs-sep { width: 1px; height: 22px; background: var(--border-color); margin: 0 0.5rem; }

        /* ── Filter Chips ── */
        .chips-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .chip-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-muted); font-weight: 700; margin-right: 0.5rem; }
        .filter-chip {
            border: 1px solid var(--border-color);
            background: var(--bg-white);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.8rem;
            color: var(--text-secondary);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: "IBM Plex Sans", sans-serif;
            font-weight: 500;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .filter-chip.active {
            border-color: var(--primary-indigo);
            background: rgba(102, 126, 234, 0.1);
            color: var(--primary-indigo);
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }
        .filter-chip:hover:not(.active) {
            background: var(--bg-light);
            border-color: var(--primary-indigo);
            transform: translateY(-1px);
            color: var(--primary-indigo);
        }

        /* ── Rec Cards ── */
        .rec-card {
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1rem;
            background: var(--bg-white);
            cursor: pointer;
            height: 100%;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .rec-card:hover {
            border-color: var(--primary-indigo);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
            transform: translateY(-3px);
            background: var(--bg-white);
        }
        .rec-thumb { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border-color); }
        .rec-reason {
            font-size: 0.65rem;
            border: 1px solid rgba(102, 126, 234, 0.25);
            border-radius: 999px;
            padding: 0.25rem 0.6rem;
            color: var(--primary-indigo);
            background: rgba(102, 126, 234, 0.08);
            font-weight: 600;
        }

        /* ── Recs Panel ── */
        .recs-panel {
            border: 1px solid rgba(102, 126, 234, 0.2);
            background: linear-gradient(180deg, rgba(102, 126, 234, 0.05), rgba(14, 165, 233, 0.02));
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }

        /* ── Info / Warning Banners ── */
        .info-banner {
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: 12px;
            padding: 0.8rem;
            display: flex; align-items: flex-start; gap: 0.6rem;
            margin-bottom: 1rem;
            font-size: 0.85rem;
            color: var(--success-dark);
        }
        .info-banner mat-icon { color: var(--success-dark); font-size: 18px; width: 18px; height: 18px; margin-top: 0.1rem; flex-shrink: 0; }

        .warn-panel {
            background: rgba(245, 158, 11, 0.08);
            border: 1px solid rgba(245, 158, 11, 0.25);
            border-radius: 12px;
            padding: 0.8rem;
            font-size: 0.85rem;
            color: var(--warning-dark);
            margin-bottom: 1rem;
        }

        /* ── Error ── */
        .error-banner {
            border: 1px solid rgba(220, 38, 38, 0.25);
            border-radius: 12px;
            background: rgba(220, 38, 38, 0.08);
            color: var(--error-dark);
            display: flex; align-items: center; gap: 0.6rem;
            padding: 0.8rem;
            margin-bottom: 1rem;
        }
        /* ── Loading / Empty ── */
        .loading-shell { min-height: 240px; display: grid; place-items: center; gap: 1rem; color: var(--text-secondary); text-align: center; font-size: 0.95rem; }
        .empty-state-wrap { text-align: center; padding: 3rem 1rem; color: var(--text-secondary); }
        .empty-icon { width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary-indigo), var(--primary-purple)); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; color: white; margin-bottom: 1.2rem; }
        .empty-icon mat-icon { font-size: 40px; width: 40px; height: 40px; }

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
    `],
    template: `
        <section class="page-shell">

            <!-- ── Hero Panel ── -->
            <header class="hero-panel reveal">
                <div>
                    <p class="eyebrow">CMP Blueprint Library</p>
                    <h1 class="page-title">Templates Hub</h1>
                    <div class="breadcrumb-row">
                        <span class="bc-link" routerLink="/app/dashboard">Home</span>
                        <mat-icon class="material-icons-outlined">chevron_right</mat-icon>
                        <span>Templates Hub</span>
                    </div>
                    <p style="margin:0.4rem 0 0;font-size:0.8rem;color:var(--tp-muted);">Reusable project blueprints — create, share, and discover templates.</p>
                </div>
                <div class="hero-actions">
                    <mat-form-field appearance="outline" style="width:220px;margin:0;">
                        <mat-label>Search</mat-label>
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput placeholder="Name, tags…" (input)="onSearch($event)" />
                    </mat-form-field>
                    <button matIconButton [class.icon-btn-active]="viewMode() === 'cards'" matTooltip="Card view" (click)="viewMode.set('cards')" class="action-btn">
                        <mat-icon class="material-icons-outlined">grid_view</mat-icon>
                    </button>
                    <button matIconButton [class.icon-btn-active]="viewMode() === 'grid'" matTooltip="List view" (click)="viewMode.set('grid')" class="action-btn">
                        <mat-icon class="material-icons-outlined">table_rows</mat-icon>
                    </button>
                    <button matIconButton matTooltip="Refresh" (click)="loadData()" class="action-btn">
                        <mat-icon class="material-icons-outlined">refresh</mat-icon>
                    </button>
                    @if (canCreate()) {
                        <button mat-flat-button type="button" class="primary-btn" (click)="openCreateDialog()">
                            <mat-icon class="material-icons-outlined">add</mat-icon> New Template
                        </button>
                    }
                </div>
            </header>

            <!-- ── Content ── -->
            <div class="content-wrap">

                @if (error()) {
                <div class="error-banner reveal">
                    <mat-icon class="material-icons-outlined">error_outline</mat-icon>
                    <div style="flex:1;">
                        <p style="font-weight:600;margin:0;font-size:0.88rem;">Failed to load templates</p>
                        <p style="margin:0;font-size:0.78rem;">{{ error() }}</p>
                    </div>
                    <button matButton style="color:var(--tp-teal);" (click)="loadData()">Retry</button>
                </div>
                }

                @if (loading()) {
                <div class="panel reveal">
                    <div class="loading-shell">
                        <mat-progress-spinner mode="indeterminate" diameter="48"></mat-progress-spinner>
                        <p style="margin:0;font-size:0.88rem;">Loading templates…</p>
                    </div>
                </div>
                }

                @if (!loading() && !error()) {

                    @if (activeTab() === 'mine' && canCreate()) {
                    <div class="reveal" style="margin-bottom:0.8rem;">
                        <p style="font-size:0.74rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--tp-muted);font-weight:700;margin:0 0 0.6rem;display:flex;align-items:center;gap:5px;">
                            <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;color:var(--tp-teal);">bolt</mat-icon>
                            Quick Start — Create from a proven blueprint
                        </p>
                        <div class="quick-row">
                            @for (s of quickStarters; track s.type) {
                                <div class="quick-card" (click)="openCreateDialog(s.type)">
                                    <div class="quick-icon" [style.background]="s.color + '1a'" [style.color]="s.color">
                                        <mat-icon class="material-icons-outlined">{{ s.icon }}</mat-icon>
                                    </div>
                                    <p class="quick-label">{{ s.label }}</p>
                                    <p class="quick-tagline">{{ s.tagline }}</p>
                                </div>
                            }
                        </div>
                    </div>
                    }

                    <!-- ── Tabs ── -->
                    <div class="tabs-row reveal">
                        <button class="tab-btn" [class.active]="activeTab() === 'mine'" (click)="setTab('mine')">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;">folder_special</mat-icon>
                            My Templates
                            <span class="tab-badge">{{ myTemplates().length }}</span>
                        </button>
                        <button class="tab-btn" [class.active]="activeTab() === 'hub'" (click)="setTab('hub')">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;">public</mat-icon>
                            Template Hub
                            <span class="tab-badge">{{ publicTemplates().length }}</span>
                        </button>
                        <button class="tab-btn" [class.active]="activeTab() === 'favorites'" (click)="setTab('favorites')">
                            <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;">favorite</mat-icon>
                            Favorites
                            <span class="tab-badge">{{ favoritesTemplates().length }}</span>
                        </button>
                        @if (isAdmin()) {
                            <span class="tabs-sep"></span>
                            <button class="tab-btn admin-tab" [class.active]="activeTab() === 'pending'" (click)="setTab('pending')">
                                <mat-icon class="material-icons-outlined" style="font-size:15px;width:15px;height:15px;">admin_panel_settings</mat-icon>
                                Review
                                @if (pendingTemplates().length > 0) {
                                    <span class="tab-badge tab-badge--warn">{{ pendingTemplates().length }}</span>
                                } @else {
                                    <span class="tab-badge">0</span>
                                }
                            </button>
                        }
                    </div>

                    @if (activeTab() === 'favorites') {
                    <div class="info-banner reveal">
                        <mat-icon class="material-icons-outlined">lightbulb</mat-icon>
                        <span>Star templates in the hub to quickly access them here for future projects.</span>
                    </div>
                    }

                    @if (activeTab() === 'hub') {
                    <div class="chips-row reveal">
                        <span class="chip-label">Type:</span>
                        @for (opt of typeOptions; track opt.value) {
                            <button class="filter-chip" [class.active]="typeFilter() === opt.value" (click)="setTypeFilter(opt.value)">{{ opt.label }}</button>
                        }
                        <span class="chip-label" style="margin-left:0.8rem;">Difficulty:</span>
                        @for (opt of difficultyOptions; track opt.value) {
                            <button class="filter-chip" [class.active]="difficultyFilter() === opt.value" (click)="setDifficultyFilter(opt.value)">{{ opt.label }}</button>
                        }
                        @if (hubSearchLoading()) {
                            <mat-progress-spinner diameter="16" mode="indeterminate"></mat-progress-spinner>
                        }
                    </div>
                    }

                    @if (activeTab() === 'pending' && isAdmin()) {
                        @if (pendingTemplates().length === 0) {
                        <div class="panel reveal" style="display:flex;align-items:center;gap:1rem;padding:1rem;">
                            <mat-icon class="material-icons-outlined" style="color:#22c55e;font-size:32px;width:32px;height:32px;">check_circle</mat-icon>
                            <div>
                                <p style="font-weight:600;margin:0;color:var(--tp-ink);">All caught up!</p>
                                <p style="margin:0;font-size:0.8rem;color:var(--tp-muted);">No templates awaiting your review.</p>
                            </div>
                        </div>
                        } @else {
                        <div class="warn-panel reveal">
                            <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;color:var(--tp-orange);vertical-align:middle;">pending_actions</mat-icon>
                            <strong>{{ pendingTemplates().length }} template{{ pendingTemplates().length > 1 ? 's' : '' }} awaiting your review.</strong>
                            Click a template to open its detail page, or use the inline Approve / Reject buttons below.
                        </div>
                        }
                    }

                    @if (activeTab() === 'hub' && featuredTemplates().length > 0) {
                    <div class="reveal" style="margin-bottom:0.8rem;">
                        <p style="font-size:0.74rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--tp-muted);font-weight:700;margin:0 0 0.55rem;display:flex;align-items:center;gap:5px;">
                            <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;color:var(--tp-orange);">star</mat-icon>
                            Featured &amp; Trending
                        </p>
                        <swiper-container slides-per-view="1.3" space-between="12" breakpoints='{"640":{"slidesPerView":2.2},"1024":{"slidesPerView":3.4}}' style="padding-bottom:8px;">
                            @for (item of featuredTemplates(); track item.id) {
                                <swiper-slide>
                                    <div class="panel" style="padding:0;overflow:hidden;cursor:pointer;margin-bottom:0;" (click)="openTemplate(item)">
                                        <div style="height:88px;overflow:hidden;">
                                            <img [src]="item.image" [alt]="item.name" style="width:100%;height:100%;object-fit:cover;" />
                                        </div>
                                        <div style="padding:0.65rem;">
                                            <p style="font-weight:600;margin:0 0 4px;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--tp-ink);">{{ item.name }}</p>
                                            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                                                <span style="font-size:0.65rem;background:rgba(13,148,136,0.12);color:var(--tp-teal);border-radius:999px;padding:2px 7px;font-weight:600;">{{ item.type }}</span>
                                                @if (item.isTrending) { <span style="font-size:0.62rem;color:var(--tp-orange);">🔥 Trending</span> }
                                                @if (item.isFeatured && !item.isTrending) { <span style="font-size:0.62rem;color:var(--tp-teal);">⭐ Featured</span> }
                                                <span style="font-size:0.68rem;color:var(--tp-muted);margin-left:auto;">{{ item.rating | number:'1.1-1' }} ★</span>
                                            </div>
                                        </div>
                                    </div>
                                </swiper-slide>
                            }
                        </swiper-container>
                    </div>
                    }

                    @if (activeTab() === 'hub') {
                    <div class="recs-panel reveal">
                        <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:0.75rem;margin-bottom:0.7rem;">
                            <div>
                                <p style="font-size:0.82rem;font-weight:600;margin:0;color:var(--tp-teal);display:flex;align-items:center;gap:4px;">
                                    <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">auto_awesome</mat-icon>
                                    For You Recommendations
                                </p>
                                <p style="font-size:0.76rem;color:var(--tp-muted);margin:2px 0 0;">Based on favorites, quality, usage momentum, and your current filter context.</p>
                            </div>
                            <button matButton style="color:var(--tp-teal);" (click)="loadRecommendations()" [disabled]="recommendationsLoading()">
                                <mat-icon class="material-icons-outlined">refresh</mat-icon> Refresh
                            </button>
                        </div>

                        @if (recommendationsLoading()) {
                            <div style="display:flex;align-items:center;gap:8px;color:var(--tp-muted);font-size:0.8rem;padding:0.5rem 0;">
                                <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                                Building recommendations…
                            </div>
                        } @else if (recommendationsError()) {
                            <div style="border:1px solid rgba(180,35,24,0.3);background:rgba(255,241,238,0.9);border-radius:8px;padding:0.6rem 0.8rem;font-size:0.8rem;color:#8b1f15;">{{ recommendationsError() }}</div>
                        } @else if (recommendationViews().length === 0) {
                            <p style="font-size:0.8rem;color:var(--tp-muted);margin:0;">No recommendations available yet. Try removing filters or rating / favoriting templates.</p>
                        } @else {
                            <div class="row gx-2 gy-2">
                                @for (rec of recommendationViews(); track rec.templateId) {
                                    <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <article class="rec-card" (click)="openTemplateById(rec.templateId)">
                                            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                                                <img class="rec-thumb" [src]="rec.image" [alt]="rec.name" />
                                                <div style="flex:1;min-width:0;">
                                                    <p style="font-weight:600;margin:0;font-size:0.82rem;color:var(--tp-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ rec.name }}</p>
                                                    <p style="font-size:0.68rem;color:var(--tp-muted);margin:2px 0 0;">{{ rec.templateType }} · {{ rec.difficultyLevel || '—' }}</p>
                                                </div>
                                                <span style="background:var(--tp-soft-green);color:var(--tp-teal);border-radius:999px;padding:2px 7px;font-size:0.62rem;font-weight:700;">{{ rec.score | number:'1.0-0' }}%</span>
                                            </div>
                                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                                <span style="font-size:0.7rem;color:var(--tp-ink);">{{ rec.rating | number:'1.1-1' }} ★</span>
                                                <span style="font-size:0.7rem;color:var(--tp-muted);">{{ rec.ratingCount }} ratings</span>
                                                <span style="font-size:0.7rem;color:var(--tp-muted);margin-left:auto;">{{ rec.usageCount }} uses</span>
                                            </div>
                                            <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                                @for (reason of rec.reasons.slice(0, 2); track $index) {
                                                    <span class="rec-reason">{{ reason }}</span>
                                                }
                                            </div>
                                        </article>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                    }

                    @if (activeTabData().length === 0 && activeTab() !== 'pending' && !hubSearchLoading()) {
                    <div class="panel reveal">
                        <div class="empty-state-wrap">
                            <div class="empty-icon">
                                <mat-icon class="material-icons-outlined">{{ activeTab() === 'favorites' ? 'favorite_border' : 'layers' }}</mat-icon>
                            </div>
                            <h3 style="font-family:'Space Grotesk',sans-serif;margin:0 0 0.4rem;color:var(--tp-ink);">
                                {{ activeTab() === 'mine' ? 'No templates yet' : activeTab() === 'favorites' ? 'No favorites yet' : 'No templates found' }}
                            </h3>
                            <p style="margin:0;font-size:0.84rem;">
                                {{ activeTab() === 'mine' ? 'Pick a blueprint above or create a blank template.'
                                   : activeTab() === 'favorites' ? 'Browse the Template Hub and click ♥ to save favorites.'
                                   : 'Try adjusting the search or filters.' }}
                            </p>
                        </div>
                    </div>
                    }

                    @if (activeTabData().length > 0 || activeTab() === 'pending') {
                        @if (activeTab() === 'pending' && pendingTemplates().length > 0) {
                            <app-templates-cards
                                [templatesData]="pendingTemplates()"
                                [currentUserId]="currentUserId()"
                                [isAdmin]="isAdmin()"
                                [reviewMode]="true"
                                title="Pending Review"
                                (dataChanged)="loadData()">
                            </app-templates-cards>
                        } @else if (activeTabData().length > 0) {
                            @if (viewMode() === 'cards') {
                                <app-templates-cards
                                    [templatesData]="activeTabData()"
                                    [currentUserId]="currentUserId()"
                                    [isAdmin]="isAdmin()"
                                    [canFavorite]="canFavorite()"
                                    [title]="activeTab() === 'mine' ? 'My Templates' : activeTab() === 'favorites' ? 'My Favorites' : 'Template Hub'"
                                    (favoriteChanged)="onFavoriteChanged($event)">
                                </app-templates-cards>
                            } @else {
                                <app-templates-grid
                                    [templatesData]="activeTabData()"
                                    [currentUserId]="currentUserId()"
                                    [isAdmin]="isAdmin()"
                                    [title]="activeTab() === 'mine' ? 'My Templates' : activeTab() === 'favorites' ? 'My Favorites' : 'Template Hub'">
                                </app-templates-grid>
                            }
                        }
                    }
                }
            </div>
        </section>
    `,
})
export class M2TemplatesComponent implements OnInit {
    private readonly templateService = inject(M2TemplateService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly router = inject(Router);

    readonly quickStarters: QuickStarter[] = QUICK_STARTERS;

    readonly typeOptions = [
        { value: "", label: "All" },
        { value: "SCRUM", label: "Scrum" },
        { value: "KANBAN", label: "Kanban" },
        { value: "WATERFALL", label: "Waterfall" },
        { value: "CUSTOM", label: "Custom" },
    ];
    readonly difficultyOptions = [
        { value: "", label: "All" },
        { value: "BEGINNER", label: "Beginner" },
        { value: "INTERMEDIATE", label: "Intermediate" },
        { value: "ADVANCED", label: "Advanced" },
    ];

    readonly myTemplates = signal<TemplateCardItem[]>([]);
    readonly publicTemplates = signal<TemplateCardItem[]>([]);
    readonly pendingTemplates = signal<TemplateCardItem[]>([]);
    readonly favoritesTemplates = signal<TemplateCardItem[]>([]);
    readonly activeTab = signal<"mine" | "hub" | "favorites" | "pending">("mine");
    readonly typeFilter = signal("");
    readonly difficultyFilter = signal("");
    readonly searchQuery = signal("");
    readonly viewMode = signal<"cards" | "grid">("cards");
    readonly loading = signal(false);
    readonly hubSearchLoading = signal(false);
    readonly error = signal("");
    readonly recommendations = signal<M2TemplateRecommendationItem[]>([]);
    readonly recommendationsLoading = signal(false);
    readonly recommendationsError = signal("");

    private readonly hubSearch$ = new Subject<void>();

    readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? 0);
    readonly isAdmin = computed(() => {
        const role = this.authService.currentUser()?.role;
        return role === "ADMIN" || role === "SUPER_ADMIN";
    });
    readonly canCreate = computed(() => {
        const role = this.authService.currentUser()?.role;
        return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER" || role === "TUTOR";
    });

    /** Only TUTOR and MANAGER may favorite templates */
    readonly canFavorite = computed(() => {
        const role = this.authService.currentUser()?.role;
        return role === "TUTOR" || role === "MANAGER";
    });

    readonly activeTabData = computed(() => {
        const tab = this.activeTab();
        if (tab === "favorites") return this.favoritesTemplates();
        const src = tab === "mine" ? this.myTemplates() : this.publicTemplates();
        const q = this.searchQuery().toLowerCase();
        if (!q) return src;
        return src.filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.tags || "").toLowerCase().includes(q) ||
            (t.useCaseDescription || "").toLowerCase().includes(q)
        );
    });

    readonly featuredTemplates = computed(() =>
        this.publicTemplates().filter(t => t.isFeatured || t.isTrending).slice(0, 8)
    );

    readonly recommendationViews = computed((): TemplateRecommendationView[] => {
        const byId = new Map<string, TemplateCardItem>();
        for (const item of [...this.publicTemplates(), ...this.myTemplates(), ...this.favoritesTemplates()]) {
            byId.set(item.id, item);
        }

        return this.recommendations().map((item) => ({
            ...item,
            image: byId.get(item.templateId)?.image || this.cardImageFor(item.name),
        }));
    });

    ngOnInit(): void {
        this.hubSearch$.pipe(debounceTime(350)).subscribe(() => this.runHubSearch());
        this.loadData();
    }

    setTab(tab: "mine" | "hub" | "favorites" | "pending"): void {
        this.activeTab.set(tab);
        if (tab === "favorites") this.loadFavorites();
        if (tab === "hub" && this.recommendations().length === 0) this.loadRecommendations();
    }

    setTypeFilter(val: string): void {
        this.typeFilter.set(val);
        this.hubSearch$.next();
        this.loadRecommendations();
    }

    setDifficultyFilter(val: string): void {
        this.difficultyFilter.set(val);
        this.hubSearch$.next();
        this.loadRecommendations();
    }

    loadFavorites(): void {
        this.templateService.getMyFavorites(0, 50).pipe(catchError(() => of({ content: [] }))).subscribe(page => {
            this.favoritesTemplates.set((page.content || []).map(t => ({ ...this.toCardItem(t), favorited: true })));
        });
    }

    onFavoriteChanged(event: { id: string; favorited: boolean }): void {
        const tab = this.activeTab();
        if (tab === 'favorites' && !event.favorited) {
            // Unfavorited inside Favorites tab → remove from list
            this.favoritesTemplates.update(list => list.filter(t => t.id !== event.id));
        }
        // Keep hub and mine lists in sync
        this.publicTemplates.update(list => list.map(t =>
            t.id === event.id ? { ...t, favorited: event.favorited } : t
        ));
        this.myTemplates.update(list => list.map(t =>
            t.id === event.id ? { ...t, favorited: event.favorited } : t
        ));
        if (event.favorited) {
            // If favorited from hub/mine and not already in favorites list, add it
            if (!this.favoritesTemplates().find(t => t.id === event.id)) {
                const src = [...this.publicTemplates(), ...this.myTemplates()].find(t => t.id === event.id);
                if (src) this.favoritesTemplates.update(list => [src, ...list]);
            }
        }
    }

    runHubSearch(): void {
        this.hubSearchLoading.set(true);
        const search = this.searchQuery() || undefined;
        const type = this.typeFilter() || undefined;
        const difficulty = this.difficultyFilter() || undefined;
        // Keep current favorite set for cross-referencing
        const currentFavIds = new Set(this.favoritesTemplates().map(t => t.id));
        this.templateService.search({ search, type, difficulty }).pipe(catchError(() => of({ content: [] }))).subscribe(page => {
            this.publicTemplates.set((page.content || []).map(t => ({
                ...this.toCardItem(t),
                favorited: currentFavIds.has(t.id),
            })));
            this.hubSearchLoading.set(false);
        });
    }

    loadData(): void {
        const userId = this.currentUserId();
        if (!userId) return;
        this.loading.set(true);
        this.error.set("");

        forkJoin([
            this.templateService.getMyTemplates(userId, 0, 50).pipe(catchError(() => of({ content: [] }))),
            this.templateService.getPublic(0, 50).pipe(catchError(() => of({ content: [] }))),
            this.isAdmin()
                ? this.templateService.getPending(0, 100).pipe(catchError(() => of({ content: [] })))
                : of({ content: [] }),
            this.canFavorite()
                ? this.templateService.getMyFavorites(0, 200).pipe(catchError(() => of({ content: [] })))
                : of({ content: [] }),
        ]).subscribe({
            next: ([myPage, hubPage, pendingPage, favPage]) => {
                const favIds = new Set<string>((favPage.content || []).map((t: { id: string }) => t.id));
                this.myTemplates.set((myPage.content || []).map(t => ({
                    ...this.toCardItem(t),
                    favorited: favIds.has(t.id),
                })));
                this.publicTemplates.set((hubPage.content || []).map(t => ({
                    ...this.toCardItem(t),
                    favorited: favIds.has(t.id),
                })));
                this.pendingTemplates.set((pendingPage.content || []).map(t => this.toCardItem(t)));
                this.favoritesTemplates.set((favPage.content || []).map(t => ({ ...this.toCardItem(t), favorited: true })));
                this.loading.set(false);
                this.loadRecommendations();
            },
            error: (err: HttpErrorResponse) => {
                this.error.set(err.message || "Failed to load templates.");
                this.loading.set(false);
            },
        });
    }

    onSearch(event: Event): void {
        const val = (event.target as HTMLInputElement).value;
        this.searchQuery.set(val);
        if (this.activeTab() === "hub") this.hubSearch$.next();
    }

    openCreateDialog(starterType?: string): void {
        const ref = this.dialog.open(CreateTemplateDialogComponent, {
            width: "680px",
            maxWidth: "95vw",
            maxHeight: "90vh",
            autoFocus: false,
            data: starterType ? { starterType } : null,
        });
        ref.afterClosed().subscribe((result?: CreateTemplateDialogResult) => {
            if (result?.created) {
                this.activeTab.set("mine");
                this.loadData();
            }
        });
    }

    openTemplate(item: TemplateCardItem): void {
        this.router.navigate(["/app/templates", item.id]);
    }

    openTemplateById(templateId: string): void {
        if (!templateId) return;
        this.router.navigate(["/app/templates", templateId]);
    }

    loadRecommendations(): void {
        if (!this.currentUserId()) return;

        this.recommendationsLoading.set(true);
        this.recommendationsError.set("");

        this.templateService.getRecommendations({
            projectType: this.typeFilter() || undefined,
            difficulty: this.difficultyFilter() || undefined,
            limit: 8,
        }).pipe(
            catchError((err: HttpErrorResponse) => {
                this.recommendationsError.set(err.message || "Recommendations are temporarily unavailable.");
                return of(this.emptyRecommendationsResponse());
            })
        ).subscribe((payload) => {
            this.recommendations.set(payload.items || []);
            this.recommendationsLoading.set(false);
        });
    }

    private toCardItem(t: M2TemplateSummary): TemplateCardItem {
        return {
            id: t.id,
            name: t.name,
            type: t.templateType,
            status: t.status,
            image: t.previewImageUrl || this.cardImageFor(t.name),
            difficulty: t.difficultyLevel,
            effort: t.estimatedEffort,
            durationDays: t.estimatedDurationDays,
            tags: t.tags,
            useCaseDescription: t.useCaseDescription,
            rating: t.rating ?? 0,
            ratingCount: t.ratingCount ?? 0,
            usageCount: t.usageCount ?? 0,
            isPublic: t.isPublic,
            isFeatured: t.isFeatured,
            isTrending: t.isTrending,
            createdBy: t.createdBy,
            favorited: t.favorited,
            favoriteCount: t.favoriteCount,
        };
    }

    private cardImageFor(seed: string): string {
        const images = [
            "assets/img/product1.jpg", "assets/img/product2.jpg", "assets/img/product3.jpg",
            "assets/img/product4.jpg", "assets/img/product5.jpg", "assets/img/product6.jpg",
            "assets/img/product7.jpg", "assets/img/product8.jpg",
        ];
        const hash = [...(seed || "")].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return images[Math.abs(hash) % images.length];
    }

    private emptyRecommendationsResponse(): M2TemplateRecommendationsResponse {
        return {
            generatedAt: new Date().toISOString(),
            limit: 8,
            count: 0,
            context: {},
            items: [],
        };
    }
}
