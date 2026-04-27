# Template Hub & Details UI/UX Enhancement Guide

This document provides exact code snippets to enhance the template pages with modern UI/UX best practices.

---

## Part 1: Template Hub (m2-templates.component.ts)

### Enhancement 1A: Full-Bleed Hero Header

**Current problem:** Hero panel has `border-radius: 16px` and is contained within padded page-shell.

**Solution:** Make it full-bleed by restructuring the template section structure.

**Replace line 89-130 (page-shell + hero-panel CSS) with:**

```css
/* ── Page Container (no padding) ── */
.page-container {
    display: block;
    background: #fafbfc;
    min-height: 100vh;
}

/* ── Hero Section (full-bleed) ── */
.hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 3rem 2rem;
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.2);
    position: relative;
    overflow: hidden;
}
.hero-section::before {
    content: "";
    position: absolute;
    top: -50%;
    right: -10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent 70%);
    pointer-events: none;
}

/* ── Hero Content Wrapper ── */
.hero-content {
    max-width: 1420px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

/* ── Hero Top Row (Breadcrumb + Title + Subtitle) ── */
.hero-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.hero-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
}
.hero-breadcrumb a {
    color: rgba(255, 255, 255, 0.95);
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
}
.hero-breadcrumb a:hover {
    color: white;
}
.hero-breadcrumb mat-icon {
    font-size: 16px;
    width: 16px;
    height: 16px;
}

.hero-title-group {
    display: flex;
    align-items: baseline;
    gap: 1.5rem;
    flex-wrap: wrap;
}
.hero-h1 {
    margin: 0;
    color: white;
    font-size: 2.8rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.2;
}
.hero-subtitle {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
    font-size: 1rem;
}

/* ── Hero Actions Row (Search + Buttons) ── */
.hero-actions-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: space-between;
}

.hero-search-group {
    flex: 1;
    min-width: 200px;
    max-width: 400px;
}

.hero-buttons-group {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}

.hero-btn {
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
}

.hero-btn-primary {
    background: white;
    color: #667eea;
}
.hero-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.hero-btn-secondary {
    background: rgba(255, 255, 255, 0.15);
    color: white;
}
.hero-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
}

.hero-icon-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ── Content Area ── */
.content-section {
    padding: 2rem;
    background: #fafbfc;
}

.content-inner {
    max-width: 1420px;
    margin: 0 auto;
}
```

**Update template HTML structure (replace line 422 onwards):**

