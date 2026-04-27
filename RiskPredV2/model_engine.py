import pickle, numpy as np
from pathlib import Path

_bundle   = pickle.load(open(Path(__file__).parent / "model_4feat.pkl", "rb"))
_model    = _bundle["model"]
_scaler   = _bundle["scaler"]
THRESHOLD = _bundle["threshold"]

# Défauts pour les paramètres optionnels (calculés sur le dataset au train)
_CR_DEFAULT   = _bundle.get("user_completion_rate_default",   0.79)
_EXP_DEFAULT  = _bundle.get("user_experience_months_default", 36.0)
_SP_DEFAULT   = _bundle.get("story_points_default",           3.0)
_NC_DEFAULT   = _bundle.get("num_comments_default",           2.0)
_DAYS_DEFAULT = _bundle.get("days_total_default",             14.0)

ML_WEIGHT   = 0.70
TEXT_WEIGHT = 0.30

PRIORITY_MAP = {
    "low": 0, "medium": 1, "high": 2, "critical": 3,
    "Low": 0, "Medium": 1, "High": 2, "Critical": 3,
}

CLAMP_RANGES = {
    "estimated_hours":          (1,    80),
    "due_in_days":              (-500, 500),
    "user_workload":            (208,  283),
    "user_completion_rate":     (0.0,  1.0),
    "user_experience_months":   (0,    120),
    "story_points":             (1,    13),
    "num_comments":             (0,    50),
    "days_total":               (1,    365),
}


def _clamp(val, lo, hi):
    return max(lo, min(hi, val))


def predict_ml(estimated_hours: float,
               priority: str,
               due_in_days: float,
               user_workload: float,
               user_completion_rate: float = None,
               user_experience_months: float = None,
               story_points: float = None,
               num_comments: float = None,
               days_total: float = None) -> float:
    """
    Retourne la probabilité brute ML que la tâche soit à risque (0.0 – 1.0).

    Paramètres requis : estimated_hours, priority, due_in_days, user_workload
    Paramètres optionnels : les autres (valeurs par défaut issues du dataset)
    """
    pri = PRIORITY_MAP.get(str(priority).strip())
    if pri is None:
        raise ValueError("priority doit être : Low, Medium, High ou Critical")

    # Valeurs avec clamp
    raw_due    = float(due_in_days)
    is_overdue = 1.0 if raw_due < 0 else 0.0
    eh  = _clamp(float(estimated_hours), *CLAMP_RANGES["estimated_hours"])
    did = _clamp(raw_due,               *CLAMP_RANGES["due_in_days"])
    uw  = _clamp(float(user_workload),  *CLAMP_RANGES["user_workload"])
    cr  = _clamp(float(user_completion_rate)   if user_completion_rate   is not None else _CR_DEFAULT,   *CLAMP_RANGES["user_completion_rate"])
    exp = _clamp(float(user_experience_months) if user_experience_months is not None else _EXP_DEFAULT,  *CLAMP_RANGES["user_experience_months"])
    sp  = _clamp(float(story_points)           if story_points           is not None else _SP_DEFAULT,   *CLAMP_RANGES["story_points"])
    nc  = _clamp(float(num_comments)           if num_comments           is not None else _NC_DEFAULT,   *CLAMP_RANGES["num_comments"])
    dt  = _clamp(float(days_total)             if days_total             is not None else _DAYS_DEFAULT, *CLAMP_RANGES["days_total"])

    # Features dérivées (identiques à train.py)
    hours_per_day      = min(eh / max(dt, 1), 20.0)
    priority_x_overdue = float(pri) * is_overdue
    workload_pressure  = uw * (1.0 - cr)
    exp_risk           = 1.0 / (1.0 + exp / 24.0)
    scope_index        = min(sp * eh, 500.0)

    # Ordre IDENTIQUE à FEATURES dans train.py
    X = np.array([[
        eh, float(pri), did, uw, cr, is_overdue,
        exp, sp, nc, dt,
        hours_per_day, priority_x_overdue,
        workload_pressure, exp_risk, scope_index,
    ]])
    X_sc = _scaler.transform(X)
    return float(_model.predict_proba(X_sc)[0, 1])


def predict(estimated_hours: float,
            priority: str,
            due_in_days: float,
            user_workload: float,
            text_risk_score: float = None,
            user_completion_rate: float = None,
            user_experience_months: float = None,
            story_points: float = None,
            num_comments: float = None,
            days_total: float = None) -> dict:

    score_ml = predict_ml(
        estimated_hours, priority, due_in_days, user_workload,
        user_completion_rate, user_experience_months,
        story_points, num_comments, days_total,
    )

    if text_risk_score is not None:
        trs         = max(0.0, min(1.0, float(text_risk_score)))
        final_score = round((score_ml * ML_WEIGHT) + (trs * TEXT_WEIGHT), 4)
        method      = f"hybrid (ML {int(ML_WEIGHT*100)}% + Text {int(TEXT_WEIGHT*100)}%)"
    else:
        final_score = round(score_ml, 4)
        method      = "ml_only"

    return {
        "risk_score": final_score,
        "risk_level": _risk_level(final_score),
        "high_risk":  final_score >= THRESHOLD,
        "threshold":  THRESHOLD,
        "method":     method,
        "score_ml":   round(score_ml, 4),
        "score_text": round(float(text_risk_score), 4) if text_risk_score is not None else None,
        "weights":    {"ml": ML_WEIGHT, "text": TEXT_WEIGHT} if text_risk_score is not None else None,
    }


def _risk_level(score: float) -> str:
    if score >= 0.65:
        return "high"
    if score >= 0.35:
        return "medium"
    return "low"
