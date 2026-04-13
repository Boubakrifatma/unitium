import { Component, OnInit, ViewChild, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, NgForm } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDividerModule } from "@angular/material/divider";
import { AuthService } from "../../../auth/auth.service";
import { M2TemplateService } from "./m2-template.service";

export interface CreateTemplateDialogResult { created: true; }

interface TemplateStarter {
    type: "SCRUM" | "KANBAN" | "WATERFALL" | "CUSTOM";
    icon: string;
    label: string;
    tagline: string;
    color: string;
    tags: string;
    useCaseDescription: string;
    effort: "LOW" | "MEDIUM" | "HIGH" | "";
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "";
    duration: number | null;
    teamStrategy: "MANUAL" | "AUTO" | "HYBRID";
    phases: string;
    roles: string;
    config: string;
}

export interface PhaseRow { name: string; durationDays: number; }
export interface RoleRow  { role: string;  count: number; }

const STARTERS: TemplateStarter[] = [
    {
        type: "SCRUM", icon: "sprint", label: "Scrum", tagline: "Iterative sprints with backlog & reviews",
        color: "#6366f1", tags: "agile, scrum, sprint, iterative",
        useCaseDescription: "Best for teams that deliver value incrementally through 2-week sprints with daily standups and retrospectives.",
        effort: "MEDIUM", difficulty: "INTERMEDIATE", duration: 90, teamStrategy: "AUTO",
        phases: '[{"name":"Product Backlog","durationDays":7},{"name":"Sprint Planning","durationDays":1},{"name":"Sprint Execution","durationDays":14},{"name":"Sprint Review","durationDays":1},{"name":"Sprint Retrospective","durationDays":1}]',
        roles: '[{"role":"SCRUM_MASTER","count":1},{"role":"PRODUCT_OWNER","count":1},{"role":"DEVELOPER","count":4},{"role":"QA","count":1}]',
        config: '{"methodology":"SCRUM","sprintDurationDays":14,"priority":"MEDIUM","maxTeamSize":8}',
    },
    {
        type: "KANBAN", icon: "view_kanban", label: "Kanban", tagline: "Continuous flow with visual board columns",
        color: "#0ea5e9", tags: "kanban, continuous, flow, board",
        useCaseDescription: "Best for support teams and ongoing feature work with continuous delivery and no fixed iterations.",
        effort: "LOW", difficulty: "BEGINNER", duration: 30, teamStrategy: "MANUAL",
        phases: '[{"name":"Backlog","durationDays":0},{"name":"Ready","durationDays":0},{"name":"In Progress","durationDays":0},{"name":"Review","durationDays":0},{"name":"Done","durationDays":0}]',
        roles: '[{"role":"KANBAN_LEAD","count":1},{"role":"DEVELOPER","count":3},{"role":"REVIEWER","count":1}]',
        config: '{"methodology":"KANBAN","wipLimit":5,"priority":"MEDIUM"}',
    },
    {
        type: "WATERFALL", icon: "water", label: "Waterfall", tagline: "Sequential phase-gate with clear milestones",
        color: "#14b8a6", tags: "waterfall, sequential, phase-gate, milestone",
        useCaseDescription: "Best for projects with fixed requirements, regulatory compliance, or when all requirements are known upfront.",
        effort: "HIGH", difficulty: "ADVANCED", duration: 180, teamStrategy: "MANUAL",
        phases: '[{"name":"Requirements","durationDays":21},{"name":"System Design","durationDays":28},{"name":"Implementation","durationDays":60},{"name":"Integration & Testing","durationDays":30},{"name":"Deployment","durationDays":14},{"name":"Maintenance","durationDays":30}]',
        roles: '[{"role":"PROJECT_MANAGER","count":1},{"role":"BUSINESS_ANALYST","count":1},{"role":"ARCHITECT","count":1},{"role":"DEVELOPER","count":5},{"role":"QA","count":2}]',
        config: '{"methodology":"WATERFALL","priority":"HIGH","approvalRequired":true}',
    },
    {
        type: "CUSTOM", icon: "tune", label: "Custom", tagline: "Build your own blueprint from scratch",
        color: "#f59e0b", tags: "", useCaseDescription: "",
        effort: "", difficulty: "", duration: null, teamStrategy: "MANUAL",
        phases: "", roles: "", config: "",
    },
];

