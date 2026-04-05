import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";

import {
    M2PibBootstrapRequest,
    M2PibBootstrapResponse,
    M2PibConfirmMemberSelection,
    M2PibConfirmRequest,
    M2PibConfirmRoleSelection,
    M2PibRoleRequirement,
    M2PibServerStatus,
    M2PibRoleSuggestions,
    M2PibTemplateRecommendation,
    M2ProjectService,
} from "./m2-project.service";

export interface CreateWithAiDialogData {
    workspaceId: string;
    workspaceName: string;
    orgType?: string;
}

export interface CreateWithAiDialogResult {
    createdProjectId?: string;
}

interface EditableRole extends M2PibRoleRequirement {
    id: string;
}

interface EditableCandidate {
    userId: number;
    name: string;
    fitScore: number;
    reasons: string[];
    accepted: boolean;
}

interface EditableSuggestionGroup {
    role: string;
    candidates: EditableCandidate[];
}

@Component({
    selector: "app-create-with-ai",
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
    ],
    templateUrl: "./create-with-ai.component.html",
    styleUrls: ["./create-with-ai.component.css"],
})
export class CreateWithAiComponent implements OnInit, OnDestroy {
    readonly dialogRef = inject(MatDialogRef<CreateWithAiComponent>);
    readonly data = inject(MAT_DIALOG_DATA) as CreateWithAiDialogData;

    private readonly projectService = inject(M2ProjectService);

    readonly step = signal<"input" | "loading" | "results">("input");
    readonly inputType = signal<"text" | "document">("text");

    readonly description = signal("");
    readonly selectedFileName = signal<string | null>(null);
    readonly selectedFileBase64 = signal<string | null>(null);

    readonly inputError = signal<string | null>(null);
    readonly requestError = signal<string | null>(null);
    readonly infoNotice = signal<string | null>(null);

    readonly aiServerOnline = signal<boolean | null>(null);
    readonly aiServerReason = signal<string | null>(null);
    readonly aiModelVersion = signal<string | null>(null);

    readonly isBootstrapping = signal(false);
    readonly isConfirming = signal(false);

    readonly loadingStageLabels = [
        "Stage 1: Semantic Extraction",
        "Stage 2: Template Matching",
        "Stage 3: Role Inference",
        "Stage 4: People Matching",
    ];
    readonly activeLoadingStage = signal(0);

    readonly bootstrapResponse = signal<M2PibBootstrapResponse | null>(null);

    readonly projectName = signal("");
    readonly projectDescription = signal("");

    readonly stage1ProjectType = signal("other");
    readonly stage1Complexity = signal("MEDIUM");
    readonly stage1DetectedMode = signal("enterprise");
    readonly stage1DomainTags = signal("");
    readonly stage1Constraints = signal("");

    readonly templates = signal<M2PibTemplateRecommendation[]>([]);
    readonly selectedTemplateId = signal<string | null>(null);
    readonly selectedTemplateName = computed(() => {
        const selectedId = this.selectedTemplateId();
        if (!selectedId) {
            return "None";
        }
        const selected = this.templates().find((template) => template.id === selectedId);
        return selected?.name || selectedId;
    });

    readonly editableRoles = signal<EditableRole[]>([]);
    readonly editableSuggestions = signal<EditableSuggestionGroup[]>([]);

    readonly newRoleInput = signal("");

    private stageTimer: ReturnType<typeof setInterval> | null = null;

    readonly canSubmitInput = computed(() => {
        if (this.inputType() === "text") {
            return this.description().trim().length >= 30;
        }
        return !!this.selectedFileBase64();
    });

    readonly stage2ColdStart = computed(() => this.bootstrapResponse()?.stage2.cold_start_mode ?? false);
    readonly stage3ColdStart = computed(() => this.bootstrapResponse()?.stage3.cold_start_mode ?? false);
    readonly stage4ColdStart = computed(() => this.bootstrapResponse()?.stage4.cold_start_mode ?? false);

