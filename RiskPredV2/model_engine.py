import pickle, numpy as np
from pathlib import Path

_bundle   = pickle.load(open(Path(__file__).parent / "model_4feat.pkl", "rb"))
_model    = _bundle["model"]
_scaler   = _bundle["scaler"]
THRESHOLD = _bundle["threshold"]

# ⚙️ Configuration des poids pour le mode hybride
ML_WEIGHT = 0.7      # 70% pour le modèle ML
TEXT_WEIGHT = 0.3    # 30% pour l'analyse texte

PRIORITY_MAP = {
    "low":0,"medium":1,"high":2,"critical":3,
    "Low":0,"Medium":1,"High":2,"Critical":3
}

VALID_RANGES = {
    "estimated_hours": (1,   80),
    "due_in_days":     (0,  500),
    "user_workload":   (208, 283),
}

def predict_ml(estimated_hours: float,
               priority: str,
               due_in_days: float,
               user_workload: float) -> float:
    pri = PRIORITY_MAP.get(str(priority).strip())
    if pri is None:
        raise ValueError("priority doit etre : Low, Medium, High ou Critical")

    values = {
        "estimated_hours": float(estimated_hours),
        "due_in_days":     float(due_in_days),
        "user_workload":   float(user_workload),
    }
    errors = []
    for field, val in values.items():
        lo, hi = VALID_RANGES[field]
        if not (lo <= val <= hi):
            errors.append(f"'{field}' = {val} hors plage [{lo} - {hi}]")
    if errors:
        raise ValueError("Valeurs hors plage :\n" + "\n".join(errors))

    X    = np.array([[values["estimated_hours"], float(pri),
                      values["due_in_days"], values["user_workload"]]])
    X_sc = _scaler.transform(X)
    return float(_model.predict_proba(X_sc)[0, 1])


def predict(estimated_hours: float,
            priority: str,
            due_in_days: float,
            user_workload: float,
            text_risk_score: float = None) -> dict:
    score_ml = predict_ml(estimated_hours, priority, due_in_days, user_workload)

    if text_risk_score is not None:
        trs = max(0.0, min(1.0, float(text_risk_score)))
        
        # 🆕 NOUVEAU CALCUL: Pondération ML 70% + Texte 30%
        final_score = round((score_ml * ML_WEIGHT) + (trs * TEXT_WEIGHT), 4)
        method = f"hybrid (ML {int(ML_WEIGHT*100)}% + Text {int(TEXT_WEIGHT*100)}%)"
    else:
        final_score = round(score_ml, 4)
        method = "ml_only"

    return {
        "risk_score": final_score,
        "high_risk":  final_score >= THRESHOLD,
        "threshold":  THRESHOLD,
        "method":     method,
        "score_ml":   round(score_ml, 4),
        "score_text": round(float(text_risk_score), 4) if text_risk_score is not None else None,
        "weights":    {
            "ml": ML_WEIGHT,
            "text": TEXT_WEIGHT
        } if text_risk_score is not None else None
    }