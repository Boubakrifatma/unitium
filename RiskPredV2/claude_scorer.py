import urllib.request
import urllib.error
import json
import os
import socket

def get_text_risk_score(task_title: str, task_description: str, category: str = "") -> dict:
    """
    Calls the Hugging Face Inference API for text-based risk scoring.
    Raises an exception when the API is unreachable (network error, timeout,
    connection refused) so the caller can fall back to ML-only prediction.
    Only falls back to local keyword analysis for bad/unexpected API responses.
    """

    text = f"{task_title} {task_description} {category}"

    url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"

    payload = {"inputs": text[:500]}

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    # Network / connectivity errors → re-raise so app.py keeps text_risk=None
    # and the prediction runs in ml_only mode.
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())

    except (urllib.error.URLError, socket.timeout, ConnectionError, OSError) as e:
        # API unreachable — let it propagate; app.py will use ML-only
        raise RuntimeError(f"HuggingFace API unreachable: {e}") from e

    # API responded but returned something unexpected → local keyword fallback
    try:
        if isinstance(data, list) and len(data) > 0:
            sentiment = data[0]
            if sentiment[0]['label'] == 'NEGATIVE':
                score = sentiment[0]['score'] * 1.0
            else:
                score = 1.0 - sentiment[0]['score']

            score = max(0.0, min(1.0, round(score, 2)))

            text_lower = text.lower()
            if any(w in text_lower for w in ['critical', 'urgent', 'security', 'vulnerability', 'breach']):
                score = min(1.0, score + 0.2)
            if any(w in text_lower for w in ['documentation', 'readme', 'typo']):
                score = max(0.0, score - 0.1)

            if score >= 0.7:
                reasoning = "CRITICAL: High-risk task detected"
            elif score >= 0.4:
                reasoning = "MODERATE: Task requires attention"
            else:
                reasoning = "LOW: Routine task with minimal risk"

            return {
                "text_risk_score": score,
                "reasoning": reasoning,
                "source": "huggingface_distilbert"
            }

        raise ValueError("Invalid API response format")

    except (KeyError, IndexError, ValueError) as e:
        print(f"HuggingFace response parse error: {e}, using local keyword analysis")
        return get_text_risk_score_local(task_title, task_description, category)

def get_text_risk_score_local(task_title: str, task_description: str, category: str = "") -> dict:
    """Fallback local - basé sur mots-clés"""
    
    text = f"{task_title} {task_description} {category}".lower()
    
    high_keywords = ['critical', 'urgent', 'security', 'vulnerability', 'crash', 
                     'production', 'outage', 'broken', 'failure', 'incident', 
                     'deadline', 'migration', 'breach', 'fix', 'bug']
    
    low_keywords = ['documentation', 'readme', 'typo', 'simple', 'minor', 
                    'color', 'style', 'cleanup', 'update']
    
    score = 0.5
    
    for kw in high_keywords:
        if kw in text:
            score += 0.12
    
    for kw in low_keywords:
        if kw in text:
            score -= 0.1
    
    if category.lower() == 'security':
        score += 0.15
    
    score = max(0.0, min(1.0, round(score, 2)))
    
    if score >= 0.7:
        reasoning = "CRITICAL: High-risk task detected"
    elif score >= 0.4:
        reasoning = "MODERATE: Task requires attention"
    else:
        reasoning = "LOW: Routine task"
    
    return {
        "text_risk_score": score,
        "reasoning": reasoning,
        "source": "local_keyword_analyzer"
    }