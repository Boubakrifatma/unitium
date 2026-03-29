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
import { M2TemplateService, M2TemplateSummary } from "./m2-template.service";
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
        .quick-card { border:1.5px solid rgba(0,0,0,0.09); border-radius:12px; padding:12px 14px; cursor:pointer; transition:all .2s; }
        .quick-card:hover { border-color:var(--bs-primary,#6366f1); background:rgba(99,102,241,0.04); transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,0.08); }
        .quick-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .tab-btn { border:none; background:none; padding:8px 14px; border-radius:20px; cursor:pointer; font-size:13px; color:#64748b; transition:all .15s; display:inline-flex; align-items:center; gap:6px; }
        .tab-btn.active { background:rgba(99,102,241,0.1); color:#6366f1; font-weight:600; }
        .tab-btn:hover:not(.active) { background:rgba(0,0,0,0.04); }
        .filter-chip { border:1px solid rgba(0,0,0,0.13); background:none; padding:4px 12px; border-radius:16px; cursor:pointer; font-size:12px; color:#475569; transition:all .15s; }
        .filter-chip.active { border-color:#6366f1; background:rgba(99,102,241,0.09); color:#6366f1; font-weight:600; }
        .filter-chip:hover:not(.active) { background:rgba(0,0,0,0.04); }
    `],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <!-- ── Header ── -->
            <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3">
                <div class="row gx-3 align-items-center">
                    <div class="col-12 col-md mb-3 mb-xl-0 py-1 order-1">
                        <h3 class="mb-1">Templates Hub</h3>
                        <p class="small mb-0">
                            <span routerLink="/app/dashboard" class="me-2 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon> Home</span>
                            <mat-icon class="material-icons-outlined align-middle text-sm me-2">chevron_right</mat-icon>
                            Templates Hub
                        </p>
                        <p class="text-secondary small mb-0 mt-1">Reusable project blueprints — create, share, and discover templates.</p>
                    </div>

                    <div class="col-12 col-md-auto order-3 mb-3 mb-xl-0">
                        <mat-form-field appearance="outline" class="inline-small w-100">
                            <mat-label>Search</mat-label>
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput placeholder="Name, tags..." (input)="onSearch($event)" />
                        </mat-form-field>
                    </div>

                    <div class="col-auto order-2 order-lg-3 mb-3 mb-xl-0 d-flex gap-2 align-items-center">
                        <button matIconButton [class.text-theme]="viewMode() === 'cards'" matTooltip="Card view" (click)="viewMode.set('cards')">
                            <mat-icon class="material-icons-outlined">grid_view</mat-icon>
                        </button>
                        <button matIconButton [class.text-theme]="viewMode() === 'grid'" matTooltip="List view" (click)="viewMode.set('grid')">
                            <mat-icon class="material-icons-outlined">table_rows</mat-icon>
                        </button>
                        <button matIconButton matTooltip="Refresh" (click)="loadData()">
                            <mat-icon class="material-icons-outlined">refresh</mat-icon>
                        </button>
                        @if (canCreate()) {
                            <button matButton="elevated" class="text-theme" (click)="openCreateDialog()">
                                <mat-icon class="material-icons-outlined">add</mat-icon> New Template
                            </button>
                        }
                    </div>
                </div>
            </mat-card>

            <!-- ── Error ── -->
            @if (error()) {
                <mat-card class="mt-3 mb-3">
                    <mat-card-content class="d-flex align-items-center gap-3 py-3">
                        <mat-icon class="material-icons-outlined theme-red">error_outline</mat-icon>
                        <div>
                            <p class="fw-medium mb-0">Failed to load templates</p>
                            <p class="text-secondary small mb-0">{{ error() }}</p>
                        </div>
                        <button matButton class="ms-auto" (click)="loadData()">Retry</button>
                    </mat-card-content>
                </mat-card>
            }

            <!-- ── Loading ── -->
            @if (loading()) {
                <mat-card class="mt-3 mb-3">
                    <mat-card-content class="text-center py-5">
                        <mat-icon class="material-icons-outlined text-secondary" style="font-size:40px;width:40px;height:40px;animation:spin 1s linear infinite;">cached</mat-icon>
                        <p class="text-secondary mt-2 mb-0">Loading templates...</p>
                    </mat-card-content>
                </mat-card>
            }

            @if (!loading() && !error()) {

                <!-- ── Quick-Start Row (My Templates tab + creator) ── -->
                @if (activeTab() === 'mine' && canCreate()) {
                    <div class="mt-3 mb-1">
                        <p class="small text-secondary mb-2" style="font-weight:600;">
                            <mat-icon class="material-icons-outlined align-middle text-theme" style="font-size:15px;width:15px;height:15px;">bolt</mat-icon>
                            Quick Start — Create from a proven blueprint:
                        </p>
                        <div class="row gx-2">
                            @for (s of quickStarters; track s.type) {
                                <div class="col-6 col-sm-3 mb-2">
                                    <div class="quick-card" (click)="openCreateDialog(s.type)">
                                        <div class="d-flex align-items-center gap-2 mb-1">
                                            <div class="quick-icon" [style.background]="s.color + '18'" [style.color]="s.color">
                                                <mat-icon class="material-icons-outlined">{{ s.icon }}</mat-icon>
                                            </div>
                                            <p class="fw-medium mb-0" style="font-size:13px;">{{ s.label }}</p>
                                        </div>
                                        <p class="text-secondary mb-0" style="font-size:11px;">{{ s.tagline }}</p>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                }

                <!-- ── Tabs ── -->
                <div class="d-flex align-items-center gap-1 mt-3 mb-2 flex-wrap">
                    <button class="tab-btn" [class.active]="activeTab() === 'mine'" (click)="setTab('mine')">
                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">folder_special</mat-icon>
                        My Templates
                        <span class="badge badge-light" style="font-size:10px;">{{ myTemplates().length }}</span>
                    </button>
                    <button class="tab-btn" [class.active]="activeTab() === 'hub'" (click)="setTab('hub')">
                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">public</mat-icon>
                        Template Hub
                        <span class="badge badge-light" style="font-size:10px;">{{ publicTemplates().length }}</span>
                    </button>
                    <button class="tab-btn" [class.active]="activeTab() === 'favorites'" (click)="setTab('favorites')">
                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">favorite</mat-icon>
                        Favorites
                        <span class="badge badge-light" style="font-size:10px;">{{ favoritesTemplates().length }}</span>
                    </button>
                    @if (isAdmin()) {
                        <button class="tab-btn" [class.active]="activeTab() === 'pending'" (click)="setTab('pending')">
                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">pending_actions</mat-icon>
                            Pending Review
                            @if (pendingTemplates().length > 0) {
                                <span class="badge ms-1" style="background:#f59e0b;color:white;font-size:10px;">{{ pendingTemplates().length }}</span>
                            } @else {
                                <span class="badge badge-light" style="font-size:10px;">0</span>
                            }
                        </button>
                    }
                </div>

                <!-- ── Hub filter chips ── -->
                @if (activeTab() === 'hub') {
                    <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <span class="text-secondary small me-1">Type:</span>
                        @for (opt of typeOptions; track opt.value) {
                            <button class="filter-chip" [class.active]="typeFilter() === opt.value"
                                (click)="setTypeFilter(opt.value)">{{ opt.label }}</button>
                        }
                        <span class="text-secondary small ms-3 me-1">Difficulty:</span>
                        @for (opt of difficultyOptions; track opt.value) {
                            <button class="filter-chip" [class.active]="difficultyFilter() === opt.value"
                                (click)="setDifficultyFilter(opt.value)">{{ opt.label }}</button>
                        }
                        @if (hubSearchLoading()) {
                            <mat-progress-spinner diameter="18" mode="indeterminate" class="ms-2"></mat-progress-spinner>
                        }
                    </div>
                }

                <!-- ── Pending Review banner ── -->
                @if (activeTab() === 'pending' && isAdmin()) {
                    @if (pendingTemplates().length === 0) {
                        <mat-card class="mt-2 mb-3" style="border:2px solid #22c55e;">
                            <mat-card-content class="d-flex align-items-center gap-3 py-3">
                                <mat-icon class="material-icons-outlined" style="color:#22c55e;font-size:32px;width:32px;height:32px;">check_circle</mat-icon>
                                <div>
                                    <p class="fw-medium mb-0">All caught up!</p>
                                    <p class="text-secondary small mb-0">No templates awaiting your review.</p>
                                </div>
                            </mat-card-content>
                        </mat-card>
                    } @else {
                        <div class="mb-2 p-3 rounded" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);">
                            <p class="small mb-0" style="color:#92400e;">
                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;color:#f59e0b;">pending_actions</mat-icon>
                                <strong>{{ pendingTemplates().length }} template{{ pendingTemplates().length > 1 ? 's' : '' }} awaiting your review.</strong>
                                Click a template to open its detail page, or use the inline Approve / Reject buttons below.
                            </p>
                        </div>
                    }
                }

                <!-- ── Featured carousel (Hub tab) ── -->
                @if (activeTab() === 'hub' && featuredTemplates().length > 0) {
                    <div class="mb-3 mt-1">
                        <p class="small text-secondary mb-2 fw-medium">
                            <mat-icon class="material-icons-outlined align-middle text-theme" style="font-size:15px;width:15px;height:15px;">star</mat-icon>
                            Featured &amp; Trending
                        </p>
                        <swiper-container slides-per-view="1.3" space-between="12" breakpoints='{"640":{"slidesPerView":2.2},"1024":{"slidesPerView":3.4}}' style="padding-bottom:8px;">
                            @for (item of featuredTemplates(); track item.id) {
                                <swiper-slide>
                                    <mat-card class="h-100" style="cursor:pointer;" (click)="openTemplate(item)">
                                        <div class="coverimg rounded-top" style="height:90px;overflow:hidden;">
                                            <img [src]="item.image" [alt]="item.name" class="w-100 h-100" style="object-fit:cover;" />
                                        </div>
                                        <mat-card-content class="pt-2 pb-2">
                                            <h4 class="mb-1 text-truncate small">{{ item.name }}</h4>
                                            <div class="d-flex align-items-center gap-1">
                                                <span class="badge badge-light" style="font-size:10px;">{{ item.type }}</span>
                                                @if (item.isTrending) { <span class="badge theme-orange" style="font-size:10px;">🔥 Trending</span> }
                                                @if (item.isFeatured && !item.isTrending) { <span class="badge theme-green" style="font-size:10px;">⭐ Featured</span> }
                                                <span class="text-secondary ms-auto" style="font-size:11px;">{{ item.rating | number:'1.1-1' }} ★</span>
                                            </div>
                                        </mat-card-content>
                                    </mat-card>
                                </swiper-slide>
                            }
                        </swiper-container>
                    </div>
                }

                <!-- ── Empty state ── -->
                @if (activeTabData().length === 0 && activeTab() !== 'pending' && !hubSearchLoading()) {
                    <mat-card class="mt-2">
                        <mat-card-content class="text-center py-5">
                            <mat-icon class="material-icons-outlined text-secondary" style="font-size:56px;width:56px;height:56px;">
                                {{ activeTab() === 'favorites' ? 'favorite_border' : 'layers' }}
                            </mat-icon>
                            <h4 class="mt-3 mb-1">
                                {{ activeTab() === 'mine' ? 'No templates yet' : activeTab() === 'favorites' ? 'No favorites yet' : 'No templates found' }}
                            </h4>
                            <p class="text-secondary small mb-3">
                                {{ activeTab() === 'mine' ? 'Pick a blueprint above or create a blank template.'
                                   : activeTab() === 'favorites' ? 'Browse the Template Hub and click ♥ to save favorites.'
                                   : 'Try adjusting the search or filters.' }}
                            </p>
                        </mat-card-content>
                    </mat-card>
                }

                <!-- ── Cards / Grid view ── -->
                @if (activeTabData().length > 0 || activeTab() === 'pending') {
                    @if (activeTab() === 'pending' && pendingTemplates().length > 0) {
                        <!-- Pending review: always cards with reviewMode -->
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

    ngOnInit(): void {
        this.hubSearch$.pipe(debounceTime(350)).subscribe(() => this.runHubSearch());
        this.loadData();
    }

    setTab(tab: "mine" | "hub" | "favorites" | "pending"): void {
        this.activeTab.set(tab);
        if (tab === "favorites") this.loadFavorites();
    }

    setTypeFilter(val: string): void {
        this.typeFilter.set(val);
        this.hubSearch$.next();
    }

    setDifficultyFilter(val: string): void {
        this.difficultyFilter.set(val);
        this.hubSearch$.next();
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
}
