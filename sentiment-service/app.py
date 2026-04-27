"""
Sentiment Analysis Microservice
Uses the local DistilBERT model in ../sentiment-model

Labels mapping:
  LABEL_0 → NEGATIVE
  LABEL_1 → NEUTRAL
  LABEL_2 → POSITIVE

Run:
    pip install fastapi uvicorn transformers torch
    uvicorn sentiment_service.app:app --host 0.0.0.0 --port 8600
  or from the sentiment-service directory:
    uvicorn app:app --host 0.0.0.0 --port 8600
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="Sentiment Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "sentiment-model")

_LABEL_MAP = {
    "LABEL_0": "NEGATIVE",
    "LABEL_1": "NEUTRAL",
    "LABEL_2": "POSITIVE",
}

print(f"Loading sentiment model from {MODEL_PATH} ...")
classifier = pipeline("text-classification", model=MODEL_PATH, tokenizer=MODEL_PATH)
print("Sentiment model loaded.")


class AnalyzeRequest(BaseModel):
    text: str


class AnalyzeResponse(BaseModel):
    label: str          # POSITIVE | NEUTRAL | NEGATIVE
    label_raw: str      # LABEL_0 | LABEL_1 | LABEL_2
    score: float        # confidence [0..1]


@app.post("/sentiment/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    text = (req.text or "").strip()
    if not text:
        return AnalyzeResponse(label="NEUTRAL", label_raw="LABEL_1", score=1.0)

    # Truncate to avoid token limit issues
    if len(text) > 512:
        text = text[:512]

    result = classifier(text)[0]
    label_raw: str = result["label"]
    score: float = float(result["score"])
    label: str = _LABEL_MAP.get(label_raw, "NEUTRAL")

    return AnalyzeResponse(label=label, label_raw=label_raw, score=score)


@app.get("/health")
def health():
    return {"status": "ok"}
