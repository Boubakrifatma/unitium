"""
Optional NLP microservice for the Deliverable Intelligence Module.

Two endpoints — both are used as smarter fallbacks by Spring Boot.
If this service is down, the Java side still works using its own
pure-Java cosine similarity + basic summary.

Run:
    pip install fastapi uvicorn scikit-learn
    uvicorn nlp_service.app:app --host 0.0.0.0 --port 8500

Then set in application.properties:
    nlp.service.enabled=true
"""
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Deliverable Intelligence NLP Sidecar")


class SimilarityRequest(BaseModel):
    a: str
    b: str


class SummarizeRequest(BaseModel):
    text: str


@app.post("/nlp/similarity")
def similarity(req: SimilarityRequest) -> dict:
    """TF-IDF cosine similarity between two snippets of text."""
    a = (req.a or "").strip()
    b = (req.b or "").strip()
    if not a or not b:
        return {"similarity": 0.0}

    vec = TfidfVectorizer().fit_transform([a, b])
    score = float(cosine_similarity(vec[0:1], vec[1:2])[0][0])
    return {"similarity": round(score, 4)}


@app.post("/nlp/summarize")
def summarize(req: SummarizeRequest) -> dict:
    """
    Lightweight extractive summary: keep the first few non-empty sentences.
    (Replace with a transformer pipeline if you want something fancier.)
    """
    text = (req.text or "").strip()
    if not text:
        return {"summary": ""}

    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    summary = ". ".join(sentences[:3])
    if summary and not summary.endswith("."):
        summary += "."
    return {"summary": summary}