@Component({
    selector: "app-create-template-dialog",
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatDialogModule, MatButtonModule,
        MatFormFieldModule, MatInputModule, MatSelectModule,
        MatIconModule, MatSnackBarModule, MatDividerModule,
    ],
    styles: [`
        .step-track { display:flex; align-items:center; gap:0; }
        .step-node { display:flex; flex-direction:column; align-items:center; gap:4px; flex-shrink:0; }
        .step-circle { width:28px; height:28px; border-radius:50%; border:2px solid #cbd5e1; background:#fff; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; transition:all .2s; }
        .step-label { font-size:10px; color:#94a3b8; white-space:nowrap; }
        .node-active .step-circle { border-color:var(--bs-primary,#6366f1); background:var(--bs-primary,#6366f1); color:#fff; }
        .node-active .step-label { color:var(--bs-primary,#6366f1); font-weight:600; }
        .node-done .step-circle { border-color:#22c55e; background:#22c55e; color:#fff; }
        .node-done .step-label { color:#22c55e; }
        .step-connector { flex:1; height:2px; background:#e2e8f0; margin:0 4px; margin-bottom:18px; min-width:16px; }
        .connector-done { background:#22c55e; }
        .summary-row { display:flex; justify-content:space-between; align-items:flex-start; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.06); gap:12px; }
        .summary-row span { color:#94a3b8; font-size:13px; flex-shrink:0; }
        .summary-row strong { font-size:13px; text-align:right; word-break:break-word; }
        .starter-card { border:1.5px solid rgba(0,0,0,0.1); border-radius:14px; padding:14px; cursor:pointer; transition:all .2s; height:100%; }
        .starter-card:hover { border-color:var(--bs-primary,#6366f1); background:rgba(99,102,241,0.04); transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.08); }
        .starter-card-selected { border-color:var(--bs-primary,#6366f1); background:rgba(99,102,241,0.06); box-shadow:0 0 0 3px rgba(99,102,241,0.18); }
        .starter-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .row-card { border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#fff; transition:box-shadow .15s; }
        .row-card:hover { box-shadow:0 2px 8px rgba(0,0,0,0.07); }
        .phase-badge { width:24px; height:24px; border-radius:50%; background:rgba(99,102,241,0.12); color:#6366f1; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
        .empty-state { border:1.5px dashed rgba(0,0,0,0.12); border-radius:10px; padding:18px; text-align:center; }
    `],
    template: `
        <!-- Fixed header -->
        <div style="padding:20px 24px 0;">
            <div class="d-flex align-items-center justify-content-between mb-3">
                @if (mode() === 'pick') {
                    <div>
                        <h3 class="mb-0">New Template</h3>
                        <p class="small text-secondary mb-0">Choose a starting point</p>
                    </div>
                } @else {
                    <h3 class="mb-0">New Template</h3>
                }
                <button matIconButton (click)="close()"><mat-icon class="material-icons-outlined">close</mat-icon></button>
            </div>

            <!-- Step indicator (wizard mode only) -->
            @if (mode() === 'wizard') {
                <div class="step-track pb-3">
                    @for (label of stepLabels; track $index) {
                        <div class="step-node" [class.node-active]="currentStep() === $index" [class.node-done]="currentStep() > $index">
                            <div class="step-circle">
                                @if (currentStep() > $index) {
                                    <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;">check</mat-icon>
                                } @else { {{ $index + 1 }} }
                            </div>
                            <span class="step-label">{{ label }}</span>
                        </div>
                        @if ($index < stepLabels.length - 1) {
                            <div class="step-connector" [class.connector-done]="currentStep() > $index"></div>
                        }
                    }
                </div>
            }
            <mat-divider></mat-divider>
        </div>

        <!-- Scrollable body -->
        <mat-dialog-content style="padding:16px 24px;flex:1 1 auto;overflow-y:auto;max-height:calc(90vh - 220px);">

            <!-- ============ STARTER PICKER MODE ============ -->
            @if (mode() === 'pick') {
                <p class="text-secondary small mb-3">Pick a blueprint to get started fast, or build your own from scratch.</p>
                <div class="row gx-3 gy-3">
                    @for (s of starters; track s.type) {
                        <div class="col-6">
                            <div class="starter-card" [class.starter-card-selected]="pickedType() === s.type" (click)="pickStarter(s)">
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <div class="starter-icon" [style.background]="s.color + '18'" [style.color]="s.color">
                                        <mat-icon class="material-icons-outlined">{{ s.icon }}</mat-icon>
                                    </div>
                                    <h5 class="mb-0">{{ s.label }}</h5>
                                    @if (pickedType() === s.type) {
                                        <mat-icon class="material-icons-outlined ms-auto" style="color:#22c55e;font-size:18px;width:18px;height:18px;">check_circle</mat-icon>
                                    }
                                </div>
                                <p class="text-secondary small mb-2">{{ s.tagline }}</p>
                                @if (s.phases) {
                                    <div class="d-flex gap-1 flex-wrap">
                                        <span class="badge badge-light" style="font-size:9px;">{{ phaseCount(s.phases) }} phases</span>
                                        <span class="badge badge-light" style="font-size:9px;">{{ roleCount(s.roles) }} roles</span>
                                        @if (s.duration) { <span class="badge badge-light" style="font-size:9px;">{{ s.duration }}d</span> }
                                        @if (s.effort) { <span class="badge badge-light" style="font-size:9px;">{{ s.effort | titlecase }}</span> }
                                    </div>
                                } @else {
                                    <p class="small text-secondary mb-0 fst-italic" style="font-size:11px;">All fields open — fill in your own</p>
                                }
                            </div>
                        </div>
                    }
                </div>

                @if (pickedType()) {
                    <div class="mt-3 p-3 rounded" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);">
                        <p class="small mb-0">
                            <mat-icon class="material-icons-outlined align-middle text-theme" style="font-size:14px;width:14px;height:14px;">info</mat-icon>
                            <strong class="text-theme">{{ pickedType() }}</strong> — {{ pickedStarter()?.useCaseDescription }}
                        </p>
                    </div>
                }
            }

            <!-- ============ WIZARD MODE ============ -->

            <!-- Step 0: Basics -->
            @if (mode() === 'wizard' && currentStep() === 0) {
                <form #basicsForm="ngForm">
                    <p class="text-secondary small mb-3">Review and refine your template basics.</p>

                    <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Template Name *</mat-label>
                        <input matInput name="name" [(ngModel)]="name" required minlength="3" maxlength="150"
                            placeholder="e.g. Sprint Planning Template"
                            #nameCtrl="ngModel" />
                        <mat-hint align="end">{{ name.length }}/150</mat-hint>
                        @if (nameCtrl.invalid && nameCtrl.touched) {
                            @if (nameCtrl.errors?.['required']) { <mat-error>Name is required.</mat-error> }
                            @else if (nameCtrl.errors?.['minlength']) { <mat-error>Name must be at least 3 characters.</mat-error> }
                        }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Template Type *</mat-label>
                        <mat-select name="templateType" [(ngModel)]="templateType" required>
                            <mat-option value="SCRUM">Scrum</mat-option>
                            <mat-option value="KANBAN">Kanban</mat-option>
                            <mat-option value="WATERFALL">Waterfall</mat-option>
                            <mat-option value="CUSTOM">Custom</mat-option>
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Use Case Description</mat-label>
                        <textarea matInput name="useCaseDescription" [(ngModel)]="useCaseDescription" rows="2" placeholder="When should teams use this template?"></textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-100 mb-2">
                        <mat-label>Preview Image URL</mat-label>
                        <input matInput name="previewImageUrl" [(ngModel)]="previewImageUrl" placeholder="https://..." />
                        <mat-hint>Optional thumbnail shown on template cards</mat-hint>
                    </mat-form-field>
                </form>
            }

            <!-- Step 1: Complexity -->
            @if (mode() === 'wizard' && currentStep() === 1) {
                <p class="text-secondary small mb-3">Set complexity and team strategy for this template.</p>
                <form #complexityForm="ngForm">
                    <div class="row gx-3">
                        <div class="col-12 col-md-6">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Estimated Effort</mat-label>
                                <mat-select name="estimatedEffort" [(ngModel)]="estimatedEffort">
                                    <mat-option value="">— Not specified —</mat-option>
                                    <mat-option value="LOW">Low</mat-option>
                                    <mat-option value="MEDIUM">Medium</mat-option>
                                    <mat-option value="HIGH">High</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-6">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Difficulty Level</mat-label>
                                <mat-select name="difficultyLevel" [(ngModel)]="difficultyLevel">
                                    <mat-option value="">— Not specified —</mat-option>
                                    <mat-option value="BEGINNER">Beginner</mat-option>
                                    <mat-option value="INTERMEDIATE">Intermediate</mat-option>
                                    <mat-option value="ADVANCED">Advanced</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-6">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Estimated Duration (days)</mat-label>
                                <input matInput type="number" name="estimatedDurationDays" [(ngModel)]="estimatedDurationDays" min="1" placeholder="e.g. 30" />
                            </mat-form-field>
                        </div>
                        <div class="col-12 col-md-6">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Team Strategy</mat-label>
                                <mat-select name="teamStrategy" [(ngModel)]="teamStrategy">
                                    <mat-option value="MANUAL">Manual</mat-option>
                                    <mat-option value="AUTO">Auto</mat-option>
                                    <mat-option value="HYBRID">Hybrid</mat-option>
                                </mat-select>
                            </mat-form-field>
                        </div>
                        <div class="col-12">
                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Tags</mat-label>
                                <input matInput name="tags" [(ngModel)]="tags" placeholder="e.g. agile, sprint, backlog" />
                                <mat-hint>Comma-separated tags for search discovery</mat-hint>
                            </mat-form-field>
                        </div>
                    </div>
                </form>
            }

            <!-- Step 2: Phases & Roles (Visual UI) -->
            @if (mode() === 'wizard' && currentStep() === 2) {

                <!-- ── Phases ── -->
                <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <div>
                            <p class="fw-medium mb-0">
                                <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:16px;width:16px;height:16px;color:#6366f1;">account_tree</mat-icon>
                                Phases
                                <span class="badge badge-light ms-1">{{ phases().length }}</span>
                            </p>
                            <p class="text-secondary small mb-0">Define the stages of this template's lifecycle</p>
                        </div>
                        <button matButton (click)="addPhase()">
                            <mat-icon class="material-icons-outlined">add</mat-icon> Add Phase
                        </button>
                    </div>

                    @if (phases().length === 0) {
                        <div class="empty-state">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:28px;width:28px;height:28px;">timeline</mat-icon>
                            <p class="text-secondary small mb-0">No phases yet. Add phases to define your template workflow.</p>
                        </div>
                    }

                    @for (phase of phases(); track $index; let i = $index) {
                        <div class="row-card d-flex align-items-center gap-2">
                            <div class="phase-badge">{{ i + 1 }}</div>
                            <div class="flex-grow-1">
                            <mat-form-field appearance="outline" class="w-100 mb-0" style="font-size:13px;">
                                <mat-label>Phase name</mat-label>
                                <input matInput [value]="phase.name"
                                    (input)="updatePhaseName(i, $any($event.target).value)"
                                    placeholder="e.g. Planning"
                                    [class.mat-form-field-invalid]="phaseNameErrors()[i]" />
                                @if (phaseNameErrors()[i]) {
                                    <mat-error>{{ phaseNameErrors()[i] }}</mat-error>
                                }
                            </mat-form-field>
                            </div>
                            <mat-form-field appearance="outline" style="width:100px;font-size:13px;flex-shrink:0;" class="mb-0">
                                <mat-label>Days</mat-label>
                                <input matInput type="number" [value]="phase.durationDays"
                                    (input)="updatePhaseDuration(i, +$any($event.target).value)"
                                    min="0" />
                            </mat-form-field>
                            <button matIconButton (click)="removePhase(i)" style="flex-shrink:0;color:#ef4444;">
                                <mat-icon class="material-icons-outlined">delete_outline</mat-icon>
                            </button>
                        </div>
                    }

                    @if (phases().length > 1) {
                        <!-- Mini visual timeline preview -->
                        <div class="d-flex gap-1 mt-2" style="height:8px;border-radius:4px;overflow:hidden;">
                            @for (phase of phases(); track $index) {
                                <div style="flex:1;border-radius:3px;" [style.background]="phaseColor($index)"></div>
                            }
                        </div>
                        <p class="text-secondary" style="font-size:10px;margin-top:4px;">
                            {{ totalPhaseDays() }} total days · {{ phases().length }} phases
                        </p>
                    }
                </div>

                <mat-divider class="mb-3"></mat-divider>

                <!-- ── Roles ── -->
                <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <div>
                            <p class="fw-medium mb-0">
                                <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:16px;width:16px;height:16px;color:#0d9488;">group</mat-icon>
                                Team Roles
                                <span class="badge badge-light ms-1">{{ roles().length }}</span>
                            </p>
                            <p class="text-secondary small mb-0">Recommended team roles for this template</p>
                        </div>
                        <button matButton (click)="addRole()">
                            <mat-icon class="material-icons-outlined">add</mat-icon> Add Role
                        </button>
                    </div>

                    @if (roles().length === 0) {
                        <div class="empty-state">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:28px;width:28px;height:28px;">group</mat-icon>
                            <p class="text-secondary small mb-0">No roles defined. Add recommended team roles.</p>
                        </div>
                    }

                    @for (role of roles(); track $index; let i = $index) {
                        <div class="row-card d-flex align-items-center gap-2">
                            <mat-icon class="material-icons-outlined text-secondary flex-shrink-0" style="font-size:18px;width:18px;height:18px;">person</mat-icon>
                            <div class="flex-grow-1">
                            <mat-form-field appearance="outline" class="w-100 mb-0" style="font-size:13px;">
                                <mat-label>Role name</mat-label>
                                <input matInput [value]="role.role"
                                    (input)="updateRoleName(i, $any($event.target).value)"
                                    placeholder="e.g. SCRUM_MASTER" />
                                @if (roleNameErrors()[i]) {
                                    <mat-error>{{ roleNameErrors()[i] }}</mat-error>
                                }
                            </mat-form-field>
                            </div>
                            <mat-form-field appearance="outline" style="width:80px;font-size:13px;flex-shrink:0;" class="mb-0">
                                <mat-label>Count</mat-label>
                                <input matInput type="number" [value]="role.count"
                                    (input)="updateRoleCount(i, +$any($event.target).value)"
                                    min="1" />
                            </mat-form-field>
                            <button matIconButton (click)="removeRole(i)" style="flex-shrink:0;color:#ef4444;">
                                <mat-icon class="material-icons-outlined">delete_outline</mat-icon>
                            </button>
                        </div>
                    }
                </div>

                <mat-divider class="mb-3"></mat-divider>

                <!-- ── Config JSON (advanced, optional) ── -->
                <div>
                    <p class="fw-medium mb-1" style="font-size:13px;">
                        <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:14px;width:14px;height:14px;color:#94a3b8;">settings</mat-icon>
                        Project Config JSON <span class="text-secondary fw-normal">(optional, advanced)</span>
                    </p>
                    <mat-form-field appearance="outline" class="w-100 mb-0">
                        <textarea matInput [(ngModel)]="defaultProjectConfigJson" rows="3"
                            placeholder='{"priority":"MEDIUM","methodology":"SCRUM"}'></textarea>
                        <mat-hint>Pre-fills project creation — must be valid JSON if provided</mat-hint>
                        @if (configJsonError) { <mat-error>{{ configJsonError }}</mat-error> }
                    </mat-form-field>
                </div>
            }

            <!-- Step 3: Review -->
            @if (mode() === 'wizard' && currentStep() === 3) {
                <p class="text-secondary small mb-3">Review before creating your template.</p>
                <div class="summary-row"><span>Name</span><strong>{{ name }}</strong></div>
                <div class="summary-row"><span>Type</span><strong>{{ templateType }}</strong></div>
                <div class="summary-row"><span>Effort</span><strong>{{ estimatedEffort || '—' }}</strong></div>
                <div class="summary-row"><span>Difficulty</span><strong>{{ difficultyLevel || '—' }}</strong></div>
                <div class="summary-row"><span>Duration</span><strong>{{ estimatedDurationDays ? estimatedDurationDays + ' days' : '—' }}</strong></div>
                <div class="summary-row"><span>Team Strategy</span><strong>{{ teamStrategy }}</strong></div>
                <div class="summary-row"><span>Tags</span><strong>{{ tags || '—' }}</strong></div>
                <div class="summary-row"><span>Use Case</span><strong>{{ useCaseDescription || '—' }}</strong></div>
                <div class="summary-row">
                    <span>Phases</span>
                    <strong>{{ phases().length > 0 ? phases().length + ' phases' : '—' }}</strong>
                </div>
                @if (phases().length > 0) {
                    <div style="padding:8px 0 6px;">
                        <div class="d-flex flex-wrap gap-1">
                            @for (p of phases(); track $index; let i = $index) {
                                <span style="background:rgba(99,102,241,0.1);color:#6366f1;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:500;">
                                    {{ i+1 }}. {{ p.name }}{{ p.durationDays ? ' (' + p.durationDays + 'd)' : '' }}
                                </span>
                            }
                        </div>
                    </div>
                }
                <div class="summary-row">
                    <span>Roles</span>
                    <strong>{{ validRoles().length > 0 ? validRoles().length + ' roles' : '—' }}</strong>
                </div>
                @if (validRoles().length > 0) {
                    <div style="padding:8px 0 6px;">
                        <div class="d-flex flex-wrap gap-1">
                            @for (r of validRoles(); track $index) {
                                <span style="background:rgba(13,148,136,0.1);color:#0d9488;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:500;">
                                    {{ r.role }}{{ r.count > 1 ? ' ×' + r.count : '' }}
                                </span>
                            }
                        </div>
                    </div>
                }
                <div class="summary-row"><span>Config JSON</span><strong>{{ defaultProjectConfigJson.trim() ? '✓ provided' : '—' }}</strong></div>
                <p class="small text-secondary mt-3 mb-0">The template will be saved as <strong>DRAFT</strong>. You can publish it for review from the Templates Hub.</p>
                @if (submitError) {
                    <div class="d-flex align-items-start gap-2 mt-3 p-2 rounded" style="background:#fef2f2;border:1px solid #fecaca;">
                        <mat-icon class="material-icons-outlined flex-shrink-0" style="color:#ef4444;font-size:18px;width:18px;height:18px;margin-top:1px;">error_outline</mat-icon>
                        <span style="font-size:13px;color:#b91c1c;">{{ submitError }}</span>
                    </div>
                }
            }
        </mat-dialog-content>

        <!-- Fixed footer -->
        <mat-divider></mat-divider>
        <mat-dialog-actions align="end" class="px-4 pb-3 pt-2">
            @if (mode() === 'pick') {
                <button matButton (click)="close()">Cancel</button>
                <button matButton="filled" [disabled]="!pickedType()" (click)="confirmPick()">
                    Continue
                    <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                </button>
            }
            @if (mode() === 'wizard') {
                @if (currentStep() === 0) {
                    <button matButton (click)="backToPick()">
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon> Change Starter
                    </button>
                }
                @if (currentStep() > 0) {
                    <button matButton (click)="prevStep()">
                        <mat-icon class="material-icons-outlined">arrow_back</mat-icon> Back
                    </button>
                }
                @if (currentStep() < 3) {
                    <button matButton="filled" (click)="nextStep()">
                        Continue <mat-icon class="material-icons-outlined">arrow_forward</mat-icon>
                    </button>
                }
                @if (currentStep() === 3) {
                    <button matButton="filled" (click)="submit()" [disabled]="submitting()">
                        @if (submitting()) { Creating... } @else { Create Template }
                    </button>
                }
            }
        </mat-dialog-actions>
    `,
})
export class CreateTemplateDialogComponent implements OnInit {
    @ViewChild("basicsForm") basicsForm?: NgForm;

