#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import pymysql
from pymysql.cursors import DictCursor
from sklearn.linear_model import LogisticRegression

EMBEDDING_DIM = 384
RNG_SEED = 20260419


def _db_connection() -> pymysql.connections.Connection:
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    db_name = os.getenv("DB_NAME", "PiProjet")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASS", "")

    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


def _hash_embedding(text: str) -> np.ndarray:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(digest[:8], "big", signed=False)
    rng = random.Random(seed)
    vec = np.array([rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)], dtype=float)
    norm = np.linalg.norm(vec)
    if norm <= 1e-12:
        return vec
    return vec / norm


def _coalesce_scores(row: Dict[str, Any]) -> Tuple[float, float, float, float]:
    role_history = float(row.get("roleHistoryScore") or 0.5)
    skill = float(row.get("skillMatchScore") or 0.5)
    availability = float(row.get("availabilityScore") or 0.5)
    chemistry = float(row.get("chemistryScore") or 0.5)

    role_history = max(0.0, min(1.0, role_history))
    skill = max(0.0, min(1.0, skill))
    availability = max(0.0, min(1.0, availability))
    chemistry = max(0.0, min(1.0, chemistry))
    return role_history, skill, availability, chemistry


def _fetch_templates(cur: DictCursor) -> pd.DataFrame:
    cur.execute(
        """
        SELECT
            CASE WHEN OCTET_LENGTH(id)=16 THEN LOWER(CONCAT(HEX(SUBSTR(id,1,4)),'-',HEX(SUBSTR(id,5,2)),'-',HEX(SUBSTR(id,7,2)),'-',HEX(SUBSTR(id,9,2)),'-',HEX(SUBSTR(id,11)))) ELSE CAST(id AS CHAR) END AS template_id,
            name,
            template_type,
            use_case_description,
            COALESCE(ml_completion_rate, 0.65) AS ml_completion_rate,
            COALESCE(ml_fitness_score, 0.72) AS ml_fitness_score
        FROM project_templates
        WHERE deleted_at IS NULL
        ORDER BY updated_at DESC, created_at DESC
        """
    )
    rows = cur.fetchall() or []
    if not rows:
        raise RuntimeError("No active project_templates found to export Stage 2 artifacts")

    records: List[Dict[str, Any]] = []
    for row in rows:
        template_id = str(row.get("template_id") or "")
        name = str(row.get("name") or "Template")
        description = str(row.get("use_case_description") or "")
        text = f"{name}\n{description}"
        records.append(
            {
                "template_id": template_id,
                "template_name": name,
                "name": name,
                "template_type": str(row.get("template_type") or "CUSTOM"),
                "ml_completion_rate": float(row.get("ml_completion_rate") or 0.65),
                "ml_fitness_score": float(row.get("ml_fitness_score") or 0.72),
                "org_type": "enterprise",
                "_embedding_text": text,
            }
        )

    return pd.DataFrame(records)


def _fetch_member_profiles(cur: DictCursor) -> pd.DataFrame:
    cur.execute(
        """
        SELECT
            CASE WHEN OCTET_LENGTH(wm.workspace_id)=16 THEN LOWER(CONCAT(HEX(SUBSTR(wm.workspace_id,1,4)),'-',HEX(SUBSTR(wm.workspace_id,5,2)),'-',HEX(SUBSTR(wm.workspace_id,7,2)),'-',HEX(SUBSTR(wm.workspace_id,9,2)),'-',HEX(SUBSTR(wm.workspace_id,11)))) ELSE CAST(wm.workspace_id AS CHAR) END AS workspace_id,
            CAST(wm.user_id AS UNSIGNED) AS user_id,
            COALESCE(wm.ml_role_history_score, 0.5) AS roleHistoryScore,
            COALESCE(wm.ml_skill_match_score, 0.5) AS skillMatchScore,
            COALESCE(wm.ml_availability_score, 0.5) AS availabilityScore,
            COALESCE(wm.ml_chemistry_score, 0.5) AS chemistryScore,
            COALESCE(NULLIF(wm.ml_top_roles_json, ''), '[]') AS top_roles
        FROM workspace_members wm
        WHERE wm.deleted_at IS NULL
        """
    )
    rows = cur.fetchall() or []
    if not rows:
        raise RuntimeError("No active workspace_members found to export Stage 4 artifacts")

    out: List[Dict[str, Any]] = []
    for row in rows:
        role_history, skill, availability, chemistry = _coalesce_scores(row)
        out.append(
            {
                "workspace_id": str(row.get("workspace_id") or ""),
                "user_id": int(row.get("user_id") or 0),
                "roleHistoryScore": role_history,
                "skillMatchScore": skill,
                "availabilityScore": availability,
                "chemistryScore": chemistry,
                "top_roles": str(row.get("top_roles") or "[]"),
            }
        )

    return pd.DataFrame(out)


