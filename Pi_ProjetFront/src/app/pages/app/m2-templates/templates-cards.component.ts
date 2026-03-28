import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog } from "@angular/material/dialog";
import { M2TemplateService } from "./m2-template.service";
import { TemplateDeleteConfirmDialogComponent } from "./template-delete-confirm-dialog.component";
import { UseTemplateWizardDialogComponent, UseTemplateWizardResult } from "./use-template-wizard-dialog.component";

export interface TemplateCardItem {
    id: string;
    name: string;
    type: string;
    status: string;
    image: string;
    difficulty?: string;
    effort?: string;
    durationDays?: number;
    tags?: string;
    useCaseDescription?: string;
    rating: number;
    ratingCount: number;
    usageCount: number;
    isPublic: boolean;
    isFeatured: boolean;
    isTrending: boolean;
    createdBy: number;
}

@Component({
    selector: "app-templates-cards",
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatIconModule, MatButtonModule, MatMenuModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatTooltipModule, MatDividerModule, MatSnackBarModule,
    ],
    template: `
        <mat-card>
            <mat-card-header>
                <div class="w-100">
                    <div class="row gx-3 align-items-center">
                        <div class="col mb-3">
                            <h3 class="mb-1">{{ title }}</h3>
                        </div>
                        <div class="col-12 col-md-4 mb-3">
                            <mat-form-field appearance="outline" class="w-100 inline-small">
                                <mat-label>Search</mat-label>
                                <mat-icon matPrefix>search</mat-icon>
                                <input matInput placeholder="Search templates..." [(ngModel)]="searchText" (ngModelChange)="applyFilters()" />
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-auto mb-3">
                            <mat-form-field appearance="outline" class="inline-small">
                                <mat-label>Type</mat-label>
                                <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilters()">
                                    <mat-option value="">All Types</mat-option>
                                    <mat-option value="SCRUM">Scrum</mat-option>
                                    <mat-option value="KANBAN">Kanban</mat-option>
                                    <mat-option value="WATERFALL">Waterfall</mat-option>
                                    <mat-option value="CUSTOM">Custom</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-auto mb-3">
                            <mat-form-field appearance="outline" class="inline-small">
                                <mat-label>Status</mat-label>
                                <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
                                    <mat-option value="">All Status</mat-option>
                                    <mat-option value="DRAFT">Draft</mat-option>
                                    <mat-option value="PENDING_APPROVAL">Pending</mat-option>
                                    <mat-option value="APPROVED">Approved</mat-option>
                                    <mat-option value="REJECTED">Rejected</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                    </div>
                </div>
            </mat-card-header>
            <mat-card-content>
                @if (filteredItems().length === 0) {
                    <div class="text-center py-5">
                        <mat-icon class="material-icons-outlined text-secondary" style="font-size:48px;width:48px;height:48px;">layers</mat-icon>
                        <p class="text-secondary mt-2">No templates found.</p>
                    </div>
                } @else {
                    <div class="row gx-3 gy-3">
                        @for (item of filteredItems(); track item.id) {
                            <div class="col-12 col-md-6 col-xl-4">
                                <mat-card class="h-100 hoverview" style="cursor:pointer;" (click)="openTemplate(item)">
                                    <div class="position-relative coverimg rounded-top" style="height:120px;overflow:hidden;">
                                        <img [src]="item.image" [alt]="item.name" class="w-100 h-100" style="object-fit:cover;" />
                                        <mat-icon class="hoverview-icon bg-light-theme text-theme rounded circle avatar avatar-40 position-absolute start-0 top-0" style="display:flex;align-items:center;justify-content:center;margin:8px;">visibility</mat-icon>
                                        <!-- status badge top-right -->
                                        <span class="badge position-absolute top-0 end-0 m-2"
                                            [ngClass]="{
                                                'theme-green': item.status === 'APPROVED',
                                                'theme-orange': item.status === 'PENDING_APPROVAL',
                                                'theme-red': item.status === 'REJECTED'
                                            }">
                                            {{ statusLabel(item.status) }}
                                        </span>
                                    </div>
                                    <mat-card-content class="pt-2 pb-1">
                                        <div class="d-flex align-items-start justify-content-between mb-1">
                                            <h4 class="mb-0 text-truncate" style="max-width:75%;">{{ item.name }}</h4>
                                            <button matIconButton [matMenuTriggerFor]="cardMenu" (click)="$event.stopPropagation()" style="margin-top:-4px;">
                                                <mat-icon class="material-icons-outlined">more_vert</mat-icon>
                                            </button>
                                            <mat-menu #cardMenu="matMenu">
                                                <button mat-menu-item (click)="$event.stopPropagation(); openTemplate(item)">
                                                    <mat-icon class="material-icons-outlined">open_in_new</mat-icon>
                                                    <span>View Details</span>
                                                </button>
                                                @if (item.status === 'APPROVED' || (item.status === 'DRAFT' && item.createdBy === currentUserId)) {
                                                    <button mat-menu-item (click)="$event.stopPropagation(); useTemplate(item)">
                                                        <mat-icon class="material-icons-outlined">rocket_launch</mat-icon>
                                                        <span>Use Template</span>
                                                    </button>
                                                }
                                                <button mat-menu-item (click)="$event.stopPropagation(); forkTemplate(item)">
                                                    <mat-icon class="material-icons-outlined">fork_right</mat-icon>
                                                    <span>Fork</span>
                                                </button>
                                                @if (canEdit(item)) {
                                                    <mat-divider></mat-divider>
                                                    @if (item.status === 'DRAFT' && item.createdBy === currentUserId) {
                                                        <button mat-menu-item (click)="$event.stopPropagation(); publishTemplate(item)">
                                                            <mat-icon class="material-icons-outlined">publish</mat-icon>
                                                            <span>Publish</span>
                                                        </button>
                                                    }
                                                    <mat-divider></mat-divider>
                                                    <button mat-menu-item (click)="$event.stopPropagation(); deleteTemplate(item)">
                                                        <mat-icon class="material-icons-outlined theme-red">archive</mat-icon>
                                                        <span class="theme-red">Archive</span>
                                                    </button>
                                                }
                                            </mat-menu>
                                        </div>

                                        <!-- type + difficulty badges -->
                                        <div class="d-flex gap-1 flex-wrap mb-2">
                                            <span class="badge badge-light">{{ item.type }}</span>
                                            @if (item.difficulty) {
                                                <span class="badge"
                                                    [ngClass]="{
                                                        'theme-green': item.difficulty === 'BEGINNER',
                                                        'theme-orange': item.difficulty === 'INTERMEDIATE',
                                                        'theme-red': item.difficulty === 'ADVANCED'
                                                    }">
                                                    {{ item.difficulty | titlecase }}
                                                </span>
                                            }
                                            @if (item.effort) {
                                                <span class="badge badge-light">{{ item.effort | titlecase }} effort</span>
                                            }
                                        </div>

                                        <!-- description -->
                                        @if (item.useCaseDescription) {
                                            <p class="text-secondary small mb-2 text-truncated" style="-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;">{{ item.useCaseDescription }}</p>
                                        }

                                        <!-- rating + usage -->
                                        <div class="d-flex align-items-center gap-2 mb-1">
                                            <div class="d-flex align-items-center">
                                                @for (star of starsArray(item.rating); track $index) {
                                                    <mat-icon style="font-size:14px;width:14px;height:14px;color:#f59e0b;">{{ star }}</mat-icon>
                                                }
                                            </div>
                                            <span class="text-secondary small">{{ item.rating | number:'1.1-1' }} ({{ item.ratingCount }})</span>
                                            <span class="text-secondary small ms-auto">{{ item.usageCount }} uses</span>
                                        </div>

                                        <!-- duration + tags -->
                                        @if (item.durationDays) {
                                            <p class="text-secondary small mb-1">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">timer</mat-icon>
                                                {{ item.durationDays }} days est.
                                            </p>
                                        }
                                        @if (item.tags) {
                                            <p class="text-secondary small mb-0 text-truncate">
                                                <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">label</mat-icon>
                                                {{ item.tags }}
                                            </p>
                                        }
                                    </mat-card-content>

                                    <!-- Review mode: inline approve / reject -->
                                    @if (reviewMode) {
                                        <div class="px-3 pb-3">
                                            @if (rejectingId() === item.id) {
                                                <textarea
                                                    [(ngModel)]="rejectReason"
                                                    rows="2"
                                                    placeholder="Rejection reason (required)..."
                                                    class="w-100 mb-2"
                                                    style="resize:none;font-size:12px;border:1px solid rgba(0,0,0,0.2);border-radius:8px;padding:6px 10px;outline:none;">
                                                </textarea>
                                                <div class="d-flex gap-2">
                                                    <button matButton class="theme-red flex-grow-1" [disabled]="!rejectReason.trim()" (click)="submitReject(item)">
                                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">send</mat-icon>
                                                        Submit Rejection
                                                    </button>
                                                    <button matButton (click)="rejectingId.set('')">Cancel</button>
                                                </div>
                                            } @else {
                                                <div class="d-flex gap-2">
                                                    <button matButton style="background:#16a34a;color:white;flex:1;border-radius:8px;" (click)="approveCard(item, $event)">
                                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">check_circle</mat-icon>
                                                        Approve
                                                    </button>
                                                    <button matButton class="theme-red flex-grow-1" style="border:1px solid #dc3545;border-radius:8px;" (click)="startReject(item.id, $event)">
                                                        <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;">cancel</mat-icon>
                                                        Reject
                                                    </button>
                                                </div>
                                            }
                                        </div>
                                    }
                                </mat-card>
                            </div>
                        }
                    </div>
                }
            </mat-card-content>
        </mat-card>
    `,
})
export class TemplatesCardsComponent implements OnInit, OnChanges {
    @Input() templatesData: TemplateCardItem[] | null = null;
    @Input() currentUserId = 0;
    @Input() isAdmin = false;
    @Input() title = "Templates";
    /** When true, shows inline Approve / Reject actions instead of the action menu */
    @Input() reviewMode = false;
    /** Emitted after a successful approve or reject so the parent can refresh its data */
    @Output() dataChanged = new EventEmitter<void>();

    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);
    private readonly templateService = inject(M2TemplateService);

    searchText = "";
    filterType = "";
    filterStatus = "";

    private readonly externalData = signal<TemplateCardItem[]>([]);

    readonly filteredItems = computed(() => {
        let items = this.externalData();
        const q = this.searchText.toLowerCase();
        if (q) items = items.filter(t => t.name.toLowerCase().includes(q) || (t.tags || "").toLowerCase().includes(q) || (t.useCaseDescription || "").toLowerCase().includes(q));
        if (this.filterType) items = items.filter(t => t.type === this.filterType);
        if (this.filterStatus) items = items.filter(t => t.status === this.filterStatus);
        return items;
    });

    ngOnInit() {
        if (this.templatesData) this.externalData.set([...this.templatesData]);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["templatesData"] && this.templatesData) {
            this.externalData.set([...this.templatesData]);
        }
    }

    applyFilters() {
        // filteredItems is computed — triggers automatically on signal change
        // forcing re-evaluation by touching externalData via a new array ref is not needed
        // since searchText, filterType, filterStatus are plain properties, we need a workaround:
        this.externalData.set([...this.externalData()]);
    }

    statusLabel(status: string): string {
        switch (status) {
            case "DRAFT": return "Draft";
            case "PENDING_APPROVAL": return "Pending";
            case "APPROVED": return "Approved";
            case "REJECTED": return "Rejected";
            default: return status;
        }
    }

    starsArray(rating: number): string[] {
        const stars: string[] = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(i <= Math.round(rating) ? "star" : "star_border");
        }
        return stars;
    }

    canEdit(item: TemplateCardItem): boolean {
        return item.createdBy === this.currentUserId || this.isAdmin;
    }

    openTemplate(item: TemplateCardItem): void {
        this.router.navigate(["/app/templates", item.id]);
    }

    useTemplate(item: TemplateCardItem): void {
        const ref = this.dialog.open(UseTemplateWizardDialogComponent, {
            width: "820px", maxWidth: "96vw", maxHeight: "90vh", autoFocus: false,
            data: { templateId: item.id },
        });
        ref.afterClosed().subscribe((result?: UseTemplateWizardResult) => {
            if (result?.projectId && result?.workspaceId) {
                this.router.navigate(["/app/real-projects", result.workspaceId, result.projectId]);
            }
        });
    }

    forkTemplate(item: TemplateCardItem): void {
        this.templateService.fork(item.id).subscribe({
            next: (forked) => {
                this.snackBar.open(`"${forked.name}" forked as DRAFT in My Templates.`, "Close", { duration: 3500 });
            },
            error: () => this.snackBar.open("Failed to fork template.", "Close", { duration: 4000 }),
        });
    }

    publishTemplate(item: TemplateCardItem): void {
        this.templateService.publish(item.id).subscribe({
            next: (updated) => {
                this.snackBar.open(`"${updated.name}" submitted for approval.`, "Close", { duration: 3500 });
                const current = this.externalData();
                this.externalData.set(current.map(t => t.id === item.id ? { ...t, status: updated.status } : t));
            },
            error: () => this.snackBar.open("Failed to publish template.", "Close", { duration: 4000 }),
        });
    }

    // ── Review mode actions ──
    readonly rejectingId = signal("");
    rejectReason = "";

    approveCard(item: TemplateCardItem, event: Event): void {
        event.stopPropagation();
        this.templateService.approve(item.id).subscribe({
            next: () => {
                this.snackBar.open(`"${item.name}" approved and published to Hub.`, "Close", { duration: 3500 });
                this.externalData.set(this.externalData().filter(t => t.id !== item.id));
                this.dataChanged.emit();
            },
            error: () => this.snackBar.open("Failed to approve.", "Close", { duration: 4000 }),
        });
    }

    startReject(id: string, event: Event): void {
        event.stopPropagation();
        this.rejectingId.set(id);
        this.rejectReason = "";
    }

    submitReject(item: TemplateCardItem): void {
        if (!this.rejectReason.trim()) return;
        this.templateService.reject(item.id, this.rejectReason).subscribe({
            next: () => {
                this.snackBar.open(`"${item.name}" rejected.`, "Close", { duration: 3500 });
                this.externalData.set(this.externalData().filter(t => t.id !== item.id));
                this.rejectingId.set("");
                this.dataChanged.emit();
            },
            error: () => this.snackBar.open("Failed to reject.", "Close", { duration: 4000 }),
        });
    }

    deleteTemplate(item: TemplateCardItem): void {
        const ref = this.dialog.open(TemplateDeleteConfirmDialogComponent, {
            width: "480px",
            maxWidth: "95vw",
            data: { templateName: item.name },
        });
        ref.afterClosed().subscribe((result?: { confirmed: true }) => {
            if (!result?.confirmed) return;
            this.templateService.delete(item.id).subscribe({
                next: () => {
                    this.snackBar.open("Template archived and removed from view.", "Close", { duration: 3500 });
                    this.externalData.set(this.externalData().filter(t => t.id !== item.id));
                },
                error: () => this.snackBar.open("Failed to archive template.", "Close", { duration: 4000 }),
            });
        });
    }
}