    readonly hasResults = computed(() => !!this.bootstrapResponse());
    readonly resultStageIndex = signal(0);
    readonly isFirstResultStage = computed(() => this.resultStageIndex() === 0);
    readonly isLastResultStage = computed(() => this.resultStageIndex() === this.loadingStageLabels.length - 1);
    readonly currentResultStageLabel = computed(() => this.loadingStageLabels[this.resultStageIndex()] || "Stage");
    readonly acceptedMembersCount = computed(() => this.editableSuggestions()
        .flatMap((group) => group.candidates)
        .filter((candidate) => candidate.accepted).length);

    readonly aiServerLabel = computed(() => {
        const online = this.aiServerOnline();
        if (online === null) {
            return "AI server checking";
        }
        return online ? "AI server on" : "AI server off";
    });

    ngOnInit(): void {
        this.checkAiServerStatus();
    }

    ngOnDestroy(): void {
        this.stopStageAnimation();
    }

    setInputType(value: "text" | "document"): void {
        this.inputType.set(value);
        this.inputError.set(null);
        this.infoNotice.set(null);
        if (value === "text") {
            this.selectedFileName.set(null);
            this.selectedFileBase64.set(null);
        }
    }

    onFilePicked(event: Event): void {
        this.inputError.set(null);
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }

