"""
Sentiment Analysis Microservice
Uses the local DistilBERT model in ../sentiment-model

Labels mapping:
  LABEL_0 → NEGATIVE
  LABEL_1 → NEUTRAL
  LABEL_2 → POSITIVE

Run:
    uvicorn app:app --host 0.0.0.0 --port 8600
"""
import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline, AutoTokenizer

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

# ── Whitelist : phrases toujours sûres, quel que soit le modèle ──────────────
_SAFE_PATTERN = re.compile(
    r"^(good\s+(morning|afternoon|evening|night|day|week|weekend)|"
    r"hi+|hello+|hey+|howdy|greetings?|"
    r"bonjour|bonsoir|bonne\s+(nuit|journée|soirée|semaine)|salut|ciao|hola|"
    r"thank\s+you|thanks|merci|please|s'il\s+vous\s+plaît|"
    r"sorry|excuse\s+me|pardon|désolé|"
    r"how\s+are\s+you|how\s+are\s+things|"
    r"nice\s+to\s+meet\s+you|have\s+a\s+(nice|good|great)|"
    r"congratulations|congrats|well\s+done|good\s+job|great\s+work|"
    r"welcome|you('re|\s+are)\s+welcome|no\s+problem|np|ok|okay|sure|"
    r"see\s+you|goodbye|bye+|take\s+care|good\s+luck|"
    r"happy\s+(new\s+year|birthday|holidays?)|merry\s+christmas|"
    r"yes|no|agreed|sounds\s+good|perfect|great)[\s!.,?😊🙂👍]*$",
    re.IGNORECASE,
)

# Mots réellement agressifs/offensants — requis pour valider un NEGATIVE sur texte court
_NEGATIVE_KEYWORDS = re.compile(
    r"\b(stupid|idiot|idiot|moron|hate|kill|die|ugly|loser|dumb|shut\s+up|"
    r"damn|crap|hell|ass|bitch|bastard|wtf|fuck|shit|bullshit|"
    r"worthless|useless|pathetic|disgusting|horrible|terrible|awful|"
    r"cretin|imbecile|nul|nuls|naze|con\b|conne|débile|connard|salope|"
    r"merde|putain|enculé|abruti)\b",
    re.IGNORECASE,
)

print(f"Loading sentiment model from {MODEL_PATH} ...")
# Fix "forward() got an unexpected keyword argument 'token_type_ids'"
# Some fine-tuned models (DistilBERT/RoBERTa) don't accept this arg.
_tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
_tokenizer.model_input_names = ["input_ids", "attention_mask"]
classifier = pipeline("text-classification", model=MODEL_PATH, tokenizer=_tokenizer)
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

    # ── 1. Whitelist : salutations et formules polies → toujours POSITIVE ────
    if _SAFE_PATTERN.match(text):
        return AnalyzeResponse(label="POSITIVE", label_raw="LABEL_2", score=0.98)

    # ── 2. Appel au modèle ────────────────────────────────────────────────────
    truncated = text[:512]
    result    = classifier(truncated)[0]
    label_raw : str   = result["label"]
    score     : float = float(result["score"])
    label     : str   = _LABEL_MAP.get(label_raw, "NEUTRAL")

    # ── 3. Validation NEGATIVE sur textes courts ──────────────────────────────
    # Le modèle est peu fiable sur les phrases courtes (< 6 mots).
    # On n'accepte NEGATIVE que si :
    #   - confiance ≥ 0.90 pour textes < 5 mots
    #   - confiance ≥ 0.80 pour textes < 10 mots
    #   - ET au moins un mot-clé négatif est présent si texte < 15 mots
    if label == "NEGATIVE":
        word_count = len(text.split())
        has_bad_word = bool(_NEGATIVE_KEYWORDS.search(text))

        if word_count < 5 and score < 0.90:
            label, label_raw, score = "NEUTRAL", "LABEL_1", 1.0 - score
        elif word_count < 5 and not has_bad_word:
            label, label_raw, score = "NEUTRAL", "LABEL_1", 1.0 - score
        elif word_count < 10 and score < 0.80:
            label, label_raw, score = "NEUTRAL", "LABEL_1", 1.0 - score
        elif word_count < 15 and not has_bad_word and score < 0.85:
            label, label_raw, score = "NEUTRAL", "LABEL_1", 1.0 - score

    return AnalyzeResponse(label=label, label_raw=label_raw, score=score)


@app.get("/health")
def health():
    return {"status": "ok", "model": "distilbert-local", "fix": "token_type_ids+short-text-guard"}
