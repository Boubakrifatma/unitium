import { CommonModule } from "@angular/common";
import { Component, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { provideNativeDateAdapter } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { FormErrorMessageComponent, FormFieldError } from "../../../components/form-error-message.component";
import { M2ProjectService } from "./m2-project.service";
import { take } from "rxjs/operators";

export interface ProjectMemberCandidate {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl?: string;
    workspaceRole?: string;
}

export interface CreateProjectWorkflowDialogData {
    workspaceId: string;
    workspaceName: string;
    orgType?: string;
    members: ProjectMemberCandidate[];
}

export interface CreateProjectWorkflowDialogResult {
    payload: Record<string, unknown>;
    assignments: Array<{ userId: number; role: string }>;
    useTemplate?: boolean;
}

@Component({
    selector: "app-create-project-workflow-dialog",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        FormErrorMessageComponent,
    ],
    template: `
        <!-- Fixed header -->
        <div class="dialog-header">
            <div class="d-flex align-items-center px-4 pt-3 pb-2">
                <div class="flex-grow-1">
                    <h3 class="mb-0">Create Project</h3>
                    <p class="small text-secondary mb-0">{{ data.workspaceName }}</p>
                </div>
                <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
            </div>

            <!-- Step indicator -->
            <div class="step-track px-4 pb-3">
                @for (label of stepLabels; track $index) {
                    <div class="step-node" [class.node-active]="currentStep() === $index" [class.node-done]="currentStep() > $index">
                        <div class="step-circle">
                            @if (currentStep() > $index) {
                                <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;">check</mat-icon>
                            } @else {
                                {{ $index + 1 }}
                            }
                        </div>
                        <span class="step-label">{{ label }}</span>
                    </div>
                    @if ($index < stepLabels.length - 1) {
                        <div class="step-connector" [class.connector-done]="currentStep() > $index"></div>
                    }
                }
            </div>
        </div>

        <!-- Scrollable content -->
        <mat-dialog-content class="px-4 pt-3 pb-2">

            <!-- Step 0: Basics -->
            @if (currentStep() === 0) {
            <!-- Template shortcut banner -->
            <div class="d-flex align-items-center gap-3 px-3 py-2 mb-3 rounded-3"
                 style="cursor:pointer;border:1.5px dashed rgba(99,102,241,0.35);background:rgba(99,102,241,0.04);transition:all .15s;"
                 (click)="switchToTemplate()">
                <mat-icon class="material-icons-outlined" style="color:#6366f1;font-size:22px;width:22px;height:22px;flex-shrink:0;">layers</mat-icon>
                <div class="flex-grow-1">
                    <p class="small fw-medium mb-0" style="color:#6366f1;">Start from a Template</p>
                    <p class="text-secondary mb-0" style="font-size:11px;">Use an approved blueprint — pre-filled phases, roles &amp; tasks.</p>
                </div>
                <mat-icon class="material-icons-outlined text-secondary" style="font-size:16px;width:16px;height:16px;flex-shrink:0;">arrow_forward</mat-icon>
            </div>
            <form #basicsForm="ngForm">
                <div class="row gx-3">
                    <div class="col-12 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Project Name</mat-label>
                            <input
                                matInput
                                name="projectName"
                                [(ngModel)]="name"
                                (ngModelChange)="duplicateProjectError.set(null)"
                                required
                                minlength="3"
                                [maxlength]="nameMaxLength"
                                #nameCtrl="ngModel"
                                placeholder="Ex: AI Automation"
                                [disabled]="isDuplicateNameChecking()"
                            />
                            <mat-hint align="start">A clear, delivery-focused title.</mat-hint>
                            <mat-hint align="end">{{ name.length }}/{{ nameMaxLength }}</mat-hint>
                        </mat-form-field>
                        @if (isDuplicateNameChecking()) {
                            <p class="small text-secondary mb-2 mt-2" style="display:flex; gap:8px; align-items:center;">
                                <mat-icon class="material-icons-outlined" style="font-size:14px;width:14px;height:14px;animation:spin 1s linear infinite;">cached</mat-icon>
                                <span>Checking project name...</span>
                            </p>
                        }
                        <app-form-error-message [error]="getProjectNameError(nameCtrl)"></app-form-error-message>
                    </div>

                    <div class="col-12 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Description <span class="text-secondary">(optional)</span></mat-label>
                            <textarea matInput rows="3" name="description" [(ngModel)]="description" maxlength="500" placeholder="What is this project about?"></textarea>
                            <mat-hint align="end">{{ description.length }}/500</mat-hint>
                        </mat-form-field>
                    </div>

                    <div class="col-12 col-sm-6 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Visibility</mat-label>
                            <mat-select name="visibility" [(ngModel)]="visibility">
                                <mat-option value="PRIVATE">Private</mat-option>
                                <mat-option value="PUBLIC">Public</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>

                    <div class="col-12 col-sm-6 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Status</mat-label>
                            <mat-select name="status" [(ngModel)]="status">
                                <mat-option value="PLANNING">Planning</mat-option>
                                <mat-option value="ACTIVE">Active</mat-option>
                                <mat-option value="ON_HOLD">On Hold</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>
            </form>
            }

            <!-- Step 1: Schedule -->
            @if (currentStep() === 1) {
            <div class="row gx-3">
                <div class="col-12 col-sm-6 mb-3">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>Start Date</mat-label>
                        <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDateVal" name="startDate" placeholder="Pick a date" />
                        <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                        <mat-datepicker #startPicker></mat-datepicker>
                        <mat-hint>Optional — when the project begins</mat-hint>
                    </mat-form-field>
                </div>
                <div class="col-12 col-sm-6 mb-3">
                    <mat-form-field appearance="outline" class="w-100">
                        <mat-label>End Date</mat-label>
                        <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDateVal" name="endDate"
                               placeholder="Pick a date" [min]="startDateVal" />
                        <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                        <mat-datepicker #endPicker></mat-datepicker>
                        @if (dateRangeValid()) {
                            <mat-hint>Optional — project deadline</mat-hint>
                        } @else {
                            <mat-error>Must be on or after start date.</mat-error>
                        }
                    </mat-form-field>
                </div>
            </div>
            @if (!dateRangeValid()) {
            <div class="d-flex align-items-center gap-2 px-2 py-2 rounded" style="background:rgba(220,53,69,0.08);border:1px solid rgba(220,53,69,0.3);">
                <mat-icon class="material-icons-outlined" style="font-size:18px;width:18px;height:18px;color:#dc3545;flex-shrink:0">error_outline</mat-icon>
                <span class="small" style="color:#dc3545">End date must be the same as or after the start date.</span>
            </div>
            }
            }

            <!-- Step 2: Members -->
            @if (currentStep() === 2) {
            <div>
                <div class="invite-toolbar mb-3">
                    <mat-form-field appearance="outline" class="w-100 mb-0">
                        <mat-label>Search workspace members</mat-label>
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set(($event || '').toString())" placeholder="Type a name or email" />
                    </mat-form-field>
                </div>

                @if (filteredMembers().length === 0) {
                <div class="empty-state mb-3">
                    <mat-icon class="material-icons-outlined">search_off</mat-icon>
                    <p class="small text-secondary mb-0">No matching workspace members.</p>
                </div>
                } @else {
                <div class="member-list mb-3">
                    @for (member of filteredMembers(); track member.userId) {
                    <button type="button" class="member-row d-flex align-items-center" [class.selected]="isSelected(member.userId)" (click)="toggleMember(member.userId)">
                        <span class="avatar avatar-40 rounded-circle align-middle me-2 bg-light-theme d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0">
                            @if (member.avatarUrl) {
                            <img class="w-100 h-100 rounded-circle" [src]="member.avatarUrl" [alt]="member.fullName" />
                            } @else {
                            <mat-icon class="material-icons-outlined">person</mat-icon>
                            }
                        </span>
                        <span class="align-middle d-inline-block flex-grow-1 text-start overflow-hidden">
                            <p class="mb-0 text-truncate">{{ member.fullName }}</p>
                            <p class="small mb-0 text-truncate text-secondary">{{ member.email }}</p>
                        </span>
                        <span class="badge badge-light mx-2 flex-shrink-0">{{ member.workspaceRole || 'MEMBER' }}</span>
                        <mat-icon class="material-icons-outlined flex-shrink-0" [style.color]="isSelected(member.userId) ? '#0088ff' : 'transparent'" style="font-size:18px;width:18px;height:18px;">check_circle</mat-icon>
                    </button>
                    }
                </div>
                }

                @if (selectedMembers().length > 0) {
                <div class="selected-block">
                    <p class="small fw-medium mb-2">
                        <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:15px;width:15px;height:15px;">group</mat-icon>
                        {{ selectedMembers().length }} selected — assign roles
                    </p>
                    @for (member of selectedMembers(); track member.userId) {
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="flex-grow-1 small text-truncate">{{ member.fullName }}</span>
                        <mat-form-field appearance="outline" class="mb-0 flex-shrink-0" style="width:180px;">
                            <mat-label>Role</mat-label>
                            <mat-select [ngModel]="memberRole(member.userId)" (ngModelChange)="setMemberRole(member.userId, ($event || '').toString())">
                                @for (role of roleOptions(); track role.value) {
                                <mat-option [value]="role.value">{{ role.label }}</mat-option>
                                }
                            </mat-select>
                        </mat-form-field>
                    </div>
                    }
                </div>
                }
            </div>
            }

            <!-- Step 3: Review -->
            @if (currentStep() === 3) {
            <div class="review-card mb-3">
                <div class="summary-row"><span>Name</span><strong>{{ name.trim() }}</strong></div>
                <div class="summary-row"><span>Description</span>
                    <strong class="text-end" style="max-width:55%;">{{ description.trim() || '—' }}</strong>
                </div>
                <div class="summary-row"><span>Visibility</span><strong>{{ visibility }}</strong></div>
                <div class="summary-row"><span>Status</span><strong>{{ statusLabel(status) }}</strong></div>
                <div class="summary-row"><span>Start Date</span><strong>{{ formatDate(startDateVal) }}</strong></div>
                <div class="summary-row"><span>End Date</span><strong>{{ formatDate(endDateVal) }}</strong></div>
                <div class="summary-row"><span>Assigned Members</span><strong>{{ selectedMembers().length }}</strong></div>
            </div>
            @if (selectedMembers().length > 0) {
            <div class="review-members">
                <p class="small fw-medium mb-2">Member roles</p>
                @for (member of selectedMembers(); track member.userId) {
                <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="flex-grow-1 small text-truncate">{{ member.fullName }}</span>
                    <span class="badge badge-light">{{ memberRole(member.userId) }}</span>
                </div>
                }
            </div>
            }
            }

        </mat-dialog-content>

        <!-- Fixed footer — always visible -->
        <mat-dialog-actions align="end" class="px-4 pb-3 pt-2">
            @if (currentStep() === 0) {
                <button matButton (click)="close()">Cancel</button>
            }
            @if (currentStep() > 0) {
                <button matButton (click)="prevStep()">
                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back
                </button>
            }
            @if (currentStep() < 3) {
                <button matButton="filled" (click)="nextStep()" [disabled]="isDuplicateNameChecking() || !!duplicateProjectError() || (currentStep() === 1 && !dateRangeValid())">
                    Continue <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                </button>
            }
            @if (currentStep() === 3) {
                <button matButton="filled" (click)="submit()">
                    <mat-icon class="material-icons-outlined me-1">add_circle</mat-icon>
                    Create Project
                </button>
            }
        </mat-dialog-actions>
    `,
    styles: [
        `
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
            }

            .dialog-header {
                flex-shrink: 0;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                background: radial-gradient(circle at top right, rgba(0, 136, 255, 0.07), transparent 60%);
            }

            /* ── Step indicator ── */
            .step-track {
                display: flex;
                align-items: center;
            }

            .step-node {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .step-circle {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                border: 2px solid rgba(0, 0, 0, 0.18);
                color: rgba(0, 0, 0, 0.4);
                background: #fff;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }

            .step-label {
                font-size: 12px;
                color: rgba(0, 0, 0, 0.45);
                white-space: nowrap;
            }

            .step-node.node-active .step-circle {
                border-color: #0088ff;
                color: #0088ff;
                background: rgba(0, 136, 255, 0.08);
            }

            .step-node.node-active .step-label {
                color: #0088ff;
                font-weight: 600;
            }

            .step-node.node-done .step-circle {
                border-color: #16a34a;
                color: #fff;
                background: #16a34a;
            }

            .step-node.node-done .step-label {
                color: #16a34a;
            }

            .step-connector {
                flex: 1;
                height: 2px;
                background: rgba(0, 0, 0, 0.12);
                margin: 0 8px;
                min-width: 20px;
                transition: background 0.2s ease;
            }

            .step-connector.connector-done {
                background: #16a34a;
            }

            /* ── Member list ── */
            .invite-toolbar {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 10px;
                background: linear-gradient(145deg, rgba(236, 247, 255, 0.7), rgba(255, 255, 255, 1));
            }

            .member-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 260px;
                overflow-y: auto;
                padding-right: 2px;
            }

            .member-row {
                width: 100%;
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 10px;
                padding: 8px 10px;
                background: #fff;
                transition: all 0.15s ease;
                cursor: pointer;
            }

            .member-row:hover {
                border-color: rgba(0, 136, 255, 0.4);
                background: rgba(0, 136, 255, 0.02);
            }

            .member-row.selected {
                border-color: #0088ff;
                box-shadow: 0 0 0 2px rgba(0, 136, 255, 0.1);
                background: rgba(0, 136, 255, 0.04);
            }

            .selected-block {
                border-top: 1px dashed rgba(0, 0, 0, 0.12);
                padding-top: 12px;
            }

            /* ── Review ── */
            .review-card {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                overflow: hidden;
            }

            .review-members {
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-radius: 12px;
                padding: 12px 14px;
            }

            .summary-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            }

            .summary-row:last-child {
                border-bottom: 0;
            }

            .summary-row span {
                color: rgba(0, 0, 0, 0.5);
                font-size: 13px;
                flex-shrink: 0;
            }

            .summary-row strong {
                font-size: 13px;
                text-align: right;
            }

            /* ── Empty state ── */
            .empty-state {
                display: flex;
                gap: 8px;
                align-items: center;
                justify-content: center;
                border: 1px dashed rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                min-height: 70px;
            }
        `,
    ],
})
export class CreateProjectWorkflowDialogComponent {
    readonly dialogRef = inject(MatDialogRef<CreateProjectWorkflowDialogComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as CreateProjectWorkflowDialogData;
    readonly projectService = inject(M2ProjectService);

    @ViewChild("basicsForm") basicsForm?: NgForm;

    // Step state
    readonly currentStep = signal(0);
    readonly stepLabels = ["Basics", "Schedule", "Members", "Review"];

    // Form validation state
    readonly formSubmitAttempted = signal(false);
    readonly isDuplicateNameChecking = signal(false);
    readonly duplicateProjectError = signal<string | null>(null);

    // Form fields
    name = "";
    description = "";
    visibility: "PRIVATE" | "PUBLIC" = "PRIVATE";
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" = "PLANNING";
    startDateVal: Date | null = new Date();
    endDateVal: Date | null = null;

    readonly nameMaxLength = 150;

    // Member selection
    readonly searchTerm = signal("");
    readonly selectedUserIds = signal<number[]>([]);
    readonly rolesByUserId = signal<Record<number, string>>({});

    readonly filteredMembers = computed(() => {
        const query = this.searchTerm().trim().toLowerCase();
        if (!query) return this.data.members || [];
        return (this.data.members || []).filter(
            (m) => m.fullName.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
        );
    });

    readonly selectedMembers = computed(() => {
        const ids = new Set(this.selectedUserIds());
        return (this.data.members || []).filter((m) => ids.has(m.userId));
    });

    readonly dateRangeValid = computed(() => {
        if (!this.startDateVal || !this.endDateVal) return true;
        return this.startDateVal.getTime() <= this.endDateVal.getTime();
    });

    readonly roleOptions = computed(() => {
        const academic = (this.data.orgType || "").toLowerCase() === "academic";
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

    isBasicsValid(): boolean {
        return this.name.trim().length >= 3 && this.name.trim().length <= this.nameMaxLength;
    }

    nextStep(): void {
        if (this.currentStep() === 0) {
            this.formSubmitAttempted.set(true);
            this.basicsForm?.form.markAllAsTouched();
            if (this.basicsForm?.invalid) return;
            
            // Check for duplicate project name before advancing (async validation)
            const trimmedName = this.name.trim();
            if (trimmedName) {
                this.validateAndAdvance(trimmedName);
                return; // Don't advance here, wait for async validation
            }
        }
        if (this.currentStep() === 1 && !this.dateRangeValid()) return;
        this.currentStep.update((n) => n + 1);
    }

    private validateAndAdvance(name: string): void {
        this.isDuplicateNameChecking.set(true);
        this.duplicateProjectError.set(null);

        this.projectService
            .getProjects(this.data.workspaceId, 0, 1000)
            .pipe(take(1))
            .subscribe({
                next: (page) => {
                    const isDuplicate = (page.content || []).some(
                        (p) => p.name.trim().toLowerCase() === name.toLowerCase()
                    );
                    
                    if (isDuplicate) {
                        // Show error and block advancement
                        this.duplicateProjectError.set(
                            `A project named "${name}" already exists in this workspace.`
                        );
                        this.isDuplicateNameChecking.set(false);
                    } else {
                        // No duplicate found, safe to advance
                        this.duplicateProjectError.set(null);
                        this.isDuplicateNameChecking.set(false);
                        // Advance to next step
                        this.currentStep.update((n) => n + 1);
                    }
                },
                error: () => {
                    // If check fails, allow continuing to avoid blocking user completely
                    this.isDuplicateNameChecking.set(false);
                    this.duplicateProjectError.set(null);
                    this.currentStep.update((n) => n + 1);
                },
            });
    }

    prevStep(): void {
        this.currentStep.update((n) => n - 1);
    }

    isSelected(userId: number): boolean {
        return this.selectedUserIds().includes(userId);
    }

    toggleMember(userId: number): void {
        const selected = this.selectedUserIds();
        if (selected.includes(userId)) {
            this.selectedUserIds.set(selected.filter((id) => id !== userId));
            return;
        }
        this.selectedUserIds.set([...selected, userId]);
        const currentRoles = { ...this.rolesByUserId() };
        if (!currentRoles[userId]) {
            currentRoles[userId] = this.defaultRoleForMember(userId);
            this.rolesByUserId.set(currentRoles);
        }
    }

    memberRole(userId: number): string {
        return this.rolesByUserId()[userId] || this.defaultRoleForMember(userId);
    }

    setMemberRole(userId: number, role: string): void {
        this.rolesByUserId.set({ ...this.rolesByUserId(), [userId]: role });
    }

    formatDate(d: Date | null): string {
        if (!d) return "—";
        return d.toLocaleDateString();
    }

    statusLabel(status: string): string {
        const map: Record<string, string> = { PLANNING: "Planning", ACTIVE: "Active", ON_HOLD: "On Hold" };
        return map[status] || status;
    }

    submit(): void {
        if (!this.isBasicsValid()) return;

        const payload: Record<string, unknown> = {
            name: this.name.trim(),
            description: this.description.trim() || null,
            visibility: this.visibility,
            status: this.status,
        };

        if (this.startDateVal) payload["startDate"] = this.toDateStr(this.startDateVal);
        if (this.endDateVal) payload["endDate"] = this.toDateStr(this.endDateVal);

        const assignments = this.selectedMembers().map((m) => ({
            userId: m.userId,
            role: this.memberRole(m.userId),
        }));

        this.dialogRef.close({ payload, assignments } as CreateProjectWorkflowDialogResult);
    }

    switchToTemplate(): void {
        this.dialogRef.close({ useTemplate: true } as CreateProjectWorkflowDialogResult);
    }

    close(): void {
        this.dialogRef.close();
    }

    getProjectNameError(control: any): FormFieldError | null {
        // Only show validation errors if form was attempted to be submitted
        if (!this.formSubmitAttempted()) return null;
        
        // Check for duplicate name first (takes priority)
        if (this.duplicateProjectError()) {
            return {
                error: 'duplicate',
                message: this.duplicateProjectError() || 'Project name already exists',
                hint: 'Choose a different project name for this workspace'
            };
        }

        // Then check for standard validation errors
        if (!control.errors) return null;
        if (control.errors['required']) {
            return {
                error: 'required',
                message: 'Project name is required.',
                hint: 'Enter a descriptive project name'
            };
        }
        if (control.errors['minlength']) {
            return {
                error: 'minlength',
                message: 'Name must be at least 3 characters.',
                hint: 'Use a clear, delivery-focused title (min 3 characters)'
            };
        }
        return null;
    }

    private toDateStr(d: Date): string {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${mo}-${day}`;
    }

    private defaultRoleForMember(userId: number): string {
        const member = (this.data.members || []).find((row) => row.userId === userId);
        const workspaceRole = (member?.workspaceRole || "").toUpperCase();
        const academic = (this.data.orgType || "").toLowerCase() === "academic";
        if (academic) return workspaceRole === "TA" ? "PROFESSOR" : "DEVELOPER";
        return workspaceRole === "OWNER" || workspaceRole === "ADMIN" || workspaceRole === "MANAGER" ? "PROJECT_MANAGER" : "DEVELOPER";
    }
}
