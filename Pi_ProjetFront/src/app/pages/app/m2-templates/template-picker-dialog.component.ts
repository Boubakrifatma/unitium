import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { M2TemplateService } from "./m2-template.service";

export interface TemplatePickerDialogData {
    workspaceId: string;
    workspaceName: string;
}

export interface TemplatePickerDialogResult {
    projectId: string;
    workspaceId: string;
}

interface PickerTemplate {
    id: string;
    name: string;
    type: string;
    difficulty?: string;
    effort?: string;
    durationDays?: number;
    rating: number;
    usageCount: number;
    useCaseDescription?: string;
    tags?: string;
    isFeatured: boolean;
    isTrending: boolean;
}

@Component({
    selector: "app-template-picker-dialog",
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatDialogModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatSnackBarModule,
    ],
    styles: [`
        .picker-row { padding:12px 20px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.05); transition:background .15s; }
        .picker-row:hover { background:rgba(0,0,0,0.025); }
        .picker-row-selected { background:rgba(99,102,241,0.07)!important; border-left:3px solid #6366f1; padding-left:17px; }
        .type-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
    `],
    template: `
        <!-- Header -->
        <div style="padding:20px 24px 14px; border-bottom:1px solid rgba(0,0,0,0.08); flex-shrink:0;">
            <div class="d-flex align-items-center gap-3 mb-3">
                <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <mat-icon class="material-icons-outlined text-theme">layers</mat-icon>
                </div>
                <div class="flex-grow-1">
                    <h4 class="mb-0">Start from Template</h4>
                    <p class="small text-secondary mb-0">
                        <mat-icon class="material-icons-outlined align-middle" style="font-size:12px;width:12px;height:12px;">workspaces</mat-icon>
                        {{ data.workspaceName }}
                    </p>
                </div>
                <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
            </div>
            <!-- Search + filter -->
            <div class="row gx-2">
                <div class="col">
                    <mat-form-field appearance="outline" class="w-100 inline-small">
                        <mat-label>Search templates</mat-label>
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput [(ngModel)]="searchText" placeholder="Name or tags..." (ngModelChange)="applyFilter()" />
                    </mat-form-field>
                </div>
                <div class="col-auto">
                    <mat-form-field appearance="outline" class="inline-small">
                        <mat-label>Type</mat-label>
                        <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilter()">
                            <mat-option value="">All</mat-option>
                            <mat-option value="SCRUM">Scrum</mat-option>
                            <mat-option value="KANBAN">Kanban</mat-option>
                            <mat-option value="WATERFALL">Waterfall</mat-option>
                            <mat-option value="CUSTOM">Custom</mat-option>
                        </mat-select>
                    </mat-form-field>
                </div>
            </div>
        </div>

        <!-- Template list -->
        <mat-dialog-content style="padding:0;max-height:340px;overflow-y:auto;flex:1 1 auto;">
            @if (loading()) {
                <div class="text-center py-5">
                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:36px;width:36px;height:36px;animation:spin 1s linear infinite;">cached</mat-icon>
                    <p class="text-secondary small mt-2 mb-0">Loading approved templates...</p>
                </div>
            } @else if (filtered().length === 0) {
                <div class="text-center py-5">
                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:40px;width:40px;height:40px;">layers</mat-icon>
                    <p class="text-secondary small mt-2 mb-0">No approved templates found.</p>
                    <p class="text-secondary small mb-0">Try adjusting the filter or check the Templates Hub.</p>
                </div>
            } @else {
                @for (t of filtered(); track t.id) {
                    <div class="picker-row" [class.picker-row-selected]="selected()?.id === t.id" (click)="select(t)">
                        <div class="d-flex align-items-center gap-3">
                            <div class="type-dot" [style.background]="typeColor(t.type)"></div>
                            <div class="flex-grow-1 overflow-hidden">
                                <div class="d-flex align-items-center gap-2">
                                    <p class="mb-0 fw-medium text-truncate" style="font-size:14px;">{{ t.name }}</p>
                                    @if (t.isTrending) { <span style="font-size:10px;">🔥</span> }
                                    @if (t.isFeatured && !t.isTrending) { <span style="font-size:10px;">⭐</span> }
                                </div>
                                <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
                                    <span class="badge badge-light" style="font-size:9px;">{{ t.type }}</span>
                                    @if (t.difficulty) { <span class="badge badge-light" style="font-size:9px;">{{ t.difficulty | titlecase }}</span> }
                                    @if (t.effort) { <span class="badge badge-light" style="font-size:9px;">{{ t.effort | titlecase }} effort</span> }
                                    @if (t.durationDays) { <span class="text-secondary" style="font-size:10px;">{{ t.durationDays }} days</span> }
                                    <span class="text-secondary ms-auto" style="font-size:10px;">{{ t.rating | number:'1.1-1' }} ★ · {{ t.usageCount }} uses</span>
                                </div>
                                @if (t.useCaseDescription) {
                                    <p class="text-secondary mb-0 mt-1" style="font-size:11px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;">{{ t.useCaseDescription }}</p>
                                }
                            </div>
                            @if (selected()?.id === t.id) {
                                <mat-icon style="color:#16a34a;flex-shrink:0;font-size:20px;width:20px;height:20px;">check_circle</mat-icon>
                            }
                        </div>
                    </div>
                }
            }
        </mat-dialog-content>

        <!-- Footer -->
        <div style="padding:16px 24px; border-top:1px solid rgba(0,0,0,0.08); flex-shrink:0;">
            @if (selected()) {
                <div class="d-flex align-items-center gap-2 mb-3 p-2 rounded" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);">
                    <mat-icon class="material-icons-outlined text-theme" style="font-size:16px;width:16px;height:16px;">layers</mat-icon>
                    <span class="small fw-medium flex-grow-1 text-truncate">{{ selected()!.name }}</span>
                    <button matIconButton style="width:24px;height:24px;" (click)="selected.set(null)">
                        <mat-icon style="font-size:14px;width:14px;height:14px;">close</mat-icon>
                    </button>
                </div>
                <mat-form-field appearance="outline" class="w-100 inline-small mb-0">
                    <mat-label>Project Name</mat-label>
                    <input matInput [(ngModel)]="projectName" placeholder="Leave blank to use template name" />
                    <mat-hint>Optional — defaults to template name</mat-hint>
                </mat-form-field>
            } @else {
                <p class="text-secondary small mb-0">
                    <mat-icon class="material-icons-outlined align-middle" style="font-size:14px;width:14px;height:14px;">touch_app</mat-icon>
                    Select a template above to continue.
                </p>
            }
            <div class="d-flex justify-content-end gap-2 mt-3">
                <button matButton (click)="close()">Cancel</button>
                <button matButton="filled" [disabled]="!selected() || creating()" (click)="submit()">
                    <mat-icon class="material-icons-outlined">rocket_launch</mat-icon>
                    {{ creating() ? "Creating..." : "Create Project" }}
                </button>
            </div>
        </div>
    `,
})
export class TemplatePickerDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<TemplatePickerDialogComponent>);
    readonly data = inject<TemplatePickerDialogData>(MAT_DIALOG_DATA);
    private readonly templateService = inject(M2TemplateService);
    private readonly snackBar = inject(MatSnackBar);

    readonly loading = signal(true);
    readonly selected = signal<PickerTemplate | null>(null);
    readonly creating = signal(false);
    readonly filtered = signal<PickerTemplate[]>([]);

    private allTemplates: PickerTemplate[] = [];
    searchText = "";
    filterType = "";
    projectName = "";

    ngOnInit(): void {
        this.templateService.getPublic(0, 200).subscribe({
            next: (page) => {
                this.allTemplates = (page.content || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    type: t.templateType,
                    difficulty: t.difficultyLevel,
                    effort: t.estimatedEffort,
                    durationDays: t.estimatedDurationDays,
                    rating: t.rating ?? 0,
                    usageCount: t.usageCount ?? 0,
                    useCaseDescription: t.useCaseDescription,
                    tags: t.tags,
                    isFeatured: t.isFeatured,
                    isTrending: t.isTrending,
                }));
                // Sort: trending first, then featured, then by usage
                this.allTemplates.sort((a, b) => {
                    if (a.isTrending && !b.isTrending) return -1;
                    if (!a.isTrending && b.isTrending) return 1;
                    if (a.isFeatured && !b.isFeatured) return -1;
                    if (!a.isFeatured && b.isFeatured) return 1;
                    return b.usageCount - a.usageCount;
                });
                this.filtered.set([...this.allTemplates]);
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    applyFilter(): void {
        let items = this.allTemplates;
        if (this.filterType) items = items.filter(t => t.type === this.filterType);
        if (this.searchText.trim()) {
            const q = this.searchText.toLowerCase();
            items = items.filter(t =>
                t.name.toLowerCase().includes(q) ||
                (t.tags || "").toLowerCase().includes(q) ||
                (t.useCaseDescription || "").toLowerCase().includes(q)
            );
        }
        this.filtered.set(items);
    }

    select(t: PickerTemplate): void {
        this.selected.set(t);
    }

    typeColor(type: string): string {
        const map: Record<string, string> = {
            SCRUM: "#6366f1", KANBAN: "#0ea5e9", WATERFALL: "#14b8a6", CUSTOM: "#f59e0b",
        };
        return map[type] || "#94a3b8";
    }

    submit(): void {
        const sel = this.selected();
        if (!sel || this.creating()) return;
        this.creating.set(true);
        this.templateService.createProjectFromTemplate(
            this.data.workspaceId,
            sel.id,
            this.projectName.trim() || undefined
        ).subscribe({
            next: (project: Record<string, unknown>) => {
                this.snackBar.open("Project created from template!", "View", { duration: 4000 });
                this.dialogRef.close({ projectId: project["id"] as string, workspaceId: this.data.workspaceId } as TemplatePickerDialogResult);
            },
            error: () => {
                this.creating.set(false);
                this.snackBar.open("Failed to create project from template.", "Close", { duration: 4000 });
            },
        });
    }

    close(): void { this.dialogRef.close(); }
}