```html
<section class="page-container">
    <!-- Full-bleed hero section -->
    <div class="hero-section">
        <div class="hero-content">
            <!-- Breadcrumb -->
            <div class="hero-breadcrumb">
                <a routerLink="/app/dashboard">Dashboard</a>
                <mat-icon>chevron_right</mat-icon>
                <a routerLink="/app/templates">Templates</a>
                <mat-icon>chevron_right</mat-icon>
                <span>Template Hub</span>
            </div>

            <!-- Title and Subtitle -->
            <div class="hero-header">
                <h1 class="hero-h1">Template Hub</h1>
                <p class="hero-subtitle">Discover, fork, and launch project blueprints to accelerate delivery</p>
            </div>

            <!-- Actions Row: Search + Buttons -->
            <div class="hero-actions-row">
                <div class="hero-search-group">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Search templates...</mat-label>
                        <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" placeholder="name, type, tags..." />
                        <mat-icon matSuffix>search</mat-icon>
                    </mat-form-field>
                </div>

                <div class="hero-buttons-group">
                    <button
                        mat-icon-button
                        class="hero-btn hero-btn-secondary hero-icon-btn"
                        (click)="toggleViewMode()"
                        [matTooltip]="viewMode() === 'cards' ? 'Switch to table view' : 'Switch to card view'">
                        <mat-icon>{{ viewMode() === 'cards' ? 'view_list' : 'dashboard' }}</mat-icon>
                    </button>

                    <button
                        mat-icon-button
                        class="hero-btn hero-btn-secondary hero-icon-btn"
                        (click)="loadData()"
                        [disabled]="loading()">
                        <mat-icon [class.rotating]="loading()">refresh</mat-icon>
                    </button>

                    @if (canCreate()) {
                        <button
                            matButton
                            class="hero-btn hero-btn-primary"
                            (click)="openCreateDialog()">
                            <mat-icon>add</mat-icon>
                            New Template
                        </button>
                    }
                </div>
            </div>
        </div>
    </div>

    <!-- Content Section -->
    <div class="content-section">
        <div class="content-inner">
            <!-- Existing error/loading blocks -->
            @if (error()) {
                <div class="error-banner">
                    <mat-icon>error_outline</mat-icon>
                    <span>{{ error() }}</span>
                </div>
            }

            @if (loading()) {
                <div class="loading-shell">
                    <mat-spinner diameter="40"></mat-spinner>
                </div>
            }

            <!-- KPI Strip (new) -->
            @if (!loading()) {
                <div class="kpi-strip">
                    <div class="kpi-card">
                        <div class="kpi-icon" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">📋</div>
                        <div>
                            <p class="kpi-label">Total Templates</p>
                            <p class="kpi-value">{{ (myTemplates().length + publicTemplates().length + (isAdmin() ? pendingTemplates().length : 0)) }}</p>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon" style="background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white;">🌐</div>
                        <div>
                            <p class="kpi-label">Public / Hub</p>
                            <p class="kpi-value">{{ publicTemplates().length }}</p>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon" style="background: linear-gradient(135deg, #10b981, #059669); color: white;">✏️</div>
                        <div>
                            <p class="kpi-label">My Templates</p>
                            <p class="kpi-value">{{ myTemplates().length }}</p>
                        </div>
                    </div>

                    <div class="kpi-card">
                        <div class="kpi-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">⭐</div>
                        <div>
                            <p class="kpi-label">Favorites</p>
                            <p class="kpi-value">{{ favoritesTemplates().length }}</p>
                        </div>
                    </div>
                </div>
            }

            <!-- Quick Start Section -->
            @if (canCreate() && activeTab() === 'my') {
                <div class="quick-start-section">
                    <div style="margin-bottom: 1rem;">
                        <p style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0 0 0.5rem;">Quick Start</p>
                        <h3 style="margin:0;color:#0f172a;font-size:1.3rem;font-weight:700;">Choose a Blueprint</h3>
                    </div>
                    <div class="quick-row">
                        @for (qs of quickStarters; track qs.type) {
                            <div class="quick-card" (click)="openCreateDialog(qs.type)">
                                <div class="quick-icon" [style.background]="'linear-gradient(135deg, ' + qs.color + ', ' + (qs.color === '#667eea' ? '#764ba2' : qs.color) + ')'">
                                    <mat-icon>{{ qs.icon }}</mat-icon>
                                </div>
                                <h4 class="quick-label">{{ qs.label }}</h4>
                                <p class="quick-tagline">{{ qs.tagline }}</p>
                                <div style="margin-top:0.5rem;color:#667eea;font-size:0.75rem;font-weight:600;opacity:0;">→</div>
                            </div>
                        }
                    </div>
                </div>
            }

            <!-- Tabs Section -->
            <div style="margin: 2rem 0 1rem;">
                <div class="tabs-row">
                    <button
                        matButton
                        class="tab-btn"
                        [class.active]="activeTab() === 'my'"
                        (click)="setTab('my')">
                        <mat-icon>folder</mat-icon>
                        My Templates
                    </button>
                    <button
                        matButton
                        class="tab-btn"
                        [class.active]="activeTab() === 'hub'"
                        (click)="setTab('hub')">
                        <mat-icon>store</mat-icon>
                        Template Hub
                    </button>
                    <button
                        matButton
                        class="tab-btn"
                        [class.active]="activeTab() === 'favorites'"
                        (click)="setTab('favorites')">
                        <mat-icon>star</mat-icon>
                        Favorites
                    </button>
                    @if (isAdmin()) {
                        <button
                            matButton
                            class="tab-btn admin-tab"
                            [class.active]="activeTab() === 'review'"
                            (click)="setTab('review')">
                            <mat-icon>assessment</mat-icon>
                            Review
                            <span class="tab-badge" style="background:#f59e0b;color:white;border-radius:999px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">
                                {{ pendingTemplates().length }}
                            </span>
                        </button>
                    }
                </div>
            </div>

            <!-- Filters (only on Hub tab) -->
            @if (activeTab() === 'hub') {
                <div class="filters-row">
                    <button
                        matButton
                        class="filter-chip"
                        [class.active]="!typeFilter()"
                        (click)="setTypeFilter(null)">
                        All Types
                    </button>
                    @for (type of typeOptions; track type.value) {
                        <button
                            matButton
                            class="filter-chip"
                            [class.active]="typeFilter() === type.value"
                            (click)="setTypeFilter(type.value)">
                            {{ type.label }}
                        </button>
                    }

                    <span style="margin: 0 0.5rem; color: #e5e7eb;">|</span>

                    <button
                        matButton
                        class="filter-chip"
                        [class.active]="!difficultyFilter()"
                        (click)="setDifficultyFilter(null)">
                        All Difficulty
                    </button>
                    @for (diff of difficultyOptions; track diff.value) {
                        <button
                            matButton
                            class="filter-chip"
                            [class.active]="difficultyFilter() === diff.value"
                            (click)="setDifficultyFilter(diff.value)">
                            {{ diff.label }}
                        </button>
                    }
                </div>
            }

            <!-- Featured/Trending Swiper (only on Hub tab) -->
            @if (activeTab() === 'hub' && featuredTemplates().length > 0) {
                <div style="margin: 2rem 0;">
                    <div style="margin-bottom: 1rem;">
                        <p style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0;">Featured & Trending</p>
                    </div>
                    <swiper-container slides-per-view="3" space-between="16" breakpoints='{"768":{"slidesPerView":1},"1024":{"slidesPerView":2}}'>
                        @for (t of featuredTemplates(); track t.id) {
                            <swiper-slide>
                                <div (click)="openTemplate(t.id)" style="cursor:pointer;height:200px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;flex-direction:column;justify-content:space-between;padding:1.5rem;color:white;transition:all 0.3s;">
                                    <div>
                                        <h4 style="margin:0;font-size:1.1rem;font-weight:700;">{{ t.name }}</h4>
                                        <p style="margin:0.5rem 0 0;opacity:0.9;font-size:0.85rem;">{{ t.useCaseDescription }}</p>
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;">
                                        <span style="font-size:0.75rem;opacity:0.8;">{{ t.templateType }}</span>
                                        <span style="font-size:0.85rem;">→</span>
                                    </div>
                                </div>
                            </swiper-slide>
                        }
                    </swiper-container>
                </div>
            }

            <!-- Recommendations Panel -->
            @if (activeTab() === 'hub' && recommendationViews().length > 0) {
                <div class="recs-panel">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                        <div>
                            <p style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0;">AI Recommendations</p>
                            <h3 style="margin:0.5rem 0 0;color:#0f172a;font-size:1.2rem;font-weight:700;">Templates for You</h3>
                        </div>
                        <button
                            mat-icon-button
                            (click)="loadRecommendations()"
                            [disabled]="recommendationsLoading()">
                            <mat-icon [class.rotating]="recommendationsLoading()">refresh</mat-icon>
                        </button>
                    </div>

                    @if (recommendationsLoading()) {
                        <div style="text-align:center;padding:2rem;">
                            <mat-spinner diameter="40"></mat-spinner>
                        </div>
                    } @else if (recommendationViews().length > 0) {
                        <div class="recs-grid">
                            @for (rec of recommendationViews(); track rec.id) {
                                <div class="rec-card" (click)="openTemplate(rec.id)">
                                    <div class="rec-thumb" [style.background]="'url(' + rec.image + ') center / cover'">
                                        <div class="rec-score-badge">{{ Math.round(rec.matchScore * 100) }}% match</div>
                                    </div>
                                    <div class="rec-content">
                                        <h4>{{ rec.name }}</h4>
                                        <p class="rec-reason">{{ rec.reason }}</p>
                                        <div class="rec-meta">
                                            <span class="rec-type">{{ rec.templateType }}</span>
                                            <span class="rec-difficulty">{{ rec.difficultyLevel || '—' }}</span>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            }

            <!-- Templates Grid/Cards -->
            @if (!loading()) {
                @if (viewMode() === 'cards') {
                    <app-templates-cards
                        [templatesData]="activeTabData()"
                        [currentUserId]="currentUserId()"
                        [isAdmin]="isAdmin()"
                        [canFavorite]="canFavorite()"
                        [reviewMode]="activeTab() === 'review'"
                        [title]="activeTab() === 'my' ? 'My Templates' : activeTab() === 'favorites' ? 'Favorites' : activeTab() === 'review' ? 'Pending Review' : 'Templates'"
                        (dataChanged)="loadData()"
                        (favoriteChanged)="onFavoriteChanged($event)">
                    </app-templates-cards>
                } @else {
                    <app-templates-grid
                        [templatesData]="activeTabData()"
                        [currentUserId]="currentUserId()"
                        [isAdmin]="isAdmin()"
                        [title]="activeTab() === 'my' ? 'My Templates' : activeTab() === 'favorites' ? 'Favorites' : activeTab() === 'review' ? 'Pending Review' : 'Templates'"
                        (dataChanged)="loadData()">
                    </app-templates-grid>
                }
            }
        </div>
    </div>
</section>

<!-- Keyboard shortcut animation -->
<style>
    @keyframes rotating {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .rotating {
        animation: rotating 1s linear infinite;
    }
</style>
```

