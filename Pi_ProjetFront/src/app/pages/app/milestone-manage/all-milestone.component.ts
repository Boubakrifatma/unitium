import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, signal, ChangeDetectionStrategy, ChangeDetectorRef, input } from "@angular/core";
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
import { MatDialog } from "@angular/material/dialog";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { trigger, transition, style, animate, query, stagger } from "@angular/animations";
import { MilestoneService, Milestone } from "../../../services/mileStoneService/milestone.service";
import { ProjectService, Project } from "../../../services/project-service";
import { CreateEditMilestoneComponent } from "./create-edit-milestone.component";
import { ConfirmDeleteDialogComponent } from "./confirm-delete-dialog.component";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from "../../../auth/auth.service";

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
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
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
            <!-- Search and Filter -->
            <div class="search-section mb-4">
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

            <!-- Milestones Grid -->
            <div class="milestones-grid" *ngIf="filteredMilestones().length > 0; else noMilestones">
                <div class="milestone-card-wrapper" *ngFor="let milestone of filteredMilestones(); let i = index" 
                    [@cardAnimation]="i"
                    [attr.data-status]="milestone.status">
                    <mat-card class="milestone-card" [class.expanded]="expandedMilestoneIds().has(milestone.id)">
                        <!-- Card Header -->
                        <div class="card-header">
                            <div class="header-content">
                                <div class="milestone-id-badge">{{ milestone.id }}</div>
                                <div class="milestone-info">
                                    <h3 class="milestone-name">{{ milestone.name }}</h3>
                                    <p class="milestone-project">{{ getProjectName(milestoneProjectId(milestone)) }}</p>
                                </div>
                            </div>
                            <div class="header-actions">
                                <span class="status-badge" 
                                    [ngClass]="'status-' + milestone.status">
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
                <div class="empty-state">
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

        /* Header Section */
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
            color: rgba(255, 255, 255, 0.9);
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

        .breadcrumb-link:hover {
            opacity: 0.8;
        }

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

        .create-btn mat-icon {
            margin-right: 8px;
        }

        /* Search Section */
        .search-section {
            margin-bottom: 2rem;
        }

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

        .search-field mat-form-field,
        .filter-field mat-form-field {
            width: 100%;
        }

        .search-icon {
            color: #667eea;
            margin-right: 8px;
        }

        /* Milestones Grid */
        .milestones-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
        }

        .milestone-card-wrapper {
            animation: slideIn 0.6s ease-out both;
        }

        .milestone-card-wrapper[data-status="completed"] .status-badge {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .milestone-card-wrapper[data-status="in_progress"] .status-badge {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .milestone-card-wrapper[data-status="pending"] .status-badge {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }

        /* Card Styles */
        .milestone-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .milestone-card:hover {
            border-color: #667eea;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
            transform: translateY(-2px);
        }

        .milestone-card.expanded {
            grid-column: span 1;
        }

        /* Card Header */
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px;
            border-bottom: 1px solid #f3f4f6;
        }

        .header-content {
            display: flex;
            gap: 12px;
            flex: 1;
        }

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

        .milestone-info {
            flex: 1;
        }

        .milestone-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 4px 0;
            line-height: 1.4;
        }

        .milestone-project {
            font-size: 0.85rem;
            color: #6b7280;
            margin: 0;
        }

        .header-actions {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
            white-space: nowrap;
        }

        .expand-btn {
            transition: transform 0.3s ease;
        }

        .expand-btn.rotated {
            transform: rotate(180deg);
        }

        /* Card Body */
        .card-body {
            padding: 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .progress-section {
            margin-bottom: 20px;
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .progress-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #6b7280;
        }

        .progress-value {
            font-size: 0.9rem;
            font-weight: 700;
            color: #667eea;
        }

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

        .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }

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

        .info-value {
            font-weight: 600;
            color: #1f2937;
            margin-left: auto;
        }

        /* Expandable Details */
        .expandable-content {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #f3f4f6;
            animation: slideDown 0.3s ease-out;
        }

        .details-section {
            margin-bottom: 20px;
        }

        .details-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #667eea;
        }

        .details-text {
            font-size: 0.9rem;
            color: #4b5563;
            line-height: 1.6;
            margin: 0;
        }

        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .detail-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .detail-value {
            font-size: 0.95rem;
            font-weight: 600;
            color: #1f2937;
        }

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

        .view-tasks-btn {
            color: #667eea;
            border-color: #667eea;
        }

        .view-tasks-btn:hover {
            background: #667eea;
            color: white;
        }

        .edit-btn {
            color: #f59e0b;
            border-color: #f59e0b;
        }

        .edit-btn:hover {
            background: #f59e0b;
            color: white;
        }

        .delete-btn {
            color: #ef4444;
            border-color: #ef4444;
        }

        .delete-btn:hover {
            background: #ef4444;
            color: white;
        }

        /* Hover Actions */
        .card-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid #f3f4f6;
            background: #fafbfc;
        }

        .hover-action-btn {
            color: #667eea;
            transition: all 0.3s ease;
        }

        .hover-action-btn:hover {
            background: #667eea;
            color: white;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }

        .empty-icon {
            font-size: 64px;
            width: 64px;
            height: 64px;
            color: #d1d5db;
            margin-bottom: 20px;
        }

        .empty-state h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 8px 0;
        }

        .empty-state p {
            font-size: 0.95rem;
            color: #6b7280;
            margin: 0 0 24px 0;
        }

        /* Animations */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                max-height: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                max-height: 1000px;
                transform: translateY(0);
            }
        }

        .fade-in {
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .milestones-grid {
                grid-template-columns: 1fr;
            }

            .header-title {
                font-size: 1.5rem;
            }

            .filter-row {
                flex-direction: column;
                align-items: stretch;
            }

            .search-field,
            .filter-field {
                min-width: auto;
                max-width: none;
            }

            .action-buttons {
                grid-template-columns: 1fr;
            }

            .details-grid {
                grid-template-columns: 1fr;
            }
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
export class AllMilestoneComponent implements OnInit {
    milestones = signal<Milestone[]>([]);
    projects = signal<Project[]>([]);
    filteredMilestones = signal<Milestone[]>([]);
    expandedMilestoneIds = signal<Set<string | number | null | undefined>>(new Set());
    selectedProjectId = signal<string | null>(null);

    // Input pour filtrer par projet
    projectId = input<string | null>(null);

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