"""
Unitum ML Anomaly Detection Service
FastAPI microservice — port 5050
Isolation Forest trained on synthetic login behavior data
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import uvicorn

# ─── Model version ───────────────────────────────────────────────
VERSION = "1.0.0"

# ─── Feature names (must match AnomalyDetectionService.java) ─────
FEATURES = [
    "login_hour",
    "day_of_week",
    "ip_changed",
    "ua_changed",
    "failed_attempts_5min",
    "time_since_last_login_h",
    "is_new_ip",
    "hour_deviation",
]

# ─── Normalization range (calibrated on training data) ───────────
SCORE_MIN = -0.04  # raw score for most anomalous sessions
SCORE_MAX =  0.32  # raw score for most normal sessions


class LoginFeatures(BaseModel):
    login_hour: float
    day_of_week: float
    ip_changed: float
    ua_changed: float
    failed_attempts_5min: float
    time_since_last_login_h: float
    is_new_ip: float
    hour_deviation: float


# ─── Train on synthetic data ──────────────────────────────────────
def _generate_training_data():
    rng = np.random.default_rng(42)
    n_normal   = 6000
    n_anomaly  = 400

    # Normal: business hours, same IP, low failures, regular schedule
    normal = np.column_stack([
        rng.integers(8, 20, n_normal),                   # login_hour
        rng.integers(1, 6,  n_normal),                   # day_of_week (Mon-Fri)
        rng.choice([0, 1], n_normal, p=[0.95, 0.05]),   # ip_changed
        rng.choice([0, 1], n_normal, p=[0.97, 0.03]),   # ua_changed
        rng.integers(0, 2, n_normal),                    # failed_attempts_5min
        rng.uniform(20, 48, n_normal),                   # time_since_last_login_h
        rng.choice([0, 1], n_normal, p=[0.95, 0.05]),   # is_new_ip
        rng.integers(0, 4, n_normal),                    # hour_deviation
    ]).astype(float)

    # Anomaly: odd hours, new IP, failures, no prior history
    anomaly = np.column_stack([
        rng.choice([0, 1, 2, 3, 22, 23], n_anomaly),   # login_hour (night)
        rng.integers(1, 8, n_anomaly),                   # day_of_week
        rng.choice([0, 1], n_anomaly, p=[0.20, 0.80]),  # ip_changed
        rng.choice([0, 1], n_anomaly, p=[0.40, 0.60]),  # ua_changed
        rng.integers(3, 10, n_anomaly),                  # failed_attempts_5min
        rng.uniform(0, 5, n_anomaly),                    # time_since_last_login_h (very recent)
        rng.choice([0, 1], n_anomaly, p=[0.10, 0.90]),  # is_new_ip
        rng.integers(8, 16, n_anomaly),                  # hour_deviation
    ]).astype(float)

    return np.vstack([normal, anomaly])


X_train = _generate_training_data()
scaler  = StandardScaler()
X_scaled = scaler.fit_transform(X_train)

model = IsolationForest(
    n_estimators=200,
    contamination=0.06,   # ~6% anomalies in training data
    random_state=42
)
model.fit(X_scaled)

# ─── FastAPI app ─────────────────────────────────────────────────
app = FastAPI(title="Unitum Anomaly Detection", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": VERSION}


@app.post("/score")
def score_login(features: LoginFeatures):
    X = np.array([[
        features.login_hour,
        features.day_of_week,
        features.ip_changed,
        features.ua_changed,
        features.failed_attempts_5min,
        features.time_since_last_login_h,
        features.is_new_ip,
        features.hour_deviation,
    ]])

    raw = model.decision_function(scaler.transform(X))[0]
    # Map raw score to [0, 1]: higher = more anomalous
    score = (SCORE_MAX - raw) / (SCORE_MAX - SCORE_MIN)
    score = float(np.clip(score, 0.0, 1.0))

    return {
        "score":   round(score, 4),
        "version": VERSION,
        "label":   "ANOMALY" if score >= 0.75 else "NORMAL"
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5050)