def _build_role_classifier() -> Tuple[Dict[str, Any], Dict[str, float]]:
    labels = ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER", "OBSERVER", "PROFESSOR"]
    struct_columns = [
        "ptype_software_dev",
        "ptype_research",
        "ptype_design",
        "ptype_migration",
        "ptype_marketing",
        "ptype_academic_assignment",
        "ptype_other",
        "complexity_low",
        "complexity_medium",
        "complexity_high",
        "org_enterprise",
        "org_academic",
    ]

    rng = np.random.default_rng(RNG_SEED)
    sample_count = 900

    role_centroids: Dict[str, np.ndarray] = {}
    for role in labels:
        base = rng.normal(0.0, 1.0, size=EMBEDDING_DIM)
        base = base / max(np.linalg.norm(base), 1e-12)
        role_centroids[role] = base

    project_types = [
        "software_dev",
        "research",
        "design",
        "migration",
        "marketing",
        "academic_assignment",
        "other",
    ]
    complexities = ["low", "medium", "high"]

    X_rows: List[np.ndarray] = []
    y_rows: List[str] = []

    for _ in range(sample_count):
        role = labels[int(rng.integers(0, len(labels)))]
        project_type = project_types[int(rng.integers(0, len(project_types)))]
        complexity = complexities[int(rng.integers(0, len(complexities)))]
        org = "academic" if role == "PROFESSOR" or rng.random() < 0.33 else "enterprise"

        emb = role_centroids[role] + rng.normal(0.0, 0.20, size=EMBEDDING_DIM)
        emb = emb / max(np.linalg.norm(emb), 1e-12)

        struct = np.zeros(len(struct_columns), dtype=float)
        active = {f"ptype_{project_type}", f"complexity_{complexity}", f"org_{org}"}
        for idx, col in enumerate(struct_columns):
            if col in active:
                struct[idx] = 1.0

        X_rows.append(np.hstack([emb, struct]))
        y_rows.append(role)

    X = np.vstack(X_rows)
    y = np.array(y_rows)

    clf = LogisticRegression(
        max_iter=800,
        multi_class="multinomial",
        random_state=RNG_SEED,
    )
    clf.fit(X, y)

    payload = {
        "classifier": clf,
        "label_classes": labels,
        "struct_columns": struct_columns,
        "embedding_dim": EMBEDDING_DIM,
    }

    thresholds = {
        "PROJECT_MANAGER": 0.33,
        "DEVELOPER": 0.33,
        "REVIEWER": 0.32,
        "OBSERVER": 0.30,
        "PROFESSOR": 0.30,
    }
    return payload, thresholds


def main() -> None:
    parser = argparse.ArgumentParser(description="Export PIB ML artifacts")
    parser.add_argument(
        "--out-dir",
        type=str,
        default=None,
        help="Output directory (default: <repo_root>/m2_ml_service/models/)",
    )
    args = parser.parse_args()

    if args.out_dir:
        models_dir = Path(args.out_dir).expanduser().resolve()
    else:
        root = Path(__file__).resolve().parents[1]
        models_dir = root / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    conn = _db_connection()
    try:
        with conn.cursor() as cur:
            templates_df = _fetch_templates(cur)
            profiles_df = _fetch_member_profiles(cur)
    finally:
        conn.close()

    template_embeddings = np.vstack([
        _hash_embedding(str(text)) for text in templates_df["_embedding_text"].tolist()
    ]).astype(np.float32)

    metadata_df = templates_df.drop(columns=["_embedding_text"]).copy()

    role_payload, thresholds = _build_role_classifier()

    np.save(models_dir / "template_embeddings.npy", template_embeddings)
    metadata_df.to_csv(models_dir / "template_metadata.csv", index=False)
    joblib.dump(role_payload, models_dir / "role_classifier.joblib")

    with (models_dir / "role_thresholds.json").open("w", encoding="utf-8") as fp:
        json.dump(thresholds, fp, ensure_ascii=True, indent=2)

    profiles_df.to_csv(models_dir / "member_profiles.csv", index=False)

    model_metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": "scripts/export_pib_artifacts.py",
        "embeddingMode": "deterministic-hash-384",
        "templateCount": int(len(metadata_df)),
        "profileCount": int(len(profiles_df)),
        "roleClasses": list(role_payload["label_classes"]),
    }
    with (models_dir / "model_metadata.json").open("w", encoding="utf-8") as fp:
        json.dump(model_metadata, fp, ensure_ascii=True, indent=2)

    print("PIB artifacts exported")
    print(f"models_dir={models_dir}")
    print(f"template_embeddings={template_embeddings.shape}")
    print(f"template_metadata_rows={len(metadata_df)}")
    print(f"member_profiles_rows={len(profiles_df)}")


if __name__ == "__main__":
    main()