**Add CSS for KPI Strip and Quick Start:**

```css
/* ── KPI Strip ── */
.kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
}

.kpi-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.kpi-card:hover {
    border-color: #667eea;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
}

.kpi-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
}

.kpi-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin: 0;
}

.kpi-value {
    font-size: 2rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0.25rem 0 0;
}

/* ── Quick Start Section ── */
.quick-start-section {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem 0;
}

.quick-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}

.quick-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    background: white;
    position: relative;
    overflow: hidden;
}

.quick-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), transparent);
    opacity: 0;
    transition: opacity 0.3s;
}

.quick-card:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
}

.quick-card:hover::before {
    opacity: 1;
}

.quick-icon {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

.quick-label {
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
}

.quick-tagline {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0.5rem 0 0;
}

/* ── Tabs ── */
.tabs-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    width: fit-content;
}

.tab-btn {
    background: transparent;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    color: #64748b;
    transition: all 0.25s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.tab-btn:hover:not(.active) {
    color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
    background: white;
    color: #667eea;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.tab-badge {
    margin-left: 0.25rem;
}

/* ── Filters ── */
.filters-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 1rem 0;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
}

.filter-chip {
    padding: 0.5rem 0.8rem;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: white;
    color: #64748b;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.25s;
}

.filter-chip:hover:not(.active) {
    border-color: #667eea;
    color: #667eea;
}

.filter-chip.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

/* ── Recommendations Panel ── */
.recs-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem 0;
}

.recs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.rec-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;
    background: white;
}

.rec-card:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.15);
}

.rec-thumb {
    height: 140px;
    position: relative;
    background: linear-gradient(135deg, #667eea, #764ba2);
}

.rec-score-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
}

.rec-content {
    padding: 1rem;
}

.rec-content h4 {
    margin: 0 0 0.5rem;
    color: #0f172a;
    font-size: 0.95rem;
    font-weight: 700;
}

.rec-reason {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0 0 0.75rem;
}

.rec-meta {
    display: flex;
    gap: 0.5rem;
}

.rec-type,
.rec-difficulty {
    font-size: 0.7rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    background: #f0f1f3;
    color: #64748b;
    font-weight: 600;
}
```