    private readonly dialogRef = inject(MatDialogRef<CreateTemplateDialogComponent>);
    private readonly templateService = inject(M2TemplateService);
    private readonly authService = inject(AuthService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialogData = inject<{ starterType?: string } | null>(MAT_DIALOG_DATA, { optional: true });

    readonly mode = signal<"pick" | "wizard">("pick");
    readonly pickedType = signal<string>("");
    readonly currentStep = signal(0);
    readonly stepLabels = ["Basics", "Complexity", "Phases & Roles", "Review"];
    readonly submitting = signal(false);

    readonly starters: TemplateStarter[] = STARTERS;

    // Phases and roles as typed arrays (auto-converted to JSON on submit)
    readonly phases = signal<PhaseRow[]>([]);
    readonly roles = signal<RoleRow[]>([]);

    readonly validRoles = computed(() => this.roles().filter(r => r.role.trim().length > 0));
    readonly totalPhaseDays = computed(() => this.phases().reduce((s, p) => s + (p.durationDays || 0), 0));
    phaseNameErrors = signal<string[]>([]);
    roleNameErrors = signal<string[]>([]);
    submitError = "";

    // Computed: find the full starter object from pickedType
    pickedStarter(): TemplateStarter | undefined {
        return this.starters.find(s => s.type === this.pickedType());
    }

    // Step 0
    name = "";
    templateType = "CUSTOM";
    previewImageUrl = "";
    useCaseDescription = "";
    // Step 1
    estimatedEffort = "";
    difficultyLevel = "";
    estimatedDurationDays: number | null = null;
    teamStrategy = "MANUAL";
    tags = "";
    // Step 2 (config JSON only — phases/roles use signal arrays)
    defaultProjectConfigJson = "";
    configJsonError = "";

    ngOnInit(): void {
        if (this.dialogData?.starterType) {
            const starter = this.starters.find(s => s.type === this.dialogData!.starterType);
            if (starter) {
                this.pickedType.set(starter.type);
                this.applyStarter(starter);
                this.mode.set("wizard");
            }
        }
    }

    pickStarter(s: TemplateStarter): void {
        this.pickedType.set(s.type);
    }

    confirmPick(): void {
        const starter = this.pickedStarter();
        if (!starter) return;
        this.applyStarter(starter);
        this.mode.set("wizard");
        this.currentStep.set(0);
    }

    private applyStarter(s: TemplateStarter): void {
        this.templateType = s.type;
        this.estimatedEffort = s.effort;
        this.difficultyLevel = s.difficulty;
        this.estimatedDurationDays = s.duration;
        this.teamStrategy = s.teamStrategy;
        this.tags = s.tags;
        this.useCaseDescription = s.useCaseDescription;
        this.defaultProjectConfigJson = s.config;
        if (s.type !== "CUSTOM") {
            this.name = s.label + " Template";
        }
        // Parse phases JSON into typed array
        try {
            const parsed = JSON.parse(s.phases || "[]");
            this.phases.set(
                Array.isArray(parsed)
                    ? parsed.map((p: { name?: string; durationDays?: number }) => ({
                          name: p.name || "",
                          durationDays: p.durationDays ?? 0,
                      }))
                    : []
            );
        } catch { this.phases.set([]); }
        // Parse roles JSON into typed array
        try {
            const parsed = JSON.parse(s.roles || "[]");
            this.roles.set(
                Array.isArray(parsed)
                    ? parsed.map((r: { role?: string; count?: number }) => ({
                          role: r.role || "",
                          count: r.count ?? 1,
                      }))
                    : []
            );
        } catch { this.roles.set([]); }
    }

    backToPick(): void {
        this.mode.set("pick");
        this.currentStep.set(0);
    }

    nextStep(): void {
        if (this.currentStep() === 0) {
            if (this.basicsForm) {
                this.basicsForm.form.markAllAsTouched();
                if (this.basicsForm.invalid) return;
            } else {
                if (!this.name.trim() || this.name.trim().length < 3) return;
            }
        }
        if (this.currentStep() === 2) {
            // Validate phase names — each phase must have a non-empty name
            const errors = this.phases().map(p => p.name.trim() ? "" : "Phase name is required.");
            this.phaseNameErrors.set(errors);
            if (errors.some(e => e)) return;

            // Validate role names — each added role must have a non-empty name
            const roleErrors = this.roles().map(r => r.role.trim() ? "" : "Role name is required.");
            this.roleNameErrors.set(roleErrors);
            if (roleErrors.some(e => e)) return;

            // Validate config JSON if provided
            this.configJsonError = "";
            const cfg = this.defaultProjectConfigJson.trim();
            if (cfg) {
                try { JSON.parse(cfg); } catch {
                    this.configJsonError = "Config JSON is not valid — check the format.";
                    return;
                }
            }
        }
        if (this.currentStep() < 3) this.currentStep.update(s => s + 1);
    }

    prevStep(): void {
        if (this.currentStep() > 0) {
            this.currentStep.update(s => s - 1);
            this.submitError = "";
        }
    }

    // ── Phase management ──
    addPhase(): void {
        this.phases.update(ps => [...ps, { name: `Phase ${ps.length + 1}`, durationDays: 14 }]);
    }
    removePhase(index: number): void {
        this.phases.update(ps => ps.filter((_, i) => i !== index));
        this.phaseNameErrors.update(errs => errs.filter((_, i) => i !== index));
    }
    updatePhaseName(index: number, name: string): void {
        this.phases.update(ps => ps.map((p, i) => i === index ? { ...p, name } : p));
        if (name.trim()) {
            this.phaseNameErrors.update(errs => errs.map((e, i) => i === index ? "" : e));
        }
    }
    updatePhaseDuration(index: number, durationDays: number): void {
        this.phases.update(ps => ps.map((p, i) => i === index ? { ...p, durationDays: isNaN(durationDays) ? 0 : durationDays } : p));
    }

    // ── Role management ──
    addRole(): void {
        this.roles.update(rs => [...rs, { role: "", count: 1 }]);
    }
    removeRole(index: number): void {
        this.roles.update(rs => rs.filter((_, i) => i !== index));
        this.roleNameErrors.update(errs => errs.filter((_, i) => i !== index));
    }
    updateRoleName(index: number, role: string): void {
        this.roles.update(rs => rs.map((r, i) => i === index ? { ...r, role } : r));
        if (role.trim()) {
            this.roleNameErrors.update(errs => errs.map((e, i) => i === index ? "" : e));
        }
    }
    updateRoleCount(index: number, count: number): void {
        this.roles.update(rs => rs.map((r, i) => i === index ? { ...r, count: isNaN(count) || count < 1 ? 1 : count } : r));
    }

    // ── Phase color palette ──
    phaseColor(index: number): string {
        const colors = ["#6366f1","#0ea5e9","#14b8a6","#f59e0b","#ec4899","#8b5cf6","#10b981","#f97316"];
        return colors[index % colors.length];
    }

    submit(): void {
        if (this.submitting()) return;
        const userId = this.authService.currentUser()?.id;
        if (!userId) return;

        this.submitting.set(true);
        const body: Record<string, unknown> = {
            name: this.name.trim(),
            templateType: this.templateType,
            teamStrategy: this.teamStrategy,
        };
        if (this.previewImageUrl.trim()) body["previewImageUrl"] = this.previewImageUrl.trim();
        if (this.estimatedEffort) body["estimatedEffort"] = this.estimatedEffort;
        if (this.difficultyLevel) body["difficultyLevel"] = this.difficultyLevel;
        if (this.estimatedDurationDays) body["estimatedDurationDays"] = this.estimatedDurationDays;
        if (this.tags.trim()) body["tags"] = this.tags.trim();
        if (this.useCaseDescription.trim()) body["useCaseDescription"] = this.useCaseDescription.trim();
        if (this.defaultProjectConfigJson.trim()) body["defaultProjectConfigJson"] = this.defaultProjectConfigJson.trim();

        // Convert arrays back to JSON strings
        if (this.phases().length > 0) {
            body["defaultPhasesJson"] = JSON.stringify(this.phases());
        }
        const vRoles = this.validRoles();
        if (vRoles.length > 0) {
            body["defaultRolesJson"] = JSON.stringify(vRoles);
        }

        this.submitError = "";
        this.templateService.create(body).subscribe({
            next: () => {
                this.snackBar.open("Template created as DRAFT.", "Close", { duration: 3500 });
                this.dialogRef.close({ created: true } as CreateTemplateDialogResult);
            },
            error: (err) => {
                this.submitting.set(false);
                this.submitError = err?.error?.message || "Failed to create template. Please try again.";
            },
        });
    }

    phaseCount(json: string): number {
        try { const a = JSON.parse(json); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
    }

    roleCount(json: string): number {
        try { const a = JSON.parse(json); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
    }

    close(): void { this.dialogRef.close(); }
}
