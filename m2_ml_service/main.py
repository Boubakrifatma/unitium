from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from routers.bootstrap import router as bootstrap_router
from routers.bootstrap import set_bootstrap_service
from services.bootstrap_service import BootstrapService


@asynccontextmanager
async def lifespan(app: FastAPI):
    models_dir = Path(__file__).resolve().parent / "models"
    service = BootstrapService(models_dir=models_dir)
    service.initialize()
    set_bootstrap_service(service)
    yield


app = FastAPI(title="Module 2 ML Service", lifespan=lifespan)
app.include_router(bootstrap_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
