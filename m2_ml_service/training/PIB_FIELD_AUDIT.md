# PIB Field Audit Contract (Module 2)

This document freezes the PIB ML field contract before entity changes.

Scope:
- Module 2 entities only: Workspace, WorkspaceMember, Project, ProjectMember, ProjectTemplate, MLTeamRecommendation.
- No SQL migration files. Columns are created by Hibernate through JPA field annotations.
- All new fields are nullable and default to NULL.

Conventions:
- Java naming: camelCase.
- DB naming: snake_case with ml_ prefix.
- JSON payload fields stored as TEXT JSON strings for compatibility with current entity style.

## 1) Project (table: projects)

| Java field | Java type | @Column contract | ML stage usage | Population | Why here | Rejected alternative |
|---|---|---|---|---|---|---|
| mlDescriptionEmbedding | String | @Column(name = "ml_description_embedding", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 sentence embedding (384 dimensions serialized as JSON array).'") | Stage 1 input embedding reused by Stage 2 and Stage 3 | Seed script and PIB bootstrap flow | Embedding belongs to project semantic description | Recompute on every request (rejected: expensive and unstable latency) |
| mlProjectType | String | @Column(name = "ml_project_type", length = 50, columnDefinition = "VARCHAR(50) DEFAULT NULL COMMENT 'Stage 1 inferred project type label.'") | Stage 1 output and Stage 3 feature | PIB bootstrap flow and optional nightly refresh | Core inferred label is project-level metadata | Store in recommendation rows only (rejected: duplicated, harder to query project analytics) |
| mlComplexity | String | @Column(name = "ml_complexity", length = 20, columnDefinition = "VARCHAR(20) DEFAULT NULL COMMENT 'Stage 1 inferred complexity level LOW/MEDIUM/HIGH.'") | Stage 1 output and Stage 2/3 conditioning | PIB bootstrap flow | Complexity is a project-level property | Compute every time from text (rejected: unnecessary repeated inference) |
| mlDetectedMode | String | @Column(name = "ml_detected_mode", length = 20, columnDefinition = "VARCHAR(20) DEFAULT NULL COMMENT 'Stage 1 detected mode enterprise/academic.'") | Stage 1 output and Stage 2/3 routing | PIB bootstrap flow | Persisting mode helps audit mode mismatches with workspace org type | Keep only in response payload (rejected: no persisted traceability) |
| mlDomainTagsJson | String | @Column(name = "ml_domain_tags_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 domain tags as JSON array.'") | Stage 1 output for UI edit and analytics | PIB bootstrap flow | Domain tags are semantic project descriptors | Normalize to join table now (rejected: not needed for current PIB scope) |
| mlConstraintsJson | String | @Column(name = "ml_constraints_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 1 extracted constraints as JSON array.'") | Stage 1 output for editable UI section | PIB bootstrap flow | Constraints are project-specific and user-adjustable | Store as separate columns per constraint type (rejected: rigid and brittle) |
| mlLastInferenceAt | Instant | @Column(name = "ml_last_inference_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last PIB inference timestamp for this project.'") | Audit and model freshness tracking | PIB bootstrap flow and nightly jobs | Needed for operational observability | Infer freshness from updated_at only (rejected: ambiguous with non-ML updates) |

## 2) ProjectTemplate (table: project_templates)

| Java field | Java type | @Column contract | ML stage usage | Population | Why here | Rejected alternative |
|---|---|---|---|---|---|---|
| mlTemplateEmbedding | String | @Column(name = "ml_template_embedding", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 2 template embedding (serialized vector).'") | Stage 2 cosine similarity | Seed script and notebook artifacts | Embedding is intrinsic to template text/config | Compute at request time (rejected: high latency under load) |
| mlFitnessScore | Double | @Column(name = "ml_fitness_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 2 historical template fitness score.'") | Stage 2 weighted ranking | Seed script, nightly batch, and confirm feedback updates | Fitness is template-level historical signal | Derive from usage_count only (rejected: usage count is not success quality) |
| mlCompletionRate | Double | @Column(name = "ml_completion_rate", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Historical completion success rate for this template.'") | Stage 2 explanation and weighting | Seed script and nightly recomputation | Completion rate is a persistent template KPI | Keep only in analytics table (rejected: service needs low-latency direct access) |
| mlLastMetricsAt | Instant | @Column(name = "ml_last_metrics_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last recompute timestamp for template ML metrics.'") | Stage 2 freshness and diagnostics | Nightly batch and seed script | Helps detect stale ranking signals | Omit freshness metadata (rejected: no operational visibility) |

## 3) WorkspaceMember (table: workspace_members)

| Java field | Java type | @Column contract | ML stage usage | Population | Why here | Rejected alternative |
|---|---|---|---|---|---|---|
| mlRoleHistoryScore | Double | @Column(name = "ml_role_history_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 role history score component.'") | Stage 4 composite score (35%) | Nightly batch and seed script | Score belongs to candidate workspace member | Compute live from project history each call (rejected: expensive joins for each request) |
| mlSkillMatchScore | Double | @Column(name = "ml_skill_match_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 skill match score component.'") | Stage 4 composite score (25%) | Nightly batch and seed script | Member-level capability signal | Store only external CSV (rejected: runtime service requires DB-resident values) |
| mlAvailabilityScore | Double | @Column(name = "ml_availability_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 availability score component.'") | Stage 4 composite score (25%) and cold-start fallback sort | Nightly batch and seed script | Availability is inherently member-specific | Compute from active task count on-demand (rejected: cross-module dependency and latency) |
| mlChemistryScore | Double | @Column(name = "ml_chemistry_score", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Stage 4 chemistry/collaboration score component.'") | Stage 4 composite score (15%) | Nightly batch and seed script | Collaboration signal applies per member profile | Omit chemistry from v1 (rejected: required by PIB scoring contract) |
| mlTopRolesJson | String | @Column(name = "ml_top_roles_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Top role affinities for member as JSON array.'") | Stage 4 reasons and role fit explanations | Nightly batch and seed script | Needed for explainable recommendations | Hard-code role mapping by workspace role only (rejected: too coarse) |
| mlProfileVector | String | @Column(name = "ml_profile_vector", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Serialized member profile vector for matching.'") | Stage 4 similarity computation | Nightly batch and seed script | Precomputed vector reduces request-time cost | Keep vector only in file artifact (rejected: extra IO and consistency risk) |
| mlProfileUpdatedAt | Instant | @Column(name = "ml_profile_updated_at", columnDefinition = "TIMESTAMP NULL DEFAULT NULL COMMENT 'Last refresh timestamp of member ML profile.'") | Stage 4 staleness checks | Nightly batch and seed script | Operational freshness signal for profile data | Reuse joined_at as proxy (rejected: unrelated lifecycle field) |

## 4) ProjectMember (table: project_members)

| Java field | Java type | @Column contract | ML stage usage | Population | Why here | Rejected alternative |
|---|---|---|---|---|---|---|
| mlAssignedByAi | Boolean | @Column(name = "ml_assigned_by_ai", columnDefinition = "TINYINT(1) DEFAULT NULL COMMENT 'True when assignment originated from PIB suggestion.'") | Confirm flow provenance | PIB confirm transaction | Assignment provenance belongs to assignment row | Track only in MLTeamRecommendation (rejected: missing provenance once member row exists alone) |
| mlAssignmentConfidence | Double | @Column(name = "ml_assignment_confidence", columnDefinition = "DOUBLE DEFAULT NULL COMMENT 'Confidence score at assignment time.'") | Stage 4 explainability and later analysis | PIB confirm transaction | Stores decision-time confidence tied to assignment | Derive from recommendation table join every time (rejected: harder reporting and stale joins) |
| mlAssignmentReasonJson | String | @Column(name = "ml_assignment_reason_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Assignment rationale snapshot JSON.'") | Stage 4 explanation persistence | PIB confirm transaction | Keeps immutable rationale snapshot | Keep mutable rationale only in response payload (rejected: no historical audit) |
| mlSourceRecommendationId | UUID | @Column(name = "ml_source_recommendation_id", columnDefinition = "CHAR(36) DEFAULT NULL COMMENT 'ML recommendation id that produced this assignment.'") | Traceability from assignment to recommendation | PIB confirm transaction | Direct linkage for audits and analytics | Omit linkage (rejected: cannot trace accepted suggestions reliably) |

## 5) MLTeamRecommendation (table: ml_team_recommendations)

| Java field | Java type | @Column contract | ML stage usage | Population | Why here | Rejected alternative |
|---|---|---|---|---|---|---|
| mlScoreBreakdownJson | String | @Column(name = "ml_score_breakdown_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Stage 4 weighted score breakdown JSON.'") | Stage 4 explainable scoring | PIB bootstrap and confirm persistence | Recommendation row is the natural home for score details | Keep only compatibility_score scalar (rejected: insufficient explainability) |
| mlReasonsJson | String | @Column(name = "ml_reasons_json", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Human-readable recommendation reasons JSON array.'") | Stage 4 UI reasons display | PIB bootstrap and confirm persistence | Reasons belong to recommendation evidence | Build reasons ad hoc at UI layer (rejected: inconsistent cross-client messaging) |
| mlColdStartMode | Boolean | @Column(name = "ml_cold_start_mode", columnDefinition = "TINYINT(1) DEFAULT NULL COMMENT 'True when recommendation was produced under fallback mode.'") | Cold-start transparency | PIB bootstrap and confirm persistence | Captures reliability context at generation time | Infer from missing artifacts retroactively (rejected: not historically accurate) |
| mlModelVersion | String | @Column(name = "ml_model_version", length = 50, columnDefinition = "VARCHAR(50) DEFAULT NULL COMMENT 'Model/version identifier used for this recommendation.'") | Model governance | PIB bootstrap and confirm persistence | Recommendation is generated by a specific model version | Store only globally in config (rejected: no per-record reproducibility) |
| mlDecisionNote | String | @Column(name = "ml_decision_note", columnDefinition = "TEXT DEFAULT NULL COMMENT 'Reviewer note captured during accept/reject decision.'") | Human review trace | PIB confirm transaction | Decision metadata belongs to review record | Separate audit table now (rejected: out of Module 2 scope) |

## 6) Workspace (table: workspaces)

No new PIB field is required for workspace in this implementation.

Reason:
- Stage 4 uses workspace_id as a filter key, but all precomputed ML values are member-level and stored on WorkspaceMember.

Rejected alternatives:
- Add workspace-level aggregate vector: rejected for v1 because current PIB response does not require workspace aggregate features and it introduces redundant denormalized state.

## 7) Design Decisions Locked

1. Store embeddings and vectors as TEXT JSON strings in entity columns.
Reason: existing entities already use JSON-in-TEXT style; avoids introducing custom converters for vector arrays.

2. Keep all new fields nullable with default NULL.
Reason: safe rollout on existing rows and compatibility with cold-start behavior.

3. Persist Stage 4 explainability in MLTeamRecommendation and snapshot provenance in ProjectMember.
Reason: preserves both recommendation evidence and assignment lineage.

4. Avoid new tables and avoid cross-module writes.
Reason: strict Module 2 ownership and no migration-based schema changes.

## 8) Implementation Note

Deliverable 2 will add these fields to entity classes with:
- nullable semantics
- columnDefinition defaults and comments
- Javadoc on each new field indicating PIB stage usage
- no modification of existing fields outside appending new ones