### Add TypeScript method for toggling view mode:

```typescript
toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'cards' ? 'grid' : 'cards');
}

// Also need Math accessible in template:
Math = Math;
```

---

## Part 2: Template Details Page (m2-template-details.component.ts)

### Enhancement 2A: Collapsible Phase Blueprint

**Add to class (before any methods):**

```typescript
readonly expandedPhases = signal<Set<string>>(new Set());

togglePhase(phaseKey: string): void {
    const expanded = new Set(this.expandedPhases());
    if (expanded.has(phaseKey)) {
        expanded.delete(phaseKey);
    } else {
        expanded.add(phaseKey);
    }
    this.expandedPhases.set(expanded);
}

isPhaseExpanded(phaseKey: string): boolean {
    return this.expandedPhases().has(phaseKey);
}

phaseColor(index: number): string {
    const colors = ['#667eea', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
    return colors[index % colors.length];
}

// Make Math available in template
Math = Math;
```

**Add CSS for collapsible phases (in styles block):**

```css
/* ── Phase Block ── */
.phase-block {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    margin-bottom: 1rem;
    overflow: hidden;
    transition: all 0.3s;
}

.phase-block:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.phase-header {
    padding: 1.25rem;
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.04), transparent);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.25s;
    user-select: none;
}

.phase-header:hover {
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), transparent);
}

.phase-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-right: 0.75rem;
}

.phase-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.95rem;
}

.phase-count-badge {
    background: #f0f1f3;
    color: #667eea;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 0.5rem;
}

.chevron-icon {
    transition: transform 0.25s ease;
    color: #667eea !important;
}

.phase-body {
    padding: 0 1.25rem;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}

.phase-expanded .phase-body {
    padding: 1.25rem;
    max-height: 5000px;
}

/* ── Milestone in Phase ── */
.milestone-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 0.75rem;
}

.milestone-card:hover {
    border-color: #667eea;
    background: white;
}

.milestone-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
}

.milestone-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 0.9rem;
}

.milestone-status-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-weight: 600;
}

.milestone-date {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.25rem;
}

.milestone-tasks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.task-chip {
    background: white;
    border: 1px solid #e5e7eb;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #64748b;
    transition: all 0.2s;
}

.task-chip:hover {
    border-color: #667eea;
    color: #667eea;
}
```

