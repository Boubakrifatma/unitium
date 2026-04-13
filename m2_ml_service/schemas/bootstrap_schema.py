from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class BootstrapRequest(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    input_type: Literal["text", "document"]
    description: Optional[str] = None
    document_base64: Optional[str] = None
    document_filename: Optional[str] = None


class Stage1Signals(BaseModel):
    embedding: List[float]
    project_type: str
    complexity: str
    domain_tags: List[str]
    detected_mode: str
    constraints: List[str]
    cold_start_mode: bool = False


class Stage2TemplateItem(BaseModel):
    id: str
    name: str
    matchScore: float
    completionRate: float
    explanation: str


class Stage2Result(BaseModel):
    cold_start_mode: bool
    templates: List[Stage2TemplateItem]


class Stage3RoleItem(BaseModel):
    role: str
    critical: bool
    confidence: float
    countSuggested: int
    cold_start_mode: bool


class Stage3Result(BaseModel):
    cold_start_mode: bool
    required_roles: List[Stage3RoleItem]


class Stage4CandidateItem(BaseModel):
    userId: int
    name: str
    fitScore: float
    reasons: List[str]


class Stage4RoleSuggestions(BaseModel):
    role: str
    candidates: List[Stage4CandidateItem]


class Stage4Result(BaseModel):
    cold_start_mode: bool
    suggestions: List[Stage4RoleSuggestions]


class BootstrapCapabilities(BaseModel):
    stage2_ready: bool
    stage3_ready: bool
    stage4_ready: bool


class BootstrapResponse(BaseModel):
    workspace_id: str
    input_type: str
    stage1: Stage1Signals
    stage2: Stage2Result
    stage3: Stage3Result
    stage4: Stage4Result
    capabilities: BootstrapCapabilities
    cold_start_any: bool
    latency_ms: int
    cache_hit: bool
    metadata: Dict[str, str]
