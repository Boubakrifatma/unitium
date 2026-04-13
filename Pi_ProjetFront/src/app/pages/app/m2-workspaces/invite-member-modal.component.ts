import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { AvailableOrgMember, WorkspaceMember } from "./models/workspace-member.model";
import { WorkspaceMemberService } from "./services/workspace-member.service";

interface InviteMemberModalData {
    workspaceId: string;
    orgType: string;
    currentUserWorkspaceRole: string;
    currentUserOrgRole: string;
}

@Component({
    selector: "app-invite-member-modal",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatTooltipModule,
    ],
    template: `
        <h3 mat-dialog-title class="d-flex align-items-center mb-0 pb-0">
            <div class="flex-grow-1">
                <div class="fw-semibold">Invite Member to Workspace</div>
                <div class="small text-secondary">{{ availableMembers().length }} available from your organization</div>
            </div>
            <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
        </h3>

        <mat-dialog-content class="mat-typography pt-2">
            @if (errorMessage()) {
            <div class="alert alert-danger small mb-3" role="alert">{{ errorMessage() }}</div>
            }

            <!-- Role Selection Section (Required) -->
            <div class="alert alert-info mb-3 d-flex align-items-start gap-2">
                <mat-icon class="material-icons-outlined mt-1">info</mat-icon>
                <div>
                    <p class="small mb-1 fw-medium">Step 1: Select the workspace role first</p>
                    <p class="small text-secondary mb-0">All selected members will be invited with this role.</p>
                </div>
            </div>

            <div class="role-selection-card mb-3">
                <mat-form-field appearance="outline" class="w-100 mb-0">
                    <mat-label>Assign Workspace Role *</mat-label>
                    <mat-icon matPrefix>security</mat-icon>
                    <mat-select [(ngModel)]="selectedRole" required>
                        @for (option of roleOptions(); track option.value) {
                        <mat-option [value]="option.value">{{ option.label }}</mat-option>
                        }
                    </mat-select>
                    @if (!selectedRole) {
                    <mat-hint>Role selection is required to proceed</mat-hint>
                    }
                </mat-form-field>
            </div>

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
                        @if (isMultiSelectMode()) {Multi-select mode enabled. Hover rows to reveal quick-pick icons.}
                        @else {Single-select mode. Click the icon to switch to bulk invites.}
                    </p>

                    @if (isMultiSelectMode() && filteredMembers().length > 0) {
                    <button matButton type="button" (click)="selectAllFiltered()">Select visible</button>
                    <button matButton type="button" (click)="clearSelection()">Clear</button>
                    }
                </div>

                <mat-form-field appearance="outline" class="w-100 mb-0">
                <mat-label>Search organization members</mat-label>
                <mat-icon matPrefix>search</mat-icon>
                    <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set(($event || '').toString())" placeholder="Type a name or email" />
                    @if (searchTerm()) {
                    <button mat-icon-button matSuffix (click)="searchTerm.set('')">
                        <mat-icon class="material-icons-outlined">close</mat-icon>
                    </button>
                    }
                </mat-form-field>
            </div>

            <div class="row gx-2 mb-3">
                <div class="col-12">
                    <div class="stat-card h-100 d-flex align-items-center justify-content-between px-3">
                        <div>
                            <p class="small text-secondary mb-0">Members on this page</p>
                            <p class="mb-0 fw-semibold">{{ filteredMembers().length }} available</p>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            @if (selectedCount() > 0) {
                            <span class="selected-pill">{{ selectedCount() }} selected</span>
                            }
                            <mat-icon class="material-icons-outlined text-theme">groups</mat-icon>
                        </div>
                    </div>
                </div>
            </div>

            @if (isLoading()) {
            <div class="empty-state">
                <mat-icon class="material-icons-outlined">hourglass_top</mat-icon>
                <p class="small text-secondary mb-0">Loading available members...</p>
            </div>
            } @else if (filteredMembers().length === 0 && availableMembers().length > 0) {
            <div class="empty-state">
                <mat-icon class="material-icons-outlined">search_off</mat-icon>
                <p class="small text-secondary mb-0">No members match your search.</p>
            </div>
            } @else if (availableMembers().length === 0) {
            <div class="empty-state">
                <mat-icon class="material-icons-outlined">done_all</mat-icon>
                <p class="small text-secondary mb-0">All organization members are already in this workspace.</p>
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
                    <span class="avatar avatar-40 rounded-circle align-middle me-2 bg-light-theme d-flex align-items-center justify-content-center">
                        @if (member.avatarUrl) {
                        <img class="w-100 h-100 rounded-circle" [src]="member.avatarUrl" [alt]="member.fullName" />
                        } @else {
                        <mat-icon class="material-icons-outlined">person</mat-icon>
                        }
                    </span>
                    <span class="align-middle d-inline-block flex-grow-1 text-start">
                        <p class="mb-1">{{ member.fullName }}</p>
                        <p class="small mb-0">{{ member.email }}</p>
                    </span>
                    <span class="d-flex align-items-center gap-2">
                        <span class="badge badge-light">{{ orgRoleLabel(member.orgRole) }}</span>
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
            <button matButton="filled" [disabled]="selectedCount() === 0 || !selectedRole || isSubmitting()" (click)="invite()" matTooltip="Select members and role above">
                @if (isSubmitting()) {Inviting...} 
                @else if (!selectedRole) {Select Role First} 
                @else {Invite {{ selectedCount() }} as {{ getRoleLabel(selectedRole) }}}
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

            .role-selection-card {
                border-left: 4px solid #0088ff;
                border-radius: 8px;
                padding: 12px;
                background: rgba(0, 136, 255, 0.04);
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
export class InviteMemberModalComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<InviteMemberModalComponent>);
    private readonly dialogData = inject(MAT_DIALOG_DATA, { optional: true }) as InviteMemberModalData | null;
    private readonly workspaceMemberService = inject(WorkspaceMemberService);
    private readonly snackBar = inject(MatSnackBar);

    @Input() workspaceId: string = "";
    @Input() orgType: string = "enterprise";
    @Input() currentUserWorkspaceRole: string = "";
    @Input() currentUserOrgRole: string = "";

    @Output() readonly memberAdded = new EventEmitter<WorkspaceMember>();

    readonly isLoading = signal(false);
    readonly isSubmitting = signal(false);
    readonly isMultiSelectMode = signal(false);
    readonly selectedUserIds = signal<number[]>([]);
    readonly availableMembers = signal<AvailableOrgMember[]>([]);
    readonly errorMessage = signal<string | null>(null);
    readonly searchTerm = signal("");

    selectedRole = "";

    readonly filteredMembers = computed(() => {
        const query = this.searchTerm().trim().toLowerCase();
        if (!query) {
            return this.availableMembers();
        }
        return this.availableMembers().filter((m) =>
            m.fullName.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
        );
    });

    readonly selectedCount = computed(() => this.selectedUserIds().length);

    readonly roleOptions = computed(() => {
        const base = this.normalizedOrgType() === "academic"
            ? [
                { value: "TA", label: "Teaching Assistant" },
                { value: "STUDENT", label: "Student" },
                { value: "VIEWER", label: "Viewer" },
            ]
            : [
                { value: "MANAGER", label: "Manager" },
                { value: "EMPLOYEE", label: "Employee" },
                { value: "VIEWER", label: "Viewer" },
            ];
        return base;
    });

    ngOnInit(): void {
        if (this.dialogData) {
            this.workspaceId = this.dialogData.workspaceId || this.workspaceId;
            this.orgType = this.dialogData.orgType || this.orgType;
            this.currentUserWorkspaceRole = this.dialogData.currentUserWorkspaceRole || this.currentUserWorkspaceRole;
            this.currentUserOrgRole = this.dialogData.currentUserOrgRole || this.currentUserOrgRole;
        }

        this.selectedRole = this.defaultRole();
        this.loadAvailableMembers();
    }

    invite(): void {
        const selectedIds = this.selectedUserIds();
        if (!selectedIds.length || !this.workspaceId) {
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set(null);

        const requests = selectedIds.map((userId) =>
            this.workspaceMemberService.addMember(this.workspaceId, userId, this.selectedRole).pipe(
                map((member) => ({ userId, member, error: null as string | null })),
                catchError((error) => of({ userId, member: null as WorkspaceMember | null, error: this.resolveHttpError(error) }))
            )
        );

        forkJoin(requests).subscribe({
            next: (results) => {
                const successful = results.filter((result) => result.member !== null);
                const failed = results.filter((result) => result.member === null);

                successful.forEach((result) => {
                    if (result.member) {
                        this.memberAdded.emit(result.member);
                    }
                });

                if (successful.length > 0) {
                    const successfulIds = new Set(successful.map((result) => result.userId));
                    this.availableMembers.update((rows) => rows.filter((row) => !successfulIds.has(row.userId)));
                }

                if (failed.length === 0) {
                    const label = successful.length === 1 ? "1 member invited" : `${successful.length} members invited`;
                    this.snackBar.open(`${label} successfully`, "Close", { duration: 3000 });
                    this.dialogRef.close(successful[0]?.member || true);
                    this.isSubmitting.set(false);
                    return;
                }

                const failedIds = failed.map((result) => result.userId);
                this.selectedUserIds.set(failedIds);

                const firstError = failed[0].error || "Failed to add member";
                const progress = `Invited ${successful.length}/${selectedIds.length}`;
                this.errorMessage.set(`${progress}. ${firstError}`);

                if (successful.length > 0) {
                    this.snackBar.open(`${progress}. Fix remaining errors to continue.`, "Close", { duration: 4200 });
                }

                this.isSubmitting.set(false);
            },
            error: (error) => {
                this.errorMessage.set(this.resolveHttpError(error));
                this.isSubmitting.set(false);
            },
        });
    }

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

        const selected = this.selectedUserIds();
        if (selected.includes(userId)) {
            this.selectedUserIds.set(selected.filter((id) => id !== userId));
            return;
        }
        this.selectedUserIds.set([...selected, userId]);
    }

    isSelected(userId: number): boolean {
        return this.selectedUserIds().includes(userId);
    }

    selectAllFiltered(): void {
        const visibleIds = this.filteredMembers().map((member) => member.userId);
        this.selectedUserIds.set(Array.from(new Set(visibleIds)));
    }

    clearSelection(): void {
        this.selectedUserIds.set([]);
    }

    close(): void {
        this.dialogRef.close();
    }

    private loadAvailableMembers(): void {
        if (!this.workspaceId) {
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.workspaceMemberService.getAvailableMembers(this.workspaceId).subscribe({
            next: (rows) => {
                this.availableMembers.set(rows || []);
                this.isLoading.set(false);
            },
            error: (error) => {
                const message = error?.error?.message || error?.message || "Failed to load available members";
                this.errorMessage.set(message);
                this.availableMembers.set([]);
                this.isLoading.set(false);
            },
        });
    }

    private normalizedOrgType(): string {
        return (this.orgType || "enterprise").toLowerCase();
    }

    private resolveHttpError(error: any): string {
        return error?.error?.message || error?.message || "Failed to add member";
    }

    private defaultRole(): string {
        return this.normalizedOrgType() === "academic" ? "STUDENT" : "EMPLOYEE";
    }

    orgRoleLabel(role: string): string {
        const normalized = (role || "").trim().toUpperCase();
        if (normalized === "ADMIN") {
            return "Org Admin";
        }
        if (normalized === "OWNER") {
            return "Owner";
        }
        if (normalized === "MEMBER") {
            return "Member";
        }
        return role || "Member";
    }

    getRoleLabel(roleValue: string): string {
        const found = this.roleOptions().find((opt) => opt.value === roleValue);
        return found ? found.label : roleValue;
    }
}
