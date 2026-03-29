import { CommonModule } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from "@angular/material/snack-bar";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { M2AvailableWorkspaceMember, M2ProjectService } from "./m2-project.service";

export interface ProjectAddMemberModalData {
    workspaceId: string;
    projectId: string;
    orgType?: string;
    members: M2AvailableWorkspaceMember[];
}

@Component({
    selector: "app-project-add-member-modal",
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatInputModule],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0 pb-0">
            <div class="flex-grow-1">
                <div class="fw-semibold">Add Project Member</div>
                <div class="small text-secondary">{{ availableMembers().length }} workspace members available</div>
            </div>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="mat-typography pt-2">
            @if (errorMessage()) {
            <div class="alert alert-danger small mb-3" role="alert">{{ errorMessage() }}</div>
            }

            <div class="invite-toolbar mb-3">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <button
                        matIconButton
                        class="mode-toggle"
                        [class.active]="isMultiSelectMode()"
                        (click)="toggleMultiSelectMode()"
                        title="Toggle multi-select mode">
                        <mat-icon class="material-icons-outlined">{{ isMultiSelectMode() ? "checklist" : "person_add" }}</mat-icon>
                    </button>
                    <p class="small mb-0 flex-grow-1 text-secondary">
                        @if (isMultiSelectMode()) { Multi-select enabled. Add several members at once. }
                        @else { Single-select mode. Click the icon to switch to bulk adds. }
                    </p>
                    @if (isMultiSelectMode() && filteredMembers().length > 0) {
                    <button matButton type="button" (click)="selectAllFiltered()">Select visible</button>
                    <button matButton type="button" (click)="clearSelection()">Clear</button>
                    }
                </div>

                <mat-form-field appearance="outline" class="w-100 mb-0">
                    <mat-label>Search workspace members</mat-label>
                    <mat-icon matPrefix>search</mat-icon>
                    <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set(($event || '').toString().trim())" placeholder="Type a name or email" />
                    @if (searchTerm()) {
                    <button mat-icon-button matSuffix (click)="searchTerm.set('')">
                        <mat-icon class="material-icons-outlined">close</mat-icon>
                    </button>
                    }
                </mat-form-field>
            </div>

            <div class="row gx-2 mb-3">
                <div class="col-12 col-md-7">
                    <mat-form-field appearance="outline" class="w-100 mb-0">
                        <mat-label>Project Role</mat-label>
                        <mat-select [(ngModel)]="selectedRole">
                            @for (option of roleOptions(); track option.value) {
                            <mat-option [value]="option.value">{{ option.label }}</mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                </div>
                <div class="col-12 col-md-5">
                    <div class="stat-card h-100 d-flex align-items-center justify-content-between px-3">
                        <div>
                            <p class="small text-secondary mb-0">Showing</p>
                            <p class="mb-0 fw-semibold">{{ filteredMembers().length }} members</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            @if (selectedCount() > 0) {
                            <span class="selected-pill">{{ selectedCount() }} selected</span>
                            }
                            <mat-icon class="material-icons-outlined text-theme">group_add</mat-icon>
                        </div>
                    </div>
                </div>
            </div>

            @if (filteredMembers().length === 0 && availableMembers().length > 0) {
            <div class="empty-state">
                <mat-icon class="material-icons-outlined">search_off</mat-icon>
                <p class="small text-secondary mb-0">No members match your search.</p>
            </div>
            } @else if (availableMembers().length === 0) {
            <div class="empty-state">
                <mat-icon class="material-icons-outlined">done_all</mat-icon>
                <p class="small text-secondary mb-0">All workspace members are already in this project.</p>
            </div>
            } @else {
            <div class="member-list">
                @for (member of filteredMembers(); track member.userId) {
                <button
                    type="button"
                    class="member-row d-flex align-items-center"
                    [class.selected]="isSelected(member.userId)"
                    [class.multi-mode]="isMultiSelectMode()"
                    (click)="toggleMemberSelection(member.userId)">
                    <span class="avatar avatar-40 rounded-circle align-middle me-2 bg-light-theme d-flex align-items-center justify-content-center overflow-hidden">
                        @if (member.avatarUrl) {
                        <img class="w-100 h-100 rounded-circle" [src]="member.avatarUrl" [alt]="member.fullName" (error)="$any($event.target).style.display='none'" />
                        } @else {
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                        }
                    </span>
                    <span class="align-middle d-inline-block flex-grow-1 text-start">
                        <p class="mb-1">{{ member.fullName }}</p>
                        <p class="small mb-0">{{ member.email }}</p>
                    </span>
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge badge-light">{{ member.workspaceRole || 'MEMBER' }}</span>
                        <span class="row-actions" [class.visible]="isSelected(member.userId)">
                            <mat-icon class="material-icons-outlined action-icon">{{ isSelected(member.userId) ? "check_circle" : "add_circle" }}</mat-icon>
                        </span>
                    </span>
                </button>
                }
            </div>
            }
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button matButton (click)="close()">Cancel</button>
            <button matButton="filled" [disabled]="selectedCount() === 0 || !selectedRole || isSubmitting()" (click)="submit()">
                @if (isSubmitting()) { Adding... }
                @else { Add {{ selectedCount() }} {{ selectedCount() === 1 ? "Member" : "Members" }} }
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .invite-toolbar {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 10px;
                background: linear-gradient(145deg, rgba(236, 247, 255, 0.7), rgba(255, 255, 255, 1));
            }

            .stat-card {
                border-radius: 12px;
                border: 1px solid rgba(0, 136, 255, 0.2);
                background: rgba(0, 136, 255, 0.06);
            }

            .mode-toggle {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                border: 1px solid rgba(0, 0, 0, 0.12);
                background: #fff;
            }

            .mode-toggle.active {
                border-color: rgba(0, 136, 255, 0.45);
                background: rgba(0, 136, 255, 0.08);
            }

            .selected-pill {
                display: inline-flex;
                align-items: center;
                border-radius: 999px;
                padding: 4px 10px;
                font-size: 12px;
                border: 1px solid rgba(0, 136, 255, 0.24);
                background: rgba(0, 136, 255, 0.1);
                color: #0367bb;
            }

            .member-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-height: 320px;
                overflow: auto;
                padding-right: 2px;
            }

            .member-row {
                width: 100%;
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 10px 12px;
                background: #fff;
                transition: all 0.2s ease;
            }

            .member-row:hover {
                border-color: rgba(0, 136, 255, 0.5);
                transform: translateY(-1px);
            }

            .member-row.selected {
                border-color: #0088ff;
                box-shadow: 0 0 0 2px rgba(0, 136, 255, 0.12);
                background: rgba(0, 136, 255, 0.04);
            }

            .member-row.multi-mode.selected {
                border-color: #00a86b;
                box-shadow: 0 0 0 2px rgba(0, 168, 107, 0.12);
                background: rgba(0, 168, 107, 0.05);
            }

            .row-actions {
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: translateX(6px);
                transition: all 0.2s ease;
            }

            .member-row:hover .row-actions,
            .row-actions.visible {
                opacity: 1;
                transform: translateX(0);
            }

            .action-icon {
                color: rgba(0, 0, 0, 0.45);
            }

            .member-row.selected .action-icon {
                color: #0088ff;
            }

            .member-row.multi-mode.selected .action-icon {
                color: #00a86b;
            }

            .empty-state {
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: center;
                border: 1px dashed rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                min-height: 80px;
            }
        `,
    ],
})
export class ProjectAddMemberModalComponent {
    private readonly dialogRef = inject(MatDialogRef<ProjectAddMemberModalComponent>);
    private readonly dialogData = inject(MAT_DIALOG_DATA) as ProjectAddMemberModalData;
    private readonly projectService = inject(M2ProjectService);
    private readonly snackBar = inject(MatSnackBar);

    readonly searchTerm = signal("");
    readonly isMultiSelectMode = signal(false);
    readonly selectedUserIds = signal<number[]>([]);
    readonly isSubmitting = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly availableMembers = signal<M2AvailableWorkspaceMember[]>(this.dialogData.members || []);

    readonly filteredMembers = computed(() => {
        const query = this.searchTerm().trim().toLowerCase();
        if (!query) return this.availableMembers();
        return this.availableMembers().filter(
            (m) => (m.fullName || "").toLowerCase().includes(query) || (m.email || "").toLowerCase().includes(query)
        );
    });

    readonly selectedCount = computed(() => this.selectedUserIds().length);

    readonly roleOptions = computed(() => {
        const academic = (this.dialogData?.orgType || "").toLowerCase() === "academic";
        if (academic) {
            return [
                { value: "PROFESSOR", label: "Professor" },
                { value: "DEVELOPER", label: "Developer" },
                { value: "REVIEWER", label: "Reviewer" },
                { value: "OBSERVER", label: "Observer" },
            ];
        }
        return [
            { value: "PROJECT_MANAGER", label: "Project Manager" },
            { value: "DEVELOPER", label: "Developer" },
            { value: "REVIEWER", label: "Reviewer" },
            { value: "OBSERVER", label: "Observer" },
        ];
    });

    selectedRole = this.defaultRole();

    toggleMultiSelectMode(): void {
        const next = !this.isMultiSelectMode();
        this.isMultiSelectMode.set(next);
        if (!next) {
            const first = this.selectedUserIds()[0];
            this.selectedUserIds.set(first ? [first] : []);
        }
    }

    toggleMemberSelection(userId: number): void {
        if (!this.isMultiSelectMode()) {
            this.selectedUserIds.set([userId]);
            return;
        }
        const current = this.selectedUserIds();
        if (current.includes(userId)) {
            this.selectedUserIds.set(current.filter((id) => id !== userId));
        } else {
            this.selectedUserIds.set([...current, userId]);
        }
    }

    isSelected(userId: number): boolean {
        return this.selectedUserIds().includes(userId);
    }

    selectAllFiltered(): void {
        const visibleIds = this.filteredMembers().map((m) => m.userId);
        this.selectedUserIds.set(Array.from(new Set(visibleIds)));
    }

    clearSelection(): void {
        this.selectedUserIds.set([]);
    }

    close(): void {
        this.dialogRef.close();
    }

    submit(): void {
        const ids = this.selectedUserIds();
        const role = this.selectedRole;
        const { workspaceId, projectId } = this.dialogData;

        if (!ids.length || !role || !workspaceId || !projectId) return;

        this.isSubmitting.set(true);
        this.errorMessage.set(null);

        const requests = ids.map((userId) =>
            this.projectService.addProjectMember(workspaceId, projectId, userId, role).pipe(
                map(() => ({ userId, error: null as string | null })),
                catchError((err) => of({ userId, error: this.resolveError(err) }))
            )
        );

        forkJoin(requests).subscribe({
            next: (results) => {
                const successful = results.filter((r) => r.error === null);
                const failed = results.filter((r) => r.error !== null);

                if (successful.length > 0) {
                    const successIds = new Set(successful.map((r) => r.userId));
                    this.availableMembers.update((rows) => rows.filter((row) => !successIds.has(row.userId)));
                }

                if (failed.length === 0) {
                    const label = successful.length === 1 ? "1 member added" : `${successful.length} members added`;
                    this.snackBar.open(`${label} successfully.`, "Close", { duration: 3000 });
                    this.dialogRef.close(true);
                    this.isSubmitting.set(false);
                    return;
                }

                this.selectedUserIds.set(failed.map((r) => r.userId));
                const progress = `Added ${successful.length}/${ids.length}`;
                const firstErr = failed[0].error || "Failed to add member";
                this.errorMessage.set(`${progress}. ${firstErr}`);

                if (successful.length > 0) {
                    this.snackBar.open(`${progress}. Fix remaining errors to continue.`, "Close", { duration: 4200 });
                }

                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.errorMessage.set(this.resolveError(err));
                this.isSubmitting.set(false);
            },
        });
    }

    private defaultRole(): string {
        const academic = (this.dialogData?.orgType || "").toLowerCase() === "academic";
        return academic ? "DEVELOPER" : "DEVELOPER";
    }

    private resolveError(error: unknown): string {
        const e = error as { error?: { message?: string }; message?: string };
        return e?.error?.message || e?.message || "Failed to add member";
    }
}
