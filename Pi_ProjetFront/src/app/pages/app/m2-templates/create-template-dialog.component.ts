import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed } from "@angular/core";
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
import { M2AcademicSourceItem, M2TemplateService, M2TemplateSummary } from "./m2-template.service";

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
    milestones?: string;
    tasks?: string;
    roles: string;
    config: string;
}

export interface PhaseRow { key: string; name: string; durationDays: number; }
export interface RoleRow  { role: string;  count: number; }
export interface MilestoneTaskRow {
    key: string;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    estimatedHours?: number;
    startOffsetDays?: number;
    dueOffsetDays?: number;
}

export interface MilestoneRow {
    key: string;
    name: string;
    description?: string;
    phaseKey?: string;
    offsetDays: number;
    tasks: MilestoneTaskRow[];
}

interface AcademicTemplateSourceCandidate {
    key: string;
    id?: string;
    title: string;
    publicationYear?: number | null;
    citedByCount?: number | null;
    openAccessUrl?: string | null;
    landingPageUrl?: string | null;
    firstAuthor?: string | null;
    selected: boolean;
}

const STARTERS: TemplateStarter[] = [
    {
        type: "SCRUM", icon: "sprint", label: "Scrum", tagline: "Iterative sprints with backlog & reviews",
        color: "#6366f1", tags: "agile, scrum, sprint, iterative",
        useCaseDescription: "Best for teams that deliver value incrementally through 2-week sprints with daily standups and retrospectives.",
        effort: "MEDIUM", difficulty: "INTERMEDIATE", duration: 90, teamStrategy: "AUTO",
        phases: '[{"name":"Product Backlog","durationDays":7},{"name":"Sprint Planning","durationDays":1},{"name":"Sprint Execution","durationDays":14},{"name":"Sprint Review","durationDays":1},{"name":"Sprint Retrospective","durationDays":1}]',
        milestones: '[{"key":"sprint-kickoff","name":"Sprint Kickoff","phaseKey":"phase-1","offsetDays":0},{"key":"sprint-review","name":"Sprint Review","phaseKey":"phase-4","offsetDays":22}]',
        tasks: '[{"title":"Draft sprint backlog","milestoneKey":"sprint-kickoff","phaseKey":"phase-1","priority":"medium","estimatedHours":6,"startOffsetDays":0,"dueOffsetDays":2},{"title":"Run sprint planning","milestoneKey":"sprint-kickoff","phaseKey":"phase-2","priority":"high","estimatedHours":3,"startOffsetDays":7,"dueOffsetDays":8},{"title":"Demo increment","milestoneKey":"sprint-review","phaseKey":"phase-4","priority":"medium","estimatedHours":4,"startOffsetDays":21,"dueOffsetDays":22}]',
        roles: '[{"role":"SCRUM_MASTER","count":1},{"role":"PRODUCT_OWNER","count":1},{"role":"DEVELOPER","count":4},{"role":"QA","count":1}]',
        config: '{"methodology":"SCRUM","sprintDurationDays":14,"priority":"MEDIUM","maxTeamSize":8}',
    },
    {
        type: "KANBAN", icon: "view_kanban", label: "Kanban", tagline: "Continuous flow with visual board columns",
        color: "#0ea5e9", tags: "kanban, continuous, flow, board",
        useCaseDescription: "Best for support teams and ongoing feature work with continuous delivery and no fixed iterations.",
        effort: "LOW", difficulty: "BEGINNER", duration: 30, teamStrategy: "MANUAL",
        phases: '[{"name":"Backlog","durationDays":0},{"name":"Ready","durationDays":0},{"name":"In Progress","durationDays":0},{"name":"Review","durationDays":0},{"name":"Done","durationDays":0}]',
        milestones: '[{"key":"kanban-first-delivery","name":"First Delivery","phaseKey":"phase-5","offsetDays":12}]',
        tasks: '[{"title":"Define board columns","milestoneKey":"kanban-first-delivery","phaseKey":"phase-1","priority":"low","estimatedHours":2},{"title":"Configure WIP limits","milestoneKey":"kanban-first-delivery","phaseKey":"phase-2","priority":"medium","estimatedHours":3}]',
        roles: '[{"role":"KANBAN_LEAD","count":1},{"role":"DEVELOPER","count":3},{"role":"REVIEWER","count":1}]',
        config: '{"methodology":"KANBAN","wipLimit":5,"priority":"MEDIUM"}',
    },
    {
        type: "WATERFALL", icon: "water", label: "Waterfall", tagline: "Sequential phase-gate with clear milestones",
        color: "#14b8a6", tags: "waterfall, sequential, phase-gate, milestone",
        useCaseDescription: "Best for projects with fixed requirements, regulatory compliance, or when all requirements are known upfront.",
        effort: "HIGH", difficulty: "ADVANCED", duration: 180, teamStrategy: "MANUAL",
        phases: '[{"name":"Requirements","durationDays":21},{"name":"System Design","durationDays":28},{"name":"Implementation","durationDays":60},{"name":"Integration & Testing","durationDays":30},{"name":"Deployment","durationDays":14},{"name":"Maintenance","durationDays":30}]',
        milestones: '[{"key":"scope-signoff","name":"Requirements Sign-off","phaseKey":"phase-1","offsetDays":21},{"key":"uat-approved","name":"UAT Approved","phaseKey":"phase-4","offsetDays":140}]',
        tasks: '[{"title":"Approve requirement baseline","milestoneKey":"scope-signoff","phaseKey":"phase-1","priority":"high","estimatedHours":8},{"title":"Execute regression suite","milestoneKey":"uat-approved","phaseKey":"phase-4","priority":"high","estimatedHours":24}]',
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
        .ios-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .ios-toggle-label { margin:0; font-size:14px; font-weight:600; color:#0f172a; }
        .ios-toggle { position:relative; display:inline-block; width:52px; height:32px; flex-shrink:0; }
        .ios-toggle input { position:absolute; width:0; height:0; opacity:0; }
        .ios-slider { position:absolute; inset:0; border-radius:999px; background:#d1d5db; box-shadow:inset 0 0 0 1px rgba(15,23,42,0.12); transition:background .18s ease; }
        .ios-slider::before { content:''; position:absolute; width:28px; height:28px; left:2px; top:2px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(15,23,42,0.24); transition:transform .18s ease; }
        .ios-toggle input:checked + .ios-slider { background:#34c759; }
        .ios-toggle input:checked + .ios-slider::before { transform:translateX(20px); }
        .ios-toggle input:focus-visible + .ios-slider { outline:2px solid rgba(99,102,241,0.5); outline-offset:2px; }
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

                    <div class="mb-3 p-3 rounded" style="background:rgba(15,23,42,0.03);border:1px solid rgba(15,23,42,0.12);">
                        <div class="ios-toggle-row mb-2">
                            <label class="ios-toggle-label" for="template-json-import-switch">
                                Use Existing Template JSON
                            </label>
                            <label class="ios-toggle" for="template-json-import-switch" aria-label="Toggle JSON template import mode">
                                <input
                                    id="template-json-import-switch"
                                    type="checkbox"
                                    [checked]="useTemplateJsonImport()"
                                    (change)="toggleTemplateJsonImport($any($event.target).checked)" />
                                <span class="ios-slider"></span>
                            </label>
                        </div>
                        <p class="small text-secondary mb-0">
                            @if (useTemplateJsonImport()) {
                                JSON mode is ON. Paste one template JSON and it will auto-fill the template fields.
                            } @else {
                                JSON mode is OFF. Continue with normal field-by-field template creation.
                            }
                        </p>
                    </div>

                    @if (useTemplateJsonImport()) {
                        <div class="mb-3 p-3 rounded" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);">
                            <p class="fw-medium mb-2" style="font-size:13px;">
                                <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:14px;width:14px;height:14px;color:#6366f1;">file_upload</mat-icon>
                                Template JSON Import
                            </p>

                            <mat-form-field appearance="outline" class="w-100 mb-2">
                                <mat-label>Paste full template JSON</mat-label>
                                <textarea
                                    #templateJsonInputRef
                                    matInput
                                    name="templateJsonInput"
                                    [(ngModel)]="templateJsonInput"
                                    rows="7"
                                    placeholder='{"name":"My Template","templateType":"SCRUM","defaultProjectConfigJson":{"methodology":"SCRUM"}}'
                                    (ngModelChange)="onTemplateJsonBodyChange($event)"></textarea>
                                <mat-hint>You can paste JSON containing name/type/phases/milestones/tasks/roles/config.</mat-hint>
                                @if (templateJsonError) { <mat-error>{{ templateJsonError }}</mat-error> }
                            </mat-form-field>

                            @if (!templateJsonError && templateJsonCompileSuccess) {
                                <p class="small mb-2" style="color:#15803d;">
                                    JSON body compiled successfully.
                                </p>
                            }

                            <div class="d-flex gap-2 justify-content-end flex-wrap">
                                <button matButton type="button" (click)="pasteTemplateJson()">
                                    <mat-icon class="material-icons-outlined">content_paste</mat-icon>
                                    Easy Paste
                                </button>
                                <button matButton type="button" (click)="compileTemplateJsonBody()">
                                    <mat-icon class="material-icons-outlined">fact_check</mat-icon>
                                    Compile JSON
                                </button>
                                <button matButton="filled" type="button" (click)="applyTemplateJson()">
                                    <mat-icon class="material-icons-outlined">auto_fix_high</mat-icon>
                                    Apply JSON
                                </button>
                            </div>
                        </div>
                    } @else {
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
                    }
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

            <!-- Step 2: Structure Builder (Visual UI) -->
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

                @if (isAcademicContext()) {
                    <div class="mb-3 p-3 rounded" style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.24);">
                        <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                            <div>
                                <p class="fw-medium mb-0" style="font-size:13px;">
                                    <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:14px;width:14px;height:14px;color:#0369a1;">library_books</mat-icon>
                                    Academic Source Pack (OpenAlex)
                                </p>
                                <p class="small text-secondary mb-0">Search papers and inject selected references as milestone tasks.</p>
                            </div>
                            <span class="badge" style="background:rgba(3,105,161,0.12);color:#0369a1;font-size:10px;">
                                {{ selectedAcademicTemplateSourceCount() }} selected
                            </span>
                        </div>

                        <div class="row gx-2 gy-2 mb-2">
                            <div class="col-12 col-md-4">
                                <mat-form-field appearance="outline" class="w-100 mb-0 inline-small">
                                    <mat-label>Target milestone</mat-label>
                                    <mat-select [(ngModel)]="academicSourceMilestoneKey" [disabled]="milestones().length === 0">
                                        @for (milestone of milestones(); track milestone.key) {
                                            <mat-option [value]="milestone.key">{{ milestone.name || 'Unnamed milestone' }}</mat-option>
                                        }
                                    </mat-select>
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-5">
                                <mat-form-field appearance="outline" class="w-100 mb-0 inline-small">
                                    <mat-label>Paper topic</mat-label>
                                    <input matInput [(ngModel)]="academicSourceQuery" placeholder="e.g. software quality assurance" />
                                </mat-form-field>
                            </div>
                            <div class="col-12 col-md-3 d-flex gap-2 align-items-start">
                                <button matButton="filled" (click)="searchAcademicSourcesForTemplate()" [disabled]="academicSourcesLoading()" style="height:40px;">
                                    <mat-icon class="material-icons-outlined">search</mat-icon>
                                    {{ academicSourcesLoading() ? 'Searching...' : 'Search' }}
                                </button>
                                <button matButton (click)="injectSelectedAcademicSourcesIntoTemplate()" [disabled]="selectedAcademicTemplateSourceCount() === 0 || milestones().length === 0" style="height:40px;">
                                    <mat-icon class="material-icons-outlined">playlist_add</mat-icon>
                                    Inject
                                </button>
                            </div>
                        </div>

                        @if (academicSourceWarning()) {
                            <p class="small mb-2" style="color:#92400e;">{{ academicSourceWarning() }}</p>
                        }
                        @if (academicSourceError()) {
                            <p class="small mb-2" style="color:#991b1b;">{{ academicSourceError() }}</p>
                        }

                        @if (academicSourcesLoading()) {
                            <div class="small text-secondary py-1">Searching OpenAlex...</div>
                        } @else if (academicSources().length > 0) {
                            <div style="max-height:220px;overflow-y:auto;border:1px solid rgba(0,0,0,0.08);border-radius:8px;background:#fff;">
                                @for (source of academicSources(); track source.key) {
                                    <div style="padding:10px 12px;border-bottom:1px solid rgba(0,0,0,0.06);">
                                        <div class="d-flex align-items-start gap-2">
                                            <input type="checkbox" [checked]="source.selected" (change)="toggleAcademicTemplateSourceSelection(source.key)" style="margin-top:2px;" />
                                            <div class="flex-grow-1">
                                                <p class="mb-1" style="font-size:12px;font-weight:600;line-height:1.35;">{{ source.title }}</p>
                                                <p class="text-secondary mb-1" style="font-size:10px;line-height:1.3;">
                                                    @if (source.firstAuthor) { {{ source.firstAuthor }} · }
                                                    @if (source.publicationYear) { {{ source.publicationYear }} · }
                                                    @if (source.citedByCount !== null && source.citedByCount !== undefined) { {{ source.citedByCount }} citations }
                                                </p>
                                                <div class="d-flex align-items-center gap-2 flex-wrap">
                                                    @if (source.openAccessUrl) {
                                                        <a [href]="source.openAccessUrl" target="_blank" rel="noopener" style="font-size:10px;color:#0369a1;" (click)="$event.stopPropagation()">Open access</a>
                                                    }
                                                    @if (!source.openAccessUrl && source.landingPageUrl) {
                                                        <a [href]="source.landingPageUrl" target="_blank" rel="noopener" style="font-size:10px;color:#0369a1;" (click)="$event.stopPropagation()">Source page</a>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }

                <mat-divider class="mb-3"></mat-divider>

                <!-- ── Milestones & Tasks ── -->
                <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <div>
                            <p class="fw-medium mb-0">
                                <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:16px;width:16px;height:16px;color:#0ea5e9;">flag</mat-icon>
                                Milestones & Tasks
                                <span class="badge badge-light ms-1">{{ milestones().length }} milestones</span>
                                <span class="badge badge-light ms-1">{{ totalTaskCount() }} tasks</span>
                            </p>
                            <p class="text-secondary small mb-0">Create milestones first, then add tasks inside each milestone</p>
                        </div>
                        <button matButton (click)="addMilestone()" [disabled]="phases().length === 0">
                            <mat-icon class="material-icons-outlined">add</mat-icon> Add Milestone
                        </button>
                    </div>

                    @if (phases().length === 0) {
                        <div class="empty-state mb-2">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:28px;width:28px;height:28px;">account_tree</mat-icon>
                            <p class="text-secondary small mb-0">Add at least one phase before creating milestones.</p>
                        </div>
                    }

                    @if (phases().length > 0 && milestones().length === 0) {
                        <div class="empty-state mb-2">
                            <mat-icon class="material-icons-outlined text-secondary mb-1" style="font-size:28px;width:28px;height:28px;">flag</mat-icon>
                            <p class="text-secondary small mb-0">No milestones yet. Add your first milestone and attach tasks to it.</p>
                        </div>
                    }

                    @for (milestone of milestones(); track milestone.key; let mi = $index) {
                        <div class="row-card" style="border-left:4px solid rgba(14,165,233,0.55);">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <div class="phase-badge" style="background:rgba(14,165,233,0.12);color:#0ea5e9;">M{{ mi + 1 }}</div>

                                <div class="flex-grow-1">
                                    <mat-form-field appearance="outline" class="w-100 mb-0" style="font-size:13px;">
                                        <mat-label>Milestone name</mat-label>
                                        <input matInput [value]="milestone.name"
                                            (input)="updateMilestoneName(mi, $any($event.target).value)"
                                            placeholder="e.g. Kickoff" />
                                        @if (milestoneNameErrors()[mi]) {
                                            <mat-error>{{ milestoneNameErrors()[mi] }}</mat-error>
                                        }
                                    </mat-form-field>
                                </div>

                                <mat-form-field appearance="outline" style="width:200px;font-size:13px;flex-shrink:0;" class="mb-0">
                                    <mat-label>Phase</mat-label>
                                    <mat-select [value]="milestone.phaseKey || ''" (selectionChange)="updateMilestonePhase(mi, $event.value)">
                                        <mat-option value="">No phase</mat-option>
                                        @for (phase of phases(); track phase.key) {
                                            <mat-option [value]="phase.key">{{ phase.name || 'Unnamed phase' }}</mat-option>
                                        }
                                    </mat-select>
                                    @if (milestonePhaseErrors()[mi]) {
                                        <mat-error>{{ milestonePhaseErrors()[mi] }}</mat-error>
                                    }
                                </mat-form-field>

                                <mat-form-field appearance="outline" style="width:120px;font-size:13px;flex-shrink:0;" class="mb-0">
                                    <mat-label>Offset (d)</mat-label>
                                    <input matInput type="number" [value]="milestone.offsetDays"
                                        (input)="updateMilestoneOffset(mi, +$any($event.target).value)"
                                        min="0" />
                                </mat-form-field>

                                <button matIconButton (click)="removeMilestone(mi)" style="flex-shrink:0;color:#ef4444;">
                                    <mat-icon class="material-icons-outlined">delete_outline</mat-icon>
                                </button>
                            </div>

                            <mat-form-field appearance="outline" class="w-100 mb-2" style="font-size:13px;">
                                <mat-label>Description (optional)</mat-label>
                                <textarea matInput rows="2" [value]="milestone.description || ''"
                                    (input)="updateMilestoneDescription(mi, $any($event.target).value)"
                                    placeholder="What should be achieved by this milestone?"></textarea>
                            </mat-form-field>

                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <p class="small mb-0" style="color:#0f172a;">
                                    <mat-icon class="material-icons-outlined align-middle me-1" style="font-size:14px;width:14px;height:14px;color:#f59e0b;">checklist</mat-icon>
                                    Tasks in this milestone
                                    <span class="badge badge-light ms-1">{{ milestone.tasks.length }}</span>
                                </p>
                                <button matButton (click)="addTask(mi)">
                                    <mat-icon class="material-icons-outlined">add</mat-icon> Add Task
                                </button>
                            </div>

                            @if (milestone.tasks.length === 0) {
                                <div class="empty-state" style="padding:10px 12px;">
                                    <p class="text-secondary small mb-0">No tasks yet for this milestone.</p>
                                </div>
                            }

                            @for (task of milestone.tasks; track task.key; let ti = $index) {
                                <div class="d-flex align-items-center gap-2 mt-2" style="border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:10px;background:rgba(245,158,11,0.05);">
                                    <div class="flex-grow-1">
                                        <mat-form-field appearance="outline" class="w-100 mb-0" style="font-size:13px;">
                                            <mat-label>Task title</mat-label>
                                            <input matInput [value]="task.title"
                                                (input)="updateTaskTitle(mi, ti, $any($event.target).value)"
                                                placeholder="e.g. Prepare sprint plan" />
                                        </mat-form-field>
                                    </div>

                                    <mat-form-field appearance="outline" style="width:130px;font-size:13px;flex-shrink:0;" class="mb-0">
                                        <mat-label>Priority</mat-label>
                                        <mat-select [value]="task.priority" (selectionChange)="updateTaskPriority(mi, ti, $event.value)">
                                            <mat-option value="low">Low</mat-option>
                                            <mat-option value="medium">Medium</mat-option>
                                            <mat-option value="high">High</mat-option>
                                        </mat-select>
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" style="width:110px;font-size:13px;flex-shrink:0;" class="mb-0">
                                        <mat-label>Hours</mat-label>
                                        <input matInput type="number" [value]="task.estimatedHours ?? null"
                                            (input)="updateTaskEstimatedHours(mi, ti, $any($event.target).value)"
                                            min="0" />
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" style="width:110px;font-size:13px;flex-shrink:0;" class="mb-0">
                                        <mat-label>Start +d</mat-label>
                                        <input matInput type="number" [value]="task.startOffsetDays ?? null"
                                            (input)="updateTaskStartOffset(mi, ti, $any($event.target).value)"
                                            min="0" />
                                    </mat-form-field>

                                    <mat-form-field appearance="outline" style="width:110px;font-size:13px;flex-shrink:0;" class="mb-0">
                                        <mat-label>Due +d</mat-label>
                                        <input matInput type="number" [value]="task.dueOffsetDays ?? null"
                                            (input)="updateTaskDueOffset(mi, ti, $any($event.target).value)"
                                            min="0" />
                                    </mat-form-field>

                                    <button matIconButton (click)="removeTask(mi, ti)" style="flex-shrink:0;color:#ef4444;">
                                        <mat-icon class="material-icons-outlined">delete_outline</mat-icon>
                                    </button>
                                </div>
                            }
                        </div>
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
                <div class="summary-row"><span>Project Config Preset</span><strong>{{ defaultProjectConfigJson.trim() ? '✓ provided' : '—' }}</strong></div>
                <div class="summary-row"><span>Milestones</span><strong>{{ milestones().length > 0 ? milestones().length + ' milestones' : '—' }}</strong></div>
                <div class="summary-row"><span>Tasks</span><strong>{{ totalTaskCount() > 0 ? totalTaskCount() + ' tasks' : '—' }}</strong></div>
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
    @ViewChild("templateJsonInputRef") templateJsonInputRef?: ElementRef<HTMLTextAreaElement>;

    private readonly dialogRef = inject(MatDialogRef<CreateTemplateDialogComponent>);
    private readonly templateService = inject(M2TemplateService);
    private readonly authService = inject(AuthService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialogData = inject<{ starterType?: string } | null>(MAT_DIALOG_DATA, { optional: true });

    readonly mode = signal<"pick" | "wizard">("pick");
    readonly pickedType = signal<string>("");
    readonly currentStep = signal(0);
    readonly stepLabels = ["Basics", "Complexity", "Structure", "Review"];
    readonly useTemplateJsonImport = signal(false);
    readonly submitting = signal(false);

    readonly starters: TemplateStarter[] = STARTERS;

    private sequence = 0;

    // Structure rows used by the visual builder
    readonly phases = signal<PhaseRow[]>([]);
    readonly milestones = signal<MilestoneRow[]>([]);
    readonly roles = signal<RoleRow[]>([]);

    readonly validRoles = computed(() => this.roles().filter(r => r.role.trim().length > 0));
    readonly totalPhaseDays = computed(() => this.phases().reduce((s, p) => s + (p.durationDays || 0), 0));
    readonly totalTaskCount = computed(() => this.milestones().reduce((sum, m) => sum + m.tasks.length, 0));
    readonly isAcademicContext = computed(() =>
        String(this.authService.currentOrganization()?.organizationType || "").toUpperCase() === "ACADEMIC"
    );
    readonly academicSources = signal<AcademicTemplateSourceCandidate[]>([]);
    readonly academicSourcesLoading = signal(false);
    readonly academicSourceError = signal("");
    readonly academicSourceWarning = signal("");
    readonly selectedAcademicTemplateSourceCount = computed(() => this.academicSources().filter((item) => item.selected).length);
    phaseNameErrors = signal<string[]>([]);
    milestoneNameErrors = signal<string[]>([]);
    milestonePhaseErrors = signal<string[]>([]);
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
    templateJsonInput = "";
    templateJsonError = "";
    templateJsonCompileSuccess = false;
    // Step 1
    estimatedEffort = "";
    difficultyLevel = "";
    estimatedDurationDays: number | null = null;
    teamStrategy = "MANUAL";
    tags = "";
    // Step 2 (structure + roles use signal arrays)
    defaultProjectConfigJson = "";
    defaultMilestonesJson = "";
    defaultTasksJson = "";
    configJsonError = "";
    academicSourceQuery = "";
    academicSourceMilestoneKey = "";

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
        this.defaultMilestonesJson = "";
        this.defaultTasksJson = "";
        if (s.type !== "CUSTOM") {
            this.name = s.label + " Template";
        }

        // Parse phases JSON into typed array
        try {
            const parsed = JSON.parse(s.phases || "[]");
            this.phases.set(
                Array.isArray(parsed)
                    ? parsed.map((p: { name?: string; durationDays?: number; key?: string }) => ({
                          key: String(p.key || this.makeKey("phase")),
                          name: p.name || "",
                          durationDays: p.durationDays ?? 0,
                      }))
                    : []
            );
        } catch { this.phases.set([]); }

        this.applyStructureFromJson(s.milestones || "", s.tasks || "");

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

        this.phaseNameErrors.set([]);
        this.milestoneNameErrors.set([]);
        this.milestonePhaseErrors.set([]);
        this.roleNameErrors.set([]);
        this.syncStructureJsonFields();
    }

    backToPick(): void {
        this.mode.set("pick");
        this.currentStep.set(0);
    }

    toggleTemplateJsonImport(enabled: boolean): void {
        this.useTemplateJsonImport.set(enabled);
        this.templateJsonError = "";
        this.templateJsonCompileSuccess = false;
    }

    onTemplateJsonBodyChange(value: string): void {
        this.templateJsonInput = value;
        this.compileTemplateJson(false, true);
    }

    async pasteTemplateJson(): Promise<void> {
        const applyPastedText = (text: string): void => {
            this.templateJsonInput = text;
            this.onTemplateJsonBodyChange(text);
        };

        const canReadClipboard =
            typeof navigator !== "undefined"
            && !!navigator.clipboard
            && typeof navigator.clipboard.readText === "function";

        try {
            if (canReadClipboard) {
                const clipboard = await navigator.clipboard.readText();
                if (!clipboard || !clipboard.trim()) {
                    this.snackBar.open("Clipboard is empty.", "Close", { duration: 2500 });
                    this.focusTemplateJsonInput();
                    return;
                }
                applyPastedText(clipboard);
                this.snackBar.open("JSON pasted from clipboard.", "Close", { duration: 2200 });
                return;
            }
        } catch {
            // Continue to legacy fallback.
        }

        const inputEl = this.templateJsonInputRef?.nativeElement;
        if (inputEl && typeof document !== "undefined" && typeof document.execCommand === "function") {
            const before = inputEl.value || "";
            inputEl.focus();
            inputEl.select();

            let commandTriggered = false;
            try {
                commandTriggered = document.execCommand("paste");
            } catch {
                commandTriggered = false;
            }

            await new Promise(resolve => setTimeout(resolve, 30));

            const after = inputEl.value || "";
            if (commandTriggered && after !== before && after.trim()) {
                applyPastedText(after);
                this.snackBar.open("JSON pasted.", "Close", { duration: 2200 });
                return;
            }
        }

        this.focusTemplateJsonInput();
        this.templateJsonCompileSuccess = false;
        this.templateJsonError = "Clipboard access is blocked for button paste. Click the JSON box and press Ctrl+V.";
        this.snackBar.open("Clipboard blocked for button paste. Press Ctrl+V in the JSON box.", "Close", { duration: 4200 });
    }

    private focusTemplateJsonInput(): void {
        const inputEl = this.templateJsonInputRef?.nativeElement;
        if (!inputEl) return;

        inputEl.focus();
        const cursor = inputEl.value?.length ?? 0;
        try {
            inputEl.setSelectionRange(cursor, cursor);
        } catch {
            // Ignore selection errors on unsupported input states.
        }
    }

    compileTemplateJsonBody(): void {
        this.compileTemplateJson(true, false);
    }

    private compileTemplateJson(requireValue: boolean, silent: boolean): Record<string, unknown> | null {
        const raw = (this.templateJsonInput || "").trim();

        if (!raw) {
            this.templateJsonCompileSuccess = false;
            if (requireValue) {
                this.templateJsonError = "Template JSON body is required.";
                if (!silent) {
                    this.snackBar.open(this.templateJsonError, "Close", { duration: 3500 });
                }
            } else {
                this.templateJsonError = "";
            }
            return null;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Template JSON must be a JSON object.");
            }

            this.templateJsonError = "";
            this.templateJsonCompileSuccess = true;
            if (!silent) {
                this.snackBar.open("JSON body is valid.", "Close", { duration: 2200 });
            }
            return parsed as Record<string, unknown>;
        } catch (error) {
            this.templateJsonCompileSuccess = false;
            this.templateJsonError = this.formatJsonCompileError(error, raw);
            if (!silent) {
                this.snackBar.open(this.templateJsonError, "Close", { duration: 4500 });
            }
            return null;
        }
    }

    private formatJsonCompileError(error: unknown, raw: string): string {
        if (!(error instanceof Error)) {
            return "JSON error: invalid JSON body.";
        }

        const message = error.message || "Invalid JSON body.";
        const match = message.match(/position\s+(\d+)/i);
        if (!match) {
            return `JSON error: ${message}`;
        }

        const position = Number(match[1]);
        if (!Number.isFinite(position) || position < 0) {
            return `JSON error: ${message}`;
        }

        const before = raw.slice(0, position);
        const line = before.split("\n").length;
        const column = position - before.lastIndexOf("\n");
        return `JSON error at line ${line}, column ${column}: ${message}`;
    }

    applyTemplateJson(): void {
        this.applyTemplateJsonFromInput(false);
    }

    private applyTemplateJsonFromInput(silent: boolean): boolean {
        const payload = this.compileTemplateJson(true, silent);
        if (!payload) {
            return false;
        }

        try {
            const parsedPayload = payload as Record<string, unknown>;

            const importedName = this.pickFirstText(parsedPayload, ["name", "templateName", "title"]);
            if (importedName) this.name = importedName;

            const importedType = (this.pickFirstText(parsedPayload, ["templateType", "type"]) || "").toUpperCase();
            if (["SCRUM", "KANBAN", "WATERFALL", "CUSTOM"].includes(importedType)) {
                this.templateType = importedType;
            }

            const importedUseCase = this.pickFirstText(parsedPayload, ["useCaseDescription", "description", "useCase"]);
            if (importedUseCase) this.useCaseDescription = importedUseCase;

            const importedPreview = this.pickFirstText(parsedPayload, ["previewImageUrl", "previewUrl", "imageUrl"]);
            if (importedPreview) this.previewImageUrl = importedPreview;

            const importedEffort = (this.pickFirstText(parsedPayload, ["estimatedEffort", "effort"]) || "").toUpperCase();
            if (["LOW", "MEDIUM", "HIGH"].includes(importedEffort)) {
                this.estimatedEffort = importedEffort;
            }

            const importedDifficulty = (this.pickFirstText(parsedPayload, ["difficultyLevel", "difficulty"]) || "").toUpperCase();
            if (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(importedDifficulty)) {
                this.difficultyLevel = importedDifficulty;
            }

            const importedDuration = this.pickFirstValue(parsedPayload, ["estimatedDurationDays", "durationDays", "duration"]);
            if (importedDuration !== undefined && importedDuration !== null && String(importedDuration).trim() !== "") {
                const durationAsNumber = Number(importedDuration);
                if (Number.isFinite(durationAsNumber) && durationAsNumber > 0) {
                    this.estimatedDurationDays = Math.round(durationAsNumber);
                }
            }

            const importedTeamStrategy = (this.pickFirstText(parsedPayload, ["teamStrategy", "strategy"]) || "").toUpperCase();
            if (["MANUAL", "AUTO", "HYBRID"].includes(importedTeamStrategy)) {
                this.teamStrategy = importedTeamStrategy;
            }

            const tagsRaw = this.pickFirstValue(parsedPayload, ["tags"]);
            if (Array.isArray(tagsRaw)) {
                this.tags = tagsRaw.map(tag => String(tag).trim()).filter(Boolean).join(", ");
            } else if (typeof tagsRaw === "string") {
                this.tags = tagsRaw;
            }

            const configRaw = this.pickFirstValue(parsedPayload, ["defaultProjectConfigJson", "projectConfig", "config"]);
            if (configRaw !== undefined) {
                this.defaultProjectConfigJson = this.normalizeConfigJsonValue(configRaw);
            }

            const phasesRaw = this.pickFirstValue(parsedPayload, ["defaultPhasesJson", "phases"]);
            if (phasesRaw !== undefined) {
                this.applyPhasesFromUnknown(phasesRaw);
            }

            const milestonesRaw = this.pickFirstValue(parsedPayload, ["defaultMilestonesJson", "milestones"]);
            const tasksRaw = this.pickFirstValue(parsedPayload, ["defaultTasksJson", "tasks"]);
            if (milestonesRaw !== undefined || tasksRaw !== undefined) {
                const milestonesJson = milestonesRaw === undefined ? "" : this.stringifyJsonValue(milestonesRaw);
                const tasksJson = tasksRaw === undefined ? "" : this.stringifyJsonValue(tasksRaw);
                this.applyStructureFromJson(milestonesJson, tasksJson);
            }

            const rolesRaw = this.pickFirstValue(parsedPayload, ["defaultRolesJson", "roles"]);
            if (rolesRaw !== undefined) {
                this.applyRolesFromUnknown(rolesRaw);
            }

            this.phaseNameErrors.set([]);
            this.milestoneNameErrors.set([]);
            this.milestonePhaseErrors.set([]);
            this.roleNameErrors.set([]);
            this.configJsonError = "";
            this.syncStructureJsonFields();

            if (!silent) {
                this.snackBar.open("Template JSON applied.", "Close", { duration: 2500 });
            }
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to apply template JSON.";
            this.templateJsonError = message;
            if (!silent) this.snackBar.open(message, "Close", { duration: 4000 });
            return false;
        }
    }

    private applyPhasesFromUnknown(rawValue: unknown): void {
        const phases = this.normalizeImportedArray(rawValue, "Phases");
        if (phases === null) return;

        this.phases.set(
            phases.map((phase, index) => {
                const rawDuration = Number(phase["durationDays"] ?? phase["duration"] ?? 0);
                const durationDays = Number.isFinite(rawDuration) ? Math.max(0, Math.round(rawDuration)) : 0;
                return {
                    key: String(phase["key"] || this.makeKey("phase")),
                    name: String(phase["name"] || phase["title"] || `Phase ${index + 1}`),
                    durationDays,
                };
            })
        );
    }

    private applyRolesFromUnknown(rawValue: unknown): void {
        const roles = this.normalizeImportedArray(rawValue, "Roles");
        if (roles === null) return;

        this.roles.set(
            roles.map((role) => {
                const rawCount = Number(role["count"] ?? 1);
                const count = Number.isFinite(rawCount) ? Math.max(1, Math.round(rawCount)) : 1;
                return {
                    role: String(role["role"] || role["name"] || ""),
                    count,
                };
            })
        );
    }

    private normalizeImportedArray(rawValue: unknown, label: string): Array<Record<string, unknown>> | null {
        if (rawValue === undefined || rawValue === null) return null;

        let parsed: unknown = rawValue;
        if (typeof rawValue === "string") {
            const trimmed = rawValue.trim();
            if (!trimmed) return [];
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                throw new Error(`${label} must be a valid JSON array.`);
            }
        }

        if (!Array.isArray(parsed)) {
            throw new Error(`${label} must be a JSON array.`);
        }
        return parsed as Array<Record<string, unknown>>;
    }

    private stringifyJsonValue(rawValue: unknown): string {
        if (rawValue === undefined || rawValue === null) return "";
        if (typeof rawValue === "string") return rawValue.trim();
        try {
            return JSON.stringify(rawValue, null, 2);
        } catch {
            return "";
        }
    }

    private normalizeConfigJsonValue(rawValue: unknown): string {
        if (rawValue === undefined || rawValue === null) return "";

        if (typeof rawValue === "string") {
            const trimmed = rawValue.trim();
            if (!trimmed) return "";
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
                    throw new Error("Project config must be a JSON object.");
                }
                return JSON.stringify(parsed, null, 2);
            } catch {
                throw new Error("Template JSON contains invalid project config JSON.");
            }
        }

        if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
            try {
                return JSON.stringify(rawValue, null, 2);
            } catch {
                return "";
            }
        }

        throw new Error("Project config must be a JSON object.");
    }

    private pickFirstValue(payload: Record<string, unknown>, keys: string[]): unknown {
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
                return payload[key];
            }
        }
        return undefined;
    }

    private pickFirstText(payload: Record<string, unknown>, keys: string[]): string | null {
        const value = this.pickFirstValue(payload, keys);
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    nextStep(): void {
        if (this.currentStep() === 0) {
            if (this.useTemplateJsonImport()) {
                const imported = this.applyTemplateJsonFromInput(true);
                if (!imported) return;

                if (!this.name.trim() || this.name.trim().length < 3) {
                    this.templateJsonError = "Imported template must include a valid name (min 3 characters).";
                    return;
                }
            } else {
                if (this.basicsForm) {
                    this.basicsForm.form.markAllAsTouched();
                    if (this.basicsForm.invalid) return;
                } else {
                    if (!this.name.trim() || this.name.trim().length < 3) return;
                }
            }

        }
        if (this.currentStep() === 2) {
            // Validate phase names — each phase must have a non-empty name
            const errors = this.phases().map(p => p.name.trim() ? "" : "Phase name is required.");
            this.phaseNameErrors.set(errors);
            if (errors.some(e => e)) return;

            // Validate milestone names and phase links
            const milestoneNameErrors = this.milestones().map(m => m.name.trim() ? "" : "Milestone name is required.");
            this.milestoneNameErrors.set(milestoneNameErrors);
            if (milestoneNameErrors.some(e => e)) return;

            const validPhaseKeys = new Set(this.phases().map(p => p.key || ""));
            const milestonePhaseErrors = this.milestones().map(m =>
                m.phaseKey && !validPhaseKeys.has(m.phaseKey) ? "Milestone phase must reference an existing phase." : ""
            );
            this.milestonePhaseErrors.set(milestonePhaseErrors);
            if (milestonePhaseErrors.some(e => e)) return;

            for (const milestone of this.milestones()) {
                for (const task of milestone.tasks) {
                    if (!task.title.trim()) {
                        this.snackBar.open("Each task must have a title.", "Close", { duration: 3500 });
                        return;
                    }
                    const startOffset = task.startOffsetDays;
                    const dueOffset = task.dueOffsetDays;
                    if (
                        startOffset !== undefined &&
                        dueOffset !== undefined &&
                        dueOffset < startOffset
                    ) {
                        this.snackBar.open("Task due offset must be greater than or equal to start offset.", "Close", { duration: 3500 });
                        return;
                    }
                }
            }

            // Validate role names — each added role must have a non-empty name
            const roleErrors = this.roles().map(r => r.role.trim() ? "" : "Role name is required.");
            this.roleNameErrors.set(roleErrors);
            if (roleErrors.some(e => e)) return;

            this.syncStructureJsonFields();
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
        this.phases.update(ps => [...ps, { key: this.makeKey("phase"), name: `Phase ${ps.length + 1}`, durationDays: 14 }]);
        this.syncStructureJsonFields();
    }
    removePhase(index: number): void {
        const removed = this.phases()[index];
        this.phases.update(ps => ps.filter((_, i) => i !== index));
        this.phaseNameErrors.update(errs => errs.filter((_, i) => i !== index));

        if (removed?.key) {
            const fallbackKey = this.phases()[0]?.key;
            this.milestones.update(ms => ms.map(m =>
                m.phaseKey === removed.key
                    ? { ...m, phaseKey: fallbackKey }
                    : m
            ));
        }
        this.syncStructureJsonFields();
    }
    updatePhaseName(index: number, name: string): void {
        this.phases.update(ps => ps.map((p, i) => i === index ? { ...p, name } : p));
        if (name.trim()) {
            this.phaseNameErrors.update(errs => errs.map((e, i) => i === index ? "" : e));
        }
        this.syncStructureJsonFields();
    }
    updatePhaseDuration(index: number, durationDays: number): void {
        this.phases.update(ps => ps.map((p, i) => i === index ? { ...p, durationDays: isNaN(durationDays) ? 0 : durationDays } : p));
        this.syncStructureJsonFields();
    }

    // ── Milestone and task management ──
    addMilestone(): void {
        const firstPhaseKey = this.phases()[0]?.key;
        this.milestones.update(ms => [...ms, {
            key: this.makeKey("milestone"),
            name: `Milestone ${ms.length + 1}`,
            description: "",
            phaseKey: firstPhaseKey,
            offsetDays: this.totalPhaseDays(),
            tasks: [],
        }]);
        if (!this.academicSourceMilestoneKey) {
            this.academicSourceMilestoneKey = this.milestones()[0]?.key || "";
        }
        this.syncStructureJsonFields();
    }

    removeMilestone(index: number): void {
        const removedMilestoneKey = this.milestones()[index]?.key;
        this.milestones.update(ms => ms.filter((_, i) => i !== index));
        this.milestoneNameErrors.update(errs => errs.filter((_, i) => i !== index));
        this.milestonePhaseErrors.update(errs => errs.filter((_, i) => i !== index));

        if (removedMilestoneKey && this.academicSourceMilestoneKey === removedMilestoneKey) {
            this.academicSourceMilestoneKey = this.milestones()[0]?.key || "";
        }
        this.syncStructureJsonFields();
    }

    updateMilestoneName(index: number, name: string): void {
        this.milestones.update(ms => ms.map((m, i) => i === index ? { ...m, name } : m));
        if (name.trim()) {
            this.milestoneNameErrors.update(errs => errs.map((e, i) => i === index ? "" : e));
        }
        this.syncStructureJsonFields();
    }

    updateMilestoneDescription(index: number, description: string): void {
        this.milestones.update(ms => ms.map((m, i) => i === index ? { ...m, description } : m));
        this.syncStructureJsonFields();
    }

    updateMilestonePhase(index: number, phaseKey: string): void {
        this.milestones.update(ms => ms.map((m, i) => i === index ? { ...m, phaseKey: phaseKey || undefined } : m));
        this.milestonePhaseErrors.update(errs => errs.map((e, i) => i === index ? "" : e));
        this.syncStructureJsonFields();
    }

    updateMilestoneOffset(index: number, offsetDays: number): void {
        this.milestones.update(ms => ms.map((m, i) => i === index ? { ...m, offsetDays: isNaN(offsetDays) ? 0 : Math.max(0, offsetDays) } : m));
        this.syncStructureJsonFields();
    }

    addTask(milestoneIndex: number): void {
        this.milestones.update(ms => ms.map((m, i) =>
            i === milestoneIndex
                ? {
                    ...m,
                    tasks: [...m.tasks, {
                        key: this.makeKey("task"),
                        title: "",
                        description: "",
                        priority: "medium",
                    }],
                }
                : m
        ));
        this.syncStructureJsonFields();
    }

    removeTask(milestoneIndex: number, taskIndex: number): void {
        this.milestones.update(ms => ms.map((m, i) =>
            i === milestoneIndex
                ? { ...m, tasks: m.tasks.filter((_, ti) => ti !== taskIndex) }
                : m
        ));
        this.syncStructureJsonFields();
    }

    updateTaskTitle(milestoneIndex: number, taskIndex: number, title: string): void {
        this.patchTask(milestoneIndex, taskIndex, { title });
    }

    updateTaskPriority(milestoneIndex: number, taskIndex: number, priority: "low" | "medium" | "high"): void {
        this.patchTask(milestoneIndex, taskIndex, { priority });
    }

    updateTaskEstimatedHours(milestoneIndex: number, taskIndex: number, hoursRaw: string): void {
        const value = hoursRaw?.toString().trim() === "" ? undefined : Number(hoursRaw);
        this.patchTask(milestoneIndex, taskIndex, { estimatedHours: Number.isFinite(value as number) ? Math.max(0, Number(value)) : undefined });
    }

    updateTaskStartOffset(milestoneIndex: number, taskIndex: number, raw: string): void {
        const value = raw?.toString().trim() === "" ? undefined : Number(raw);
        this.patchTask(milestoneIndex, taskIndex, { startOffsetDays: Number.isFinite(value as number) ? Math.max(0, Number(value)) : undefined });
    }

    updateTaskDueOffset(milestoneIndex: number, taskIndex: number, raw: string): void {
        const value = raw?.toString().trim() === "" ? undefined : Number(raw);
        this.patchTask(milestoneIndex, taskIndex, { dueOffsetDays: Number.isFinite(value as number) ? Math.max(0, Number(value)) : undefined });
    }

    private patchTask(milestoneIndex: number, taskIndex: number, patch: Partial<MilestoneTaskRow>): void {
        this.milestones.update(ms => ms.map((m, mi) =>
            mi === milestoneIndex
                ? {
                    ...m,
                    tasks: m.tasks.map((t, ti) => ti === taskIndex ? { ...t, ...patch } : t),
                }
                : m
        ));
        this.syncStructureJsonFields();
    }

    searchAcademicSourcesForTemplate(): void {
        if (!this.isAcademicContext()) {
            this.academicSourceError.set("Academic source pack is only available for academic organizations.");
            return;
        }

        const query = (this.academicSourceQuery || this.name || this.useCaseDescription || "").trim();
        if (!query) {
            this.academicSourceError.set("Enter a topic to search academic sources.");
            this.academicSourceWarning.set("");
            this.academicSources.set([]);
            return;
        }

        this.academicSourceQuery = query;
        this.academicSourcesLoading.set(true);
        this.academicSourceError.set("");
        this.academicSourceWarning.set("");

        this.templateService.getAcademicSources(query, { perPage: 8 }).subscribe({
            next: (response) => {
                const items = (response.items || []).map((item, index) => this.toAcademicTemplateSource(item, index));
                this.academicSources.set(items);
                this.academicSourceWarning.set(response.warning || "");
                this.academicSourcesLoading.set(false);
            },
            error: (error: any) => {
                this.academicSources.set([]);
                this.academicSourceWarning.set("");
                this.academicSourcesLoading.set(false);
                this.academicSourceError.set(error?.error?.message || error?.message || "Unable to fetch academic sources.");
            },
        });
    }

    toggleAcademicTemplateSourceSelection(key: string): void {
        this.academicSources.update((items) =>
            items.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item))
        );
    }

    injectSelectedAcademicSourcesIntoTemplate(): void {
        const selected = this.academicSources().filter((item) => item.selected);
        if (selected.length === 0) {
            this.snackBar.open("Select at least one paper to inject.", "Close", { duration: 2500 });
            return;
        }

        const allMilestones = this.milestones();
        if (allMilestones.length === 0) {
            this.snackBar.open("Add at least one milestone before injecting academic sources.", "Close", { duration: 3200 });
            return;
        }

        const targetMilestoneKey = this.academicSourceMilestoneKey || allMilestones[0].key;
        const targetIndex = allMilestones.findIndex((milestone) => milestone.key === targetMilestoneKey);
        if (targetIndex < 0) {
            this.snackBar.open("Select a valid milestone for injection.", "Close", { duration: 2800 });
            return;
        }

        const existingMarkers = new Set(
            allMilestones
                .flatMap((milestone) => milestone.tasks)
                .map((task) => task.description || "")
                .filter((description) => description.includes("[OpenAlex:"))
        );

        let skippedDuplicates = 0;
        const injectedTasks: MilestoneTaskRow[] = [];

        for (const source of selected) {
            const marker = this.openAlexMarker(source);
            const alreadyExists = Array.from(existingMarkers).some((description) => description.includes(marker));
            if (alreadyExists) {
                skippedDuplicates += 1;
                continue;
            }

            const sourceTitle = source.title || "Untitled paper";
            const taskTitle = `Read paper: ${sourceTitle.length > 86 ? `${sourceTitle.slice(0, 83)}...` : sourceTitle}`;
            const description = [
                marker,
                source.firstAuthor ? `Author: ${source.firstAuthor}` : null,
                source.publicationYear ? `Year: ${source.publicationYear}` : null,
                source.citedByCount !== null && source.citedByCount !== undefined ? `Citations: ${source.citedByCount}` : null,
                source.openAccessUrl
                    ? `Open access: ${source.openAccessUrl}`
                    : (source.landingPageUrl ? `Source: ${source.landingPageUrl}` : null),
            ]
                .filter((line): line is string => !!line)
                .join("\n");

            injectedTasks.push({
                key: this.makeKey("task"),
                title: taskTitle,
                description,
                priority: "medium",
                estimatedHours: 2,
            });
            existingMarkers.add(description);
        }

        if (injectedTasks.length === 0) {
            this.snackBar.open("All selected papers were already injected.", "Close", { duration: 2800 });
            return;
        }

        this.milestones.update((milestones) =>
            milestones.map((milestone, index) =>
                index === targetIndex
                    ? { ...milestone, tasks: [...milestone.tasks, ...injectedTasks] }
                    : milestone
            )
        );
        this.academicSources.update((items) => items.map((item) => ({ ...item, selected: false })));
        this.syncStructureJsonFields();

        const duplicateSuffix = skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : "";
        this.snackBar.open(`${injectedTasks.length} academic task(s) injected${duplicateSuffix}.`, "Close", { duration: 3600 });
    }

    private toAcademicTemplateSource(item: M2AcademicSourceItem, index: number): AcademicTemplateSourceCandidate {
        const id = item.id ? String(item.id) : undefined;
        return {
            key: id || `openalex-template-${index}`,
            id,
            title: item.title ? String(item.title) : "Untitled paper",
            publicationYear: item.publicationYear ?? null,
            citedByCount: item.citedByCount ?? null,
            openAccessUrl: item.openAccessUrl ?? null,
            landingPageUrl: item.landingPageUrl ?? null,
            firstAuthor: item.firstAuthor ?? null,
            selected: false,
        };
    }

    private openAlexMarker(source: AcademicTemplateSourceCandidate): string {
        const token = source.id || source.title;
        return `[OpenAlex:${token}]`;
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

    private makeKey(prefix: string): string {
        this.sequence += 1;
        return `${prefix}-${this.sequence}`;
    }

    private normalizeOptionalNumber(value: number | undefined): number | undefined {
        if (value === undefined || value === null || Number.isNaN(value)) return undefined;
        return Math.max(0, value);
    }

    private buildStructuredPayload(): {
        phases: Array<Record<string, unknown>>;
        milestones: Array<Record<string, unknown>>;
        tasks: Array<Record<string, unknown>>;
    } {
        const phases = this.phases().map((phase, index) => ({
            key: phase.key,
            name: phase.name.trim(),
            durationDays: Math.max(0, Number(phase.durationDays || 0)),
            order: index + 1,
            enabled: true,
        }));

        const milestones = this.milestones().map((milestone) => ({
            key: milestone.key,
            name: milestone.name.trim(),
            description: milestone.description?.trim() || undefined,
            phaseKey: milestone.phaseKey || undefined,
            offsetDays: Math.max(0, Number(milestone.offsetDays || 0)),
            status: "pending",
            completionPct: 0,
            enabled: true,
        }));

        const tasks = this.milestones().flatMap((milestone) =>
            milestone.tasks.map((task) => ({
                key: task.key,
                title: task.title.trim(),
                description: task.description?.trim() || undefined,
                phaseKey: milestone.phaseKey || undefined,
                milestoneKey: milestone.key,
                taskType: "task",
                status: "todo",
                priority: task.priority,
                estimatedHours: this.normalizeOptionalNumber(task.estimatedHours),
                startOffsetDays: this.normalizeOptionalNumber(task.startOffsetDays),
                dueOffsetDays: this.normalizeOptionalNumber(task.dueOffsetDays),
                enabled: true,
            }))
        );

        return { phases, milestones, tasks };
    }

    private syncStructureJsonFields(): void {
        const payload = this.buildStructuredPayload();
        this.defaultMilestonesJson = payload.milestones.length > 0 ? JSON.stringify(payload.milestones) : "";
        this.defaultTasksJson = payload.tasks.length > 0 ? JSON.stringify(payload.tasks) : "";
    }

    private applyStructureFromJson(milestonesJson: string, tasksJson: string): void {
        const phaseKeys = new Set(this.phases().map(p => p.key));

        const parseArray = (raw: string): Array<Record<string, unknown>> => {
            try {
                const parsed = JSON.parse(raw || "[]");
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        };

        const milestoneRows: MilestoneRow[] = parseArray(milestonesJson).map((m, idx) => {
            const key = String(m["key"] || this.makeKey("milestone"));
            const phaseKeyCandidate = m["phaseKey"] ? String(m["phaseKey"]) : (m["phase"] ? String(m["phase"]) : undefined);
            return {
                key,
                name: String(m["name"] || m["title"] || `Milestone ${idx + 1}`),
                description: m["description"] ? String(m["description"]) : "",
                phaseKey: phaseKeyCandidate && phaseKeys.has(phaseKeyCandidate) ? phaseKeyCandidate : this.phases()[0]?.key,
                offsetDays: Math.max(0, Number(m["offsetDays"] ?? 0)),
                tasks: [],
            };
        });

        const byMilestoneKey = new Map(milestoneRows.map(m => [m.key, m]));

        for (const row of parseArray(tasksJson)) {
            const requestedMilestoneKey = row["milestoneKey"] ? String(row["milestoneKey"]) : (row["milestone"] ? String(row["milestone"]) : undefined);

            let milestone = requestedMilestoneKey ? byMilestoneKey.get(requestedMilestoneKey) : undefined;
            if (!milestone) {
                if (milestoneRows.length === 0) {
                    const fallbackMilestone: MilestoneRow = {
                        key: this.makeKey("milestone"),
                        name: "Imported Milestone",
                        description: "",
                        phaseKey: this.phases()[0]?.key,
                        offsetDays: 0,
                        tasks: [],
                    };
                    milestoneRows.push(fallbackMilestone);
                    byMilestoneKey.set(fallbackMilestone.key, fallbackMilestone);
                }
                milestone = milestoneRows[0];
            }

            const priorityRaw = String(row["priority"] || "medium").toLowerCase();
            const priority: "low" | "medium" | "high" =
                priorityRaw === "low" || priorityRaw === "high" ? (priorityRaw as "low" | "high") : "medium";

            milestone.tasks.push({
                key: String(row["key"] || this.makeKey("task")),
                title: String(row["title"] || row["name"] || ""),
                description: row["description"] ? String(row["description"]) : "",
                priority,
                estimatedHours: row["estimatedHours"] !== undefined ? Math.max(0, Number(row["estimatedHours"])) : undefined,
                startOffsetDays: row["startOffsetDays"] !== undefined ? Math.max(0, Number(row["startOffsetDays"])) : undefined,
                dueOffsetDays: row["dueOffsetDays"] !== undefined ? Math.max(0, Number(row["dueOffsetDays"])) : undefined,
            });
        }

        this.milestones.set(milestoneRows);
        if (milestoneRows.length > 0) {
            const exists = milestoneRows.some((milestone) => milestone.key === this.academicSourceMilestoneKey);
            if (!exists) {
                this.academicSourceMilestoneKey = milestoneRows[0].key;
            }
        } else {
            this.academicSourceMilestoneKey = "";
        }
    }

    submit(): void {
        if (this.submitting()) return;
        const userId = this.authService.currentUser()?.id;
        if (!userId) return;

        this.syncStructureJsonFields();
        const structuredPayload = this.buildStructuredPayload();

        const normalizedName = this.name.trim();
        if (!normalizedName) {
            this.submitError = "Template name is required.";
            this.currentStep.set(0);
            return;
        }

        this.submitting.set(true);
        const body: Record<string, unknown> = {
            name: normalizedName,
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
        if (structuredPayload.phases.length > 0) body["defaultPhasesJson"] = JSON.stringify(structuredPayload.phases);
        if (structuredPayload.milestones.length > 0) body["defaultMilestonesJson"] = JSON.stringify(structuredPayload.milestones);
        if (structuredPayload.tasks.length > 0) body["defaultTasksJson"] = JSON.stringify(structuredPayload.tasks);

        const vRoles = this.validRoles();
        if (vRoles.length > 0) {
            body["defaultRolesJson"] = JSON.stringify(vRoles);
        }

        this.submitError = "";
        this.attemptTemplateCreate(body, userId);
    }

    private attemptTemplateCreate(body: Record<string, unknown>, userId: number): void {
        const requestedName = String(body["name"] || "").trim();

        this.templateService.getMyTemplates(userId, 0, 200).subscribe({
            next: (page) => {
                const existing = page?.content || [];
                if (this.hasTemplateNameConflict(requestedName, existing)) {
                    const suggested = this.suggestUniqueTemplateName(requestedName, existing);
                    this.name = suggested;
                    this.submitting.set(false);
                    this.currentStep.set(0);
                    this.submitError = `You already have a template named '${requestedName}'. Suggested name: '${suggested}'.`;
                    this.snackBar.open("Template name already exists. A new name was suggested.", "Close", { duration: 4200 });
                    return;
                }

                this.templateService.create(body).subscribe({
                    next: () => {
                        this.snackBar.open("Template created as DRAFT.", "Close", { duration: 3500 });
                        this.dialogRef.close({ created: true } as CreateTemplateDialogResult);
                    },
                    error: (err) => {
                        this.submitting.set(false);
                        if (err?.status === 409) {
                            const conflictMessage = err?.error?.message || `You already have a template named '${requestedName}'.`;
                            const suggested = this.suggestUniqueTemplateName(requestedName, existing);
                            this.name = suggested;
                            this.currentStep.set(0);
                            this.submitError = `${conflictMessage} Suggested name: '${suggested}'.`;
                            this.snackBar.open("Template name conflict. Suggested a unique name.", "Close", { duration: 4500 });
                            return;
                        }
                        this.submitError = err?.error?.message || "Failed to create template. Please try again.";
                    },
                });
            },
            error: () => {
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
            },
        });
    }

    private hasTemplateNameConflict(name: string, existing: M2TemplateSummary[]): boolean {
        const normalized = name.trim().toLowerCase();
        if (!normalized) return false;
        return existing.some(t => (t.name || "").trim().toLowerCase() === normalized);
    }

    private suggestUniqueTemplateName(baseName: string, existing: M2TemplateSummary[]): string {
        const normalizedExisting = new Set(
            existing.map(t => (t.name || "").trim().toLowerCase()).filter(Boolean)
        );

        const cleanBase = baseName.trim() || "New Template";
        if (!normalizedExisting.has(cleanBase.toLowerCase())) {
            return cleanBase;
        }

        for (let i = 2; i <= 999; i++) {
            const candidate = `${cleanBase} (${i})`;
            if (!normalizedExisting.has(candidate.toLowerCase())) {
                return candidate;
            }
        }

        return `${cleanBase} (${Date.now()})`;
    }

    phaseCount(json: string): number {
        try { const a = JSON.parse(json); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
    }

    roleCount(json: string): number {
        try { const a = JSON.parse(json); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
    }

    close(): void { this.dialogRef.close(); }
}