**Replace phase blueprint template section:**

```html
<!-- Execution Blueprint (Collapsible) -->
@if (phaseBlueprint().length > 0 && !editMode()) {
    <div style="margin:2rem 0;border:1px solid #e5e7eb;border-radius:16px;padding:1.5rem;">
        <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:0;">Project Structure</p>
            <h4 style="margin:0.5rem 0 0;color:#0f172a;font-size:1.2rem;font-weight:700;">Execution Blueprint</h4>
        </div>

        @for (bp of phaseBlueprint(); track bp.phase.key) {
            <div class="phase-block" [class.phase-expanded]="isPhaseExpanded(bp.phase.key)">
                <div class="phase-header" (click)="togglePhase(bp.phase.key)">
                    <div style="display:flex;align-items:center;flex:1;">
                        <div class="phase-dot" [style.background]="phaseColor($index)"></div>
                        <span class="phase-name">{{ bp.phase.name }}</span>
                        <span class="phase-count-badge">{{ bp.milestones.length + bp.looseTasks.length }} items</span>
                    </div>
                    <mat-icon class="chevron-icon"
                        [style.transform]="isPhaseExpanded(bp.phase.key) ? 'rotate(90deg)' : 'rotate(0)'"
                        style="transition: transform 0.25s ease;">
                        chevron_right
                    </mat-icon>
                </div>

                <div class="phase-body">
                    <!-- Milestones in phase -->
                    @for (m of bp.milestones; track m.key) {
                        <div class="milestone-card">
                            <div class="milestone-header">
                                <div>
                                    <div class="milestone-name">{{ m.name }}</div>
                                    <div class="milestone-date">{{ m.offsetDays }} days into phase</div>
                                </div>
                                <span class="milestone-status-badge"
                                    [style.background]="milestoneStatusColor(m.status)"
                                    [style.color]="m.status === 'pending' ? '#0f172a' : 'white'">
                                    {{ milestoneStatusLabel(m.status) }}
                                </span>
                            </div>

                            @if (m.description) {
                                <p style="font-size:0.8rem;color:#64748b;margin:0.5rem 0;">{{ m.description }}</p>
                            }

                            <!-- Tasks in milestone -->
                            @if (phaseBlueprint()[$ index]?.phaseBlueprint.find(p => p.phase.key === bp.phase.key)?.milestones.find(mile => mile.key === m.key)?.tasks.length > 0) {
                                <div class="milestone-tasks">
                                    @for (t of phaseBlueprint()[$ index]?.phaseBlueprint.find(p => p.phase.key === bp.phase.key)?.milestones.find(mile => mile.key === m.key)?.tasks || []; track t.key) {
                                        <div class="task-chip" [style.border-left]="'3px solid ' + taskPriorityColor(t.priority)">
                                            <strong style="color:#667eea;">{{ t.title }}</strong>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    }

                    <!-- Loose tasks in phase -->
                    @if (bp.looseTasks.length > 0) {
                        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb;">
                            <p style="font-size:0.75rem;font-weight:600;text-transform:uppercase;color:#94a3b8;margin:0 0 0.5rem;">Standalone Tasks</p>
                            <div class="milestone-tasks">
                                @for (t of bp.looseTasks; track t.key) {
                                    <div class="task-chip" [style.border-left]="'3px solid ' + taskPriorityColor(t.priority)">
                                        <strong style="color:#667eea;">{{ t.title }}</strong>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
        }

        @if (orphanMilestones().length > 0) {
            <div style="margin-top:1.5rem;padding:1rem;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;">
                <p style="margin:0;font-size:0.75rem;font-weight:600;color:#b45309;text-transform:uppercase;">⚠️ {{ orphanMilestones().length }} Orphan Milestones</p>
                <p style="margin:0.5rem 0 0;font-size:0.8rem;color:#92400e;">These milestones reference non-existent phases. Review and assign them to phases.</p>
            </div>
        }

        @if (unscopedTasks().length > 0) {
            <div style="margin-top:1rem;padding:1rem;background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;">
                <p style="margin:0;font-size:0.75rem;font-weight:600;color:#991b1b;text-transform:uppercase;">⚠️ {{ unscopedTasks().length }} Unscoped Tasks</p>
                <p style="margin:0.5rem 0 0;font-size:0.8rem;color:#7f1d1d;">These tasks don't belong to a phase or milestone. Assign them or delete.</p>
            </div>
        }
    </div>
}
```