        const allowed = [".pdf", ".docx"];
        const lowerName = file.name.toLowerCase();
        if (!allowed.some((ext) => lowerName.endsWith(ext))) {
            this.inputError.set("Only PDF and DOCX files are allowed.");
            input.value = "";
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            this.inputError.set("File exceeds 10MB limit.");
            input.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            this.selectedFileName.set(file.name);
            this.selectedFileBase64.set(base64);
        };
        reader.onerror = () => {
            this.inputError.set("Could not read file. Please try again.");
        };
        reader.readAsDataURL(file);
    }

    clearFile(): void {
        this.selectedFileName.set(null);
        this.selectedFileBase64.set(null);
    }

    startBootstrap(): void {
        this.requestError.set(null);
        this.inputError.set(null);
        this.infoNotice.set(null);

        if (!this.canSubmitInput()) {
            if (this.inputType() === "text") {
                this.inputError.set("Description must be at least 30 characters.");
            } else {
                this.inputError.set("Upload a PDF or DOCX file before continuing.");
            }
            return;
        }

        const req: M2PibBootstrapRequest = {
            workspace_id: this.data.workspaceId,
            input_type: this.inputType(),
            description: this.inputType() === "text" ? this.description().trim() : null,
            document_base64: this.inputType() === "document" ? this.selectedFileBase64() : null,
            document_filename: this.inputType() === "document" ? this.selectedFileName() : null,
        };

        this.isBootstrapping.set(true);
        this.step.set("loading");
        this.startStageAnimation();

        this.projectService.bootstrapProjectIntelligence(this.data.workspaceId, req).subscribe({
            next: (response) => {
                console.info("[PIB] bootstrap response", response);
                this.applyBootstrapResponse(response);
                this.step.set("results");
                this.isBootstrapping.set(false);
                this.stopStageAnimation();
            },
            error: (error: HttpErrorResponse) => {
                console.error("[PIB] bootstrap error", error);
                this.step.set("input");
                this.isBootstrapping.set(false);
                this.stopStageAnimation();
                this.requestError.set(this.resolveError(error));
            },
        });
    }

    backToInput(): void {
        this.step.set("input");
        this.requestError.set(null);
        this.infoNotice.set(null);
        this.resultStageIndex.set(0);
    }

    previousResultStage(): void {
        this.resultStageIndex.update((idx) => Math.max(0, idx - 1));
    }

    nextResultStage(): void {
        this.resultStageIndex.update((idx) => Math.min(this.loadingStageLabels.length - 1, idx + 1));
    }

    goToResultStage(index: number): void {
        if (!Number.isFinite(index)) {
            return;
        }
        const normalized = Math.max(0, Math.min(this.loadingStageLabels.length - 1, Math.floor(index)));
        this.resultStageIndex.set(normalized);
    }

    addRole(): void {
        const role = this.newRoleInput().trim().toUpperCase();
        if (!role) {
            return;
        }
        if (this.editableRoles().some((r) => r.role === role)) {
            this.newRoleInput.set("");
            return;
        }

        const next: EditableRole = {
            id: this.createId(),
            role,
            critical: false,
            confidence: 0,
            countSuggested: 1,
            cold_start_mode: this.stage3ColdStart(),
        };

        this.editableRoles.update((rows) => [...rows, next]);
        this.editableSuggestions.update((rows) => [...rows, { role, candidates: [] }]);
        this.newRoleInput.set("");
    }

    removeRole(roleId: string): void {
        const target = this.editableRoles().find((r) => r.id === roleId);
        if (!target) {
            return;
        }
        this.editableRoles.update((rows) => rows.filter((r) => r.id !== roleId));
        this.editableSuggestions.update((rows) => rows.filter((r) => r.role !== target.role));
    }

    updateRoleField(roleId: string, field: "role" | "countSuggested" | "confidence", value: string): void {
        this.editableRoles.update((rows) => rows.map((row) => {
            if (row.id !== roleId) {
                return row;
            }

            if (field === "role") {
                const normalized = value.trim().toUpperCase();
                if (!normalized) {
                    return row;
                }
                this.editableSuggestions.update((groups) => groups.map((g) => g.role === row.role ? { ...g, role: normalized } : g));
                return { ...row, role: normalized };
            }

            if (field === "countSuggested") {
                const parsed = Number(value);
                return { ...row, countSuggested: Number.isFinite(parsed) ? Math.max(1, Math.min(10, Math.round(parsed))) : row.countSuggested };
            }

            const parsed = Number(value);
            return { ...row, confidence: Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : row.confidence };
        }));
    }

    toggleRoleCritical(roleId: string): void {
        this.editableRoles.update((rows) => rows.map((row) => row.id === roleId ? { ...row, critical: !row.critical } : row));
    }

    toggleCandidate(role: string, userId: number): void {
        this.editableSuggestions.update((groups) => groups.map((group) => {
            if (group.role !== role) {
                return group;
            }
            return {
                ...group,
                candidates: group.candidates.map((candidate) => {
                    if (candidate.userId !== userId) {
                        return candidate;
                    }
                    return { ...candidate, accepted: !candidate.accepted };
                }),
            };
        }));
    }

    confirmCreateProject(): void {
        this.requestError.set(null);

        if (!this.projectName().trim()) {
            this.requestError.set("Project name is required before confirmation.");
            return;
        }

        const bootstrap = this.bootstrapResponse();

        const stage1 = {
            embedding: bootstrap?.stage1.embedding || [],
            project_type: this.stage1ProjectType().trim() || "other",
            complexity: this.stage1Complexity().trim() || "MEDIUM",
            domain_tags: this.parseCsv(this.stage1DomainTags()),
            detected_mode: this.stage1DetectedMode().trim() || this.inferredMode(),
            constraints: this.parseCsv(this.stage1Constraints()),
            cold_start_mode: bootstrap?.stage1.cold_start_mode ?? false,
        };

        const roles: M2PibConfirmRoleSelection[] = this.editableRoles().map((role) => ({
            role: role.role,
            critical: role.critical,
            confidence: role.confidence,
            countSuggested: role.countSuggested,
        }));

        const members: M2PibConfirmMemberSelection[] = this.editableSuggestions().flatMap((group) =>
            group.candidates.map((candidate) => ({
                role: group.role,
                userId: candidate.userId,
                accepted: candidate.accepted,
                fitScore: candidate.fitScore,
                reasons: candidate.reasons,
            }))
        );

        const request: M2PibConfirmRequest = {
            inputType: this.inputType(),
            projectName: this.projectName().trim(),
            projectDescription: this.projectDescription().trim(),
            visibility: "PRIVATE",
            selectedTemplateId: this.selectedTemplateId(),
            selectedTemplateName: this.selectedTemplateName(),
            stage1,
            roles,
            members,
            coldStartAny: bootstrap?.cold_start_any ?? false,
            modelVersion: bootstrap?.metadata?.["model_version"] || "pib-bridge-v1",
        };

        this.isConfirming.set(true);
        this.projectService.confirmProjectIntelligence(this.data.workspaceId, request).subscribe({
            next: (created) => {
                console.info("[PIB] confirm success", { projectId: created.id, request });
                this.isConfirming.set(false);
                this.dialogRef.close({ createdProjectId: created.id } as CreateWithAiDialogResult);
            },
            error: (error: HttpErrorResponse) => {
                console.error("[PIB] confirm error", error);
                this.isConfirming.set(false);
                this.requestError.set(this.resolveError(error));
            },
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    templateLabel(template: M2PibTemplateRecommendation): string {
        return `${template.name} (${Math.round(template.matchScore * 100)}%)`;
    }

    templateGapFromBest(template: M2PibTemplateRecommendation): number {
        const rows = this.templates();
        if (rows.length === 0) {
            return 0;
        }
        const best = rows.reduce((acc, item) => Math.max(acc, item.matchScore || 0), 0);
        return Math.max(0, (best || 0) - (template.matchScore || 0));
    }

    templateReasonSummary(template: M2PibTemplateRecommendation): string {
        const gap = this.templateGapFromBest(template);
        if (gap <= 0.0001) {
            return "Top semantic match for your current project brief and constraints.";
        }
        return `${Math.round(gap * 100)} points below the best template, kept as an alternative candidate.`;
    }

    roleReasonLines(role: EditableRole): string[] {
        const reasons: string[] = [];
        if (role.cold_start_mode) {
            reasons.push("Cold-start inference from org mode and template defaults");
        } else {
            reasons.push(`Model confidence ${Math.round((role.confidence || 0) * 100)}%`);
        }

        reasons.push(`Suggested ${Math.max(1, role.countSuggested)} member(s) for ${this.stage1Complexity()} complexity`);

        if (role.critical) {
            reasons.push("Marked critical for delivery governance and decision flow");
        }

        const roleKey = (role.role || "").toUpperCase();
        if (roleKey.includes("MANAGER") || roleKey.includes("PROFESSOR")) {
            reasons.push("Leadership role to coordinate scope and milestones");
        } else if (roleKey.includes("DEVELOPER")) {
            reasons.push("Core implementation capacity for planned features");
        } else if (roleKey.includes("REVIEWER") || roleKey.includes("QA")) {
            reasons.push("Quality gate role to reduce delivery risk");
        }

        return reasons;
    }

    private checkAiServerStatus(): void {
        this.projectService.getProjectIntelligenceStatus(this.data.workspaceId).subscribe({
            next: (status: M2PibServerStatus) => {
                this.aiServerOnline.set(!!status.online);
                this.aiServerReason.set(status.online ? null : (status.reason || "ml-service-unavailable"));
                this.aiModelVersion.set(status.model_version || null);
            },
            error: (error: HttpErrorResponse) => {
                console.warn("[PIB] status ping failed", error);
                this.aiServerOnline.set(false);
                this.aiServerReason.set("Unable to reach ML status endpoint");
            },
        });
    }

    private applyBootstrapResponse(response: M2PibBootstrapResponse): void {
        this.bootstrapResponse.set(response);
        this.resultStageIndex.set(0);

        const fallbackReason = response.metadata?.["bridge_fallback_reason"];
        if (fallbackReason) {
            this.infoNotice.set("Python ML service is unavailable. You are in fallback mode. Start the ML service to use full AI inference.");
            this.aiServerOnline.set(false);
            this.aiServerReason.set(fallbackReason);
        } else if (response.cold_start_any) {
            this.infoNotice.set("AI responded, but some stages are still in cold-start mode for this workspace.");
            this.aiServerOnline.set(true);
            this.aiServerReason.set(null);
        } else {
            this.infoNotice.set("AI analysis completed across all 4 stages.");
            this.aiServerOnline.set(true);
            this.aiServerReason.set(null);
        }

        this.aiModelVersion.set(response.metadata?.["model_version"] || this.aiModelVersion());

        const inferredProjectType = response.stage1.project_type || "other";
        this.projectName.set(this.defaultProjectName(inferredProjectType));

        if (this.inputType() === "text") {
            this.projectDescription.set(this.description().trim());
        } else {
            this.projectDescription.set(`AI draft created from uploaded document: ${this.selectedFileName() || "document"}.`);
        }

        this.stage1ProjectType.set(response.stage1.project_type || "other");
        this.stage1Complexity.set((response.stage1.complexity || "MEDIUM").toUpperCase());
        this.stage1DetectedMode.set((response.stage1.detected_mode || this.inferredMode()).toLowerCase());
        this.stage1DomainTags.set((response.stage1.domain_tags || []).join(", "));
        this.stage1Constraints.set((response.stage1.constraints || []).join(", "));

        const templates = response.stage2.templates || [];
        this.templates.set(templates);
        this.selectedTemplateId.set(templates.length > 0 ? templates[0].id : null);

        const roles = (response.stage3.required_roles || []).map((role) => ({
            ...role,
            id: this.createId(),
        }));
        this.editableRoles.set(roles);

        const suggestionsByRole = new Map<string, M2PibRoleSuggestions>();
        for (const group of response.stage4.suggestions || []) {
            suggestionsByRole.set(group.role, group);
        }

        const autoAcceptedUsers = new Set<number>();
        const editableGroups: EditableSuggestionGroup[] = roles.map((role) => {
            const group = suggestionsByRole.get(role.role);
            let acceptedAssignedForRole = false;
            const candidates = (group?.candidates || []).map((candidate) => {
                const canAutoAccept = !acceptedAssignedForRole && !autoAcceptedUsers.has(candidate.userId);
                if (canAutoAccept) {
                    acceptedAssignedForRole = true;
                    autoAcceptedUsers.add(candidate.userId);
                }
                return {
                    ...candidate,
                    accepted: canAutoAccept,
                };
            });
            return {
                role: role.role,
                candidates,
            };
        });

        this.editableSuggestions.set(editableGroups);
    }

    private startStageAnimation(): void {
        this.activeLoadingStage.set(0);
        this.stopStageAnimation();
        this.stageTimer = setInterval(() => {
            this.activeLoadingStage.update((idx) => {
                const next = idx + 1;
                if (next >= this.loadingStageLabels.length) {
                    return this.loadingStageLabels.length - 1;
                }
                return next;
            });
        }, 650);
    }

    private stopStageAnimation(): void {
        if (this.stageTimer) {
            clearInterval(this.stageTimer);
            this.stageTimer = null;
        }
    }

    private parseCsv(raw: string): string[] {
        return raw
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    private inferredMode(): string {
        return (this.data.orgType || "enterprise").toLowerCase();
    }

    private resolveError(error: HttpErrorResponse): string {
        const payload = error?.error || {};
        const code = typeof payload?.code === "string" ? payload.code : "";
        let msg = payload?.detail || payload?.message || error.message || "Request failed";

        const meta = payload?.meta;
        if (meta && typeof meta === "object") {
            const selectedTemplateId = typeof meta["selectedTemplateId"] === "string" ? meta["selectedTemplateId"] : null;
            const selectedTemplateName = typeof meta["selectedTemplateName"] === "string" ? meta["selectedTemplateName"] : null;
            const diagnosis = typeof meta["diagnosis"] === "string" ? meta["diagnosis"] : null;
            const matchingTemplateIdByName = typeof meta["matchingTemplateIdByName"] === "string" ? meta["matchingTemplateIdByName"] : null;

            const details: string[] = [];
            if (selectedTemplateId) details.push(`selectedTemplateId=${selectedTemplateId}`);
            if (selectedTemplateName) details.push(`selectedTemplateName=${selectedTemplateName}`);
            if (matchingTemplateIdByName) details.push(`matchingTemplateIdByName=${matchingTemplateIdByName}`);
            if (diagnosis) details.push(`diagnosis=${diagnosis}`);

            if (details.length > 0) {
                msg = `${msg} (${details.join("; ")})`;
            }
        }

        const codePart = code ? ` code=${code}` : "";
        return `status=${error.status || 0}${codePart} message=${msg}`;
    }

    private defaultProjectName(projectType: string): string {
        const pretty = projectType
            .replace(/_/g, " ")
            .replace(/\b\w/g, (m) => m.toUpperCase());
        return `${pretty} Project - ${this.data.workspaceName}`;
    }

    private createId(): string {
        return Math.random().toString(36).slice(2, 11);
    }
}
