import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { provideNativeDateAdapter } from "@angular/material/core";
import { Router } from "@angular/router";
import { forkJoin, of, from } from "rxjs";
import { catchError, concatMap, toArray } from "rxjs/operators";
import { M2TemplateService, M2TemplateSummary } from "./m2-template.service";
import { M2WorkspaceService, M2Workspace, M2WorkspaceMember } from "../m2-workspaces/m2-workspace.service";
import { M2ProjectService } from "../m2-projects/m2-project.service";
import { AuthService } from "../../../auth/auth.service";

export interface UseTemplateWizardData {
    templateId?: string;
    template?: M2TemplateSummary;
    workspaceId?: string;
    workspaceName?: string;
}

export interface UseTemplateWizardResult {
    projectId: string;
    workspaceId: string;
}

type StepKey = "pick" | "setup" | "phases" | "team" | "tasks" | "review";

interface ParsedPhase {
    id: string;
    name: string;
    description?: string;
    durationDays: number;
    order: number;
    enabled: boolean;
}

interface RoleSlot { userId: number | null; userName?: string; }

interface ParsedRole {
    id: string;
    role: string;
    label: string;
    description?: string;
    count: number;
    slots: RoleSlot[];
    icon: string;
    projectRole: string;
    color: string;
}

interface ParsedTask {
    id: string;
    title: string;
    description?: string;
    phase?: string;
    priority: string;
    estimatedHours?: number;
    selected: boolean;
}

const PHASE_COLORS = ["#6366f1","#0ea5e9","#14b8a6","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#84cc16"];

function roleIcon(role: string): string {
    const r = role.toLowerCase();
    if (r.includes("scrum")) return "manage_accounts";
    if (r.includes("product")) return "person_pin";
    if (r.includes("developer") || r.includes("dev")) return "code";
    if (r.includes("qa") || r.includes("test")) return "bug_report";
    if (r.includes("design")) return "palette";
    if (r.includes("devops") || r.includes("cloud")) return "cloud";
    if (r.includes("analyst")) return "analytics";
    if (r.includes("manager")) return "assignment_ind";
    if (r.includes("lead") || r.includes("architect")) return "engineering";
    if (r.includes("kanban")) return "view_kanban";
    if (r.includes("reviewer")) return "rate_review";
    return "person";
}

function roleColor(role: string): string {
    const r = role.toLowerCase();
    if (r.includes("scrum") || r.includes("lead")) return "#6366f1";
    if (r.includes("product") || r.includes("owner")) return "#8b5cf6";
    if (r.includes("developer") || r.includes("dev")) return "#0ea5e9";
    if (r.includes("qa") || r.includes("test")) return "#f59e0b";
    if (r.includes("design")) return "#ec4899";
    if (r.includes("devops")) return "#14b8a6";
    return "#64748b";
}

function mapToProjectRole(role: string): string {
    const r = role.toLowerCase().replace(/[_-]/g, " ");
    if (r.includes("scrum")) return "SCRUM_MASTER";
    if (r.includes("product owner")) return "PRODUCT_OWNER";
    if (r.includes("developer") || r.includes("dev") || r.includes("engineer") || r.includes("programmer")) return "DEVELOPER";
    if (r.includes("qa") || r.includes("tester") || r.includes("quality")) return "TESTER";
    if (r.includes("design")) return "DESIGNER";
    if (r.includes("devops")) return "DEVOPS";
    if (r.includes("analyst")) return "BUSINESS_ANALYST";
    if (r.includes("tech lead") || r.includes("technical") || r.includes("architect")) return "TECH_LEAD";
    if (r.includes("manager")) return "PROJECT_MANAGER";
    if (r.includes("owner")) return "PRODUCT_OWNER";
    if (r.includes("reviewer") || r.includes("kanban")) return "DEVELOPER";
    return "DEVELOPER";
}

function priorityColor(p: string): string {
    if (p === "HIGH") return "#ef4444";
    if (p === "MEDIUM") return "#f59e0b";
    return "#22c55e";
}

