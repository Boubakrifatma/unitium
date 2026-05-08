#!/usr/bin/env python3
"""
Export PIB template artifacts for Stage 2 matching.

Outputs (in /app/models by default):
- template_embeddings.npy
- template_metadata.csv
- model_metadata.json

DB connection uses env vars: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
"""

from __future__ import annotations

import json
import math
import os
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Sequence

import numpy as np
import pandas as pd
import pymysql
from pymysql.cursors import DictCursor


EMBEDDING_DIM = 384


@dataclass
class TemplateRow:
    template_id: str
    name: str
    template_type: str
    default_roles_json: str
    ml_completion_rate: float
    ml_fitness_score: float


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
        autocommit=True,
    )


class Embedder:
    def __init__(self) -> None:
        self._model = None
        self._mode = "hash"
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            allow_download = os.getenv("PIB_ALLOW_MODEL_DOWNLOAD", "false").strip().lower() == "true"
            init_kwargs = {"local_files_only": not allow_download}
            self._model = SentenceTransformer("all-MiniLM-L6-v2", **init_kwargs)
            self._mode = "sentence-transformers"
        except Exception:
            self._model = None
            self._mode = "hash"

    @property
    def mode(self) -> str:
        return self._mode

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        if self._model is not None:
            vectors = self._model.encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
            return [[float(v) for v in row] for row in vectors]
        return [self._hash_vector(text) for text in texts]

    def _hash_vector(self, text: str) -> List[float]:
        seed = abs(hash(text)) % (2**32)
        rng = random.Random(seed)
        raw = [rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)]
        norm = math.sqrt(sum(v * v for v in raw)) or 1.0
        return [v / norm for v in raw]


def fetch_templates() -> List[TemplateRow]:
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    template_type,
                    COALESCE(default_roles_json, '[]') AS default_roles_json,
                    COALESCE(ml_completion_rate, 0.0) AS ml_completion_rate,
                    COALESCE(ml_fitness_score, 0.0) AS ml_fitness_score
                FROM project_templates
                WHERE deleted_at IS NULL
                ORDER BY updated_at DESC
                """
            )
            rows = cur.fetchall() or []
    finally:
        conn.close()

    output: List[TemplateRow] = []
    for row in rows:
        output.append(
            TemplateRow(
                template_id=str(row.get("id")),
                name=str(row.get("name") or "Template"),
                template_type=str(row.get("template_type") or "other"),
                default_roles_json=str(row.get("default_roles_json") or "[]"),
                ml_completion_rate=float(row.get("ml_completion_rate") or 0.0),
                ml_fitness_score=float(row.get("ml_fitness_score") or 0.0),
            )
        )
    return output


def main() -> None:
    models_dir = Path(__file__).resolve().parents[1] / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    templates = fetch_templates()
    if not templates:
        raise RuntimeError("No templates found to export artifacts.")

    embedder = Embedder()
    texts = [f"{t.name} {t.template_type}".strip() for t in templates]
    embeddings = np.array(embedder.encode(texts), dtype=float)

    metadata_rows = [
        {
            "template_id": t.template_id,
            "name": t.name,
            "template_type": t.template_type,
            "default_roles_json": t.default_roles_json,
            "ml_completion_rate": t.ml_completion_rate,
            "ml_fitness_score": t.ml_fitness_score,
        }
        for t in templates
    ]
    metadata = pd.DataFrame(metadata_rows)

    np.save(models_dir / "template_embeddings.npy", embeddings)
    metadata.to_csv(models_dir / "template_metadata.csv", index=False)

    model_metadata = {
        "generator": "scripts/export_pib_artifacts.py",
        "embedding_dim": EMBEDDING_DIM,
        "embedding_mode": embedder.mode,
        "template_count": len(templates),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
    with (models_dir / "model_metadata.json").open("w", encoding="utf-8") as fp:
        json.dump(model_metadata, fp, indent=2)


if __name__ == "__main__":
    main()
