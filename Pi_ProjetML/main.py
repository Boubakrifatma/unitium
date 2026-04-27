"""
Unitum ML Service
FastAPI microservice — port 5050
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

VERSION = "2.0.0"

app = FastAPI(title="Unitum ML Service", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": VERSION}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5050)