### Enhancement 2B: Collapsible Analytics and Projects

**Add CSS:**

```css
/* ── Collapsible Card Header ── */
.collapsible-header {
    padding: 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.04), transparent);
    border-bottom: 1px solid #e5e7eb;
    transition: all 0.25s;
    user-select: none;
}

.collapsible-header:hover {
    background: linear-gradient(90deg, rgba(102, 126, 234, 0.08), transparent);
}

.collapsible-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}

.collapsible-content.expanded {
    max-height: 5000px;
    padding: 1.5rem;
}

.collapsible-toggle {
    transition: transform 0.25s ease;
    color: #667eea !important;
}

.collapsible-toggle.expanded {
    transform: rotate(180deg);
}
```

**Wrap Analytics + Projects sections with collapsible headers:**

```html
<!-- Analytics + Projects Row (Collapsible) -->
<div class="row gx-2 mb-3">
    <div class="col-12 col-lg-6">
        <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <div class="collapsible-header" (click)="toggleAnalyticsExpanded()">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <mat-icon style="color:#667eea;">insights</mat-icon>
                    <h5 style="margin:0;color:#0f172a;font-weight:700;">Template Analytics</h5>
                </div>
                <mat-icon class="collapsible-toggle" [class.expanded]="analyticsExpanded()">expand_more</mat-icon>
            </div>

            <div class="collapsible-content" [class.expanded]="analyticsExpanded()">
                <!-- existing analytics content -->
            </div>
        </div>
    </div>

    <div class="col-12 col-lg-6">
        <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <div class="collapsible-header" (click)="toggleProjectsExpanded()">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <mat-icon style="color:#10b981;">deployed_code</mat-icon>
                    <h5 style="margin:0;color:#0f172a;font-weight:700;">Projects Using This</h5>
                </div>
                <mat-icon class="collapsible-toggle" [class.expanded]="projectsExpanded()">expand_more</mat-icon>
            </div>

            <div class="collapsible-content" [class.expanded]="projectsExpanded()">
                <!-- existing projects content -->
            </div>
        </div>
    </div>
</div>
```

**Add to TypeScript class:**

```typescript
readonly analyticsExpanded = signal(true);
readonly projectsExpanded = signal(true);

toggleAnalyticsExpanded(): void {
    this.analyticsExpanded.set(!this.analyticsExpanded());
}

toggleProjectsExpanded(): void {
    this.projectsExpanded.set(!this.projectsExpanded());
}
```

---

## Summary of Key Changes

| Component | Enhancement | Impact |
|-----------|------------|--------|
| m2-templates.ts | Full-bleed gradient hero | Modern, eye-catching landing |
| m2-templates.ts | KPI strip | Clear overview metrics |
| m2-templates.ts | Pill-style tabs | Improved tab UX |
| m2-templates.ts | Quick-start cards | Reduced friction for new templates |
| m2-templates.ts | Recommendations panel | AI-powered discovery |
| m2-template-details.ts | Collapsible phase accordion | Compact blueprint view |
| m2-template-details.ts | Collapsible analytics | Faster page load |
| m2-template-details.ts | Color-coded phase dots | Better visual hierarchy |
| templates-cards.ts | Type color strip (upcoming) | Quicker type identification |

---

## Testing Checklist

- [ ] Navigate to `/app/templates` — verify full-bleed hero renders
- [ ] Verify KPI strip shows correct counts
- [ ] Switch between tabs — verify content updates
- [ ] Click on phase accordion arrows — verify smooth collapse/expand
- [ ] Check responsive behavior on mobile (hero should stack vertically)
- [ ] Verify hover states on cards and buttons
- [ ] Test dark mode (if applicable)
- [ ] Check accessibility (keyboard navigation, screen reader)

---

## Python ML Server Commands

### Windows
```bash
cd c:\Users\riahi\OneDrive\Desktop\pipooo\PiProjetByUnitum
start-ml-server.bat
```

### macOS / Linux
```bash
cd ~/path/to/pipooo/PiProjetByUnitum
bash start-ml-server.sh
```

### Manual (All Platforms)
```bash
cd m2_ml_service
pip install -r requirements.txt
python scripts/export_pib_artifacts.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Server will be available at **http://localhost:8000** ✅
