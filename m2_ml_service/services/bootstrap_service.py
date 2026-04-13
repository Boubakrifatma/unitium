from __future__ import annotations

import base64
import hashlib
import json
import logging
import math
import os
import random
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import pymysql
from fastapi import HTTPException
from pymysql.cursors import DictCursor

logger = logging.getLogger("uvicorn.error")


@dataclass
class WorkspaceContext:
    workspace_id: str
    workspace_name: str
    org_type: str


@dataclass
class ArtifactState:
    stage2_ready: bool = False
    stage3_ready: bool = False
    stage4_ready: bool = False
    template_embeddings: Optional[np.ndarray] = None
    template_metadata: Optional[pd.DataFrame] = None
    role_classifier_payload: Optional[Dict[str, Any]] = None
    role_thresholds: Dict[str, float] = field(default_factory=dict)
    member_profiles: Optional[pd.DataFrame] = None
    model_metadata: Dict[str, Any] = field(default_factory=dict)


class BootstrapService:
    def __init__(self, models_dir: Path) -> None:
        self.models_dir = models_dir
        self.artifacts = ArtifactState()
        self.embed_model = None
        self.redis_client = None
        self.redis_ttl_seconds = 3600

        self._load_stage1_model()
        self._load_redis_client()

    def initialize(self) -> None:
        self.models_dir.mkdir(parents=True, exist_ok=True)

        template_embeddings_path = self.models_dir / "template_embeddings.npy"
        template_metadata_path = self.models_dir / "template_metadata.csv"
        role_classifier_path = self.models_dir / "role_classifier.joblib"
        role_thresholds_path = self.models_dir / "role_thresholds.json"
        member_profiles_path = self.models_dir / "member_profiles.csv"
        model_metadata_path = self.models_dir / "model_metadata.json"

        if template_embeddings_path.exists() and template_metadata_path.exists():
            try:
                self.artifacts.template_embeddings = np.load(template_embeddings_path)
                self.artifacts.template_metadata = pd.read_csv(template_metadata_path)
                self.artifacts.stage2_ready = True
            except Exception as exc:
                logger.warning("Failed loading Stage 2 artifacts: %s", exc)
                self.artifacts.stage2_ready = False

        if role_classifier_path.exists() and role_thresholds_path.exists():
            try:
                self.artifacts.role_classifier_payload = joblib.load(role_classifier_path)
                with role_thresholds_path.open("r", encoding="utf-8") as fp:
                    self.artifacts.role_thresholds = {
                        str(k): float(v) for k, v in json.load(fp).items()
                    }
                self.artifacts.stage3_ready = True
            except Exception as exc:
                logger.warning("Failed loading Stage 3 artifacts: %s", exc)
                self.artifacts.stage3_ready = False

        if member_profiles_path.exists():
            try:
                self.artifacts.member_profiles = pd.read_csv(member_profiles_path)
                self.artifacts.stage4_ready = True
            except Exception as exc:
                logger.warning("Failed loading Stage 4 artifacts: %s", exc)
                self.artifacts.stage4_ready = False

        if model_metadata_path.exists():
            try:
                with model_metadata_path.open("r", encoding="utf-8") as fp:
                    raw = json.load(fp)
                if isinstance(raw, dict):
                    self.artifacts.model_metadata = {str(k): raw[k] for k in raw.keys()}
            except Exception as exc:
                logger.warning("Failed loading model metadata artifact: %s", exc)
                self.artifacts.model_metadata = {}

        logger.info(
            "PIB capabilities - stage2_ready=%s stage3_ready=%s stage4_ready=%s",
            self.artifacts.stage2_ready,
            self.artifacts.stage3_ready,
            self.artifacts.stage4_ready,
        )

    def capabilities(self) -> Dict[str, bool]:
        return {
            "stage2_ready": self.artifacts.stage2_ready,
            "stage3_ready": self.artifacts.stage3_ready,
            "stage4_ready": self.artifacts.stage4_ready,
        }

    def process_bootstrap(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        started = time.perf_counter()

        workspace_id = str(payload.get("workspace_id") or "").strip()
        input_type = str(payload.get("input_type") or "").strip().lower()
        description = payload.get("description")

        logger.info("PIB request received workspace_id=%s input_type=%s", workspace_id, input_type)

        if not workspace_id:
            raise HTTPException(status_code=400, detail="workspace_id is required")

        if input_type not in {"text", "document"}:
            raise HTTPException(status_code=400, detail="input_type must be text or document")

        workspace = self._fetch_workspace_context(workspace_id)
        if workspace is None:
            raise HTTPException(status_code=404, detail="workspace not found")

        text_input = ""
        if input_type == "text":
            text_input = str(description or "").strip()
            if not text_input:
                raise HTTPException(status_code=400, detail="missing description and document both")
        else:
            text_input = self._extract_document_text(
                payload.get("document_base64"),
                payload.get("document_filename"),
            )

        if input_type == "document" and len(text_input.split()) < 20:
            raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")

        cache_hit = False
        cache_key = None
        if input_type == "text":
            cache_key = self._cache_key(workspace_id, text_input)
            cached = self._cache_get(cache_key)
            if cached is not None:
                if bool(cached.get("cold_start_any", False)):
                    logger.warning(
                        "Ignoring cached PIB response with cold_start_any=true in strict mode workspace_id=%s",
                        workspace_id,
                    )
                else:
                    logger.info("PIB cache hit workspace_id=%s", workspace_id)
                    cached["cache_hit"] = True
                    return cached

        stage1 = self._run_stage1(text_input, workspace)
        stage2 = self._run_stage2(stage1, text_input, workspace)
        stage3 = self._run_stage3(stage1, stage2, workspace)
        stage4 = self._run_stage4(stage1, stage3, workspace)

        latency_ms = int((time.perf_counter() - started) * 1000)
        cold_start_any = False
        response = {
            "workspace_id": workspace.workspace_id,
            "input_type": input_type,
            "stage1": stage1,
            "stage2": stage2,
            "stage3": stage3,
            "stage4": stage4,
            "capabilities": self.capabilities(),
            "cold_start_any": cold_start_any,
            "latency_ms": latency_ms,
            "cache_hit": cache_hit,
            "metadata": {
                "embedding_model": "all-MiniLM-L6-v2",
                "workspace_mode": workspace.org_type,
                "model_version": self._resolve_model_version(),
            },
        }

        logger.info(
            "PIB response workspace_id=%s latency_ms=%s cold_start_any=%s stage2_cold=%s stage3_cold=%s stage4_cold=%s",
            workspace.workspace_id,
            latency_ms,
            cold_start_any,
            stage2["cold_start_mode"],
            stage3["cold_start_mode"],
            stage4["cold_start_mode"],
        )

        if cache_key is not None:
            self._cache_set(cache_key, response)

        return response

    def debug_status(self) -> Dict[str, Any]:
        template_shape = None
        if self.artifacts.template_embeddings is not None:
            try:
                template_shape = [int(x) for x in self.artifacts.template_embeddings.shape]
            except Exception:
                template_shape = None

        return {
            "capabilities": self.capabilities(),
            "models_dir": str(self.models_dir),
            "artifacts": {
                "template_embeddings_loaded": self.artifacts.template_embeddings is not None,
                "template_embeddings_shape": template_shape,
                "template_metadata_rows": 0 if self.artifacts.template_metadata is None else int(len(self.artifacts.template_metadata)),
                "role_classifier_loaded": self.artifacts.role_classifier_payload is not None,
                "role_threshold_count": int(len(self.artifacts.role_thresholds)),
                "member_profiles_rows": 0 if self.artifacts.member_profiles is None else int(len(self.artifacts.member_profiles)),
                "model_metadata_keys": sorted([str(k) for k in (self.artifacts.model_metadata or {}).keys()]),
            },
            "resolved_model_version": self._resolve_model_version(),
        }

    def _load_stage1_model(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            allow_download = os.getenv("PIB_ALLOW_MODEL_DOWNLOAD", "false").strip().lower() == "true"
            init_kwargs: Dict[str, Any] = {}
            if not allow_download:
                # Avoid long startup hangs in offline environments.
                init_kwargs["local_files_only"] = True

            self.embed_model = SentenceTransformer("all-MiniLM-L6-v2", **init_kwargs)
            logger.info("Stage 1 model loaded: all-MiniLM-L6-v2 (allow_download=%s)", allow_download)
        except Exception as exc:  # pragma: no cover
            self.embed_model = None
            logger.warning("Stage 1 Sentence-BERT unavailable; using deterministic hash embedding fallback. %s", exc)

    def _load_redis_client(self) -> None:
        try:
            import redis  # type: ignore

            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            client = redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=0.2)
            client.ping()
            self.redis_client = client
            logger.info("Redis cache enabled for PIB")
        except Exception as exc:
            self.redis_client = None
            logger.warning("Redis unavailable for PIB cache; continuing without cache. %s", exc)

    def _db_connection(self):
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

    def _fetch_workspace_context(self, workspace_id: str) -> Optional[WorkspaceContext]:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        w.id AS workspace_id,
                        w.name AS workspace_name,
                        COALESCE(LOWER(w.org_type), LOWER(o.org_type), 'enterprise') AS org_type
                    FROM workspaces w
                    LEFT JOIN organizations o ON o.id = w.organization_id
                    WHERE w.id = %s
                      AND w.deleted_at IS NULL
                    LIMIT 1
                    """,
                    (workspace_id,),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                return WorkspaceContext(
                    workspace_id=str(row["workspace_id"]),
                    workspace_name=str(row.get("workspace_name") or "Workspace"),
                    org_type=self._normalize_org_type(str(row.get("org_type") or "enterprise")),
                )
        finally:
            conn.close()

    def _templates_count(self) -> int:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS c FROM project_templates WHERE deleted_at IS NULL")
                row = cur.fetchone() or {"c": 0}
                return int(row.get("c", 0))
        finally:
            conn.close()

    def _fetch_templates(self, workspace_mode: str) -> List[Dict[str, Any]]:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        id,
                        name,
                        template_type,
                        default_roles_json,
                        COALESCE(ml_completion_rate, 0.0) AS completion_rate,
                        COALESCE(ml_fitness_score, 0.0) AS fitness_score
                    FROM project_templates
                    WHERE deleted_at IS NULL
                    ORDER BY COALESCE(ml_fitness_score, 0.0) DESC, updated_at DESC
                    """
                )
                rows = cur.fetchall() or []
                return [dict(row) for row in rows]
        finally:
            conn.close()

    def _fetch_workspace_members(self, workspace_id: str) -> List[Dict[str, Any]]:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        wm.user_id,
                        COALESCE(u.full_name, CONCAT('User #', wm.user_id)) AS full_name,
                        COALESCE(wm.ml_role_history_score, 0.5) AS role_history,
                        COALESCE(wm.ml_skill_match_score, 0.5) AS skill_match,
                        COALESCE(wm.ml_availability_score, 0.5) AS availability,
                        COALESCE(wm.ml_chemistry_score, 0.5) AS chemistry,
                        COALESCE(wm.ml_top_roles_json, '[]') AS top_roles
                    FROM workspace_members wm
                    LEFT JOIN users u ON u.id = wm.user_id
                    WHERE wm.workspace_id = %s
                      AND wm.deleted_at IS NULL
                    """,
                    (workspace_id,),
                )
                return [dict(row) for row in (cur.fetchall() or [])]
        finally:
            conn.close()

    def _build_workspace_profiles_from_db(self, workspace_id: str) -> pd.DataFrame:
        rows = self._fetch_workspace_members(workspace_id)
        if not rows:
            return pd.DataFrame()

        normalized: List[Dict[str, Any]] = []
        for row in rows:
            try:
                user_id = int(row.get("user_id"))
            except Exception:
                continue

            normalized.append(
                {
                    "workspace_id": str(workspace_id),
                    "user_id": user_id,
                    "roleHistoryScore": float(row.get("role_history") or 0.5),
                    "skillMatchScore": float(row.get("skill_match") or 0.5),
                    "availabilityScore": float(row.get("availability") or 0.5),
                    "chemistryScore": float(row.get("chemistry") or 0.5),
                    "top_roles": row.get("top_roles") or "[]",
                }
            )

        return pd.DataFrame(normalized)

    def _fetch_workspace_members_fallback(self, workspace_id: str) -> List[Dict[str, Any]]:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        wm.user_id,
                        COALESCE(u.full_name, CONCAT('User #', wm.user_id)) AS full_name,
                        COALESCE(active.active_count, 0) AS active_count
                    FROM workspace_members wm
                    LEFT JOIN users u ON u.id = wm.user_id
                    LEFT JOIN (
                        SELECT
                            p.workspace_id,
                            pm.user_id,
                            COUNT(*) AS active_count
                        FROM project_members pm
                        JOIN projects p ON p.id = pm.project_id
                        WHERE pm.deleted_at IS NULL
                          AND p.deleted_at IS NULL
                          AND p.status IN ('PLANNING', 'ACTIVE', 'ON_HOLD')
                        GROUP BY p.workspace_id, pm.user_id
                    ) active
                      ON active.workspace_id = wm.workspace_id
                     AND active.user_id = wm.user_id
                    WHERE wm.workspace_id = %s
                      AND wm.deleted_at IS NULL
                    ORDER BY active.active_count ASC, wm.user_id ASC
                    """,
                    (workspace_id,),
                )
                return [dict(row) for row in (cur.fetchall() or [])]
        finally:
            conn.close()

    def _extract_document_text(self, document_base64: Any, document_filename: Any) -> str:
        encoded = str(document_base64 or "").strip()
        filename = str(document_filename or "").strip().lower()

        if not encoded:
            raise HTTPException(status_code=400, detail="missing description and document both")

        try:
            binary = base64.b64decode(encoded)
        except Exception:
            raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")

        if filename.endswith(".pdf"):
            try:
                from pypdf import PdfReader  # type: ignore
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"document text extraction failed or < 20 words extracted: {exc}")

            try:
                from io import BytesIO

                reader = PdfReader(BytesIO(binary))
                chunks = [page.extract_text() or "" for page in reader.pages]
                text = "\n".join(chunks).strip()
            except Exception:
                raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")
        elif filename.endswith(".docx"):
            try:
                import docx  # type: ignore
                from io import BytesIO

                doc = docx.Document(BytesIO(binary))
                text = "\n".join([p.text for p in doc.paragraphs]).strip()
            except Exception:
                raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")
        else:
            raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")

        if len(text.split()) < 20:
            raise HTTPException(status_code=422, detail="document text extraction failed or < 20 words extracted")
        return text

    def _run_stage1(self, text_input: str, workspace: WorkspaceContext) -> Dict[str, Any]:
        embedding = self._encode_text(text_input)

        project_type = self._infer_project_type(text_input)
        complexity = self._infer_complexity(text_input)
        domain_tags = self._infer_domain_tags(text_input, project_type)
        constraints = self._infer_constraints(text_input, complexity)
        detected_mode = self._infer_mode(text_input, workspace.org_type)

        return {
            "embedding": embedding,
            "project_type": project_type,
            "complexity": complexity,
            "domain_tags": domain_tags,
            "detected_mode": detected_mode,
            "constraints": constraints,
            "cold_start_mode": False,
        }

    def _run_stage2(self, stage1: Dict[str, Any], text_input: str, workspace: WorkspaceContext) -> Dict[str, Any]:
        if not (self.artifacts.stage2_ready and self.artifacts.template_embeddings is not None and self.artifacts.template_metadata is not None):
            raise HTTPException(
                status_code=503,
                detail="stage2-unavailable: template artifacts are missing. Re-export model artifacts and restart ML service.",
            )

        templates = self._rank_templates_from_artifacts(stage1)
        if not templates:
            raise HTTPException(
                status_code=503,
                detail="stage2-unavailable: template ranking produced no candidates. Verify template_metadata/template_embeddings alignment.",
            )

        return {
            "cold_start_mode": False,
            "templates": templates,
        }

    def _rank_templates_from_artifacts(self, stage1: Dict[str, Any]) -> List[Dict[str, Any]]:
        embedding = np.array(stage1["embedding"], dtype=float)
        if embedding.ndim != 1:
            embedding = embedding.ravel()

        matrix = self.artifacts.template_embeddings
        metadata = self.artifacts.template_metadata.copy()

        if matrix is None or matrix.size == 0 or metadata.empty:
            return []

        if matrix.ndim == 1:
            matrix = matrix.reshape(1, -1)

        dim = int(min(matrix.shape[1], embedding.size))
        if dim <= 0:
            return []

        matrix_view = matrix[:, :dim]
        query = embedding[:dim]
        query_norm = float(np.linalg.norm(query))
        if query_norm <= 1e-12:
            return []

        matrix_norms = np.linalg.norm(matrix_view, axis=1)
        denom = np.maximum(matrix_norms * query_norm, 1e-12)
        sim = (matrix_view @ query) / denom

        top_indices = np.argsort(-sim)[: min(3, sim.shape[0])]

        results: List[Dict[str, Any]] = []
        for idx in top_indices:
            row = metadata.iloc[int(idx)]
            template_id = str(row.get("template_id") or row.get("id") or f"template_{idx}")
            name = str(row.get("template_name") or row.get("name") or "Template")
            completion = float(row.get("ml_completion_rate", 0.0) or 0.0)
            score = float(sim[int(idx)])
            norm_score = float(max(0.0, min(1.0, (score + 1.0) / 2.0)))
            results.append(
                {
                    "id": template_id,
                    "name": name,
                    "matchScore": round(norm_score, 4),
                    "completionRate": round(completion, 4),
                    "explanation": "Matched using semantic similarity and historical completion fitness.",
                }
            )
        return results

    def _rank_templates_fallback(self, text_input: str, workspace_mode: str) -> List[Dict[str, Any]]:
        templates = self._fetch_templates(workspace_mode)
        if not templates:
            return []

        query_tokens = set(self._tokenize(text_input))
        scored: List[Tuple[float, Dict[str, Any]]] = []

        for t in templates:
            name_tokens = set(self._tokenize(str(t.get("name") or "")))
            overlap = len(query_tokens.intersection(name_tokens))
            fit = float(t.get("fitness_score") or 0.0)
            completion = float(t.get("completion_rate") or 0.0)
            score = overlap * 0.6 + fit * 0.4
            scored.append((score, t))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:3]

        output: List[Dict[str, Any]] = []
        for score, t in top:
            output.append(
                {
                    "id": str(t.get("id")),
                    "name": str(t.get("name") or "Template"),
                    "matchScore": round(float(max(0.0, min(1.0, score))), 4),
                    "completionRate": round(float(t.get("completion_rate") or 0.0), 4),
                    "explanation": "Fallback ranking based on template name overlap and known fitness score.",
                }
            )
        return output

    def _run_stage3(self, stage1: Dict[str, Any], stage2: Dict[str, Any], workspace: WorkspaceContext) -> Dict[str, Any]:
        if not (self.artifacts.stage3_ready and self.artifacts.role_classifier_payload is not None):
            raise HTTPException(
                status_code=503,
                detail="stage3-unavailable: role classifier artifacts are missing. Re-export role_classifier.joblib and role_thresholds.json.",
            )

        roles = self._infer_roles_from_model(stage1, workspace)
        if not roles:
            raise HTTPException(
                status_code=503,
                detail="stage3-unavailable: role inference produced no required roles. Review training label coverage.",
            )

        return {
            "cold_start_mode": False,
            "required_roles": roles,
        }

    def _infer_roles_from_model(self, stage1: Dict[str, Any], workspace: WorkspaceContext) -> List[Dict[str, Any]]:
        payload = self.artifacts.role_classifier_payload or {}
        clf = payload.get("classifier")
        labels = list(payload.get("label_classes") or [])
        struct_columns = list(payload.get("struct_columns") or [])
        embedding_dim = int(payload.get("embedding_dim") or 384)

        if clf is None or not labels:
            raise HTTPException(
                status_code=503,
                detail="stage3-unavailable: invalid role classifier payload (missing classifier or labels).",
            )

        emb = np.array(stage1.get("embedding") or [], dtype=float)
        if emb.size < embedding_dim:
            emb = np.pad(emb, (0, embedding_dim - emb.size))
        emb = emb[:embedding_dim]

        struct = np.zeros(len(struct_columns), dtype=float)
        active_keys = {
            f"ptype_{stage1.get('project_type', 'other')}",
            f"complexity_{str(stage1.get('complexity', 'MEDIUM')).lower()}",
            f"org_{self._normalize_org_type(stage1.get('detected_mode', workspace.org_type))}",
        }
        for idx, col in enumerate(struct_columns):
            if col in active_keys:
                struct[idx] = 1.0

        features = np.hstack([emb, struct]).reshape(1, -1)
        probabilities = clf.predict_proba(features)[0]

        rows: List[Dict[str, Any]] = []
        for idx, role in enumerate(labels):
            prob = float(probabilities[idx])
            threshold = float(self.artifacts.role_thresholds.get(role, 0.5))
            if prob >= threshold:
                rows.append(
                    {
                        "role": role,
                        "critical": role in {"PROJECT_MANAGER", "PROFESSOR"},
                        "confidence": round(prob, 4),
                        "countSuggested": self._suggested_count(stage1.get("complexity", "MEDIUM")),
                        "cold_start_mode": False,
                    }
                )

        if not rows:
            ranked_indices = np.argsort(-probabilities)
            top_k = 3 if str(stage1.get("complexity", "MEDIUM")).upper() == "HIGH" else 2
            for idx in ranked_indices[:top_k]:
                prob = float(probabilities[idx])
                if prob < 0.15:
                    continue
                role = str(labels[idx])
                rows.append(
                    {
                        "role": role,
                        "critical": role in {"PROJECT_MANAGER", "PROFESSOR"},
                        "confidence": round(prob, 4),
                        "countSuggested": self._suggested_count(stage1.get("complexity", "MEDIUM")),
                        "cold_start_mode": False,
                    }
                )

        lead_role = "PROFESSOR" if workspace.org_type == "academic" else "PROJECT_MANAGER"
        if not any(str(item.get("role", "")).upper() == lead_role for item in rows):
            lead_confidence = 0.35
            if lead_role in labels:
                lead_idx = labels.index(lead_role)
                lead_confidence = max(lead_confidence, float(probabilities[lead_idx]))
            rows.append(
                {
                    "role": lead_role,
                    "critical": True,
                    "confidence": round(float(min(1.0, max(0.0, lead_confidence))), 4),
                    "countSuggested": self._suggested_count(stage1.get("complexity", "MEDIUM")),
                    "cold_start_mode": False,
                }
            )

        dedup: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            role_key = str(row.get("role") or "").strip().upper()
            if not role_key:
                continue
            existing = dedup.get(role_key)
            if existing is None or float(row.get("confidence", 0.0)) > float(existing.get("confidence", 0.0)):
                dedup[role_key] = row
        rows = sorted(dedup.values(), key=lambda item: float(item.get("confidence", 0.0)), reverse=True)

        if not rows:
            raise HTTPException(
                status_code=503,
                detail="stage3-unavailable: classifier returned no usable role predictions.",
            )
        return rows

    def _fallback_roles_from_template(self, stage2: Dict[str, Any], workspace: WorkspaceContext) -> List[str]:
        templates = stage2.get("templates") or []
        if templates:
            selected_template_id = str(templates[0].get("id") or "").strip()
            if selected_template_id:
                roles = self._fetch_template_roles(selected_template_id)
                if roles:
                    return roles

        if workspace.org_type == "academic":
            return ["PROFESSOR", "DEVELOPER", "REVIEWER"]
        return ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER"]

    def _fetch_template_roles(self, template_id: str) -> List[str]:
        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT default_roles_json
                    FROM project_templates
                    WHERE id = %s
                      AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    (template_id,),
                )
                row = cur.fetchone()
                if not row:
                    return []
                raw = row.get("default_roles_json")
                if not raw:
                    return []
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(x).upper() for x in parsed if str(x).strip()]
                except Exception:
                    return []
                return []
        finally:
            conn.close()

    def _run_stage4(self, stage1: Dict[str, Any], stage3: Dict[str, Any], workspace: WorkspaceContext) -> Dict[str, Any]:
        role_rows = [row for row in (stage3.get("required_roles") or []) if isinstance(row, dict)]
        roles = self._dedupe_roles(
            [str(r.get("role") or "").strip().upper() for r in role_rows if r.get("role")]
        )

        if not (self.artifacts.stage4_ready and self.artifacts.member_profiles is not None):
            raise HTTPException(
                status_code=503,
                detail="stage4-unavailable: member profile artifacts are missing. Re-export member_profiles.csv.",
            )

        suggestions, used_fallback = self._suggest_members_from_profiles(workspace.workspace_id, roles, role_rows)
        if used_fallback:
            raise HTTPException(
                status_code=503,
                detail="stage4-unavailable: strict mode forbids fallback ranking.",
            )

        return {
            "cold_start_mode": False,
            "suggestions": suggestions,
        }

    def _suggest_members_from_profiles(
        self,
        workspace_id: str,
        roles: List[str],
        role_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[List[Dict[str, Any]], bool]:
        roles = self._dedupe_roles(roles)
        if not roles:
            raise HTTPException(status_code=503, detail="stage4-unavailable: no roles provided from stage3.")

        df = self.artifacts.member_profiles
        if df is None or df.empty:
            raise HTTPException(status_code=503, detail="stage4-unavailable: member_profiles artifact is empty.")

        local = df[df["workspace_id"].astype(str) == str(workspace_id)].copy()
        if local.empty:
            # Artifact workspace IDs can drift after reseed; derive Stage 4 profiles from DB ML columns.
            local = self._build_workspace_profiles_from_db(workspace_id)
            if local.empty:
                raise HTTPException(
                    status_code=503,
                    detail=f"stage4-unavailable: no member profiles found for workspace_id={workspace_id}. Seed/train profiles for this workspace.",
                )

        for col in ["roleHistoryScore", "skillMatchScore", "availabilityScore", "chemistryScore"]:
            if col not in local.columns:
                local[col] = 0.5
            local[col] = pd.to_numeric(local[col], errors="coerce").fillna(0.5).clip(0.0, 1.0)

        local["base_fit_score"] = (
            local["roleHistoryScore"] * 0.35
            + local["skillMatchScore"] * 0.25
            + local["availabilityScore"] * 0.25
            + local["chemistryScore"] * 0.15
        )

        if "top_roles" in local.columns:
            local["top_roles_list"] = local["top_roles"].apply(self._parse_roles_payload)
        else:
            local["top_roles_list"] = [[] for _ in range(len(local))]

        name_map = self._fetch_user_names([int(uid) for uid in local["user_id"].astype(int).tolist()])

        ranked_by_role: Dict[str, List[Dict[str, Any]]] = {}
        for role in roles:
            role_key = str(role or "").strip().upper()
            role_scored = local.copy()
            role_scored["role_bonus"] = role_scored["top_roles_list"].apply(
                lambda role_list: self._role_match_bonus(role_key, role_list)
            )
            role_scored["fit_score"] = (role_scored["base_fit_score"] + role_scored["role_bonus"]).clip(0.0, 1.0)

            ranked: List[Dict[str, Any]] = []
            for _, row in role_scored.sort_values(by="fit_score", ascending=False).head(8).iterrows():
                uid = int(row["user_id"])
                role_bonus = float(row.get("role_bonus", 0.0))
                fit_score = float(row["fit_score"])

                reasons = [
                    f"Weighted base fit (history 35%, skill 25%, availability 25%, chemistry 15%) = {float(row['base_fit_score']):.2f}",
                    f"Role history {float(row['roleHistoryScore']):.2f}",
                    f"Skill match {float(row['skillMatchScore']):.2f}",
                    f"Availability {float(row['availabilityScore']):.2f}",
                ]
                if role_bonus > 0.0:
                    reasons.insert(1, f"Top-role alignment bonus +{role_bonus:.2f} for {role_key}")
                reasons.append(f"Final fit score {fit_score:.2f}")

                ranked.append(
                    {
                        "userId": uid,
                        "name": name_map.get(uid, f"User #{uid}"),
                        "fitScore": round(fit_score, 4),
                        "reasons": reasons,
                    }
                )

            ranked_by_role[role_key] = ranked

        assignment_order = self._prioritize_roles_for_assignment(roles, role_rows)
        used_user_ids: set[int] = set()
        primary_pick_by_role: Dict[str, Dict[str, Any]] = {}

        for role in assignment_order:
            ranked = ranked_by_role.get(role, [])
            if not ranked:
                continue

            unique_choice = next((candidate for candidate in ranked if int(candidate["userId"]) not in used_user_ids), None)
            if unique_choice is not None:
                chosen = unique_choice
                is_unique = True
            else:
                chosen = ranked[0]
                is_unique = False

            chosen_user_id = int(chosen["userId"])
            primary_pick_by_role[role] = {
                "user_id": chosen_user_id,
                "is_unique": is_unique,
            }
            used_user_ids.add(chosen_user_id)

        output: List[Dict[str, Any]] = []
        for role in roles:
            role_key = str(role or "").strip().upper()
            ranked = list(ranked_by_role.get(role_key, []))

            primary_meta = primary_pick_by_role.get(role_key)
            if primary_meta is not None:
                primary_user_id = int(primary_meta["user_id"])
                ranked.sort(
                    key=lambda candidate: (
                        0 if int(candidate["userId"]) == primary_user_id else 1,
                        -float(candidate.get("fitScore", 0.0)),
                    )
                )

            candidates = ranked[:3]
            if primary_meta is not None and candidates:
                primary_user_id = int(primary_meta["user_id"])
                is_unique = bool(primary_meta.get("is_unique", False))
                for candidate in candidates:
                    if int(candidate["userId"]) == primary_user_id:
                        diversity_reason = (
                            "Primary pick reserved for role coverage diversity"
                            if is_unique
                            else "Top fit reused because unique candidates are limited"
                        )
                        candidate["reasons"] = [diversity_reason, *list(candidate.get("reasons") or [])]
                        break

            output.append({"role": role_key, "candidates": candidates})
        return output, False

    def _suggest_members_fallback(
        self,
        workspace_id: str,
        roles: List[str],
        role_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        roles = self._dedupe_roles(roles)
        if not roles:
            return []

        rows = self._fetch_workspace_members_fallback(workspace_id)
        if not rows:
            return [{"role": role, "candidates": []} for role in roles]

        ordered_rows = sorted(
            rows,
            key=lambda row: (int(row.get("active_count") or 0), int(row.get("user_id") or 0)),
        )
        max_active = max(int(r.get("active_count") or 0) for r in ordered_rows) + 1
        top = ordered_rows[:5]

        assignment_order = self._prioritize_roles_for_assignment(roles, role_rows)
        used_user_ids: set[int] = set()
        primary_pick_by_role: Dict[str, Dict[str, Any]] = {}
        for role in assignment_order:
            unique_row = next((row for row in top if int(row["user_id"]) not in used_user_ids), None)
            if unique_row is not None:
                chosen_row = unique_row
                is_unique = True
            else:
                chosen_row = top[0]
                is_unique = False

            chosen_user_id = int(chosen_row["user_id"])
            primary_pick_by_role[role] = {
                "user_id": chosen_user_id,
                "is_unique": is_unique,
            }
            used_user_ids.add(chosen_user_id)

        output = []
        for role in roles:
            candidates = []
            for row in top:
                active_count = int(row.get("active_count") or 0)
                fit = 1.0 - (active_count / max_active)
                uid = int(row["user_id"])
                candidates.append(
                    {
                        "userId": uid,
                        "name": str(row.get("full_name") or f"User #{uid}"),
                        "fitScore": round(float(max(0.0, min(1.0, fit))), 4),
                        "reasons": [
                            f"Fallback by lowest active project count ({active_count})",
                            "Cold-start mode: availability-only ranking",
                        ],
                    }
                )

            primary_meta = primary_pick_by_role.get(role)
            if primary_meta is not None:
                primary_user_id = int(primary_meta["user_id"])
                is_unique = bool(primary_meta.get("is_unique", False))
                candidates.sort(
                    key=lambda candidate: (
                        0 if int(candidate["userId"]) == primary_user_id else 1,
                        -float(candidate.get("fitScore", 0.0)),
                    )
                )
                if candidates:
                    diversity_reason = (
                        "Primary pick reserved for role coverage diversity"
                        if is_unique
                        else "Top fit reused because unique candidates are limited"
                    )
                    candidates[0]["reasons"] = [diversity_reason, *list(candidates[0].get("reasons") or [])]

            output.append({"role": role, "candidates": candidates[:3]})
        return output

    def _dedupe_roles(self, roles: Iterable[str]) -> List[str]:
        deduped: List[str] = []
        for role in roles:
            role_key = str(role or "").strip().upper()
            if role_key and role_key not in deduped:
                deduped.append(role_key)
        return deduped

    def _prioritize_roles_for_assignment(
        self,
        roles: List[str],
        role_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        role_meta: Dict[str, Dict[str, Any]] = {}
        for row in (role_rows or []):
            role_key = str(row.get("role") or "").strip().upper()
            if not role_key:
                continue

            confidence = 0.0
            try:
                confidence = float(row.get("confidence") or 0.0)
            except Exception:
                confidence = 0.0

            critical = bool(row.get("critical") or role_key in {"PROJECT_MANAGER", "PROFESSOR"})
            current = role_meta.get(role_key)
            if current is None or confidence > float(current.get("confidence", 0.0)):
                role_meta[role_key] = {
                    "confidence": confidence,
                    "critical": critical,
                }

        def sort_key(role: str) -> Tuple[int, float, str]:
            key = str(role or "").strip().upper()
            meta = role_meta.get(key, {})
            confidence = float(meta.get("confidence", 0.0))
            critical = bool(meta.get("critical", key in {"PROJECT_MANAGER", "PROFESSOR"}))
            return (
                0 if critical else 1,
                -confidence,
                key,
            )

        return sorted(self._dedupe_roles(roles), key=sort_key)

    def _fetch_user_names(self, user_ids: List[int]) -> Dict[int, str]:
        if not user_ids:
            return {}

        placeholders = ",".join(["%s"] * len(user_ids))
        sql = f"SELECT id, COALESCE(full_name, CONCAT('User #', id)) AS full_name FROM users WHERE id IN ({placeholders})"

        conn = self._db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(user_ids))
                rows = cur.fetchall() or []
                return {int(r["id"]): str(r.get("full_name") or f"User #{r['id']}") for r in rows}
        finally:
            conn.close()

    def _parse_roles_payload(self, value: Any) -> List[str]:
        if value is None:
            return []

        parsed_roles: List[Any] = []
        if isinstance(value, list):
            parsed_roles = value
        elif isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            try:
                json_value = json.loads(raw)
                if isinstance(json_value, list):
                    parsed_roles = json_value
                else:
                    parsed_roles = [item.strip() for item in re.split(r"[,;|]", raw) if item.strip()]
            except Exception:
                parsed_roles = [item.strip() for item in re.split(r"[,;|]", raw) if item.strip()]
        else:
            return []

        out: List[str] = []
        for role in parsed_roles:
            role_key = str(role).strip().upper().replace(" ", "_")
            if role_key and role_key not in out:
                out.append(role_key)
        return out

    def _role_match_bonus(self, role: str, top_roles: List[str]) -> float:
        if not role or not top_roles:
            return 0.0

        role_key = role.strip().upper()
        normalized = [str(item).strip().upper().replace(" ", "_") for item in top_roles]
        if role_key not in normalized:
            return 0.0

        rank = normalized.index(role_key)
        if rank == 0:
            return 0.25
        if rank == 1:
            return 0.18
        if rank == 2:
            return 0.12
        return 0.08

    def _encode_text(self, text_input: str) -> List[float]:
        if self.embed_model is not None:
            vec = self.embed_model.encode([text_input], normalize_embeddings=True, show_progress_bar=False)[0]
            return [float(v) for v in vec[:384]]

        digest = hashlib.sha256(text_input.encode("utf-8")).digest()
        seed = int.from_bytes(digest[:8], "big", signed=False)
        rng = random.Random(seed)
        raw = [rng.uniform(-1.0, 1.0) for _ in range(384)]
        norm = math.sqrt(sum(v * v for v in raw)) or 1.0
        return [float(v / norm) for v in raw]

    def _infer_project_type(self, text_input: str) -> str:
        text = text_input.lower()
        rules = {
            "academic_assignment": ["semester", "assignment", "student", "capstone", "course"],
            "migration": ["migrate", "migration", "legacy", "cutover", "replatform"],
            "marketing": ["campaign", "conversion", "audience", "content", "brand"],
            "design": ["ux", "ui", "prototype", "accessibility", "design"],
            "research": ["study", "research", "experiment", "hypothesis", "analysis"],
            "software_dev": ["api", "backend", "frontend", "deployment", "feature"],
        }

        best_label = "other"
        best_score = 0
        for label, keywords in rules.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > best_score:
                best_score = score
                best_label = label
        return best_label

    def _infer_complexity(self, text_input: str) -> str:
        text = text_input.lower()
        high_terms = ["multi", "integration", "compliance", "critical", "distributed", "strict"]
        medium_terms = ["stakeholder", "dependency", "milestone", "coordination"]

        high_score = sum(1 for term in high_terms if term in text)
        medium_score = sum(1 for term in medium_terms if term in text)
        length_score = 1 if len(text.split()) > 160 else 0

        if high_score + length_score >= 3:
            return "HIGH"
        if medium_score + high_score >= 2:
            return "MEDIUM"
        return "LOW"

    def _infer_domain_tags(self, text_input: str, project_type: str) -> List[str]:
        text = text_input.lower()
        candidates = {
            "software_dev": ["backend", "api", "qa", "devops", "testing"],
            "research": ["analysis", "benchmark", "reporting", "dataset"],
            "design": ["ux", "ui", "prototype", "accessibility"],
            "migration": ["data-migration", "cutover", "integrations", "stability"],
            "marketing": ["campaign", "content", "analytics", "conversion"],
            "academic_assignment": ["coursework", "assessment", "collaboration", "presentation"],
            "other": ["operations", "coordination", "governance", "delivery"],
        }
        selected = [tag for tag in candidates.get(project_type, candidates["other"]) if tag.replace("-", " ") in text]
        if not selected:
            selected = candidates.get(project_type, candidates["other"])[:3]
        return selected[:4]

    def _infer_constraints(self, text_input: str, complexity: str) -> List[str]:
        text = text_input.lower()
        constraints = []
        if "deadline" in text or "due" in text:
            constraints.append("strict deadline")
        if "budget" in text or "cost" in text:
            constraints.append("budget-sensitive")
        if "compliance" in text or "regulation" in text:
            constraints.append("compliance requirements")

        if not constraints:
            if complexity == "HIGH":
                constraints = ["cross-team dependencies", "high reliability target"]
            elif complexity == "MEDIUM":
                constraints = ["stakeholder coordination", "iterative delivery"]
            else:
                constraints = ["limited scope", "single team"]
        return constraints[:4]

    def _infer_mode(self, text_input: str, workspace_mode: str) -> str:
        text = text_input.lower()
        academic_terms = ["student", "professor", "course", "semester", "assignment"]
        enterprise_terms = ["customer", "product", "sprint", "roadmap", "stakeholder"]

        academic_score = sum(1 for term in academic_terms if term in text)
        enterprise_score = sum(1 for term in enterprise_terms if term in text)

        if academic_score > enterprise_score:
            return "academic"
        if enterprise_score > academic_score:
            return "enterprise"
        return self._normalize_org_type(workspace_mode)

    def _cache_key(self, workspace_id: str, description: str) -> str:
        payload = f"{workspace_id}{description[:200]}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _resolve_model_version(self) -> str:
        metadata = self.artifacts.model_metadata or {}
        for key in ("model_version", "created_at_utc", "trained_at"):
            value = metadata.get(key)
            if value is not None and str(value).strip():
                return str(value).strip()
        return "pib-fastapi-v1"

    def _cache_get(self, key: str) -> Optional[Dict[str, Any]]:
        if self.redis_client is None:
            return None
        try:
            raw = self.redis_client.get(key)
            if not raw:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Redis get failed for PIB cache key %s: %s", key, exc)
            return None

    def _cache_set(self, key: str, value: Dict[str, Any]) -> None:
        if self.redis_client is None:
            return
        try:
            self.redis_client.setex(key, self.redis_ttl_seconds, json.dumps(value))
        except Exception as exc:
            logger.warning("Redis set failed for PIB cache key %s: %s", key, exc)

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    def _normalize_org_type(self, raw: Any) -> str:
        value = str(raw or "enterprise").strip().lower()
        return "academic" if value == "academic" else "enterprise"

    def _suggested_count(self, complexity: Any) -> int:
        c = str(complexity or "MEDIUM").upper()
        if c == "LOW":
            return 1
        if c == "HIGH":
            return 3
        return 2

    def _fallback_role_rows(self, org_type: str, complexity: Any) -> List[Dict[str, Any]]:
        roles = ["PROFESSOR", "DEVELOPER", "REVIEWER"] if org_type == "academic" else ["PROJECT_MANAGER", "DEVELOPER", "REVIEWER"]
        return [
            {
                "role": role,
                "critical": role in {"PROJECT_MANAGER", "PROFESSOR"},
                "confidence": 0.0,
                "countSuggested": self._suggested_count(complexity),
                "cold_start_mode": True,
            }
            for role in roles
        ]
