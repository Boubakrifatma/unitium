from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model.churn_model import ChurnModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Unitum ML Service",
    description="XGBoost Churn Prediction API for Unitum Billing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

churn_model = ChurnModel()


class FeaturesInput(BaseModel):
    org_id: str
    wau_ratio: float = 0.5
    ml_usage_rate: float = 0.5
    support_ticket_count: float = 0.0
    last_login_delta_days: float = 7.0
    plan_utilization_pct: float = 50.0
    payment_failures_count: float = 0.0
    tenure_months: float = 12.0


class TrainInput(BaseModel):
    use_telco_dataset: bool = True


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": churn_model.is_trained,
        "model_version": churn_model.model_version
    }


@app.post("/predict/churn")
def predict_churn(data: FeaturesInput):
    try:
        features = data.model_dump()
        features.pop("org_id")
        result = churn_model.predict(features)
        logger.info(f"Churn prediction for org {data.org_id}: {result['churn_score']} → {result['action']}")
        return {"org_id": data.org_id, **result}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train")
def train_model(data: TrainInput = TrainInput()):
    try:
        metrics = churn_model.train_from_telco()
        return {
            "status": "trained",
            "model_version": churn_model.model_version,
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/info")
def model_info():
    return {
        "model_version": churn_model.model_version,
        "is_trained": churn_model.is_trained,
        "features": churn_model.FEATURES,
        "thresholds": {
            "urgent_coupon": 0.80,
            "retention_email": 0.50,
            "manager_alert": 0.30,
            "stable": 0.0
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
