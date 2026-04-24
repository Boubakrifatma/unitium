from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from schemas.bootstrap_schema import BootstrapRequest, BootstrapResponse
from services.bootstrap_service import BootstrapService


router = APIRouter(prefix="/api/v1/ml", tags=["pib-bootstrap"])
_service: Optional[BootstrapService] = None


def set_bootstrap_service(service: BootstrapService) -> None:
    global _service
    _service = service


def get_bootstrap_service() -> BootstrapService:
    if _service is None:
        raise HTTPException(status_code=503, detail="Bootstrap service not initialized")
    return _service


@router.post("/project-bootstrap", response_model=BootstrapResponse)
def project_bootstrap(request: BootstrapRequest) -> BootstrapResponse:
    service = get_bootstrap_service()
    result = service.process_bootstrap(request.model_dump())
    return BootstrapResponse(**result)


@router.get("/capabilities")
def capabilities() -> dict:
    service = get_bootstrap_service()
    return service.debug_status()
