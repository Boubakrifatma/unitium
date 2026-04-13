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
import { M2TemplateLineageNode, M2TemplateService, M2TemplateSummary } from "./m2-template.service";
import { TemplateDeleteConfirmDialogComponent } from "./template-delete-confirm-dialog.component";
import { AuthService } from "../../../auth/auth.service";
import { M2WorkspaceService } from "../m2-workspaces/m2-workspace.service";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "./use-template-wizard-dialog.component";
import { TemplateDnaViewerComponent } from "../../../components/template-dna-viewer/template-dna-viewer.component";

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
                                } @else {
                                    <!-- Phases — visual timeline -->
                                    <div class="mb-3">
                                        <p class="fw-medium small mb-2">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">account_tree</mat-icon>
                                            Phases
                                        </p>
                                        @if (parsedPhases().length > 0) {
                                            <div class="d-flex align-items-center flex-wrap gap-1">
                                                @for (phase of parsedPhases(); track $index) {
                                                    <div class="d-flex align-items-center">
                                                        <span style="background:rgba(99,102,241,0.12);color:#6366f1;padding:4px 10px;border-radius:20px;font-size:11px;white-space:nowrap;font-weight:500;border:1px solid rgba(99,102,241,0.25);">
                                                            {{ $index + 1 }}. {{ phase.name }}
                                                        </span>
                                                        @if ($index < parsedPhases().length - 1) {
                                                            <mat-icon style="font-size:14px;width:14px;height:14px;color:#94a3b8;flex-shrink:0;">chevron_right</mat-icon>
                                                        }
                                                    </div>
                                                }
                                            </div>
                                        } @else if (template()!.defaultPhasesJson) {
                                            <pre class="bg-light rounded p-2 small mb-0" style="white-space:pre-wrap;word-break:break-word;max-height:120px;overflow-y:auto;font-size:11px;">{{ template()!.defaultPhasesJson }}</pre>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                        }
                                    </div>
                                    <mat-divider class="mb-3"></mat-divider>

                                    <!-- Roles — chip display -->
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
                                                        {{ role.role || role.name }}
                                                        @if (role.count && role.count > 1) { <span style="opacity:0.7;">×{{ role.count }}</span> }
                                                    </span>
                                                }
                                            </div>
                                        } @else if (template()!.defaultRolesJson) {
                                            <pre class="bg-light rounded p-2 small mb-0" style="white-space:pre-wrap;word-break:break-word;max-height:120px;overflow-y:auto;font-size:11px;">{{ template()!.defaultRolesJson }}</pre>
                                        } @else {
                                            <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                        }
                                    </div>
                                    <mat-divider class="mb-3"></mat-divider>

                                    <!-- Remaining sections as raw JSON -->
                                    @for (section of rawStructureSections(); track section.label) {
                                        <div class="mb-3">
                                            <p class="fw-medium small mb-1">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">{{ section.icon }}</mat-icon>
                                                {{ section.label }}
                                            </p>
                                            @if (section.value) {
                                                <pre class="bg-light rounded p-2 small mb-0" style="white-space:pre-wrap;word-break:break-word;max-height:160px;overflow-y:auto;font-size:11px;">{{ section.value }}</pre>
                                            } @else {
                                                <p class="text-secondary small mb-0 fst-italic">Not configured</p>
                                            }
                                        </div>
                                        <mat-divider class="mb-3"></mat-divider>
                                    }
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
    readonly userRating = signal(0);
    hoverRating = 0;

    // Validation error messages for edit mode
    editNameError = "";
    editPhasesError = "";
    editRolesError = "";
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

    readonly isOwner = computed(() => this.template()?.createdBy === this.authService.currentUser()?.id);
    readonly isAdmin = computed(() => {
        const role = this.authService.currentUser()?.role;
        return role === "ADMIN" || role === "SUPER_ADMIN";
    });
    readonly canEdit = computed(() => this.isOwner() || this.isAdmin());

    readonly tagsArray = computed(() =>
        (this.template()?.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    );

    readonly structureSections = computed(() => {
        const t = this.template();
        if (!t) return [];
        return [
            { label: "Project Config", icon: "settings", value: t.defaultProjectConfigJson },
            { label: "Phases", icon: "account_tree", value: t.defaultPhasesJson },
            { label: "Milestones", icon: "flag", value: t.defaultMilestonesJson },
            { label: "Tasks", icon: "checklist", value: t.defaultTasksJson },
            { label: "Roles", icon: "group", value: t.defaultRolesJson },
            { label: "Checklist", icon: "playlist_add_check", value: t.defaultChecklistJson },
            { label: "Team Recommendation", icon: "groups", value: t.teamRecommendationJson },
        ];
    });

    // Visual: parsed phases for timeline rendering
    readonly parsedPhases = computed((): Array<{ name?: string }> => {
        const json = this.template()?.defaultPhasesJson;
        if (!json) return [];
        try { const a = JSON.parse(json); return Array.isArray(a) ? a as Array<{ name?: string }> : []; } catch { return []; }
    });

    // Visual: parsed roles for chip rendering
    readonly parsedRoles = computed((): Array<{ role?: string; name?: string; count?: number }> => {
        const json = this.template()?.defaultRolesJson;
        if (!json) return [];
        try { const a = JSON.parse(json); return Array.isArray(a) ? a as Array<{ role?: string; name?: string; count?: number }> : []; } catch { return []; }
    });

    // Raw JSON sections (all except phases & roles which are shown visually)
    readonly rawStructureSections = computed(() => {
        const t = this.template();
        if (!t) return [];
        return [
            { label: "Project Config", icon: "settings", value: t.defaultProjectConfigJson },
            { label: "Milestones", icon: "flag", value: t.defaultMilestonesJson },
            { label: "Tasks", icon: "checklist", value: t.defaultTasksJson },
            { label: "Checklist", icon: "playlist_add_check", value: t.defaultChecklistJson },
            { label: "Team Recommendation", icon: "groups", value: t.teamRecommendationJson },
        ];
    });

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
            },
            error: (err: HttpErrorResponse) => {
                this.error.set(err.message || "Template not found.");
                this.loading.set(false);
                this.lineage.set(null);
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
        const jsonValidations: { value: string; label: string; setErr: (e: string) => void }[] = [
            { value: this.editDefaultConfig.trim(), label: "Project Config JSON", setErr: (e) => { this.editConfigError = e; } },
            { value: this.editPhases.trim(), label: "Phases JSON", setErr: (e) => { this.editPhasesError = e; } },
            { value: this.editRoles.trim(), label: "Roles JSON", setErr: (e) => { this.editRolesError = e; } },
        ];
        for (const v of jsonValidations) {
            if (v.value) {
                try { JSON.parse(v.value); } catch {
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