function safeParse(json?: string | null): unknown[] {
    if (!json) return [];
    try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

@Component({
    selector: "app-use-template-wizard-dialog",
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [
        CommonModule, FormsModule, MatDialogModule, MatButtonModule,
        MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatSnackBarModule, MatTooltipModule, MatDividerModule, MatDatepickerModule,
    ],
    styles: [`
        :host { display:flex; flex-direction:column; height:100%; }
        .wiz-header { padding:20px 24px 0; flex-shrink:0; border-bottom:1px solid rgba(0,0,0,0.07); }
        .wiz-content { flex:1 1 auto; overflow-y:auto; padding:20px 24px; }
        .wiz-footer { padding:14px 24px; border-top:1px solid rgba(0,0,0,0.07); flex-shrink:0; display:flex; align-items:center; gap:10px; }
        /* Step track */
        .step-track { display:flex; align-items:flex-start; padding-bottom:16px; overflow-x:auto; }
        .step-node { display:flex; flex-direction:column; align-items:center; gap:4px; flex-shrink:0; }
        .step-circle { width:30px; height:30px; border-radius:50%; border:2px solid #cbd5e1; background:#fff; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; transition:all .2s; }
        .step-label { font-size:10px; color:#94a3b8; white-space:nowrap; max-width:64px; text-align:center; line-height:1.2; }
        .node-active .step-circle { border-color:#6366f1; background:#6366f1; color:#fff; box-shadow:0 0 0 3px rgba(99,102,241,0.18); }
        .node-active .step-label { color:#6366f1; font-weight:600; }
        .node-done .step-circle { border-color:#22c55e; background:#22c55e; color:#fff; }
        .node-done .step-label { color:#22c55e; }
        .step-connector { flex:1; height:2px; background:#e2e8f0; margin:0 4px; margin-top:14px; min-width:12px; }
        .connector-done { background:#22c55e; }
        /* Template picker */
        .tpl-row { padding:10px 14px; cursor:pointer; border-bottom:1px solid rgba(0,0,0,0.05); transition:background .12s; display:flex; align-items:center; gap:12px; }
        .tpl-row:hover { background:rgba(0,0,0,0.025); }
        .tpl-row-selected { background:rgba(99,102,241,0.07)!important; border-left:3px solid #6366f1; padding-left:11px; }
        .type-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        /* Phases */
        .phase-card { border:2px solid rgba(0,0,0,0.08); border-radius:12px; padding:14px 16px; margin-bottom:10px; transition:all .15s; position:relative; }
        .phase-card.enabled { border-color:rgba(99,102,241,0.25); }
        .phase-badge { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
        /* Roles */
        .role-card { border:1.5px solid rgba(0,0,0,0.08); border-radius:12px; padding:14px; margin-bottom:12px; }
        .role-icon-wrap { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .slot-row { display:flex; align-items:center; gap:8px; margin-top:8px; padding:6px 8px; background:rgba(0,0,0,0.025); border-radius:8px; }
        /* Tasks */
        .task-group-header { padding:6px 0 4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#64748b; border-bottom:1px solid rgba(0,0,0,0.06); margin-bottom:4px; }
        .task-row { padding:8px 4px; border-bottom:1px solid rgba(0,0,0,0.04); display:flex; align-items:center; gap:10px; cursor:pointer; transition:background .1s; border-radius:6px; }
        .task-row:hover { background:rgba(0,0,0,0.025); }
        .priority-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        /* Review */
        .review-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:500px) { .review-grid { grid-template-columns:1fr; } }
        .review-card { border:1.5px solid rgba(0,0,0,0.1); border-radius:14px; padding:16px; }
        .review-metric { font-size:28px; font-weight:800; color:#6366f1; line-height:1; }
        /* Timeline bar */
        .timeline-bar { display:flex; height:8px; border-radius:4px; overflow:hidden; gap:2px; margin-top:14px; }
        .timeline-seg { border-radius:3px; transition:all .2s; }
    `],
    template: `
        <!-- ── Fixed Header ── -->
        <div class="wiz-header">
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="d-flex align-items-center gap-3">
                    <div style="width:40px;height:40px;border-radius:12px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <mat-icon class="material-icons-outlined text-theme">rocket_launch</mat-icon>
                    </div>
                    <div>
                        <h4 class="mb-0">Use Template</h4>
                        <p class="small text-secondary mb-0">{{ currentStep() === 'pick' ? 'Choose an approved template' : (template()?.name || 'Loading template...') }}</p>
                    </div>
                </div>
                <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
            </div>

            <!-- Step indicator -->
            @if (!loadingTemplate()) {
                <div class="step-track">
                    @for (step of activeSteps(); track step; let i = $index) {
                        @if (i > 0) {
                            <div class="step-connector" [class.connector-done]="activeStepIndex() > i"></div>
                        }
                        <div class="step-node"
                             [class.node-active]="activeStepIndex() === i"
                             [class.node-done]="activeStepIndex() > i">
                            <div class="step-circle">
                                @if (activeStepIndex() > i) {
                                    <mat-icon style="font-size:14px;width:14px;height:14px;">check</mat-icon>
                                } @else { {{ i + 1 }} }
                            </div>
                            <span class="step-label">{{ stepLabel(step) }}</span>
                        </div>
                    }
                </div>
            }
        </div>

        <!-- ── Scrollable Content ── -->
        <div class="wiz-content">

            @if (loadingTemplate()) {
                <div class="text-center py-5">
                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:40px;width:40px;height:40px;animation:spin 1s linear infinite;">cached</mat-icon>
                    <p class="text-secondary mt-2 mb-0">Loading template...</p>
                </div>
            } @else {

            <!-- ═══════════════════════════ STEP: PICK ═══════════════════════════ -->
            @if (currentStep() === 'pick') {
                <p class="small text-secondary mb-3">Choose an approved template to start your project from.</p>
                <!-- Search + filter -->
                <div class="row gx-2 mb-3">
                    <div class="col">
                        <mat-form-field appearance="outline" class="w-100 inline-small">
                            <mat-label>Search templates</mat-label>
                            <mat-icon matPrefix>search</mat-icon>
                            <input matInput [(ngModel)]="pickSearch" placeholder="Name or tags..." (ngModelChange)="applyPickFilter()" />
                        </mat-form-field>
                    </div>
                    <div class="col-auto">
                        <mat-form-field appearance="outline" class="inline-small">
                            <mat-label>Type</mat-label>
                            <mat-select [(ngModel)]="pickType" (ngModelChange)="applyPickFilter()">
                                <mat-option value="">All</mat-option>
                                <mat-option value="SCRUM">Scrum</mat-option>
                                <mat-option value="KANBAN">Kanban</mat-option>
                                <mat-option value="WATERFALL">Waterfall</mat-option>
                                <mat-option value="CUSTOM">Custom</mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>
                <!-- Template list -->
                <div style="border:1px solid rgba(0,0,0,0.08);border-radius:10px;overflow:hidden;max-height:300px;overflow-y:auto;">
                    @if (loadingPick()) {
                        <div class="text-center py-4">
                            <mat-icon class="material-icons-outlined text-secondary" style="animation:spin 1s linear infinite;">cached</mat-icon>
                        </div>
                    } @else if (filteredPick().length === 0) {
                        <div class="text-center py-4">
                            <mat-icon class="material-icons-outlined text-secondary">layers</mat-icon>
                            <p class="text-secondary small mt-1 mb-0">No approved templates found.</p>
                        </div>
                    } @else {
                        @for (t of filteredPick(); track t.id) {
                            <div class="tpl-row" [class.tpl-row-selected]="selectedPickId() === t.id" (click)="pickTemplate(t)">
                                <div class="type-dot" [style.background]="typeColor(t.templateType)"></div>
                                <div class="flex-grow-1 overflow-hidden">
                                    <div class="d-flex align-items-center gap-2">
                                        <p class="mb-0 fw-medium text-truncate" style="font-size:13px;">{{ t.name }}</p>
                                        @if (t.isTrending) { <span style="font-size:10px;">🔥</span> }
                                        @if (t.isFeatured && !t.isTrending) { <span style="font-size:10px;">⭐</span> }
                                    </div>
                                    <div class="d-flex align-items-center gap-2 mt-1">
                                        <span class="badge badge-light" style="font-size:9px;">{{ t.templateType }}</span>
                                        @if (t.estimatedDurationDays) { <span class="text-secondary" style="font-size:10px;">{{ t.estimatedDurationDays }}d</span> }
                                        <span class="text-secondary ms-auto" style="font-size:10px;">{{ t.rating | number:'1.1-1' }} ★ · {{ t.usageCount }} uses</span>
                                    </div>
                                </div>
                                @if (selectedPickId() === t.id) {
                                    <mat-icon style="color:#22c55e;font-size:18px;width:18px;height:18px;flex-shrink:0;">check_circle</mat-icon>
                                }
                            </div>
                        }
                    }
                </div>
            }

            <!-- ═══════════════════════════ STEP: SETUP ═══════════════════════════ -->
            @if (currentStep() === 'setup') {
                <!-- Template banner -->
                @if (template()) {
                    <div class="d-flex align-items-center gap-3 mb-4 p-3 rounded-3" style="background:rgba(99,102,241,0.05);border:1.5px solid rgba(99,102,241,0.15);">
                        <div style="width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;"
                             [style.background]="typeColor(template()!.templateType) + '22'">
                            <mat-icon class="material-icons-outlined" [style.color]="typeColor(template()!.templateType)">layers</mat-icon>
                        </div>
                        <div class="flex-grow-1 overflow-hidden">
                            <div class="d-flex align-items-center gap-2">
                                <p class="fw-medium mb-0 text-truncate">{{ template()!.name }}</p>
                                <span class="badge badge-light" style="font-size:10px;">{{ template()!.templateType }}</span>
                                @if (template()!.estimatedDurationDays) {
                                    <span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1;font-size:10px;">{{ template()!.estimatedDurationDays }}d est.</span>
                                }
                            </div>
                            @if (template()!.useCaseDescription) {
                                <p class="text-secondary small mb-0 mt-1 text-truncate">{{ template()!.useCaseDescription }}</p>
                            }
                        </div>
                        <div class="text-end flex-shrink-0">
                            <p class="small fw-medium mb-0" style="color:#f59e0b;">{{ template()!.rating | number:'1.1-1' }} ★</p>
                            <p class="text-secondary" style="font-size:10px;margin-bottom:0;">{{ template()!.usageCount }} uses</p>
                        </div>
                    </div>
                }

                <!-- Workspace selector (only if not pre-set) -->
                @if (!data.workspaceId) {
                    <mat-form-field appearance="outline" class="w-100 mb-3">
                        <mat-label>Workspace *</mat-label>
                        <mat-icon matPrefix class="material-icons-outlined">workspaces</mat-icon>
                        <mat-select [(ngModel)]="selectedWorkspaceId" (ngModelChange)="onWorkspaceChange()">
                            @for (ws of workspaces(); track ws.id) {
                                <mat-option [value]="ws.id">{{ ws.name }}</mat-option>
                            }
                        </mat-select>
                        @if (workspaces().length === 0) { <mat-hint>No workspaces found.</mat-hint> }
                    </mat-form-field>
                }

                <mat-form-field appearance="outline" class="w-100 mb-3">
                    <mat-label>Project Name *</mat-label>
                    <mat-icon matPrefix class="material-icons-outlined">folder</mat-icon>
                    <input matInput [(ngModel)]="projectName" placeholder="Enter project name" />
                    <mat-hint>{{ projectName.length }}/150</mat-hint>
                </mat-form-field>

                <div class="row gx-3">
                    <div class="col-12 col-md-6 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>Start Date *</mat-label>
                            <input matInput [matDatepicker]="wizStartPicker" [(ngModel)]="startDateObj"
                                   (ngModelChange)="recalcEndDate()" placeholder="Pick start date" />
                            <mat-datepicker-toggle matIconSuffix [for]="wizStartPicker"></mat-datepicker-toggle>
                            <mat-datepicker #wizStartPicker></mat-datepicker>
                            <mat-hint>Required — when the project begins</mat-hint>
                        </mat-form-field>
                    </div>
                    <div class="col-12 col-md-6 mb-3">
                        <mat-form-field appearance="outline" class="w-100">
                            <mat-label>End Date</mat-label>
                            <input matInput [matDatepicker]="wizEndPicker" [(ngModel)]="endDateObj"
                                   [min]="startDateObj" placeholder="Pick end date" />
                            <mat-datepicker-toggle matIconSuffix [for]="wizEndPicker"></mat-datepicker-toggle>
                            <mat-datepicker #wizEndPicker></mat-datepicker>
                            @if (!endDateObj && template()?.estimatedDurationDays) {
                                <mat-hint>Auto-set from start + {{ template()!.estimatedDurationDays }} days</mat-hint>
                            }
                            @if (endDateObj && startDateObj && endDateObj < startDateObj) {
                                <mat-error>End date must be after start date.</mat-error>
                            }
                        </mat-form-field>
                    </div>
                </div>

                <mat-form-field appearance="outline" class="w-100">
                    <mat-label>Visibility</mat-label>
                    <mat-icon matPrefix class="material-icons-outlined">{{ visibility === 'PUBLIC' ? 'public' : 'lock' }}</mat-icon>
                    <mat-select [(ngModel)]="visibility">
                        <mat-option value="PUBLIC">Public — visible to all workspace members</mat-option>
                        <mat-option value="PRIVATE">Private — invite-only access</mat-option>
                    </mat-select>
                </mat-form-field>
            }

            <!-- ═══════════════════════════ STEP: PHASES ═══════════════════════════ -->
            @if (currentStep() === 'phases') {
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h5 class="mb-1">Phase Planning</h5>
                        <p class="text-secondary small mb-0">Toggle phases on/off and customise their names. Dates are estimated from your start date.</p>
                    </div>
                    <span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1;font-size:11px;">
                        {{ enabledPhaseCount() }} / {{ parsedPhases().length }} enabled
                    </span>
                </div>

                @if (parsedPhases().length === 0) {
                    <div class="text-center py-4" style="border:1.5px dashed rgba(0,0,0,0.12);border-radius:12px;">
                        <mat-icon class="material-icons-outlined text-secondary" style="font-size:36px;width:36px;height:36px;">timeline</mat-icon>
                        <p class="text-secondary small mb-2 mt-1">No phases yet. Add phases to structure your project timeline.</p>
                        <button matButton (click)="addPhase()">
                            <mat-icon class="material-icons-outlined">add</mat-icon> Add Phase
                        </button>
                    </div>
                } @else {
                @for (phase of parsedPhases(); track phase.id; let i = $index) {
                    <div class="phase-card" [class.enabled]="phase.enabled" [style.opacity]="phase.enabled ? 1 : 0.55">
                        <div class="d-flex align-items-center gap-3">
                            <div class="phase-badge" [style.background]="phaseColor(i)">{{ i + 1 }}</div>
                            <div class="flex-grow-1">
                                <input class="form-control form-control-sm fw-medium border-0 bg-transparent px-0"
                                       style="font-size:14px;"
                                       [(ngModel)]="phase.name"
                                       placeholder="Phase name" />
                                <div class="d-flex align-items-center gap-2 mt-1 flex-wrap">
                                    @if (phase.durationDays > 0) {
                                        <span class="text-secondary" style="font-size:11px;">
                                            <mat-icon class="material-icons-outlined align-middle" style="font-size:12px;width:12px;height:12px;">timer</mat-icon>
                                            {{ phase.durationDays }} days
                                        </span>
                                    }
                                    @if (startDateObj && phase.durationDays > 0) {
                                        <span class="text-secondary" style="font-size:11px;">
                                            · {{ phaseStart(i) | date:'MMM d' }} – {{ phaseEnd(i) | date:'MMM d, y' }}
                                        </span>
                                    }
                                </div>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <mat-form-field appearance="outline" class="inline-small" style="width:80px;">
                                    <input matInput type="number" [(ngModel)]="phase.durationDays" min="1" placeholder="Days" />
                                    <mat-hint>days</mat-hint>
                                </mat-form-field>
                                <!-- Toggle -->
                                <button matIconButton [matTooltip]="phase.enabled ? 'Disable phase' : 'Enable phase'"
                                        (click)="togglePhase(phase)">
                                    <mat-icon [style.color]="phase.enabled ? '#22c55e' : '#94a3b8'" class="material-icons-outlined">
                                        {{ phase.enabled ? 'toggle_on' : 'toggle_off' }}
                                    </mat-icon>
                                </button>
                                <!-- Remove phase -->
                                <button matIconButton matTooltip="Remove phase" (click)="removePhase(i)">
                                    <mat-icon class="material-icons-outlined" style="color:#94a3b8;font-size:18px;width:18px;height:18px;">delete_outline</mat-icon>
                                </button>
                            </div>
                        </div>
                    </div>
                }
                <!-- Add another phase -->
                <button matButton (click)="addPhase()" style="margin-top:4px;">
                    <mat-icon class="material-icons-outlined">add</mat-icon> Add Phase
                </button>
                }

                <!-- Timeline bar -->
                @if (enabledPhaseCount() > 0) {
                    <div class="mt-3">
                        <p class="small text-secondary mb-1 fw-medium">Project Timeline</p>
                        <div class="timeline-bar">
                            @for (phase of parsedPhases(); track phase.id; let i = $index) {
                                @if (phase.enabled && phase.durationDays > 0) {
                                    <div class="timeline-seg" [style.background]="phaseColor(i)"
                                         [style.flex]="phase.durationDays"
                                         [matTooltip]="phase.name + ' · ' + phase.durationDays + 'd'"></div>
                                }
                            }
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span class="text-secondary" style="font-size:10px;">Start</span>
                            <span class="text-secondary" style="font-size:10px;">{{ totalDays() }} days total</span>
                            <span class="text-secondary" style="font-size:10px;">End</span>
                        </div>
                    </div>
                }
            }

            <!-- ═══════════════════════════ STEP: TEAM ═══════════════════════════ -->
            @if (currentStep() === 'team') {
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h5 class="mb-1">Team Assembly</h5>
                        <p class="text-secondary small mb-0">Assign workspace members to template roles. All roles are optional.</p>
                    </div>
                    <span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1;font-size:11px;">
                        {{ filledSlots() }} / {{ totalSlots() }} slots filled
                    </span>
                </div>

                @if (loadingMembers()) {
                    <div class="text-center py-4">
                        <mat-icon class="material-icons-outlined text-secondary" style="animation:spin 1s linear infinite;">cached</mat-icon>
                        <p class="text-secondary small mt-2 mb-0">Loading workspace members...</p>
                    </div>
                } @else if (workspaceMembers().length === 0) {
                    <div class="d-flex align-items-center gap-3 p-3 rounded-3" style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);">
                        <mat-icon class="material-icons-outlined" style="color:#f59e0b;">warning</mat-icon>
                        <p class="small mb-0">No workspace members found. You can assign members later from the project settings.</p>
                    </div>
                } @else {
                    @for (role of parsedRoles(); track role.id) {
                        <div class="role-card">
                            <div class="d-flex align-items-center gap-3 mb-2">
                                <div class="role-icon-wrap" [style.background]="role.color + '18'" [style.color]="role.color">
                                    <mat-icon class="material-icons-outlined" style="font-size:20px;width:20px;height:20px;">{{ role.icon }}</mat-icon>
                                </div>
                                <div class="flex-grow-1">
                                    <p class="fw-medium mb-0" style="font-size:13px;">{{ role.label }}</p>
                                    @if (role.description) {
                                        <p class="text-secondary mb-0" style="font-size:11px;">{{ role.description }}</p>
                                    }
                                </div>
                                <span class="badge badge-light" style="font-size:11px;">×{{ role.count }}</span>
                            </div>
                            @for (slot of role.slots; track $index; let si = $index) {
                                <div class="slot-row">
                                    <mat-icon class="material-icons-outlined text-secondary" style="font-size:16px;width:16px;height:16px;">person_outline</mat-icon>
                                    <span class="text-secondary" style="font-size:11px;width:24px;">{{ si + 1 }}.</span>
                                    <mat-form-field appearance="outline" class="flex-grow-1 inline-small" style="margin-bottom:0;">
                                        <mat-select [(ngModel)]="slot.userId" (ngModelChange)="onSlotChange(slot, $event)">
                                            <mat-option [value]="null">— Unassigned —</mat-option>
                                            @for (m of workspaceMembers(); track m.userId) {
                                                <mat-option [value]="m.userId">
                                                    {{ m.user?.fullName || 'Member #' + m.userId }}
                                                    <span class="text-secondary" style="font-size:10px;"> · {{ m.role }}</span>
                                                </mat-option>
                                            }
                                        </mat-select>
                                    </mat-form-field>
                                </div>
                            }
                        </div>
                    }
                }
            }

            <!-- ═══════════════════════════ STEP: TASKS ═══════════════════════════ -->
            @if (currentStep() === 'tasks') {
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h5 class="mb-1">Ready-Made Tasks</h5>
                        <p class="text-secondary small mb-0">Select the tasks to import into your project. You can always add more later.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge" style="background:rgba(99,102,241,0.12);color:#6366f1;font-size:11px;">
                            {{ selectedTaskCount() }} / {{ parsedTasks().length }} selected
                        </span>
                        <button matButton (click)="toggleAllTasks()">
                            {{ selectedTaskCount() === parsedTasks().length ? 'Deselect All' : 'Select All' }}
                        </button>
                    </div>
                </div>

                @for (group of taskGroups(); track group.name) {
                    @if (group.tasks.length > 0) {
                        <div class="task-group-header d-flex align-items-center justify-content-between">
                            <span>{{ group.name }}</span>
                            <button matIconButton style="width:22px;height:22px;" (click)="toggleGroup(group)">
                                <mat-icon style="font-size:14px;width:14px;height:14px;" [matTooltip]="allGroupSelected(group) ? 'Deselect group' : 'Select group'">
                                    {{ allGroupSelected(group) ? 'check_box' : 'check_box_outline_blank' }}
                                </mat-icon>
                            </button>
                        </div>
                        @for (task of group.tasks; track task.id) {
                            <div class="task-row" (click)="task.selected = !task.selected">
                                <mat-icon style="font-size:18px;width:18px;height:18px;color:#6366f1;">
                                    {{ task.selected ? 'check_box' : 'check_box_outline_blank' }}
                                </mat-icon>
                                <div class="priority-dot" [style.background]="priorityDot(task.priority)"></div>
                                <p class="mb-0 flex-grow-1" style="font-size:13px;" [style.textDecoration]="task.selected ? 'none' : 'line-through'" [style.color]="task.selected ? 'inherit' : '#94a3b8'">
                                    {{ task.title }}
                                </p>
                                @if (task.estimatedHours) {
                                    <span class="badge badge-light" style="font-size:10px;flex-shrink:0;">{{ task.estimatedHours }}h</span>
                                }
                                <span class="badge" style="font-size:9px;flex-shrink:0;"
                                      [style.background]="priorityDot(task.priority) + '20'"
                                      [style.color]="priorityDot(task.priority)">{{ task.priority }}</span>
                            </div>
                        }
                        <div style="height:12px;"></div>
                    }
                }
            }

            <!-- ═══════════════════════════ STEP: REVIEW ═══════════════════════════ -->
            @if (currentStep() === 'review') {
                <!-- Hero -->
                <div class="text-center mb-4">
                    <div style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(14,165,233,0.1));display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                        <mat-icon class="material-icons-outlined text-theme" style="font-size:32px;width:32px;height:32px;">rocket_launch</mat-icon>
                    </div>
                    <h4 class="mb-1">Ready to Launch?</h4>
                    <p class="text-secondary small mb-0">Review your project configuration before creating.</p>
                </div>

                <div class="review-grid mb-3">
                    <!-- Project card -->
                    <div class="review-card" style="grid-column:1/-1;">
                        <div class="d-flex align-items-center gap-3">
                            <mat-icon class="material-icons-outlined text-theme">folder</mat-icon>
                            <div class="flex-grow-1 overflow-hidden">
                                <p class="fw-medium mb-0 text-truncate">{{ projectName || template()?.name }}</p>
                                <p class="text-secondary small mb-0">
                                    {{ selectedWorkspaceName() }}
                                    @if (startDateObj) { · {{ startDateObj | date:'MMM d, y' }} @if (endDateObj) { → {{ endDateObj | date:'MMM d, y' }} } }
                                </p>
                            </div>
                            <span class="badge badge-light">{{ visibility }}</span>
                        </div>
                    </div>

                    <!-- Phases card -->
                    @if (parsedPhases().length > 0) {
                        <div class="review-card text-center">
                            <div class="review-metric">{{ enabledPhaseCount() }}</div>
                            <p class="text-secondary small mb-1 mt-1">Phases</p>
                            <div class="timeline-bar" style="height:6px;">
                                @for (phase of parsedPhases(); track phase.id; let i = $index) {
                                    @if (phase.enabled) {
                                        <div class="timeline-seg" [style.background]="phaseColor(i)" [style.flex]="phase.durationDays || 1"></div>
                                    }
                                }
                            </div>
                        </div>
                    }

                    <!-- Tasks card -->
                    @if (parsedTasks().length > 0) {
                        <div class="review-card text-center">
                            <div class="review-metric">{{ selectedTaskCount() }}</div>
                            <p class="text-secondary small mb-1 mt-1">Tasks imported</p>
                            <div class="d-flex justify-content-center gap-1 flex-wrap">
                                <span class="badge" style="background:#ef444420;color:#ef4444;font-size:10px;">{{ taskCountByPriority('HIGH') }} HIGH</span>
                                <span class="badge" style="background:#f59e0b20;color:#f59e0b;font-size:10px;">{{ taskCountByPriority('MEDIUM') }} MED</span>
                                <span class="badge" style="background:#22c55e20;color:#22c55e;font-size:10px;">{{ taskCountByPriority('LOW') }} LOW</span>
                            </div>
                        </div>
                    }

                    <!-- Team card -->
                    @if (parsedRoles().length > 0) {
                        <div class="review-card" [class.text-center]="parsedTasks().length === 0">
                            <div class="review-metric">{{ filledSlots() }}</div>
                            <p class="text-secondary small mb-2 mt-1">Team members assigned</p>
                            <div class="d-flex flex-wrap gap-1">
                                @for (role of parsedRoles(); track role.id) {
                                    @for (slot of role.slots; track $index) {
                                        @if (slot.userId) {
                                            <span class="badge" [style.background]="role.color + '20'" [style.color]="role.color" style="font-size:10px;">
                                                {{ memberName(slot.userId) }}
                                            </span>
                                        }
                                    }
                                }
                            </div>
                        </div>
                    }

                    <!-- Template source -->
                    <div class="review-card" style="grid-column:1/-1;">
                        <div class="d-flex align-items-center gap-3">
                            <mat-icon class="material-icons-outlined text-secondary">layers</mat-icon>
                            <div>
                                <p class="small mb-0 text-secondary">Based on template</p>
                                <p class="fw-medium mb-0">{{ template()?.name }}</p>
                            </div>
                            <div class="ms-auto text-end">
                                <p class="small mb-0" style="color:#f59e0b;">{{ template()?.rating | number:'1.1-1' }} ★</p>
                                <p class="text-secondary" style="font-size:10px;margin-bottom:0;">{{ template()?.usageCount }} uses</p>
                            </div>
                        </div>
                    </div>
                </div>

                @if (errorMsg()) {
                    <div class="d-flex align-items-center gap-2 p-3 rounded-3" style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);">
                        <mat-icon class="material-icons-outlined" style="color:#ef4444;">error_outline</mat-icon>
                        <p class="small mb-0" style="color:#dc2626;">{{ errorMsg() }}</p>
                    </div>
                }
            }

            } <!-- end @if(!loadingTemplate) -->
        </div>

        <!-- ── Fixed Footer ── -->
        <div class="wiz-footer">
            <button matButton (click)="close()" class="text-secondary">Cancel</button>
            <div class="flex-grow-1"></div>
            @if (activeStepIndex() > 0) {
                <button matButton (click)="prevStep()" [disabled]="launching()">
                    <mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back
                </button>
            }
            @if (currentStep() !== 'review') {
                <button matButton="filled" (click)="nextStep()" [disabled]="!canAdvance()">
                    Next <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                </button>
            } @else {
                <button matButton="filled" (click)="launch()" [disabled]="launching() || !canAdvance()">
                    <mat-icon class="material-icons-outlined">{{ launching() ? 'hourglass_empty' : 'rocket_launch' }}</mat-icon>
                    {{ launching() ? 'Launching...' : 'Launch Project' }}
                </button>
            }
        </div>
    `,
})
export class UseTemplateWizardDialogComponent implements OnInit {
    private readonly dialogRef = inject(MatDialogRef<UseTemplateWizardDialogComponent>);
    readonly data = inject<UseTemplateWizardData>(MAT_DIALOG_DATA);
    private readonly templateService = inject(M2TemplateService);
    private readonly workspaceService = inject(M2WorkspaceService);
    private readonly projectService = inject(M2ProjectService);
    private readonly authService = inject(AuthService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly router = inject(Router);

    // ── Loading states ──
    readonly loadingTemplate = signal(true);
    readonly loadingPick = signal(true);
    readonly loadingMembers = signal(false);
    readonly launching = signal(false);
    readonly errorMsg = signal("");

    // ── Template data ──
    readonly template = signal<M2TemplateSummary | null>(null);
    readonly parsedPhases = signal<ParsedPhase[]>([]);
    readonly parsedRoles = signal<ParsedRole[]>([]);
    readonly parsedTasks = signal<ParsedTask[]>([]);

    // ── Step navigation ──
    readonly activeSteps = signal<StepKey[]>(["setup", "review"]);
    readonly activeStepIndex = signal(0);
    readonly currentStep = computed(() => this.activeSteps()[this.activeStepIndex()] ?? "setup");

    // ── Setup fields ──
    selectedWorkspaceId = "";
    projectName = "";
    startDateObj: Date | null = null;
    endDateObj: Date | null = null;
    visibility = "PUBLIC";

    // ── Workspace data ──
    readonly workspaces = signal<M2Workspace[]>([]);
    readonly workspaceMembers = signal<M2WorkspaceMember[]>([]);

    // ── Template picker state (step: pick) ──
    readonly allPublicTemplates = signal<M2TemplateSummary[]>([]);
    readonly filteredPick = signal<M2TemplateSummary[]>([]);
    readonly selectedPickId = signal<string>("");
    pickSearch = "";
    pickType = "";

    // ── Computed helpers ──
    readonly enabledPhaseCount = computed(() => this.parsedPhases().filter(p => p.enabled).length);
    readonly totalDays = computed(() => this.parsedPhases().filter(p => p.enabled).reduce((s, p) => s + p.durationDays, 0));
    readonly selectedTaskCount = computed(() => this.parsedTasks().filter(t => t.selected).length);
    readonly filledSlots = computed(() => this.parsedRoles().flatMap(r => r.slots).filter(s => s.userId !== null).length);
    readonly totalSlots = computed(() => this.parsedRoles().reduce((s, r) => s + r.slots.length, 0));
    readonly taskGroups = computed(() => {
        const groups = new Map<string, ParsedTask[]>();
        for (const task of this.parsedTasks()) {
            const g = task.phase || "General";
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g)!.push(task);
        }
        return [...groups.entries()].map(([name, tasks]) => ({ name, tasks }));
    });
    readonly selectedWorkspaceName = computed(() => {
        if (this.data.workspaceName) return this.data.workspaceName;
        const id = this.data.workspaceId || this.selectedWorkspaceId;
        return this.workspaces().find(w => w.id === id)?.name ?? "—";
    });

    ngOnInit(): void {
        // Set start date to today
        this.startDateObj = new Date();

        // Load workspaces unless pre-set
        if (!this.data.workspaceId) {
            this.workspaceService.getWorkspaces().subscribe({
                next: (list) => this.workspaces.set(list || []),
                error: () => {},
            });
        } else {
            this.selectedWorkspaceId = this.data.workspaceId;
        }

        // Load template or public templates for picker
        if (this.data.templateId) {
            const tpl = this.data.template;
            if (tpl && tpl.defaultPhasesJson !== undefined) {
                // Already fully loaded
                this.applyTemplate(tpl);
            } else {
                this.templateService.getById(this.data.templateId).subscribe({
                    next: (t) => this.applyTemplate(t),
                    error: () => this.loadingTemplate.set(false),
                });
            }
        } else {
            // Show template picker first — initialize steps with "pick" immediately
            this.activeSteps.set(["pick", "setup", "phases", "review"]);
            this.activeStepIndex.set(0);
            this.loadingTemplate.set(false);
            this.loadingPick.set(true);
            this.templateService.getPublic(0, 200).subscribe({
                next: (page) => {
                    const sorted = (page.content || []).sort((a, b) => {
                        if (a.isTrending && !b.isTrending) return -1;
                        if (!a.isTrending && b.isTrending) return 1;
                        return b.usageCount - a.usageCount;
                    });
                    this.allPublicTemplates.set(sorted);
                    this.filteredPick.set(sorted);
                    this.loadingPick.set(false);
                },
                error: () => this.loadingPick.set(false),
            });
        }
    }

    private applyTemplate(t: M2TemplateSummary, fromPicker = false): void {
        this.template.set(t);
        this.projectName = t.name;
        this.recalcEndDate();

        // Parse phases
        const rawPhases = safeParse(t.defaultPhasesJson) as Array<Record<string, unknown>>;
        const phases: ParsedPhase[] = rawPhases.map((p, i) => ({
            id: String(i),
            name: String(p["name"] || `Phase ${i + 1}`),
            description: p["description"] ? String(p["description"]) : undefined,
            durationDays: Number(p["durationDays"] || p["duration"] || 14),
            order: i,
            enabled: true,
        }));

        // Parse roles
        const rawRoles = safeParse(t.defaultRolesJson) as Array<Record<string, unknown>>;
        const roles: ParsedRole[] = rawRoles.map((r, i) => {
            const roleName = String(r["role"] || r["name"] || `Role ${i + 1}`);
            const count = Number(r["count"] || 1);
            return {
                id: String(i),
                role: roleName,
                label: roleName.replace(/_/g, " "),
                description: r["description"] ? String(r["description"]) : undefined,
                count,
                slots: Array.from({ length: count }, () => ({ userId: null as number | null })),
                icon: roleIcon(roleName),
                projectRole: mapToProjectRole(roleName),
                color: roleColor(roleName),
            };
        });

        // Parse tasks
        const rawTasks = safeParse(t.defaultTasksJson) as Array<Record<string, unknown>>;
        const tasks: ParsedTask[] = rawTasks.map((task, i) => ({
            id: String(i),
            title: String(task["title"] || task["name"] || `Task ${i + 1}`),
            description: task["description"] ? String(task["description"]) : undefined,
            phase: task["phase"] ? String(task["phase"]) : undefined,
            priority: String(task["priority"] || "MEDIUM").toUpperCase(),
            estimatedHours: task["estimatedHours"] ? Number(task["estimatedHours"]) : undefined,
            selected: true,
        }));

        this.parsedPhases.set(phases);
        this.parsedRoles.set(roles);
        this.parsedTasks.set(tasks);

        // Determine active steps — phases is always included so users can plan even without template defaults
        const steps: StepKey[] = [];
        if (!this.data.templateId) steps.push("pick");
        steps.push("setup");
        steps.push("phases");
        if (roles.length > 0) steps.push("team");
        if (tasks.length > 0) steps.push("tasks");
        steps.push("review");
        this.activeSteps.set(steps);

        // Move to correct step: after user picks from the picker → go to "setup"; otherwise start at 0
        if (fromPicker) {
            this.activeStepIndex.set(steps.indexOf("setup"));
        } else {
            const pickIdx = steps.indexOf("pick");
            this.activeStepIndex.set(pickIdx >= 0 ? pickIdx : 0);
        }

        this.loadingTemplate.set(false);

        // Load members if workspaceId is already known
        if (this.data.workspaceId) {
            this.loadWorkspaceMembers(this.data.workspaceId);
        }
    }

    // ── Template picker ──────────────────────────────────────────────────────

    applyPickFilter(): void {
        let items = this.allPublicTemplates();
        if (this.pickType) items = items.filter(t => t.templateType === this.pickType);
        if (this.pickSearch.trim()) {
            const q = this.pickSearch.toLowerCase();
            items = items.filter(t =>
                t.name.toLowerCase().includes(q) ||
                (t.tags || "").toLowerCase().includes(q) ||
                (t.useCaseDescription || "").toLowerCase().includes(q)
            );
        }
        this.filteredPick.set(items);
    }

    pickTemplate(t: M2TemplateSummary): void {
        this.selectedPickId.set(t.id);
        if (t.defaultPhasesJson !== undefined) {
            this.applyTemplate(t, true);
        } else {
            this.loadingTemplate.set(true);
            this.templateService.getById(t.id).subscribe({
                next: (full) => this.applyTemplate(full, true),
                error: () => this.loadingTemplate.set(false),
            });
        }
    }

    // ── Workspace members ────────────────────────────────────────────────────

    onWorkspaceChange(): void {
        if (this.selectedWorkspaceId) this.loadWorkspaceMembers(this.selectedWorkspaceId);
    }

    private loadWorkspaceMembers(wsId: string): void {
        this.loadingMembers.set(true);
        this.workspaceService.getWorkspaceMembers(wsId).subscribe({
            next: (members) => {
                this.workspaceMembers.set(members || []);
                this.loadingMembers.set(false);
            },
            error: () => this.loadingMembers.set(false),
        });
    }

    onSlotChange(slot: RoleSlot, userId: number | null): void {
        slot.userId = userId;
        const member = this.workspaceMembers().find(m => m.userId === userId);
        slot.userName = member?.user?.fullName;
    }

    memberName(userId: number): string {
        const m = this.workspaceMembers().find(w => w.userId === userId);
        return m?.user?.fullName || `User #${userId}`;
    }

    // ── Step navigation ──────────────────────────────────────────────────────

    stepLabel(step: StepKey): string {
        const map: Record<StepKey, string> = {
            pick: "Template", setup: "Setup", phases: "Phases",
            team: "Team", tasks: "Tasks", review: "Launch",
        };
        return map[step];
    }

    canAdvance(): boolean {
        const step = this.currentStep();
        if (step === "pick") return !!this.selectedPickId() && !this.loadingTemplate();
        if (step === "setup") {
            const wsId = this.data.workspaceId || this.selectedWorkspaceId;
            const name = (this.projectName || this.template()?.name || "").trim();
            if (!wsId || name.length < 3 || !this.startDateObj) return false;
            if (this.endDateObj && this.endDateObj < this.startDateObj) return false;
            return true;
        }
        return true;
    }

    nextStep(): void {
        if (!this.canAdvance()) return;
        const current = this.activeStepIndex();
        const max = this.activeSteps().length - 1;
        if (current < max) {
            // Load members when moving into team step
            const nextStep = this.activeSteps()[current + 1];
            if (nextStep === "team" && !this.loadingMembers()) {
                const wsId = this.data.workspaceId || this.selectedWorkspaceId;
                if (wsId && this.workspaceMembers().length === 0) this.loadWorkspaceMembers(wsId);
            }
            this.activeStepIndex.set(current + 1);
        }
    }

    prevStep(): void {
        const current = this.activeStepIndex();
        if (current > 0) this.activeStepIndex.set(current - 1);
    }

    // ── Phase helpers ────────────────────────────────────────────────────────

    phaseColor(index: number): string { return PHASE_COLORS[index % PHASE_COLORS.length]; }

    togglePhase(phase: ParsedPhase): void {
        phase.enabled = !phase.enabled;
        this.parsedPhases.set([...this.parsedPhases()]);
    }

    addPhase(): void {
        const phases = this.parsedPhases();
        const next: ParsedPhase = {
            id: String(Date.now()),
            name: `Phase ${phases.length + 1}`,
            durationDays: 14,
            order: phases.length,
            enabled: true,
        };
        this.parsedPhases.set([...phases, next]);
    }

    removePhase(index: number): void {
        const phases = this.parsedPhases().filter((_, i) => i !== index);
        this.parsedPhases.set(phases);
    }

    phaseStart(index: number): Date {
        const base = this.startDateObj ? new Date(this.startDateObj) : new Date();
        const phases = this.parsedPhases();
        let offset = 0;
        for (let i = 0; i < index; i++) {
            if (phases[i].enabled) offset += phases[i].durationDays;
        }
        const d = new Date(base);
        d.setDate(d.getDate() + offset);
        return d;
    }

    phaseEnd(index: number): Date {
        const start = this.phaseStart(index);
        const d = new Date(start);
        d.setDate(d.getDate() + (this.parsedPhases()[index].durationDays - 1));
        return d;
    }

    recalcEndDate(): void {
        const t = this.template();
        if (!this.startDateObj || !t?.estimatedDurationDays) return;
        const d = new Date(this.startDateObj);
        d.setDate(d.getDate() + t.estimatedDurationDays);
        this.endDateObj = d;
    }

    // ── Task helpers ─────────────────────────────────────────────────────────

    priorityDot(priority: string): string { return priorityColor(priority); }

    toggleAllTasks(): void {
        const allSelected = this.selectedTaskCount() === this.parsedTasks().length;
        this.parsedTasks.set(this.parsedTasks().map(t => ({ ...t, selected: !allSelected })));
    }

    toggleGroup(group: { name: string; tasks: ParsedTask[] }): void {
        const allSel = group.tasks.every(t => t.selected);
        this.parsedTasks.set(this.parsedTasks().map(t =>
            group.tasks.includes(t) ? { ...t, selected: !allSel } : t
        ));
    }

    allGroupSelected(group: { name: string; tasks: ParsedTask[] }): boolean {
        return group.tasks.every(t => t.selected);
    }

    taskCountByPriority(p: string): number {
        return this.parsedTasks().filter(t => t.selected && t.priority === p).length;
    }

    // ── Type color helper ────────────────────────────────────────────────────

    typeColor(type: string): string {
        const map: Record<string, string> = {
            SCRUM: "#6366f1", KANBAN: "#0ea5e9", WATERFALL: "#14b8a6", CUSTOM: "#f59e0b",
        };
        return map[type] || "#94a3b8";
    }

    // ── Launch ───────────────────────────────────────────────────────────────

    launch(): void {
        if (this.launching()) return;
        const wsId = this.data.workspaceId || this.selectedWorkspaceId;
        const tId = this.data.templateId || this.selectedPickId();
        const name = (this.projectName || this.template()?.name || "").trim();

        if (!wsId || !tId || name.length < 3) {
            this.errorMsg.set("Missing required fields (workspace, template, or project name).");
            return;
        }

        this.launching.set(true);
        this.errorMsg.set("");

        // Step 1: Create project from template
        const toIso = (d: Date | null) => d
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : undefined;
        this.templateService.createProjectFromTemplate(wsId, tId, name, toIso(this.startDateObj), toIso(this.endDateObj))
            .pipe(
                // Step 2: Assign members (chain sequentially)
                concatMap((project) => {
                    const projectId = project["id"] as string;
                    const assignments = this.parsedRoles()
                        .flatMap(r => r.slots.filter(s => s.userId !== null).map(s => ({
                            userId: s.userId as number,
                            role: r.projectRole,
                        })));

                    if (assignments.length === 0) return of(projectId);

                    return from(assignments).pipe(
                        concatMap(a =>
                            this.projectService.addProjectMember(wsId, projectId, a.userId, a.role).pipe(
                                catchError(() => of(null))
                            )
                        ),
                        toArray(),
                        concatMap(() => of(projectId))
                    );
                }),
                catchError((err) => {
                    this.errorMsg.set(err?.error?.message || err?.message || "Failed to create project. Please try again.");
                    this.launching.set(false);
                    throw err;
                })
            )
            .subscribe({
                next: (projectId) => {
                    this.snackBar.open("Project created successfully!", "View", { duration: 4000 });
                    this.dialogRef.close({ projectId: String(projectId), workspaceId: wsId } as UseTemplateWizardResult);
                    this.router.navigate(["/app/real-projects", wsId, projectId]);
                },
                error: () => this.launching.set(false),
            });
    }

    close(): void { this.dialogRef.close(); }
}
