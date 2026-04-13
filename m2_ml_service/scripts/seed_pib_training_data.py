#!/usr/bin/env python3
"""
Seed deterministic PIB training data for Module 2 tables.

Requirements addressed:
- DB credentials from env vars only: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
- Deterministic, rerunnable upserts
- Realistic enterprise and academic project descriptions
- Role assignment realism in project_members
- Template completion/fidelity metrics for Stage 2
- Precomputed embeddings for projects/templates and profile scores for workspace_members
- Progress output every 10 rows
- Final export: cmp_training_export.csv
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

import pymysql
from pymysql.cursors import DictCursor


NAMESPACE = uuid.UUID("9fd75f8c-2c2c-4e90-9e77-a3ba7d9d6072")
EMBEDDING_DIM = 384
PROJECTS_PER_WORKSPACE_MIN = 28
PROJECTS_PER_WORKSPACE_MAX = 48
CSV_ONLY_DEFAULT_PROJECTS = 10000
CSV_ONLY_DEFAULT_WORKSPACES = 120


PROJECT_TYPE_LIBRARY: Dict[str, List[str]] = {
    "software_dev": [
        "Build a feature-flagged onboarding flow for multi-tenant accounts with usage telemetry and rollback support.",
        "Implement a sprint-ready API gateway hardening plan with rate limits, audit tracing, and staged deployment.",
        "Create a collaborative backlog planner with drag-and-drop prioritization and role-aware approvals.",
    ],
    "research": [
        "Run a mixed-methods study on user retention drivers and produce an evidence-backed intervention plan.",
        "Conduct comparative benchmarking of recommendation strategies across historical workspace outcomes.",
        "Investigate latency regressions in project analytics queries and propose statistically validated fixes.",
    ],
    "design": [
        "Design a role-adaptive dashboard system with accessibility-first layouts and reusable UI tokens.",
        "Prototype an end-to-end project intake journey focused on clarity, confidence, and low friction.",
        "Create a mobile-first visual language for project cards, notifications, and progress affordances.",
    ],
    "migration": [
        "Migrate legacy workspace settings to a normalized schema with zero-downtime cutover and rollback plan.",
        "Plan and execute phased data migration from CSV imports into canonical project and member entities.",
        "Replatform template configuration storage to structured JSON with compatibility validation checkpoints.",
    ],
    "marketing": [
        "Launch a campaign operations workspace for quarterly product updates with measurable conversion goals.",
        "Create a content pipeline for thought-leadership releases tied to customer onboarding milestones.",
        "Run a cross-channel experiment to improve trial-to-paid conversion among enterprise organizations.",
    ],
    "academic_assignment": [
        "Prepare a semester project where students build a collaborative planning tool and submit weekly iterations.",
        "Design a capstone assignment on software quality metrics with peer review and faculty checkpoint rubrics.",
        "Coordinate a research practicum where student teams deliver reproducible experiments and written reports.",
    ],
    "other": [
        "Organize a cross-functional operational initiative with clear ownership, deadlines, and quality gates.",
        "Deliver an internal process improvement program with measurable cycle-time reduction objectives.",
        "Coordinate a knowledge-transfer project to document critical workflows before team transitions.",
    ],
}

DOMAIN_TAGS: Dict[str, List[str]] = {
    "software_dev": ["backend", "api", "qa", "devops"],
    "research": ["analysis", "benchmark", "hypothesis", "reporting"],
    "design": ["ux", "ui", "accessibility", "prototype"],
    "migration": ["data-migration", "integrations", "cutover", "stability"],
    "marketing": ["campaign", "content", "analytics", "conversion"],
    "academic_assignment": ["coursework", "assessment", "collaboration", "presentation"],
    "other": ["operations", "governance", "execution", "documentation"],
}

CONSTRAINTS_BY_COMPLEXITY: Dict[str, List[str]] = {
    "LOW": ["limited scope", "single team", "standard tooling"],
    "MEDIUM": ["cross-team dependencies", "deadline pressure", "stakeholder review"],
    "HIGH": ["multi-system integration", "strict compliance", "high reliability target"],
}


@dataclass
class WorkspaceRow:
    workspace_id: str
    workspace_name: str
    org_type: str


@dataclass
class WorkspaceMemberRow:
    workspace_id: str
    user_id: int
    role: str


@dataclass
class TemplateSeed:
    template_id: str
    org_type: str
    name: str
    template_type: str
    default_roles: List[str]
    description: str


class ProgressTicker:
    def __init__(self) -> None:
        self.count = 0

    def tick(self, label: str) -> None:
        self.count += 1
        if self.count % 10 == 0:
            print(f"[{datetime.utcnow().isoformat()}] processed {self.count} rows ({label})")


class Embedder:
    def __init__(self) -> None:
        self._model = None
        self._mode = "hash"
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            self._mode = "sentence-transformers"
            print("Loaded Sentence-BERT model all-MiniLM-L6-v2")
        except Exception as exc:  # pragma: no cover
            print(
                "WARNING: sentence-transformers unavailable; "
                "falling back to deterministic hashed embeddings.")
            print(f"Reason: {exc}")

    @property
    def mode(self) -> str:
        return self._mode

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        if self._model is not None:
            vectors = self._model.encode(  # type: ignore[attr-defined]
                list(texts),
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return [[float(v) for v in row] for row in vectors]

        return [self._hash_vector(text) for text in texts]

    def _hash_vector(self, text: str) -> List[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        seed = int.from_bytes(digest[:8], "big", signed=False)
        rng = random.Random(seed)
        raw = [rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)]
        norm = math.sqrt(sum(v * v for v in raw)) or 1.0
        return [v / norm for v in raw]


def require_env(name: str, allow_empty: bool = False) -> str:
    if name not in os.environ:
        raise RuntimeError(f"Environment variable {name} is required")
    value = os.getenv(name, "")
    if not allow_empty and not value.strip():
        raise RuntimeError(f"Environment variable {name} is required")
    return value


def connect_db() -> pymysql.connections.Connection:
    host = require_env("DB_HOST")
    port = int(require_env("DB_PORT"))
    db_name = require_env("DB_NAME")
    user = require_env("DB_USER")
    password = os.getenv("DB_PASS", "")

    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )


def deterministic_uuid(*parts: str) -> str:
    material = "::".join(parts)
    return str(uuid.uuid5(NAMESPACE, material))


def normalize_org_type(raw: str | None) -> str:
    val = (raw or "enterprise").strip().lower()
    return "academic" if val == "academic" else "enterprise"


def choose_complexity(project_type: str, rng: random.Random) -> str:
    if project_type in {"research", "migration", "academic_assignment"}:
        options = ["MEDIUM", "HIGH"]
        weights = [0.55, 0.45]
    elif project_type in {"software_dev", "marketing", "design"}:
        options = ["LOW", "MEDIUM", "HIGH"]
        weights = [0.25, 0.55, 0.20]
    else:
        options = ["LOW", "MEDIUM", "HIGH"]
        weights = [0.45, 0.40, 0.15]
    return rng.choices(options, weights=weights, k=1)[0]


def pick_project_type(org_type: str, rng: random.Random) -> str:
    if org_type == "academic":
        labels = [
            "academic_assignment",
            "research",
            "software_dev",
            "design",
            "other",
        ]
        weights = [0.46, 0.24, 0.14, 0.08, 0.08]
    else:
        labels = [
            "software_dev",
            "migration",
            "marketing",
            "design",
            "research",
            "other",
        ]
        weights = [0.38, 0.18, 0.16, 0.12, 0.10, 0.06]
    return rng.choices(labels, weights=weights, k=1)[0]


def build_project_description(project_type: str, complexity: str, rng: random.Random) -> str:
    base = rng.choice(PROJECT_TYPE_LIBRARY[project_type])
    milestones = {
        "LOW": "Target a concise delivery plan with one primary milestone and clear ownership.",
        "MEDIUM": "Plan three milestones with weekly stakeholder checkpoints and dependency tracking.",
        "HIGH": "Plan phased execution with risk controls, formal review gates, and rollback readiness.",
    }
    return f"{base} {milestones[complexity]}"


def template_catalog() -> List[TemplateSeed]:
    seeds: List[TemplateSeed] = []
    base = [
        ("Delivery Sprint Blueprint", "SCRUM", ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER"]),
        ("Incremental Kanban Delivery", "KANBAN", ["PROJECT_MANAGER", "DEVELOPER", "OBSERVER"]),
        ("Structured Research Program", "WATERFALL", ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER"]),
        ("Design Discovery Track", "CUSTOM", ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER"]),
        ("Migration Reliability Plan", "WATERFALL", ["PROJECT_MANAGER", "DEVELOPER", "OBSERVER"]),
        ("Academic Team Assignment", "SCRUM", ["PROFESSOR", "DEVELOPER", "REVIEWER"]),
        ("Capstone Research Studio", "CUSTOM", ["PROFESSOR", "DEVELOPER", "OBSERVER"]),
    ]

    for org_type in ("enterprise", "academic"):
        for name, template_type, roles in base:
            if org_type == "enterprise" and "Academic" in name:
                continue
            if org_type == "enterprise" and "Capstone" in name:
                continue
            if org_type == "academic" and "Migration" in name:
                continue

            description = (
                f"{name} for {org_type} teams with reusable phases, role defaults, and measurable outcomes."
            )
            template_id = deterministic_uuid("template", org_type, name)
            seeds.append(
                TemplateSeed(
                    template_id=template_id,
                    org_type=org_type,
                    name=name,
                    template_type=template_type,
                    default_roles=roles,
                    description=description,
                )
            )
    return seeds


def fetch_workspaces(cur: DictCursor) -> List[WorkspaceRow]:
    cur.execute(
        """
        SELECT
            w.id AS workspace_id,
            w.name AS workspace_name,
            COALESCE(LOWER(w.org_type), LOWER(o.org_type), 'enterprise') AS org_type
        FROM workspaces w
        LEFT JOIN organizations o ON o.id = w.organization_id
        WHERE w.deleted_at IS NULL
        ORDER BY w.created_at ASC
        """
    )
    rows = cur.fetchall()
    return [
        WorkspaceRow(
            workspace_id=str(row["workspace_id"]),
            workspace_name=str(row.get("workspace_name") or "Workspace"),
            org_type=normalize_org_type(str(row.get("org_type") or "enterprise")),
        )
        for row in rows
    ]


def fetch_workspace_members(cur: DictCursor) -> List[WorkspaceMemberRow]:
    cur.execute(
        """
        SELECT workspace_id, user_id, role
        FROM workspace_members
        WHERE deleted_at IS NULL
        ORDER BY workspace_id, user_id
        """
    )
    rows = cur.fetchall()
    return [
        WorkspaceMemberRow(
            workspace_id=str(row["workspace_id"]),
            user_id=int(row["user_id"]),
            role=str(row.get("role") or "MEMBER").upper(),
        )
        for row in rows
    ]


def upsert_templates(cur: DictCursor, embedder: Embedder, ticker: ProgressTicker) -> Dict[str, List[TemplateSeed]]:
    seeds = template_catalog()
    vectors = embedder.encode([s.description for s in seeds])

    grouped: Dict[str, List[TemplateSeed]] = {"enterprise": [], "academic": []}

    for seed, vec in zip(seeds, vectors):
        default_phases = json.dumps(
            [
                "Discovery",
                "Planning",
                "Execution",
                "Validation",
            ],
            separators=(",", ":"),
        )
        default_roles = json.dumps(seed.default_roles, separators=(",", ":"))
        completion_rate = 0.62
        if seed.template_type == "KANBAN":
            completion_rate = 0.74
        elif seed.template_type == "SCRUM":
            completion_rate = 0.69
        elif seed.template_type == "WATERFALL":
            completion_rate = 0.63

        if seed.org_type == "academic":
            completion_rate += 0.03

        fitness = round(min(0.98, max(0.35, completion_rate + 0.08)), 4)

        cur.execute(
            """
            INSERT INTO project_templates (
                id,
                organization_id,
                name,
                template_type,
                default_phases_json,
                default_roles_json,
                use_case_description,
                is_public,
                status,
                created_by,
                version,
                usage_count,
                rating,
                rating_count,
                created_at,
                updated_at,
                ml_template_embedding,
                ml_fitness_score,
                ml_completion_rate,
                ml_last_metrics_at
            ) VALUES (
                %s, NULL, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                NOW(), NOW(), %s, %s, %s, NOW()
            )
            ON DUPLICATE KEY UPDATE
                template_type = VALUES(template_type),
                default_phases_json = VALUES(default_phases_json),
                default_roles_json = VALUES(default_roles_json),
                use_case_description = VALUES(use_case_description),
                is_public = VALUES(is_public),
                status = VALUES(status),
                version = VALUES(version),
                ml_template_embedding = VALUES(ml_template_embedding),
                ml_fitness_score = VALUES(ml_fitness_score),
                ml_completion_rate = VALUES(ml_completion_rate),
                ml_last_metrics_at = NOW(),
                deleted_at = NULL,
                updated_at = NOW()
            """,
            (
                seed.template_id,
                seed.name,
                seed.template_type,
                default_phases,
                default_roles,
                seed.description,
                1,
                "APPROVED",
                1,
                1,
                50,
                4.4,
                12,
                json.dumps(vec, separators=(",", ":")),
                fitness,
                round(completion_rate, 4),
            ),
        )
        grouped[seed.org_type].append(seed)
        ticker.tick("template-upsert")

    return grouped


def assign_project_roles(
    org_type: str,
    members: List[WorkspaceMemberRow],
    rng: random.Random,
) -> List[Tuple[int, str]]:
    if not members:
        return []

    by_role: Dict[str, List[int]] = {}
    for row in members:
        by_role.setdefault(row.role.upper(), []).append(row.user_id)

    def pick_one(candidates: Iterable[int], fallback: int) -> int:
        c = list(dict.fromkeys(candidates))
        return rng.choice(c) if c else fallback

    all_user_ids = list(dict.fromkeys([m.user_id for m in members]))
    primary_fallback = all_user_ids[0]

    if org_type == "academic":
        lead_candidates = by_role.get("TA", []) + by_role.get("ADMIN", []) + by_role.get("OWNER", [])
        lead = pick_one(lead_candidates, primary_fallback)
        assignments: List[Tuple[int, str]] = [(lead, "PROFESSOR")]
    else:
        lead_candidates = by_role.get("MANAGER", []) + by_role.get("ADMIN", []) + by_role.get("OWNER", [])
        lead = pick_one(lead_candidates, primary_fallback)
        assignments = [(lead, "PROJECT_MANAGER")]

    remaining = [uid for uid in all_user_ids if uid != lead]
    if not remaining:
        return assignments

    dev_count = max(1, min(4, int(round(len(remaining) * 0.45))))
    reviewer_count = 1 if len(remaining) >= 2 else 0
    observer_count = 1 if len(remaining) >= 4 else 0

    rng.shuffle(remaining)
    picked_devs = remaining[:dev_count]
    for uid in picked_devs:
        assignments.append((uid, "DEVELOPER"))

    cursor = dev_count
    for _ in range(reviewer_count):
        if cursor < len(remaining):
            assignments.append((remaining[cursor], "REVIEWER"))
            cursor += 1

    for _ in range(observer_count):
        if cursor < len(remaining):
            assignments.append((remaining[cursor], "OBSERVER"))
            cursor += 1

    dedup: Dict[int, str] = {}
    for uid, role in assignments:
        if uid not in dedup:
            dedup[uid] = role
    return [(uid, role) for uid, role in dedup.items()]


def seed_projects_and_members(
    cur: DictCursor,
    embedder: Embedder,
    workspaces: List[WorkspaceRow],
    members_by_workspace: Dict[str, List[WorkspaceMemberRow]],
    templates_by_org_type: Dict[str, List[TemplateSeed]],
    ticker: ProgressTicker,
) -> Dict[str, int]:
    summary = {
        "projects_seeded": 0,
        "project_members_seeded": 0,
        "workspace_profiles_updated": 0,
    }

    for ws in workspaces:
        ws_members = members_by_workspace.get(ws.workspace_id, [])
        if not ws_members:
            continue

        ws_rng = random.Random(int(hashlib.sha1(ws.workspace_id.encode("utf-8")).hexdigest()[:10], 16))
        project_count = ws_rng.randint(PROJECTS_PER_WORKSPACE_MIN, PROJECTS_PER_WORKSPACE_MAX)
        templates = templates_by_org_type.get(ws.org_type, templates_by_org_type["enterprise"])

        descriptions: List[str] = []
        project_payloads: List[Dict[str, object]] = []

        for index in range(project_count):
            project_type = pick_project_type(ws.org_type, ws_rng)
            complexity = choose_complexity(project_type, ws_rng)
            description = build_project_description(project_type, complexity, ws_rng)
            domain_tags = ws_rng.sample(DOMAIN_TAGS[project_type], k=min(3, len(DOMAIN_TAGS[project_type])))
            constraints = ws_rng.sample(CONSTRAINTS_BY_COMPLEXITY[complexity], k=min(2, len(CONSTRAINTS_BY_COMPLEXITY[complexity])))
            template = ws_rng.choice(templates)

            status = ws_rng.choices(
                ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"],
                weights=[0.22, 0.40, 0.14, 0.24],
                k=1,
            )[0]

            start_date = date.today() - timedelta(days=ws_rng.randint(10, 150))
            end_date = start_date + timedelta(days=ws_rng.randint(20, 120))

            title_prefix = {
                "software_dev": "Platform",
                "research": "Research",
                "design": "Design",
                "migration": "Migration",
                "marketing": "Campaign",
                "academic_assignment": "Assignment",
                "other": "Initiative",
            }[project_type]
            name = f"{title_prefix} {index + 1} - {ws.workspace_name}"

            project_id = deterministic_uuid("project", ws.workspace_id, str(index + 1))
            creator_id = ws_members[0].user_id

            project_payloads.append(
                {
                    "project_id": project_id,
                    "workspace_id": ws.workspace_id,
                    "template_id": template.template_id,
                    "created_by": creator_id,
                    "name": name,
                    "description": description,
                    "status": status,
                    "visibility": "PRIVATE" if ws_rng.random() < 0.82 else "PUBLIC",
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "project_type": project_type,
                    "complexity": complexity,
                    "detected_mode": ws.org_type,
                    "domain_tags_json": json.dumps(domain_tags, separators=(",", ":")),
                    "constraints_json": json.dumps(constraints, separators=(",", ":")),
                }
            )
            descriptions.append(description)

        embeddings = embedder.encode(descriptions)

        for payload, vector in zip(project_payloads, embeddings):
            cur.execute(
                """
                INSERT INTO projects (
                    id,
                    workspace_id,
                    template_id,
                    created_by,
                    name,
                    description,
                    status,
                    visibility,
                    start_date,
                    end_date,
                    phases_json,
                    created_at,
                    updated_at,
                    ml_description_embedding,
                    ml_project_type,
                    ml_complexity,
                    ml_detected_mode,
                    ml_domain_tags_json,
                    ml_constraints_json,
                    ml_last_inference_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    NOW(), NOW(), %s, %s, %s, %s, %s, %s, NOW()
                )
                ON DUPLICATE KEY UPDATE
                    template_id = VALUES(template_id),
                    created_by = VALUES(created_by),
                    name = VALUES(name),
                    description = VALUES(description),
                    status = VALUES(status),
                    visibility = VALUES(visibility),
                    start_date = VALUES(start_date),
                    end_date = VALUES(end_date),
                    phases_json = VALUES(phases_json),
                    ml_description_embedding = VALUES(ml_description_embedding),
                    ml_project_type = VALUES(ml_project_type),
                    ml_complexity = VALUES(ml_complexity),
                    ml_detected_mode = VALUES(ml_detected_mode),
                    ml_domain_tags_json = VALUES(ml_domain_tags_json),
                    ml_constraints_json = VALUES(ml_constraints_json),
                    ml_last_inference_at = NOW(),
                    deleted_at = NULL,
                    updated_at = NOW()
                """,
                (
                    payload["project_id"],
                    payload["workspace_id"],
                    payload["template_id"],
                    payload["created_by"],
                    payload["name"],
                    payload["description"],
                    payload["status"],
                    payload["visibility"],
                    payload["start_date"],
                    payload["end_date"],
                    json.dumps(["Discovery", "Execution", "Review"], separators=(",", ":")),
                    json.dumps(vector, separators=(",", ":")),
                    payload["project_type"],
                    payload["complexity"],
                    payload["detected_mode"],
                    payload["domain_tags_json"],
                    payload["constraints_json"],
                ),
            )
            summary["projects_seeded"] += 1
            ticker.tick("project-upsert")

            role_rows = assign_project_roles(ws.org_type, ws_members, ws_rng)
            for user_id, role in role_rows:
                pm_id = deterministic_uuid("project-member", payload["project_id"], str(user_id))
                confidence = round(ws_rng.uniform(0.58, 0.94), 4)
                reason = json.dumps(
                    {
                        "reason": f"Role fit and availability suggest {role.lower()} assignment.",
                        "org_type": ws.org_type,
                    },
                    separators=(",", ":"),
                )

                rec_id = deterministic_uuid("rec", payload["project_id"], str(user_id), role)
                cur.execute(
                    """
                    INSERT INTO project_members (
                        id,
                        project_id,
                        user_id,
                        role,
                        assigned_at,
                        assigned_by,
                        ml_assigned_by_ai,
                        ml_assignment_confidence,
                        ml_assignment_reason_json,
                        ml_source_recommendation_id
                    ) VALUES (
                        %s, %s, %s, %s, NOW(), %s,
                        %s, %s, %s, %s
                    )
                    ON DUPLICATE KEY UPDATE
                        role = VALUES(role),
                        assigned_by = VALUES(assigned_by),
                        ml_assigned_by_ai = VALUES(ml_assigned_by_ai),
                        ml_assignment_confidence = VALUES(ml_assignment_confidence),
                        ml_assignment_reason_json = VALUES(ml_assignment_reason_json),
                        ml_source_recommendation_id = VALUES(ml_source_recommendation_id),
                        deleted_at = NULL
                    """,
                    (
                        pm_id,
                        payload["project_id"],
                        user_id,
                        role,
                        payload["created_by"],
                        1,
                        confidence,
                        reason,
                        rec_id,
                    ),
                )
                summary["project_members_seeded"] += 1
                ticker.tick("project-member-upsert")

        for member in ws_members:
            profile_rng = random.Random(
                int(hashlib.sha1(f"{ws.workspace_id}:{member.user_id}".encode("utf-8")).hexdigest()[:10], 16)
            )
            role_history = round(profile_rng.uniform(0.30, 0.95), 4)
            skill_match = round(profile_rng.uniform(0.35, 0.97), 4)
            availability = round(profile_rng.uniform(0.25, 0.90), 4)
            chemistry = round(profile_rng.uniform(0.20, 0.88), 4)

            top_roles = ["DEVELOPER", "REVIEWER"]
            if ws.org_type == "academic" and member.role in {"TA", "ADMIN", "OWNER"}:
                top_roles = ["PROFESSOR", "REVIEWER"]
            elif ws.org_type == "enterprise" and member.role in {"MANAGER", "ADMIN", "OWNER"}:
                top_roles = ["PROJECT_MANAGER", "REVIEWER"]

            profile_vector = [
                role_history,
                skill_match,
                availability,
                chemistry,
            ] + [0.0 for _ in range(20)]

            cur.execute(
                """
                UPDATE workspace_members
                SET
                    ml_role_history_score = %s,
                    ml_skill_match_score = %s,
                    ml_availability_score = %s,
                    ml_chemistry_score = %s,
                    ml_top_roles_json = %s,
                    ml_profile_vector = %s,
                    ml_profile_updated_at = NOW()
                WHERE workspace_id = %s
                  AND user_id = %s
                  AND deleted_at IS NULL
                """,
                (
                    role_history,
                    skill_match,
                    availability,
                    chemistry,
                    json.dumps(top_roles, separators=(",", ":")),
                    json.dumps(profile_vector, separators=(",", ":")),
                    ws.workspace_id,
                    member.user_id,
                ),
            )
            summary["workspace_profiles_updated"] += 1
            ticker.tick("workspace-member-profile-update")

    return summary


def upsert_recommendations(cur: DictCursor, ticker: ProgressTicker) -> int:
    cur.execute(
        """
        SELECT p.id AS project_id, pm.user_id, pm.role
        FROM projects p
        JOIN project_members pm ON pm.project_id = p.id
        WHERE p.deleted_at IS NULL
          AND pm.deleted_at IS NULL
        ORDER BY p.id, pm.user_id
        """
    )
    rows = cur.fetchall()
    inserted = 0

    for row in rows:
        project_id = str(row["project_id"])
        user_id = int(row["user_id"])
        role = str(row["role"])
        recommendation_id = deterministic_uuid("rec", project_id, str(user_id), role)
        breakdown = {
            "roleHistoryScore": 0.35,
            "skillMatchScore": 0.25,
            "availabilityScore": 0.25,
            "chemistryScore": 0.15,
        }
        reasons = [
            "Historical role performance is strong for this context.",
            "Current availability aligns with project timeline.",
        ]

        cur.execute(
            """
            INSERT INTO ml_team_recommendations (
                id,
                project_id,
                recommended_user_id,
                target_role,
                compatibility_score,
                shap_features_json,
                status,
                generated_at,
                reviewed_by,
                reviewed_at,
                ml_score_breakdown_json,
                ml_reasons_json,
                ml_cold_start_mode,
                ml_model_version,
                ml_decision_note
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, NOW(), NULL, NULL,
                %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                target_role = VALUES(target_role),
                compatibility_score = VALUES(compatibility_score),
                shap_features_json = VALUES(shap_features_json),
                ml_score_breakdown_json = VALUES(ml_score_breakdown_json),
                ml_reasons_json = VALUES(ml_reasons_json),
                ml_cold_start_mode = VALUES(ml_cold_start_mode),
                ml_model_version = VALUES(ml_model_version),
                ml_decision_note = VALUES(ml_decision_note),
                deleted_at = NULL
            """,
            (
                recommendation_id,
                project_id,
                user_id,
                role,
                0.76,
                json.dumps({"top_feature": "availability"}, separators=(",", ":")),
                "PENDING",
                json.dumps(breakdown, separators=(",", ":")),
                json.dumps(reasons, separators=(",", ":")),
                0,
                "pib-baseline-v1",
                "Seeded recommendation row",
            ),
        )
        inserted += 1
        ticker.tick("recommendation-upsert")

    return inserted


def export_training_csv(cur: DictCursor, output_path: Path) -> int:
    cur.execute(
        """
        SELECT
            p.id AS project_id,
            p.workspace_id,
            COALESCE(LOWER(w.org_type), LOWER(o.org_type), 'enterprise') AS org_type,
            p.name AS project_name,
            p.description,
            p.status,
            p.ml_project_type,
            p.ml_complexity,
            p.ml_detected_mode,
            p.ml_domain_tags_json,
            p.ml_constraints_json,
            p.ml_description_embedding,
            p.template_id,
            t.name AS template_name,
            t.template_type,
            t.ml_fitness_score,
            t.ml_completion_rate,
            pm.user_id,
            pm.role AS member_role,
            pm.ml_assigned_by_ai,
            pm.ml_assignment_confidence,
            wm.ml_role_history_score,
            wm.ml_skill_match_score,
            wm.ml_availability_score,
            wm.ml_chemistry_score,
            wm.ml_top_roles_json
        FROM projects p
        JOIN workspaces w ON w.id = p.workspace_id
        LEFT JOIN organizations o ON o.id = w.organization_id
        LEFT JOIN project_templates t ON t.id = p.template_id
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted_at IS NULL
        LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
                                     AND wm.user_id = pm.user_id
                                     AND wm.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        ORDER BY p.id, pm.user_id
        """
    )
    rows = cur.fetchall()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as fp:
        if rows:
            writer = csv.DictWriter(fp, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        else:
            writer = csv.writer(fp)
            writer.writerow(
                [
                    "project_id",
                    "workspace_id",
                    "org_type",
                    "project_name",
                    "description",
                ]
            )
    return len(rows)


def _round_embedding(vec: Sequence[float]) -> str:
    return json.dumps([round(float(v), 6) for v in vec[:EMBEDDING_DIM]], separators=(",", ":"))


def _member_profile_scores(workspace_id: str, user_id: int) -> Tuple[float, float, float, float]:
    seed = int(hashlib.sha1(f"{workspace_id}:{user_id}".encode("utf-8")).hexdigest()[:12], 16)
    rng = random.Random(seed)
    role_history = round(rng.uniform(0.30, 0.97), 4)
    skill_match = round(rng.uniform(0.35, 0.99), 4)
    availability = round(rng.uniform(0.20, 0.95), 4)
    chemistry = round(rng.uniform(0.15, 0.92), 4)
    return role_history, skill_match, availability, chemistry


def _assign_csv_roles(org_type: str, member_pool: List[int], rng: random.Random) -> List[Tuple[int, str]]:
    size = min(len(member_pool), rng.randint(4, 7))
    picked = rng.sample(member_pool, k=size)

    lead_role = "PROFESSOR" if org_type == "academic" else "PROJECT_MANAGER"
    assignments: List[Tuple[int, str]] = [(picked[0], lead_role)]

    remaining_roles = rng.choices(
        ["DEVELOPER", "REVIEWER", "OBSERVER"],
        weights=[0.62, 0.25, 0.13],
        k=max(0, size - 1),
    )
    for user_id, role in zip(picked[1:], remaining_roles):
        assignments.append((user_id, role))

    if all(role != "REVIEWER" for _, role in assignments) and len(assignments) > 2:
        last_user_id, _ = assignments[-1]
        assignments[-1] = (last_user_id, "REVIEWER")

    return assignments


def generate_large_csv_only_dataset(
    embedder: Embedder,
    output_path: Path,
    ticker: ProgressTicker,
    target_projects: int,
    workspace_count: int,
) -> Dict[str, int]:
    rng = random.Random(20260404)

    template_rows: List[Dict[str, object]] = []
    template_seeds = template_catalog()
    template_vectors = embedder.encode([seed.description for seed in template_seeds])
    for seed, vec in zip(template_seeds, template_vectors):
        completion = 0.62
        if seed.template_type == "KANBAN":
            completion = 0.76
        elif seed.template_type == "SCRUM":
            completion = 0.71
        elif seed.template_type == "WATERFALL":
            completion = 0.65
        if seed.org_type == "academic":
            completion += 0.03
        fitness = round(min(0.98, max(0.35, completion + 0.09)), 4)
        template_rows.append(
            {
                "id": seed.template_id,
                "org_type": seed.org_type,
                "name": seed.name,
                "template_type": seed.template_type,
                "completion_rate": round(completion, 4),
                "fitness": fitness,
                "embedding": _round_embedding(vec),
            }
        )

    templates_by_org = {
        "enterprise": [t for t in template_rows if t["org_type"] == "enterprise"],
        "academic": [t for t in template_rows if t["org_type"] == "academic"],
    }

    workspaces: List[WorkspaceRow] = []
    for idx in range(workspace_count):
        org_type = "academic" if idx % 3 == 0 else "enterprise"
        workspace_id = deterministic_uuid("csv-workspace", str(idx + 1))
        workspaces.append(
            WorkspaceRow(
                workspace_id=workspace_id,
                workspace_name=f"{org_type.title()} Workspace {idx + 1}",
                org_type=org_type,
            )
        )

    member_pool_by_workspace: Dict[str, List[int]] = {}
    for idx, ws in enumerate(workspaces):
        base = 100000 + idx * 1000
        pool_size = 280 if ws.org_type == "academic" else 240
        member_pool_by_workspace[ws.workspace_id] = list(range(base, base + pool_size))

    headers = [
        "project_id",
        "workspace_id",
        "org_type",
        "project_name",
        "description",
        "status",
        "ml_project_type",
        "ml_complexity",
        "ml_detected_mode",
        "ml_domain_tags_json",
        "ml_constraints_json",
        "ml_description_embedding",
        "template_id",
        "template_name",
        "template_type",
        "ml_fitness_score",
        "ml_completion_rate",
        "ml_template_embedding",
        "user_id",
        "member_role",
        "ml_assigned_by_ai",
        "ml_assignment_confidence",
        "ml_role_history_score",
        "ml_skill_match_score",
        "ml_availability_score",
        "ml_chemistry_score",
        "ml_top_roles_json",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)

    projects_seeded = 0
    rows_written = 0
    batch_size = 128
    pending: List[Dict[str, object]] = []

    def flush_pending(writer: csv.DictWriter) -> None:
        nonlocal projects_seeded, rows_written, pending
        if not pending:
            return

        vectors = embedder.encode([str(item["description"]) for item in pending])
        for item, vec in zip(pending, vectors):
            ws = item["workspace"]
            template = item["template"]
            roles = item["roles"]
            embedding_json = _round_embedding(vec)

            for user_id, role in roles:
                role_history, skill_match, availability, chemistry = _member_profile_scores(ws.workspace_id, user_id)
                if role in {"PROJECT_MANAGER", "PROFESSOR"}:
                    top_roles = [role, "REVIEWER"]
                else:
                    top_roles = [role, "DEVELOPER", "REVIEWER"]

                confidence = 0.0
                if role in {"PROJECT_MANAGER", "PROFESSOR"}:
                    confidence = round(random.Random(user_id).uniform(0.70, 0.96), 4)
                else:
                    confidence = round(random.Random(user_id + 11).uniform(0.48, 0.92), 4)

                writer.writerow(
                    {
                        "project_id": item["project_id"],
                        "workspace_id": ws.workspace_id,
                        "org_type": ws.org_type,
                        "project_name": item["project_name"],
                        "description": item["description"],
                        "status": item["status"],
                        "ml_project_type": item["project_type"],
                        "ml_complexity": item["complexity"],
                        "ml_detected_mode": ws.org_type,
                        "ml_domain_tags_json": item["domain_tags_json"],
                        "ml_constraints_json": item["constraints_json"],
                        "ml_description_embedding": embedding_json,
                        "template_id": template["id"],
                        "template_name": template["name"],
                        "template_type": template["template_type"],
                        "ml_fitness_score": template["fitness"],
                        "ml_completion_rate": template["completion_rate"],
                        "ml_template_embedding": template["embedding"],
                        "user_id": user_id,
                        "member_role": role,
                        "ml_assigned_by_ai": 1 if random.Random(user_id + 23).random() < 0.78 else 0,
                        "ml_assignment_confidence": confidence,
                        "ml_role_history_score": role_history,
                        "ml_skill_match_score": skill_match,
                        "ml_availability_score": availability,
                        "ml_chemistry_score": chemistry,
                        "ml_top_roles_json": json.dumps(top_roles, separators=(",", ":")),
                    }
                )
                rows_written += 1

            projects_seeded += 1
            ticker.tick("csv-project-generate")

        pending = []

    with output_path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=headers)
        writer.writeheader()

        for index in range(target_projects):
            ws = workspaces[index % len(workspaces)]
            member_pool = member_pool_by_workspace[ws.workspace_id]
            project_rng = random.Random(index + 703)

            project_type = pick_project_type(ws.org_type, project_rng)
            complexity = choose_complexity(project_type, project_rng)
            description = build_project_description(project_type, complexity, project_rng)
            domain_tags = project_rng.sample(DOMAIN_TAGS[project_type], k=min(3, len(DOMAIN_TAGS[project_type])))
            constraints = project_rng.sample(CONSTRAINTS_BY_COMPLEXITY[complexity], k=min(2, len(CONSTRAINTS_BY_COMPLEXITY[complexity])))

            templates = templates_by_org.get(ws.org_type, templates_by_org["enterprise"])
            template = templates[index % len(templates)]

            status = project_rng.choices(
                ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"],
                weights=[0.20, 0.42, 0.13, 0.22, 0.03],
                k=1,
            )[0]

            title_prefix = {
                "software_dev": "Platform",
                "research": "Research",
                "design": "Design",
                "migration": "Migration",
                "marketing": "Campaign",
                "academic_assignment": "Assignment",
                "other": "Initiative",
            }[project_type]

            pending.append(
                {
                    "project_id": deterministic_uuid("csv-project", str(index + 1)),
                    "workspace": ws,
                    "project_name": f"{title_prefix} {index + 1} - {ws.workspace_name}",
                    "description": description,
                    "status": status,
                    "project_type": project_type,
                    "complexity": complexity,
                    "domain_tags_json": json.dumps(domain_tags, separators=(",", ":")),
                    "constraints_json": json.dumps(constraints, separators=(",", ":")),
                    "template": template,
                    "roles": _assign_csv_roles(ws.org_type, member_pool, project_rng),
                }
            )

            if len(pending) >= batch_size:
                flush_pending(writer)

        flush_pending(writer)

    return {
        "projects_seeded": projects_seeded,
        "rows_exported": rows_written,
        "workspaces_synthesized": len(workspaces),
        "templates_synthesized": len(template_rows),
    }


def main() -> None:
    print("Starting PIB training data seed...")
    print("Embedding mode: sentence-transformers if available, deterministic hash fallback otherwise.")

    embedder = Embedder()
    ticker = ProgressTicker()

    export_path = Path(__file__).resolve().parents[1] / "cmp_training_export.csv"
    target_projects = int(os.getenv("PIB_CSV_ONLY_PROJECTS", str(CSV_ONLY_DEFAULT_PROJECTS)))
    workspace_count = int(os.getenv("PIB_CSV_ONLY_WORKSPACES", str(CSV_ONLY_DEFAULT_WORKSPACES)))

    connection = None
    try:
        connection = connect_db()
        try:
            with connection.cursor() as cur:
                workspaces = fetch_workspaces(cur)
                if not workspaces:
                    raise RuntimeError("No active workspaces found. Seed at least one workspace before running PIB seed.")

                members = fetch_workspace_members(cur)
                members_by_workspace: Dict[str, List[WorkspaceMemberRow]] = {}
                for row in members:
                    members_by_workspace.setdefault(row.workspace_id, []).append(row)

                templates_by_org_type = upsert_templates(cur, embedder, ticker)
                summary = seed_projects_and_members(
                    cur,
                    embedder,
                    workspaces,
                    members_by_workspace,
                    templates_by_org_type,
                    ticker,
                )
                summary["recommendations_seeded"] = upsert_recommendations(cur, ticker)

                exported_rows = export_training_csv(cur, export_path)

            connection.commit()

            print("\nPIB seed completed successfully")
            print("--------------------------------")
            print(f"Workspaces scanned: {len(workspaces)}")
            print(f"Projects upserted: {summary['projects_seeded']}")
            print(f"Project members upserted: {summary['project_members_seeded']}")
            print(f"Workspace member profiles updated: {summary['workspace_profiles_updated']}")
            print(f"Recommendation rows upserted: {summary['recommendations_seeded']}")
            print(f"CSV rows exported: {exported_rows}")
            print(f"CSV path: {export_path}")
            print(f"Embedding mode used: {embedder.mode}")
            return
        except pymysql.err.OperationalError as db_exc:
            if connection is not None:
                connection.rollback()
            if "Unknown column" in str(db_exc):
                print("\nDetected missing ML schema columns in DB. Switching to large CSV-only generation mode.")
            else:
                raise
    except Exception as exc:
        if isinstance(exc, pymysql.err.OperationalError):
            print("\nDatabase operation failed, switching to CSV-only generation mode.")
        else:
            raise
    finally:
        if connection is not None:
            connection.close()

    csv_summary = generate_large_csv_only_dataset(
        embedder=embedder,
        output_path=export_path,
        ticker=ticker,
        target_projects=target_projects,
        workspace_count=workspace_count,
    )
    print("\nPIB seed completed in CSV-only mode")
    print("--------------------------------")
    print(f"Workspaces synthesized: {csv_summary['workspaces_synthesized']}")
    print(f"Templates synthesized: {csv_summary['templates_synthesized']}")
    print(f"Projects generated: {csv_summary['projects_seeded']}")
    print(f"CSV rows exported: {csv_summary['rows_exported']}")
    print(f"CSV path: {export_path}")
    print(f"Embedding mode used: {embedder.mode}")


if __name__ == "__main__":
    main()
