import urllib.request
import json
import os

def get_text_risk_score(task_title: str, task_description: str, category: str = "") -> dict:
    """
    Utilise l'API gratuite Hugging Face (sans clé requise)
    Modèle: distilbert-base-uncased-finetuned-sst-2-english
    """
    
    text = f"{task_title} {task_description} {category}"
    
    # API Hugging Face gratuite (rate limitée mais fonctionnelle)
    url = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"
    
    payload = {
        "inputs": text[:500]  # Limiter la longueur
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            
            # Convertir le sentiment en score de risque
            if isinstance(data, list) and len(data) > 0:
                sentiment = data[0]
                # NEGATIVE = risque élevé, POSITIVE = risque faible
                if sentiment[0]['label'] == 'NEGATIVE':
                    score = sentiment[0]['score'] * 1.0  # 0.5-1.0
                else:
                    score = 1.0 - sentiment[0]['score']  # 0.0-0.5
                
                score = max(0.0, min(1.0, round(score, 2)))
                
                # Ajustement par mots-clés
                text_lower = text.lower()
                if any(w in text_lower for w in ['critical', 'urgent', 'security', 'vulnerability', 'breach']):
                    score = min(1.0, score + 0.2)
                if any(w in text_lower for w in ['documentation', 'readme', 'typo']):
                    score = max(0.0, score - 0.1)
                
                # Générer raisonnement
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
            
            raise ValueError("Réponse API invalide")
            
    except Exception as e:
        print(f"API Hugging Face error: {e}, falling back to local analysis")
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