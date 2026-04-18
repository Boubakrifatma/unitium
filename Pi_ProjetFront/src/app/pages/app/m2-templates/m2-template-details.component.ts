import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatTooltipModule } from "@angular/material/tooltip";
import {
    M2TemplateAnalyticsResponse,
    M2TemplateCoverSuggestion,
    M2TemplateLineageNode,
    M2TemplateService,
    M2TemplateSummary,
} from "./m2-template.service";
import { TemplateDeleteConfirmDialogComponent } from "./template-delete-confirm-dialog.component";
import { AuthService } from "../../../auth/auth.service";
import { M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "./use-template-wizard-dialog.component";
import { TemplateDnaViewerComponent } from "../../../components/template-dna-viewer/template-dna-viewer.component";

interface TemplatePhaseView {
    key: string;
    name: string;
    durationDays: number;
    order: number;
    enabled: boolean;
}

interface TemplateMilestoneView {
    key: string;
    name: string;
    description: string;
    phaseKey: string | null;
    offsetDays: number | null;
    status: string;
    completionPct: number;
    enabled: boolean;
}

interface TemplateTaskView {
    key: string;
    title: string;
    description: string;
    phaseKey: string | null;
    milestoneKey: string | null;
    taskType: string;
    status: string;
    priority: string;
    estimatedHours: number | null;
    startOffsetDays: number | null;
    dueOffsetDays: number | null;
    parentTaskKey: string | null;
    enabled: boolean;
}

interface TemplatePhaseBlueprint {
    phase: TemplatePhaseView;
    milestones: Array<TemplateMilestoneView & { tasks: TemplateTaskView[] }>;
    looseTasks: TemplateTaskView[];
}

// Simple inline workspace-selector dialog
import { Component as DlgComp, inject as dlgInject, signal as dlgSignal, OnInit as DlgOnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

@DlgComp({
    selector: "app-use-template-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatIconModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0">
            <mat-icon class="material-icons-outlined me-2 text-theme">rocket_launch</mat-icon>
            <span class="flex-grow-1">Use Template</span>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>
        <mat-dialog-content class="pt-2">
            <p class="small text-secondary mb-3">Select a workspace and optionally provide a project name to create a project from this template.</p>
            <mat-form-field appearance="outline" class="w-100 mb-2">
                <mat-label>Workspace *</mat-label>
                <mat-select [(ngModel)]="selectedWorkspaceId" required>
                    @for (ws of workspaces(); track ws.id) {
                        <mat-option [value]="ws.id">{{ ws.name }}</mat-option>
                    }
                </mat-select>
                @if (loadingWs()) { <mat-hint>Loading workspaces...</mat-hint> }
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Project Name (optional)</mat-label>
                <input matInput [(ngModel)]="projectName" placeholder="Leave blank to use template name" />
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" [disabled]="!selectedWorkspaceId || creating" (click)="submit()">
                {{ creating ? 'Creating...' : 'Create Project' }}
            </button>
        </mat-dialog-actions>
    `,
})
export class UseTemplateDialogComponent implements DlgOnInit {
    private readonly dialogRef = dlgInject(MatDialogRef<UseTemplateDialogComponent>);
    private readonly data = dlgInject(MAT_DIALOG_DATA) as { templateId: string };
    private readonly workspaceService = dlgInject(M2WorkspaceService);
    private readonly templateService = dlgInject(M2TemplateService);
    private readonly snackBar = dlgInject(MatSnackBar);

    readonly workspaces = dlgSignal<{ id: string; name: string }[]>([]);
    readonly loadingWs = dlgSignal(true);
    selectedWorkspaceId = "";
    projectName = "";
    creating = false;

    ngOnInit(): void {
        this.workspaceService.getWorkspaces().subscribe({
            next: (list) => {
                this.workspaces.set((list || []).map((w) => ({ id: w.id, name: w.name })));
                this.loadingWs.set(false);
            },
            error: () => this.loadingWs.set(false),
        });
    }

    submit(): void {
        if (!this.selectedWorkspaceId || this.creating) return;
        this.creating = true;
        this.templateService.createProjectFromTemplate(
            this.selectedWorkspaceId,
            this.data.templateId,
            this.projectName.trim() || undefined
        ).subscribe({
            next: (project) => {
                this.snackBar.open("Project created from template!", "Close", { duration: 3500 });
                this.dialogRef.close({ workspaceId: this.selectedWorkspaceId, projectId: (project as { id?: string })["id"] });
            },
            error: () => {
                this.creating = false;
                this.snackBar.open("Failed to create project.", "Close", { duration: 4000 });
            },
        });
    }

    close(): void { this.dialogRef.close(); }
}

// Reject dialog
@DlgComp({
    selector: "app-reject-template-dialog",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
    template: `
        <h3 mat-dialog-title>Reject Template</h3>
        <mat-dialog-content>
            <mat-form-field appearance="outline" class="w-100">
                <mat-label>Rejection Reason *</mat-label>
                <textarea matInput [(ngModel)]="reason" rows="3" placeholder="Explain why this template is rejected..."></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" color="warn" [disabled]="!reason.trim()" (click)="submit()">Reject</button>
        </mat-dialog-actions>
    `,
})
export class RejectTemplateDialogComponent {
    private readonly dialogRef = dlgInject(MatDialogRef<RejectTemplateDialogComponent>);
    reason = "";
    submit(): void { if (this.reason.trim()) this.dialogRef.close({ reason: this.reason.trim() }); }
    close(): void { this.dialogRef.close(); }
}

// ===================== MAIN DETAIL COMPONENT =====================
@Component({
    selector: "app-m2-template-details",
    standalone: true,
    imports: [
        CommonModule, RouterLink, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule, MatDividerModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatSnackBarModule, MatDialogModule, MatTooltipModule,
        TemplateDnaViewerComponent,
    ],
    template: `
        <div class="container-fluid fade-in mb-3 mb-lg-4">
            <!-- Loading -->
            @if (loading()) {
                <mat-card class="mt-3">
                    <mat-card-content class="text-center py-5">
                        <mat-icon class="material-icons-outlined text-secondary" style="font-size:40px;width:40px;height:40px;animation:spin 1s linear infinite;">cached</mat-icon>
                        <p class="text-secondary mt-2">Loading template...</p>
                    </mat-card-content>
                </mat-card>
            }

            <!-- Error -->
            @if (error() && !loading()) {
                <mat-card class="mt-3">
                    <mat-card-content class="d-flex align-items-center gap-3 py-3">
                        <mat-icon class="material-icons-outlined theme-red">error_outline</mat-icon>
                        <div>
                            <p class="fw-medium mb-0">Failed to load template</p>
                            <p class="text-secondary small mb-0">{{ error() }}</p>
                        </div>
                        <button matButton class="ms-auto" (click)="backToTemplates()">Back to Templates</button>
                    </mat-card-content>
                </mat-card>
            }

            @if (!loading() && !error() && template()) {

                <!-- ── ADMIN REVIEW BANNER ── -->
                @if (isAdmin() && template()!.status === 'PENDING_APPROVAL') {
                    <div class="mb-3" style="background:linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.04));border:2px solid #f59e0b;border-radius:16px;padding:20px 24px;">
                        <div class="row gx-3 align-items-center">
                            <div class="col-auto">
                                <div style="width:52px;height:52px;border-radius:14px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;">
                                    <mat-icon class="material-icons-outlined" style="color:#f59e0b;font-size:28px;width:28px;height:28px;">pending_actions</mat-icon>
                                </div>
                            </div>
                            <div class="col">
                                <h5 class="mb-1" style="color:#b45309;">Awaiting Your Review</h5>
                                <p class="small text-secondary mb-0">This template has been submitted for approval and needs admin review before it's published to the Template Hub.</p>
                            </div>
                            <div class="col-12 col-md-auto mt-3 mt-md-0 d-flex gap-2">
                                <button matButton="elevated" style="background:#16a34a;color:white;" (click)="approveTemplate()">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon>
                                    Approve &amp; Publish
                                </button>
                                <button matButton style="color:#dc3545;border:1px solid #dc3545;border-radius:4px;" (click)="rejectTemplate()">
                                    <mat-icon class="material-icons-outlined">cancel</mat-icon>
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                }

                <!-- Header card -->
                <mat-card class="bg-light-theme shadow-none pt-3 pb-lg-3 px-3 mb-3">
                    <div class="row gx-3 align-items-center">
                        <div class="col-auto">
                            <button matIconButton (click)="backToTemplates()" matTooltip="Back to Templates Hub">
                                <mat-icon class="material-icons-outlined">arrow_back</mat-icon>
                            </button>
                        </div>
                        <div class="col">
                            <h3 class="mb-0">{{ template()!.name }}</h3>
                            <p class="small mb-0">
                                <span routerLink="/app/dashboard" class="me-1 text-theme style-none"><mat-icon class="material-icons-outlined align-middle text-sm">house</mat-icon></span>
                                <mat-icon class="material-icons-outlined align-middle text-sm me-1">chevron_right</mat-icon>
                                <span routerLink="/app/templates" class="me-1 text-theme style-none">Templates Hub</span>
                                <mat-icon class="material-icons-outlined align-middle text-sm me-1">chevron_right</mat-icon>
                                {{ template()!.name }}
                            </p>
                        </div>
                        <div class="col-12 col-md-auto mt-2 mt-md-0">
                            <!-- status badge -->
                            <span class="badge me-2"
                                [ngClass]="{
                                    'theme-green': template()!.status === 'APPROVED',
                                    'theme-orange': template()!.status === 'PENDING_APPROVAL',
                                    'theme-red': template()!.status === 'REJECTED'
                                }">
                                {{ statusLabel(template()!.status) }}
                            </span>
                            <!-- Action buttons -->
                            @if (template()!.status === 'APPROVED' || (isOwner() && template()!.status === 'DRAFT')) {
                                <button matButton="elevated" class="text-theme me-1" (click)="openUseTemplateDialog()">
                                    <mat-icon class="material-icons-outlined">rocket_launch</mat-icon> Use Template
                                </button>
                            }
                            @if (template()!.status === 'APPROVED') {
                                <button matButton class="me-1" (click)="forkTemplate()">
                                    <mat-icon class="material-icons-outlined">fork_right</mat-icon> Fork
                                </button>
                            }
                            @if (isOwner() && template()!.status === 'DRAFT') {
                                <button matButton class="me-1" (click)="publishTemplate()" style="color:#f57c00;">
                                    <mat-icon class="material-icons-outlined">publish</mat-icon> Publish
                                </button>
                            }
                            @if (isAdmin() && template()!.status === 'PENDING_APPROVAL') {
                                <button matButton class="me-1 theme-green" (click)="approveTemplate()">
                                    <mat-icon class="material-icons-outlined">check_circle</mat-icon> Approve
                                </button>
                                <button matButton class="me-1 theme-red" (click)="rejectTemplate()">
                                    <mat-icon class="material-icons-outlined">cancel</mat-icon> Reject
                                </button>
                            }
                            @if (canEdit()) {
                                @if (!editMode()) {
                                    <button matButton class="me-1" (click)="startEdit()">
                                        <mat-icon class="material-icons-outlined">edit</mat-icon> Edit
                                    </button>
                                } @else {
                                    <button matButton="filled" class="me-1 text-theme" (click)="saveEdit()" [disabled]="saving()">
                                        {{ saving() ? 'Saving...' : 'Save' }}
                                    </button>
                                    <button matButton class="me-1" (click)="cancelEdit()">Cancel</button>
                                }
                            }
                            @if (canEdit()) {
                                <button matButton class="theme-red" (click)="openDeleteDialog()">
                                    <mat-icon class="material-icons-outlined">archive</mat-icon> Archive
                                </button>
                            }
                        </div>
                    </div>
                </mat-card>

                <!-- Info metric cards -->
                <div class="row gx-3 mb-3">
                    <div class="col-6 col-lg-3 mb-3">
                        <mat-card class="h-100">
                            <mat-card-content class="py-3 text-center">
                                <mat-icon class="material-icons-outlined text-theme mb-1" style="font-size:28px;width:28px;height:28px;">category</mat-icon>
                                <p class="small text-secondary mb-1">Type</p>
                                <p class="fw-bold mb-0">{{ template()!.templateType }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <div class="col-6 col-lg-3 mb-3">
                        <mat-card class="h-100">
                            <mat-card-content class="py-3 text-center">
                                <mat-icon class="material-icons-outlined text-theme mb-1" style="font-size:28px;width:28px;height:28px;">bar_chart</mat-icon>
                                <p class="small text-secondary mb-1">Difficulty</p>
                                <p class="fw-bold mb-0">{{ template()!.difficultyLevel || '—' }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <div class="col-6 col-lg-3 mb-3">
                        <mat-card class="h-100">
                            <mat-card-content class="py-3 text-center">
                                <mat-icon class="material-icons-outlined text-theme mb-1" style="font-size:28px;width:28px;height:28px;">bolt</mat-icon>
                                <p class="small text-secondary mb-1">Effort</p>
                                <p class="fw-bold mb-0">{{ template()!.estimatedEffort || '—' }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                    <div class="col-6 col-lg-3 mb-3">
                        <mat-card class="h-100">
                            <mat-card-content class="py-3 text-center">
                                <mat-icon class="material-icons-outlined text-theme mb-1" style="font-size:28px;width:28px;height:28px;">timer</mat-icon>
                                <p class="small text-secondary mb-1">Duration</p>
                                <p class="fw-bold mb-0">{{ template()!.estimatedDurationDays ? template()!.estimatedDurationDays + ' days' : '—' }}</p>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>

                <!-- Analytics and cover suggestions -->
                <div class="row gx-3 mb-1">
                    <div class="col-12 col-lg-7 mb-3">
                        <mat-card>
                            <mat-card-content class="py-3">
                                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                                    <div>
                                        <h5 class="mb-0">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">analytics</mat-icon>
                                            Template Analytics
                                        </h5>
                                        <p class="small text-secondary mb-0">Live quality, growth, velocity, and rating-distribution signals.</p>
                                    </div>
                                    <button matButton class="text-theme" (click)="loadTemplateAnalytics(templateId())" [disabled]="analyticsLoading()">
                                        <mat-icon class="material-icons-outlined">refresh</mat-icon>
                                        Refresh
                                    </button>
                                </div>

                                @if (analyticsLoading()) {
                                    <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                                        Loading analytics...
                                    </div>
                                } @else if (analyticsError()) {
                                    <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);">
                                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;color:#dc2626;">error_outline</mat-icon>
                                        <p class="small mb-0" style="color:#991b1b;">{{ analyticsError() }}</p>
                                    </div>
                                } @else if (templateAnalytics(); as analytics) {
                                    <div class="row gx-2 mb-2">
                                        <div class="col-6 col-md-3 mb-2">
                                            <div style="border:1px solid rgba(34,197,94,0.24);border-radius:10px;background:rgba(34,197,94,0.08);padding:8px 10px;">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Quality</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#15803d;">{{ analytics.scores.qualityScore | number:'1.0-0' }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-md-3 mb-2">
                                            <div style="border:1px solid rgba(14,165,233,0.25);border-radius:10px;background:rgba(14,165,233,0.08);padding:8px 10px;">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Growth</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#0369a1;">{{ analytics.scores.growthScore | number:'1.0-0' }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-md-3 mb-2">
                                            <div style="border:1px solid rgba(99,102,241,0.26);border-radius:10px;background:rgba(99,102,241,0.08);padding:8px 10px;">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Velocity / week</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#4f46e5;">{{ analytics.scores.usageVelocityPerWeek | number:'1.1-1' }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-md-3 mb-2">
                                            <div style="border:1px solid rgba(245,158,11,0.28);border-radius:10px;background:rgba(245,158,11,0.09);padding:8px 10px;">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Total Favorites</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#b45309;">{{ analytics.totals.favoriteCount }}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="d-flex flex-wrap gap-2 mb-2">
                                        <span class="badge badge-light">Avg rating {{ analytics.totals.averageRating | number:'1.1-1' }}</span>
                                        <span class="badge badge-light">{{ analytics.totals.ratingCount }} ratings</span>
                                        <span class="badge badge-light">{{ analytics.totals.usageCount }} launches</span>
                                        <span class="badge badge-light">+{{ analytics.recent.favorites7d }} favorites in 7d</span>
                                        <span class="badge badge-light">+{{ analytics.recent.ratings30d }} ratings in 30d</span>
                                    </div>

                                    <div class="d-flex flex-column gap-1">
                                        @for (row of ratingDistributionRows(); track row.stars) {
                                            <div class="d-flex align-items-center gap-2">
                                                <span style="font-size:11px;color:#475569;min-width:34px;">{{ row.stars }}★</span>
                                                <div style="flex:1;height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
                                                    <div style="height:100%;background:linear-gradient(90deg,#f59e0b,#f97316);" [style.width.%]="(row.count / ratingDistributionMax()) * 100"></div>
                                                </div>
                                                <span style="font-size:11px;color:#475569;min-width:20px;text-align:right;">{{ row.count }}</span>
                                            </div>
                                        }
                                    </div>
                                } @else {
                                    <p class="small text-secondary mb-0">Analytics not available yet.</p>
                                }
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <div class="col-12 col-lg-5 mb-3">
                        <mat-card>
                            <mat-card-content class="py-3">
                                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                                    <div>
                                        <h5 class="mb-0">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">image_search</mat-icon>
                                            Cover Suggestions
                                        </h5>
                                        <p class="small text-secondary mb-0">Free Openverse suggestions for better template visuals.</p>
                                    </div>
                                    @if (coverProviderStatus() === 'fallback') {
                                        <span class="badge theme-orange" style="font-size:10px;">Fallback</span>
                                    }
                                </div>

                                <div class="d-flex gap-2 mb-2">
                                    <mat-form-field appearance="outline" class="w-100 inline-small" style="margin:0;">
                                        <mat-label>Cover query</mat-label>
                                        <input matInput [(ngModel)]="coverQuery" placeholder="kanban board" />
                                    </mat-form-field>
                                    <button matButton="filled" class="text-theme" (click)="loadCoverSuggestions(coverQuery)" [disabled]="coverSuggestionsLoading()" style="height:40px;margin-top:2px;">
                                        Search
                                    </button>
                                </div>

                                @if (coverSuggestionsLoading()) {
                                    <div class="d-flex align-items-center gap-2 text-secondary small py-2">
                                        <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;animation:spin 1s linear infinite;">cached</mat-icon>
                                        Loading cover suggestions...
                                    </div>
                                }

                                @if (coverWarning()) {
                                    <div class="small mb-2" style="color:#92400e;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:7px 9px;">
                                        {{ coverWarning() }}
                                    </div>
                                }

                                @if (coverSuggestionsError()) {
                                    <div class="small" style="color:#991b1b;">{{ coverSuggestionsError() }}</div>
                                } @else if (coverSuggestions().length === 0 && !coverSuggestionsLoading()) {
                                    <p class="small text-secondary mb-0">No suggestions yet. Try another keyword.</p>
                                } @else {
                                    <div class="row gx-2 gy-2">
                                        @for (item of coverSuggestions(); track item.id || $index) {
                                            <div class="col-6">
                                                <div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;padding:6px;background:#fff;">
                                                    @if (item.thumbnail) {
                                                        <img [src]="item.thumbnail" [alt]="item.title || 'cover'" style="width:100%;height:80px;object-fit:cover;border-radius:8px;" />
                                                    } @else {
                                                        <div style="height:80px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:11px;">No preview</div>
                                                    }
                                                    <p class="mb-0 mt-1 text-truncate" style="font-size:11px;color:#0f172a;">{{ item.title || 'Untitled image' }}</p>
                                                    <p class="mb-0 text-truncate" style="font-size:10px;color:#64748b;">{{ item.creator || 'Unknown creator' }}</p>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                }
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>

                <!-- Main body -->
                <div class="row gx-3">
                    <!-- Left column -->
                    <div class="col-12 col-md-4 mb-3">
                        <!-- Summary card -->
                        <mat-card class="mb-3">
                            <mat-card-content class="py-3">
                                @if (!editMode()) {
                                    <h5 class="mb-2">Summary</h5>
                                    <p class="small text-secondary mb-1">Name</p>
                                    <p class="fw-medium mb-2">{{ template()!.name }}</p>
                                    @if (template()!.useCaseDescription) {
                                        <p class="small text-secondary mb-1">Use Case</p>
                                        <p class="small mb-2">{{ template()!.useCaseDescription }}</p>
                                    }
                                    @if (template()!.tags) {
                                        <p class="small text-secondary mb-1">Tags</p>
                                        <div class="d-flex flex-wrap gap-1 mb-2">
                                            @for (tag of tagsArray(); track tag) {
                                                <span class="badge badge-light">{{ tag }}</span>
                                            }
                                        </div>
                                    }
                                    <mat-divider class="my-2"></mat-divider>
                                    <div class="row gx-2">
                                        <div class="col-6">
                                            <p class="small text-secondary mb-0">Version</p>
                                            <p class="small mb-0">v{{ template()!.version }}</p>
                                        </div>
                                        <div class="col-6">
                                            <p class="small text-secondary mb-0">Strategy</p>
                                            <p class="small mb-0">{{ template()!.teamStrategy || '—' }}</p>
                                        </div>
                                    </div>
                                    @if (template()!.parentTemplateId) {
                                        <mat-divider class="my-2"></mat-divider>
                                        <p class="small text-secondary mb-0">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">fork_right</mat-icon>
                                            Forked template
                                        </p>
                                    }
                                    @if (template()!.rejectionReason) {
                                        <mat-divider class="my-2"></mat-divider>
                                        <div class="d-flex align-items-start gap-2 p-2 rounded" style="background:rgba(220,53,69,0.07);border:1px solid rgba(220,53,69,0.25);">
                                            <mat-icon class="material-icons-outlined theme-red" style="font-size:16px;width:16px;height:16px;flex-shrink:0;margin-top:1px;">block</mat-icon>
                                            <div>
                                                <p class="small fw-medium theme-red mb-0">Rejection reason</p>
                                                <p class="small text-secondary mb-0">{{ template()!.rejectionReason }}</p>
                                            </div>
                                        </div>
                                    }
                                } @else {
                                    <h5 class="mb-2">Edit Template</h5>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Name *</mat-label>
                                        <input matInput [(ngModel)]="editName" required minlength="3" maxlength="150" (ngModelChange)="editNameError=''" />
                                        @if (editNameError) { <mat-error>{{ editNameError }}</mat-error> }
                                        <mat-hint align="end">{{ editName.length }}/150</mat-hint>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Type</mat-label>
                                        <mat-select [(ngModel)]="editType">
                                            <mat-option value="SCRUM">Scrum</mat-option>
                                            <mat-option value="KANBAN">Kanban</mat-option>
                                            <mat-option value="WATERFALL">Waterfall</mat-option>
                                            <mat-option value="CUSTOM">Custom</mat-option>
                                        </mat-select>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Tags</mat-label>
                                        <input matInput [(ngModel)]="editTags" placeholder="agile, sprint" />
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Use Case Description</mat-label>
                                        <textarea matInput [(ngModel)]="editDescription" rows="3"></textarea>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Effort</mat-label>
                                        <mat-select [(ngModel)]="editEffort">
                                            <mat-option value="">—</mat-option>
                                            <mat-option value="LOW">Low</mat-option>
                                            <mat-option value="MEDIUM">Medium</mat-option>
                                            <mat-option value="HIGH">High</mat-option>
                                        </mat-select>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Difficulty</mat-label>
                                        <mat-select [(ngModel)]="editDifficulty">
                                            <mat-option value="">—</mat-option>
                                            <mat-option value="BEGINNER">Beginner</mat-option>
                                            <mat-option value="INTERMEDIATE">Intermediate</mat-option>
                                            <mat-option value="ADVANCED">Advanced</mat-option>
                                        </mat-select>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Est. Duration (days)</mat-label>
                                        <input matInput type="number" [(ngModel)]="editDuration" min="1" />
                                        <mat-hint>Minimum 1 day</mat-hint>
                                    </mat-form-field>
                                }
                            </mat-card-content>
                        </mat-card>

                        <!-- Community card -->
                        <mat-card>
                            <mat-card-content class="py-3">
                                <h5 class="mb-2">Community</h5>

                                <!-- Average rating (always visible) -->
                                <div class="d-flex align-items-center gap-2 mb-3">
                                    <div class="d-flex">
                                        @for (s of starsArray(template()!.rating); track $index) {
                                            <mat-icon style="font-size:18px;width:18px;height:18px;color:#f59e0b;">{{ s }}</mat-icon>
                                        }
                                    </div>
                                    <span class="small fw-medium">{{ template()!.rating | number:'1.1-1' }}</span>
                                    <span class="small text-secondary">({{ template()!.ratingCount }} {{ template()!.ratingCount === 1 ? 'rating' : 'ratings' }})</span>
                                </div>

                                <!-- User rating interaction -->
                                @if (userRating() === 0) {
                                    <div class="mb-3">
                                        <p class="small text-secondary mb-1">Rate this template:</p>
                                        <div class="d-flex gap-1">
                                            @for (i of [1,2,3,4,5]; track i) {
                                                <mat-icon
                                                    style="font-size:26px;width:26px;height:26px;cursor:pointer;transition:color 0.12s;"
                                                    [style.color]="i <= (hoverRating || 0) ? '#f59e0b' : '#cbd5e1'"
                                                    (mouseenter)="hoverRating = i"
                                                    (mouseleave)="hoverRating = 0"
                                                    (click)="rateTemplate(i)">
                                                    {{ i <= (hoverRating || 0) ? 'star' : 'star_border' }}
                                                </mat-icon>
                                            }
                                        </div>
                                    </div>
                                } @else {
                                    <div class="mb-3 d-flex align-items-center gap-2 p-2 rounded" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);">
                                        <div class="d-flex">
                                            @for (i of [1,2,3,4,5]; track i) {
                                                <mat-icon style="font-size:18px;width:18px;height:18px;" [style.color]="i <= userRating() ? '#f59e0b' : '#e2e8f0'">
                                                    {{ i <= userRating() ? 'star' : 'star_border' }}
                                                </mat-icon>
                                            }
                                        </div>
                                        <span class="small fw-medium" style="color:#b45309;">Your rating: {{ userRating() }}/5</span>
                                        <mat-icon class="material-icons-outlined ms-auto" style="font-size:14px;width:14px;height:14px;color:#b45309;">check_circle</mat-icon>
                                    </div>
                                }

                                <p class="small text-secondary mb-0">
                                    <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">rocket_launch</mat-icon>
                                    {{ template()!.usageCount }} projects created from this template
                                </p>

                                <!-- Admin feature/trending controls -->
                                @if (isAdmin() && template()!.status === 'APPROVED') {
                                    <mat-divider class="my-3"></mat-divider>
                                    <p class="small fw-medium mb-2">Admin Controls</p>
                                    <div class="d-flex flex-wrap gap-2">
                                        <button matButton [class.text-theme]="template()!.isFeatured" (click)="toggleFeatured()">
                                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">star</mat-icon>
                                            {{ template()!.isFeatured ? 'Featured ✓' : 'Mark Featured' }}
                                        </button>
                                        <button matButton [class.text-theme]="template()!.isTrending" (click)="toggleTrending()">
                                            <mat-icon class="material-icons-outlined" style="font-size:16px;width:16px;height:16px;">trending_up</mat-icon>
                                            {{ template()!.isTrending ? 'Trending ✓' : 'Mark Trending' }}
                                        </button>
                                    </div>
                                }
                            </mat-card-content>
                        </mat-card>
                    </div>

                    <!-- Right column -->
                    <div class="col-12 col-md-8 mb-3">
                        <mat-card>
                            <mat-card-content class="py-3">
                                <h5 class="mb-3">Template Structure</h5>

                                @if (editMode()) {
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Project Config JSON</mat-label>
                                        <textarea matInput [(ngModel)]="editDefaultConfig" rows="4" placeholder='{"name":"","priority":"HIGH"}' (ngModelChange)="editConfigError=''"></textarea>
                                        @if (editConfigError) { <mat-error>{{ editConfigError }}</mat-error> }
                                        <mat-hint>Optional — must be valid JSON object if provided</mat-hint>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Phases JSON</mat-label>
                                        <textarea matInput [(ngModel)]="editPhases" rows="4" placeholder='[{"name":"Planning"},{"name":"Execution"}]' (ngModelChange)="editPhasesError=''"></textarea>
                                        @if (editPhasesError) { <mat-error>{{ editPhasesError }}</mat-error> }
                                        <mat-hint>Optional — must be valid JSON array if provided</mat-hint>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Roles JSON</mat-label>
                                        <textarea matInput [(ngModel)]="editRoles" rows="4" placeholder='[{"role":"SCRUM_MASTER"}]' (ngModelChange)="editRolesError=''"></textarea>
                                        @if (editRolesError) { <mat-error>{{ editRolesError }}</mat-error> }
                                        <mat-hint>Optional — must be valid JSON array if provided</mat-hint>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Milestones JSON</mat-label>
                                        <textarea matInput [(ngModel)]="editMilestones" rows="4" placeholder='[{"key":"milestone-1","name":"Kickoff","phaseKey":"phase-1","offsetDays":0}]' (ngModelChange)="editMilestonesError=''"></textarea>
                                        @if (editMilestonesError) { <mat-error>{{ editMilestonesError }}</mat-error> }
                                        <mat-hint>Optional — must be valid JSON array if provided</mat-hint>
                                    </mat-form-field>
                                    <mat-form-field appearance="outline" class="w-100 mb-2">
                                        <mat-label>Tasks JSON</mat-label>
                                        <textarea matInput [(ngModel)]="editTasks" rows="5" placeholder='[{"key":"task-1","title":"Plan sprint","phaseKey":"phase-1","priority":"medium"}]' (ngModelChange)="editTasksError=''"></textarea>
                                        @if (editTasksError) { <mat-error>{{ editTasksError }}</mat-error> }
                                        <mat-hint>Optional — must be valid JSON array if provided</mat-hint>
                                    </mat-form-field>
                                } @else {
                                    <div class="row gx-2 mb-3">
                                        <div class="col-6 col-lg-3 mb-2">
                                            <div style="border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:10px 12px;background:rgba(99,102,241,0.06);">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Phases</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#4f46e5;">{{ parsedPhases().length }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-lg-3 mb-2">
                                            <div style="border:1px solid rgba(14,165,233,0.25);border-radius:12px;padding:10px 12px;background:rgba(14,165,233,0.07);">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Milestones</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#0369a1;">{{ parsedMilestones().length }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-lg-3 mb-2">
                                            <div style="border:1px solid rgba(245,158,11,0.28);border-radius:12px;padding:10px 12px;background:rgba(245,158,11,0.09);">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Tasks</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#b45309;">{{ parsedTasks().length }}</p>
                                            </div>
                                        </div>
                                        <div class="col-6 col-lg-3 mb-2">
                                            <div style="border:1px solid rgba(34,197,94,0.24);border-radius:12px;padding:10px 12px;background:rgba(34,197,94,0.08);">
                                                <p class="text-secondary mb-1" style="font-size:11px;">Estimated Hours</p>
                                                <p class="fw-semibold mb-0" style="font-size:18px;color:#15803d;">{{ estimatedTaskHours() | number:'1.0-0' }}h</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <p class="fw-medium small mb-2">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">settings</mat-icon>
                                            Project Configuration
                                        </p>
                                        @if (parsedConfigEntries().length > 0) {
                                            <div class="row gx-2">
                                                @for (entry of parsedConfigEntries(); track $index) {
                                                    <div class="col-12 col-lg-6 mb-2">
                                                        <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 10px;background:#f8fafc;">
                                                            <p class="text-secondary mb-1" style="font-size:11px;">{{ entry.key }}</p>
                                                            <p class="fw-medium mb-0" style="font-size:12px;color:#0f172a;">{{ entry.value }}</p>
                                                        </div>
                                                    </div>
                                                }
                                            </div>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">No project config preset defined.</p>
                                        }
                                    </div>
                                    <mat-divider class="mb-3"></mat-divider>

                                    <div class="mb-3">
                                        <p class="fw-medium small mb-2">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">account_tree</mat-icon>
                                            Phase Flow
                                        </p>
                                        @if (parsedPhases().length > 0) {
                                            <div class="d-flex align-items-center flex-wrap gap-1">
                                                @for (phase of parsedPhases(); track phase.key; let i = $index) {
                                                    <div class="d-flex align-items-center">
                                                        <span style="padding:5px 10px;border-radius:20px;font-size:11px;white-space:nowrap;font-weight:600;border:1px solid;"
                                                            [style.background]="phase.enabled ? 'rgba(99,102,241,0.12)' : 'rgba(148,163,184,0.14)'"
                                                            [style.color]="phase.enabled ? '#4f46e5' : '#475569'"
                                                            [style.borderColor]="phase.enabled ? 'rgba(99,102,241,0.3)' : 'rgba(148,163,184,0.4)'">
                                                            {{ i + 1 }}. {{ phase.name }}
                                                            @if (phase.durationDays > 0) {
                                                                <span style="opacity:0.75;"> · {{ phase.durationDays }}d</span>
                                                            }
                                                        </span>
                                                        @if (i < parsedPhases().length - 1) {
                                                            <mat-icon style="font-size:14px;width:14px;height:14px;color:#94a3b8;flex-shrink:0;">chevron_right</mat-icon>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">No phases configured.</p>
                                        }
                                    </div>
                                    <mat-divider class="mb-3"></mat-divider>

                                    <div class="mb-3">
                                        <p class="fw-medium small mb-2">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">schema</mat-icon>
                                            Execution Blueprint
                                        </p>

                                        @if (phaseBlueprint().length > 0) {
                                            <div class="d-flex flex-column gap-2">
                                                @for (bundle of phaseBlueprint(); track bundle.phase.key) {
                                                    <div style="border:1px solid rgba(15,23,42,0.12);border-radius:12px;padding:10px;background:#ffffff;">
                                                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                                            <div>
                                                                <p class="fw-semibold mb-0" style="font-size:13px;color:#0f172a;">{{ bundle.phase.name }}</p>
                                                                <p class="small text-secondary mb-0">
                                                                    {{ bundle.phase.durationDays }} day{{ bundle.phase.durationDays !== 1 ? 's' : '' }} · {{ bundle.milestones.length }} milestone{{ bundle.milestones.length !== 1 ? 's' : '' }} · {{ bundle.looseTasks.length }} standalone task{{ bundle.looseTasks.length !== 1 ? 's' : '' }}
                                                                </p>
                                                            </div>
                                                            @if (!bundle.phase.enabled) {
                                                                <span class="badge badge-light" style="font-size:10px;">Disabled</span>
                                                            }
                                                        </div>

                                                        @if (bundle.milestones.length > 0) {
                                                            <div class="d-flex flex-column gap-2 mb-2">
                                                                @for (milestone of bundle.milestones; track milestone.key) {
                                                                    <div style="border:1px solid;border-radius:10px;padding:8px 9px;"
                                                                        [style.borderColor]="milestoneStatusColor(milestone.status) + '40'"
                                                                        [style.background]="milestoneStatusColor(milestone.status) + '12'">
                                                                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
                                                                            <p class="mb-0 fw-medium" style="font-size:12px;color:#0f172a;">{{ milestone.name }}</p>
                                                                            <span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;border:1px solid;"
                                                                                [style.color]="milestoneStatusColor(milestone.status)"
                                                                                [style.borderColor]="milestoneStatusColor(milestone.status) + '66'"
                                                                                [style.background]="milestoneStatusColor(milestone.status) + '1A'">
                                                                                {{ milestoneStatusLabel(milestone.status) }}
                                                                            </span>
                                                                        </div>
                                                                        <p class="small text-secondary mb-1" style="font-size:11px;">
                                                                            Offset: {{ milestone.offsetDays ?? 0 }}d · Completion: {{ milestone.completionPct | number:'1.0-0' }}%
                                                                        </p>
                                                                        @if (milestone.description) {
                                                                            <p class="small mb-1" style="font-size:11px;color:#334155;">{{ milestone.description }}</p>
                                                                        }
                                                                        @if (milestone.tasks.length > 0) {
                                                                            <div class="d-flex flex-wrap gap-1">
                                                                                @for (task of milestone.tasks.slice(0, 3); track task.key) {
                                                                                    <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10px;border:1px solid;"
                                                                                        [style.background]="taskPriorityColor(task.priority) + '1A'"
                                                                                        [style.borderColor]="taskPriorityColor(task.priority) + '55'"
                                                                                        [style.color]="taskPriorityColor(task.priority)">
                                                                                        {{ task.title }}
                                                                                        @if (task.estimatedHours !== null) {
                                                                                            <span style="opacity:.8;">({{ task.estimatedHours }}h)</span>
                                                                                        }
                                                                                    </span>
                                                                                }
                                                                                @if (milestone.tasks.length > 3) {
                                                                                    <span class="badge badge-light" style="font-size:10px;">+{{ milestone.tasks.length - 3 }} more</span>
                                                                                }
                                                                            </div>
                                                                        } @else {
                                                                            <p class="small text-secondary mb-0 fst-italic" style="font-size:11px;">No tasks mapped to this milestone.</p>
                                                                        }
                                                                    </div>
                                                                }
                                                            </div>
                                                        }

                                                        @if (bundle.looseTasks.length > 0) {
                                                            <div>
                                                                <p class="small fw-medium mb-1" style="font-size:11px;color:#0f172a;">Standalone Tasks</p>
                                                                <div class="d-flex flex-wrap gap-1">
                                                                    @for (task of bundle.looseTasks; track task.key) {
                                                                        <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10px;border:1px solid;"
                                                                            [style.background]="taskPriorityColor(task.priority) + '1A'"
                                                                            [style.borderColor]="taskPriorityColor(task.priority) + '55'"
                                                                            [style.color]="taskPriorityColor(task.priority)">
                                                                            {{ task.title }}
                                                                            <span style="opacity:.8;">{{ taskStatusLabel(task.status) }}</span>
                                                                        </span>
                                                                    }
                                                                </div>
                                                            </div>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">No relation-aware blueprint available yet.</p>
                                        }
                                    </div>

                                    @if (orphanMilestones().length > 0 || unscopedTasks().length > 0) {
                                        <div class="mb-3" style="border:1px dashed rgba(148,163,184,0.5);border-radius:10px;padding:10px;background:rgba(248,250,252,0.85);">
                                            <p class="fw-medium small mb-2" style="color:#475569;">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">warning_amber</mat-icon>
                                                Unlinked Structure Items
                                            </p>

                                            @if (orphanMilestones().length > 0) {
                                                <p class="small mb-1" style="font-size:11px;color:#64748b;">Milestones without a valid phase link:</p>
                                                <div class="d-flex flex-wrap gap-1 mb-2">
                                                    @for (milestone of orphanMilestones(); track milestone.key) {
                                                        <span class="badge badge-light" style="font-size:10px;">{{ milestone.name }}</span>
                                                    }
                                                </div>
                                            }

                                            @if (unscopedTasks().length > 0) {
                                                <p class="small mb-1" style="font-size:11px;color:#64748b;">Tasks without phase/milestone references:</p>
                                                <div class="d-flex flex-wrap gap-1">
                                                    @for (task of unscopedTasks(); track task.key) {
                                                        <span class="badge badge-light" style="font-size:10px;">{{ task.title }}</span>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    }
                                    <mat-divider class="mb-3"></mat-divider>

                                    <div class="mb-3">
                                        <p class="fw-medium small mb-2">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">group</mat-icon>
                                            Roles
                                        </p>
                                        @if (parsedRoles().length > 0) {
                                            <div class="d-flex flex-wrap gap-2">
                                                @for (role of parsedRoles(); track $index) {
                                                    <span style="background:rgba(20,184,166,0.1);color:#0d9488;padding:5px 10px;border-radius:20px;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(20,184,166,0.25);">
                                                        <mat-icon style="font-size:11px;width:11px;height:11px;">person</mat-icon>
                                                        {{ role.role }}
                                                        @if (role.count > 1) { <span style="opacity:0.7;">×{{ role.count }}</span> }
                                                    </span>
                                                }
                                            </div>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                        }
                                    </div>
                                    <mat-divider class="mb-3"></mat-divider>

                                    <div class="row gx-2">
                                        <div class="col-12 col-lg-6 mb-2">
                                            <p class="fw-medium small mb-2">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">playlist_add_check</mat-icon>
                                                Checklist
                                            </p>
                                            @if (parsedChecklistItems().length > 0) {
                                                <div class="d-flex flex-column gap-1">
                                                    @for (item of parsedChecklistItems(); track $index) {
                                                        <div style="display:flex;align-items:flex-start;gap:6px;font-size:11px;color:#334155;">
                                                            <mat-icon style="font-size:14px;width:14px;height:14px;color:#16a34a;flex-shrink:0;">task_alt</mat-icon>
                                                            <span>{{ item }}</span>
                                                        </div>
                                                    }
                                                </div>
                                            } @else {
                                                <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                            }
                                        </div>

                                        <div class="col-12 col-lg-6 mb-2">
                                            <p class="fw-medium small mb-2">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">groups</mat-icon>
                                                Team Recommendation
                                            </p>
                                            @if (parsedTeamRecommendation().length > 0) {
                                                <div class="d-flex flex-column gap-2">
                                                    @for (entry of parsedTeamRecommendation(); track $index) {
                                                        <div style="border:1px solid rgba(15,23,42,0.1);border-radius:10px;padding:8px 9px;background:#f8fafc;">
                                                            <p class="text-secondary mb-1" style="font-size:10px;">{{ entry.key }}</p>
                                                            <p class="small mb-0" style="font-size:11px;color:#0f172a;">{{ entry.value }}</p>
                                                        </div>
                                                    }
                                                </div>
                                            } @else {
                                                <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                            }
                                        </div>
                                    </div>
                                }
                            </mat-card-content>
                        </mat-card>

                        <mat-card class="mt-3">
                            <mat-card-content class="py-3">
                                <div class="d-flex flex-wrap align-items-start gap-2 mb-2">
                                    <div class="flex-grow-1">
                                        <h5 class="mb-1">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:18px;width:18px;height:18px;">account_tree</mat-icon>
                                            Template DNA Viewer
                                        </h5>
                                        <p class="small text-secondary mb-0">Fork lineage across ancestors and descendants. Node color encodes rating; link width encodes usage.</p>
                                    </div>
                                </div>

                                <app-template-dna-viewer
                                    [lineage]="lineage()"
                                    [loading]="lineageLoading()"
                                    [error]="lineageError()"
                                    [activeTemplateId]="templateId()"
                                    (openTemplate)="openLineageTemplate($event)">
                                </app-template-dna-viewer>
                            </mat-card-content>
                        </mat-card>
                    </div>
                </div>
            }
        </div>
    `,
})
export class M2TemplateDetailsComponent implements OnInit {
    private readonly templateService = inject(M2TemplateService);
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);

    readonly templateId = signal("");
    readonly template = signal<M2TemplateSummary | null>(null);
    readonly lineage = signal<M2TemplateLineageNode | null>(null);
    readonly loading = signal(true);
    readonly error = signal("");
    readonly lineageLoading = signal(false);
    readonly lineageError = signal("");
    readonly editMode = signal(false);
    readonly saving = signal(false);
    readonly templateAnalytics = signal<M2TemplateAnalyticsResponse | null>(null);
    readonly analyticsLoading = signal(false);
    readonly analyticsError = signal("");
    readonly coverSuggestions = signal<M2TemplateCoverSuggestion[]>([]);
    readonly coverSuggestionsLoading = signal(false);
    readonly coverSuggestionsError = signal("");
    readonly coverProviderStatus = signal<"live" | "fallback" | null>(null);
    readonly coverWarning = signal("");
    readonly userRating = signal(0);
    hoverRating = 0;
    coverQuery = "";

    // Validation error messages for edit mode
    editNameError = "";
    editPhasesError = "";
    editRolesError = "";
    editMilestonesError = "";
    editTasksError = "";
    editConfigError = "";

    // edit fields
    editName = "";
    editType = "CUSTOM";
    editEffort = "";
    editDifficulty = "";
    editDuration: number | null = null;
    editTags = "";
    editDescription = "";
    editDefaultConfig = "";
    editPhases = "";
    editRoles = "";
    editMilestones = "";
    editTasks = "";

    readonly isOwner = computed(() => this.template()?.createdBy === this.authService.currentUser()?.id);
    readonly isAdmin = computed(() => {
        const role = this.authService.currentUser()?.role;
        return role === "ADMIN" || role === "SUPER_ADMIN";
    });
    readonly canEdit = computed(() => this.isOwner() || this.isAdmin());

    readonly tagsArray = computed(() =>
        (this.template()?.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    );

    readonly ratingDistributionRows = computed(() => {
        const distribution = this.templateAnalytics()?.ratingDistribution || {};
        return [5, 4, 3, 2, 1].map((stars) => ({
            stars,
            count: Number((distribution as Record<string, number>)[String(stars)] ?? 0),
        }));
    });

    readonly ratingDistributionMax = computed(() => {
        const rows = this.ratingDistributionRows();
        if (rows.length === 0) return 1;
        return Math.max(1, ...rows.map((row) => row.count));
    });

    readonly parsedPhases = computed((): TemplatePhaseView[] => {
        const rows = this.parseJsonArray(this.template()?.defaultPhasesJson);
        return rows
            .map((row, index) => ({
                key: this.valueToText(row["key"]) || `phase-${index + 1}`,
                name: this.valueToText(row["name"]) || `Phase ${index + 1}`,
                durationDays: this.valueToNumber(row["durationDays"] ?? row["duration"], 0),
                order: this.valueToNumber(row["order"], index + 1),
                enabled: this.valueToBoolean(row["enabled"], true),
            }))
            .sort((left, right) => left.order - right.order);
    });

    readonly parsedMilestones = computed((): TemplateMilestoneView[] => {
        const rows = this.parseJsonArray(this.template()?.defaultMilestonesJson);
        return rows.map((row, index) => ({
            key: this.valueToText(row["key"]) || `milestone-${index + 1}`,
            name: this.valueToText(row["name"] ?? row["title"]) || `Milestone ${index + 1}`,
            description: this.valueToText(row["description"]) || "",
            phaseKey: this.valueToText(row["phaseKey"] ?? row["phase"]),
            offsetDays: this.valueToNullableNumber(row["offsetDays"]),
            status: (this.valueToText(row["status"]) || "pending").toLowerCase(),
            completionPct: this.valueToNumber(row["completionPct"], 0),
            enabled: this.valueToBoolean(row["enabled"], true),
        }));
    });

    readonly parsedTasks = computed((): TemplateTaskView[] => {
        const rows = this.parseJsonArray(this.template()?.defaultTasksJson);
        return rows.map((row, index) => ({
            key: this.valueToText(row["key"]) || `task-${index + 1}`,
            title: this.valueToText(row["title"] ?? row["name"]) || `Task ${index + 1}`,
            description: this.valueToText(row["description"]) || "",
            phaseKey: this.valueToText(row["phaseKey"] ?? row["phase"]),
            milestoneKey: this.valueToText(row["milestoneKey"] ?? row["milestone"]),
            taskType: (this.valueToText(row["taskType"] ?? row["type"]) || "task").toLowerCase(),
            status: (this.valueToText(row["status"]) || "todo").toLowerCase(),
            priority: (this.valueToText(row["priority"]) || "medium").toLowerCase(),
            estimatedHours: this.valueToNullableNumber(row["estimatedHours"]),
            startOffsetDays: this.valueToNullableNumber(row["startOffsetDays"]),
            dueOffsetDays: this.valueToNullableNumber(row["dueOffsetDays"]),
            parentTaskKey: this.valueToText(row["parentTaskKey"]),
            enabled: this.valueToBoolean(row["enabled"], true),
        }));
    });

    readonly parsedRoles = computed((): Array<{ role: string; count: number }> => {
        const rows = this.parseJsonArray(this.template()?.defaultRolesJson);
        return rows.map((row) => ({
            role: this.valueToText(row["role"] ?? row["name"]) || "ROLE",
            count: Math.max(1, this.valueToNumber(row["count"], 1)),
        }));
    });

    readonly parsedConfigEntries = computed((): Array<{ key: string; value: string }> => {
        const config = this.parseJsonObject(this.template()?.defaultProjectConfigJson);
        if (!config) return [];
        return Object.entries(config).map(([key, value]) => ({
            key: this.humanizeKey(key),
            value: this.humanizeValue(value),
        }));
    });

    readonly parsedChecklistItems = computed(() => this.toStringItems(this.template()?.defaultChecklistJson));

    readonly parsedTeamRecommendation = computed((): Array<{ key: string; value: string }> => {
        const root = this.parseJson(this.template()?.teamRecommendationJson);
        if (!root) return [];

        if (Array.isArray(root)) {
            return root
                .map((entry, index) => ({
                    key: `Recommendation ${index + 1}`,
                    value: this.humanizeValue(entry),
                }))
                .filter((entry) => !!entry.value);
        }

        if (typeof root === "object") {
            return Object.entries(root as Record<string, unknown>).map(([key, value]) => ({
                key: this.humanizeKey(key),
                value: this.humanizeValue(value),
            }));
        }

        return [{ key: "Team Recommendation", value: this.humanizeValue(root) }];
    });

    readonly estimatedTaskHours = computed(() =>
        this.parsedTasks().reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0)
    );

    readonly phaseBlueprint = computed((): TemplatePhaseBlueprint[] => {
        const phases = this.parsedPhases();
        const milestones = this.parsedMilestones();
        const tasks = this.parsedTasks();

        const milestonesByKey = new Map(milestones.map((milestone) => [milestone.key, milestone]));
        const tasksByMilestone = new Map<string, TemplateTaskView[]>();

        for (const task of tasks) {
            if (!task.milestoneKey) continue;
            const list = tasksByMilestone.get(task.milestoneKey) || [];
            list.push(task);
            tasksByMilestone.set(task.milestoneKey, list);
        }

        return phases.map((phase) => {
            const phaseMilestones = milestones
                .filter((milestone) => milestone.phaseKey === phase.key)
                .sort((left, right) => (left.offsetDays ?? 0) - (right.offsetDays ?? 0))
                .map((milestone) => ({
                    ...milestone,
                    tasks: (tasksByMilestone.get(milestone.key) || [])
                        .slice()
                        .sort((left, right) => (left.startOffsetDays ?? 0) - (right.startOffsetDays ?? 0)),
                }));

            const looseTasks = tasks
                .filter((task) => task.phaseKey === phase.key && (!task.milestoneKey || !milestonesByKey.has(task.milestoneKey)))
                .sort((left, right) => (left.startOffsetDays ?? 0) - (right.startOffsetDays ?? 0));

            return { phase, milestones: phaseMilestones, looseTasks };
        });
    });

    readonly orphanMilestones = computed((): Array<TemplateMilestoneView & { tasks: TemplateTaskView[] }> => {
        const phaseKeys = new Set(this.parsedPhases().map((phase) => phase.key));
        const tasksByMilestone = new Map<string, TemplateTaskView[]>();

        for (const task of this.parsedTasks()) {
            if (!task.milestoneKey) continue;
            const list = tasksByMilestone.get(task.milestoneKey) || [];
            list.push(task);
            tasksByMilestone.set(task.milestoneKey, list);
        }

        return this.parsedMilestones()
            .filter((milestone) => !milestone.phaseKey || !phaseKeys.has(milestone.phaseKey))
            .map((milestone) => ({
                ...milestone,
                tasks: (tasksByMilestone.get(milestone.key) || []).slice(),
            }));
    });

    readonly unscopedTasks = computed(() =>
        this.parsedTasks().filter((task) => !task.phaseKey && !task.milestoneKey)
    );

    milestoneStatusLabel(status: string): string {
        const normalized = (status || "").toLowerCase();
        if (normalized === "done" || normalized === "completed") return "Completed";
        if (normalized === "in_progress") return "In Progress";
        if (normalized === "on_hold") return "On Hold";
        if (normalized === "cancelled") return "Cancelled";
        return normalized ? this.humanizeKey(normalized) : "Pending";
    }

    milestoneStatusColor(status: string): string {
        const normalized = (status || "").toLowerCase();
        if (normalized === "done" || normalized === "completed") return "#16a34a";
        if (normalized === "in_progress") return "#2563eb";
        if (normalized === "on_hold") return "#f59e0b";
        if (normalized === "cancelled") return "#dc2626";
        return "#64748b";
    }

    taskPriorityColor(priority: string): string {
        const normalized = (priority || "").toLowerCase();
        if (normalized === "high" || normalized === "urgent") return "#dc2626";
        if (normalized === "low") return "#2563eb";
        return "#b45309";
    }

    taskStatusLabel(status: string): string {
        const normalized = (status || "").toLowerCase();
        if (normalized === "done" || normalized === "completed") return "Done";
        if (normalized === "in_progress") return "In Progress";
        if (normalized === "on_hold") return "On Hold";
        if (normalized === "cancelled") return "Cancelled";
        return normalized ? this.humanizeKey(normalized) : "Todo";
    }

    private parseJson(rawJson?: string): unknown | null {
        if (!rawJson || !rawJson.trim()) return null;
        try {
            return JSON.parse(rawJson);
        } catch {
            return null;
        }
    }

    private parseJsonArray(rawJson?: string): Array<Record<string, unknown>> {
        const parsed = this.parseJson(rawJson);
        return Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
    }

    private parseJsonObject(rawJson?: string): Record<string, unknown> | null {
        const parsed = this.parseJson(rawJson);
        if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
            return null;
        }
        return parsed as Record<string, unknown>;
    }

    private valueToText(value: unknown): string | null {
        if (value === null || value === undefined) return null;
        const text = String(value).trim();
        return text ? text : null;
    }

    private valueToNumber(value: unknown, fallback: number): number {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    private valueToNullableNumber(value: unknown): number | null {
        if (value === null || value === undefined || String(value).trim() === "") {
            return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }

    private valueToBoolean(value: unknown, fallback: boolean): boolean {
        if (value === null || value === undefined) return fallback;
        if (typeof value === "boolean") return value;
        const normalized = String(value).trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
        return fallback;
    }

    private humanizeKey(value: string): string {
        return (value || "")
            .replace(/[_-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    private humanizeValue(value: unknown): string {
        if (value === null || value === undefined) return "-";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (typeof value === "number") return String(value);
        if (typeof value === "string") return value;

        if (Array.isArray(value)) {
            const preview = value.slice(0, 4).map((item) => this.humanizeValue(item)).filter(Boolean);
            return value.length > 4 ? `${preview.join(", ")} (+${value.length - 4} more)` : preview.join(", ");
        }

        if (typeof value === "object") {
            const entries = Object.entries(value as Record<string, unknown>)
                .slice(0, 3)
                .map(([key, item]) => `${this.humanizeKey(key)}: ${this.humanizeValue(item)}`);
            return entries.join(" | ");
        }

        return String(value);
    }

    private toStringItems(rawJson?: string): string[] {
        const parsed = this.parseJson(rawJson);
        if (!parsed) return [];

        if (Array.isArray(parsed)) {
            return parsed
                .map((entry, index) => {
                    if (typeof entry === "string") return entry;
                    if (entry && typeof entry === "object") {
                        const row = entry as Record<string, unknown>;
                        return this.valueToText(row["title"] ?? row["name"] ?? row["label"] ?? row["text"])
                            || this.humanizeValue(entry)
                            || `Checklist item ${index + 1}`;
                    }
                    return this.humanizeValue(entry);
                })
                .filter(Boolean);
        }

        if (typeof parsed === "object") {
            return Object.entries(parsed as Record<string, unknown>)
                .map(([key, value]) => `${this.humanizeKey(key)}: ${this.humanizeValue(value)}`)
                .filter(Boolean);
        }

        return [this.humanizeValue(parsed)];
    }

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const id = params.get("templateId") || "";
            if (!id) {
                this.error.set("Template not found.");
                this.loading.set(false);
                return;
            }
            this.templateId.set(id);
            this.loadTemplate(id);
        });
    }

    loadTemplate(id: string): void {
        this.loading.set(true);
        this.error.set("");
        this.templateService.getById(id).subscribe({
            next: (t) => {
                this.template.set(t);
                this.loading.set(false);
                this.loadUserRating(id);
                this.loadLineage(id);
                this.coverQuery = t.name || "";
                this.loadTemplateAnalytics(id);
                this.loadCoverSuggestions(this.coverQuery);
            },
            error: (err: HttpErrorResponse) => {
                this.error.set(err.message || "Template not found.");
                this.loading.set(false);
                this.lineage.set(null);
                this.templateAnalytics.set(null);
                this.coverSuggestions.set([]);
            },
        });
    }

    private loadLineage(id: string): void {
        this.lineageLoading.set(true);
        this.lineageError.set("");
        this.templateService.getLineage(id, 5).subscribe({
            next: (tree) => {
                this.lineage.set(tree);
                this.lineageLoading.set(false);
            },
            error: () => {
                this.lineage.set(null);
                this.lineageError.set("Unable to load template lineage.");
                this.lineageLoading.set(false);
            },
        });
    }

    loadTemplateAnalytics(id: string): void {
        if (!id) return;
        this.analyticsLoading.set(true);
        this.analyticsError.set("");

        this.templateService.getTemplateAnalytics(id).subscribe({
            next: (analytics) => {
                this.templateAnalytics.set(analytics);
                this.analyticsLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.templateAnalytics.set(null);
                this.analyticsLoading.set(false);
                this.analyticsError.set(error.message || "Unable to load template analytics.");
            },
        });
    }

    loadCoverSuggestions(query?: string): void {
        const q = (query || this.coverQuery || this.template()?.name || "").trim();
        if (!q) {
            this.coverSuggestions.set([]);
            this.coverSuggestionsError.set("Enter a keyword to search for cover suggestions.");
            this.coverProviderStatus.set(null);
            this.coverWarning.set("");
            return;
        }

        this.coverQuery = q;
        this.coverSuggestionsLoading.set(true);
        this.coverSuggestionsError.set("");
        this.coverWarning.set("");

        this.templateService.getCoverSuggestions(q, 8).subscribe({
            next: (response) => {
                this.coverSuggestions.set(response.items || []);
                this.coverProviderStatus.set(response.providerStatus || null);
                this.coverWarning.set(response.warning || "");
                this.coverSuggestionsLoading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.coverSuggestions.set([]);
                this.coverSuggestionsLoading.set(false);
                this.coverProviderStatus.set(null);
                this.coverWarning.set("");
                this.coverSuggestionsError.set(error.message || "Unable to load cover suggestions.");
            },
        });
    }

    private ratingStorageKey(templateId: string): string {
        const userId = this.authService.currentUser()?.id ?? "anon";
        return `template-rating-${userId}-${templateId}`;
    }

    private loadUserRating(templateId: string): void {
        const stored = localStorage.getItem(this.ratingStorageKey(templateId));
        if (stored) this.userRating.set(parseInt(stored, 10) || 0);
        else this.userRating.set(0);
    }

    statusLabel(status: string): string {
        switch (status) {
            case "DRAFT": return "Draft";
            case "PENDING_APPROVAL": return "Pending Approval";
            case "APPROVED": return "Approved";
            case "REJECTED": return "Rejected";
            default: return status;
        }
    }

    starsArray(rating: number): string[] {
        return [1, 2, 3, 4, 5].map(i => i <= Math.round(rating) ? "star" : "star_border");
    }

    rateTemplate(rating: number): void {
        if (this.userRating() > 0) return; // already voted
        const id = this.templateId();
        if (!id) return;
        this.templateService.rate(id, rating).subscribe({
            next: (updated) => {
                this.template.set({ ...this.template()!, rating: updated.rating, ratingCount: updated.ratingCount });
                this.userRating.set(rating);
                localStorage.setItem(this.ratingStorageKey(id), String(rating));
                this.snackBar.open(`Rated ${rating}/5 — thank you!`, "Close", { duration: 3000 });
            },
            error: () => this.snackBar.open("Failed to submit rating.", "Close", { duration: 3500 }),
        });
    }

    startEdit(): void {
        const t = this.template();
        if (!t) return;
        this.editName = t.name;
        this.editType = t.templateType;
        this.editEffort = t.estimatedEffort || "";
        this.editDifficulty = t.difficultyLevel || "";
        this.editDuration = t.estimatedDurationDays || null;
        this.editTags = t.tags || "";
        this.editDescription = t.useCaseDescription || "";
        this.editDefaultConfig = t.defaultProjectConfigJson || "";
        this.editPhases = t.defaultPhasesJson || "";
        this.editRoles = t.defaultRolesJson || "";
        this.editMilestones = t.defaultMilestonesJson || "";
        this.editTasks = t.defaultTasksJson || "";
        this.editMode.set(true);
    }

    cancelEdit(): void {
        this.editMode.set(false);
    }

    saveEdit(): void {
        if (this.saving()) return;

        // Reset errors
        this.editNameError = "";
        this.editPhasesError = "";
        this.editRolesError = "";
        this.editMilestonesError = "";
        this.editTasksError = "";
        this.editConfigError = "";

        // Validate name
        const name = this.editName.trim();
        if (!name) { this.editNameError = "Name is required."; return; }
        if (name.length < 3) { this.editNameError = "Name must be at least 3 characters."; return; }
        if (name.length > 150) { this.editNameError = "Name must be at most 150 characters."; return; }

        // Validate duration
        if (this.editDuration !== null && this.editDuration < 1) {
            this.snackBar.open("Duration must be at least 1 day.", "Close", { duration: 4000 });
            return;
        }

        // Validate JSON fields
        const jsonValidations: { value: string; label: string; setErr: (e: string) => void; expected: "object" | "array" }[] = [
            { value: this.editDefaultConfig.trim(), label: "Project Config JSON", setErr: (e) => { this.editConfigError = e; }, expected: "object" },
            { value: this.editPhases.trim(), label: "Phases JSON", setErr: (e) => { this.editPhasesError = e; }, expected: "array" },
            { value: this.editRoles.trim(), label: "Roles JSON", setErr: (e) => { this.editRolesError = e; }, expected: "array" },
            { value: this.editMilestones.trim(), label: "Milestones JSON", setErr: (e) => { this.editMilestonesError = e; }, expected: "array" },
            { value: this.editTasks.trim(), label: "Tasks JSON", setErr: (e) => { this.editTasksError = e; }, expected: "array" },
        ];
        for (const v of jsonValidations) {
            if (v.value) {
                try {
                    const parsed = JSON.parse(v.value);
                    if (v.expected === "array" && !Array.isArray(parsed)) {
                        v.setErr(`${v.label} must be a JSON array.`);
                        this.snackBar.open(`${v.label} must be a JSON array.`, "Close", { duration: 4500 });
                        return;
                    }
                    if (v.expected === "object" && (Array.isArray(parsed) || parsed === null || typeof parsed !== "object")) {
                        v.setErr(`${v.label} must be a JSON object.`);
                        this.snackBar.open(`${v.label} must be a JSON object.`, "Close", { duration: 4500 });
                        return;
                    }
                } catch {
                    v.setErr(`${v.label} is not valid JSON.`);
                    this.snackBar.open(`${v.label} is not valid JSON — check the format.`, "Close", { duration: 4500 });
                    return;
                }
            }
        }

        this.saving.set(true);
        const body: Record<string, unknown> = {
            name,
            templateType: this.editType,
        };
        if (this.editEffort) body["estimatedEffort"] = this.editEffort;
        if (this.editDifficulty) body["difficultyLevel"] = this.editDifficulty;
        if (this.editDuration && this.editDuration >= 1) body["estimatedDurationDays"] = this.editDuration;
        if (this.editTags.trim()) body["tags"] = this.editTags.trim();
        if (this.editDescription.trim()) body["useCaseDescription"] = this.editDescription.trim();
        if (this.editDefaultConfig.trim()) body["defaultProjectConfigJson"] = this.editDefaultConfig.trim();
        if (this.editPhases.trim()) body["defaultPhasesJson"] = this.editPhases.trim();
        if (this.editMilestones.trim()) body["defaultMilestonesJson"] = this.editMilestones.trim();
        if (this.editTasks.trim()) body["defaultTasksJson"] = this.editTasks.trim();
        if (this.editRoles.trim()) body["defaultRolesJson"] = this.editRoles.trim();

        this.templateService.update(this.templateId(), body).subscribe({
            next: (updated) => {
                this.template.set({ ...this.template()!, ...updated });
                this.editMode.set(false);
                this.saving.set(false);
                this.snackBar.open("Template updated.", "Close", { duration: 3000 });
            },
            error: () => {
                this.saving.set(false);
                this.snackBar.open("Failed to update template.", "Close", { duration: 3500 });
            },
        });
    }

    publishTemplate(): void {
        this.templateService.publish(this.templateId()).subscribe({
            next: (updated) => {
                this.template.set({ ...this.template()!, status: updated.status });
                this.snackBar.open("Template submitted for approval.", "Close", { duration: 3500 });
            },
            error: () => this.snackBar.open("Failed to publish template.", "Close", { duration: 3500 }),
        });
    }

    approveTemplate(): void {
        this.templateService.approve(this.templateId()).subscribe({
            next: (updated) => {
                this.template.set({ ...this.template()!, status: updated.status });
                this.snackBar.open("Template approved and published to Hub.", "Close", { duration: 3500 });
            },
            error: () => this.snackBar.open("Failed to approve template.", "Close", { duration: 3500 }),
        });
    }

    rejectTemplate(): void {
        const ref = this.dialog.open(RejectTemplateDialogComponent, { width: "480px", maxWidth: "95vw" });
        ref.afterClosed().subscribe((result?: { reason: string }) => {
            if (!result?.reason) return;
            this.templateService.reject(this.templateId(), result.reason).subscribe({
                next: (updated) => {
                    this.template.set({ ...this.template()!, status: updated.status, rejectionReason: updated.rejectionReason });
                    this.snackBar.open("Template rejected.", "Close", { duration: 3500 });
                },
                error: () => this.snackBar.open("Failed to reject template.", "Close", { duration: 3500 }),
            });
        });
    }

    forkTemplate(): void {
        this.templateService.fork(this.templateId()).subscribe({
            next: (forked) => {
                this.snackBar.open(`"${forked.name}" forked as DRAFT.`, "View", { duration: 4000 })
                    .onAction().subscribe(() => this.router.navigate(["/app/templates", forked.id]));
            },
            error: () => this.snackBar.open("Failed to fork template.", "Close", { duration: 3500 }),
        });
    }

    openUseTemplateDialog(): void {
        const ref = this.dialog.open(UseTemplateWizardDialogComponent, {
            width: "820px",
            maxWidth: "96vw",
            maxHeight: "90vh",
            data: { templateId: this.templateId(), template: this.template() },
        });
        ref.afterClosed().subscribe((result?: UseTemplateWizardResult) => {
            if (result?.projectId) {
                this.router.navigate(["/app/real-projects", result.workspaceId, result.projectId]);
            }
        });
    }

    openDeleteDialog(): void {
        const t = this.template();
        if (!t) return;
        const ref = this.dialog.open(TemplateDeleteConfirmDialogComponent, {
            width: "480px",
            maxWidth: "95vw",
            data: { templateName: t.name },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.templateService.delete(this.templateId()).subscribe({
                next: () => {
                    this.snackBar.open("Template archived.", "Close", { duration: 3500 });
                    this.backToTemplates();
                },
                error: () => this.snackBar.open("Failed to archive template.", "Close", { duration: 3500 }),
            });
        });
    }

    toggleFeatured(): void {
        const t = this.template();
        if (!t) return;
        this.templateService.setFeatured(t.id, !t.isFeatured).subscribe({
            next: (updated) => {
                this.template.set({ ...t, isFeatured: updated.isFeatured });
                this.snackBar.open(updated.isFeatured ? "Marked as Featured." : "Removed from Featured.", "Close", { duration: 2500 });
            },
            error: () => this.snackBar.open("Failed to update.", "Close", { duration: 3000 }),
        });
    }

    toggleTrending(): void {
        const t = this.template();
        if (!t) return;
        this.templateService.setTrending(t.id, !t.isTrending).subscribe({
            next: (updated) => {
                this.template.set({ ...t, isTrending: updated.isTrending });
                this.snackBar.open(updated.isTrending ? "Marked as Trending." : "Removed from Trending.", "Close", { duration: 2500 });
            },
            error: () => this.snackBar.open("Failed to update.", "Close", { duration: 3000 }),
        });
    }

    backToTemplates(): void {
        this.router.navigate(["/app/templates"]);
    }

    openLineageTemplate(templateId: string): void {
        if (!templateId) return;
        this.router.navigate(["/app/templates", templateId]);
    }
}
