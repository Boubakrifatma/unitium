import xgboost as xgb
import pickle
import numpy as np
import pandas as pd
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../data/churn_model.pkl")
TELCO_CSV  = os.path.join(os.path.dirname(__file__), "../data/WA_Fn-UseC_-Telco-Customer-Churn.csv")


class ChurnModel:

    FEATURES = [
        "wau_ratio",
        "ml_usage_rate",
        "support_ticket_count",
        "last_login_delta_days",
        "plan_utilization_pct",
        "payment_failures_count",
        "tenure_months",
    ]

    def __init__(self):
        self.model = None
        self.is_trained = False
        self.model_version = "not_loaded"
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                self.is_trained = True
                self.model_version = "telco-xgb-v1"
                logger.info(f"Model loaded from {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Could not load model: {e}")
        else:
            logger.warning("No pre-trained model found. POST /train to train.")

    def train_from_telco(self) -> dict:
        """
        Train XGBoost on Telco dataset.
        scikit-learn is imported here (lazy) so it's only needed at training time.
        """
        if not os.path.exists(TELCO_CSV):
            raise FileNotFoundError(
                f"Telco CSV not found at {TELCO_CSV}. "
                "Place WA_Fn-UseC_-Telco-Customer-Churn.csv in ml-service/data/"
            )

        # Lazy import - only needed for training
        try:
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import roc_auc_score
            use_sklearn = True
        except ImportError:
            use_sklearn = False
            logger.warning("scikit-learn not installed, using manual 80/20 split")

        df = pd.read_csv(TELCO_CSV)
        df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0)
        df["Churn_bin"] = (df["Churn"] == "Yes").astype(int)

        df["wau_ratio"]              = np.clip(df["tenure"] / 72.0, 0, 1)
        tech_cols                    = ["OnlineSecurity","OnlineBackup","DeviceProtection","TechSupport"]
        df["ml_usage_rate"]          = df[tech_cols].apply(lambda c: (c == "Yes").astype(int)).mean(axis=1)
        df["support_ticket_count"]   = ((df["TechSupport"] == "No").astype(int) * 2
                                        + (df["InternetService"] == "Fiber optic").astype(int))
        df["last_login_delta_days"]  = np.clip(30 - df["tenure"], 0, 60).astype(int)
        df["plan_utilization_pct"]   = np.clip(df["MonthlyCharges"] / 120.0 * 100, 0, 100)
        df["payment_failures_count"] = (df["PaymentMethod"] == "Electronic check").astype(int) * 2
        df["tenure_months"]          = df["tenure"]

        X = df[self.FEATURES].values
        y = df["Churn_bin"].values

        if use_sklearn:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        else:
            # Manual 80/20 split without sklearn
            n = len(X)
            idx = np.random.RandomState(42).permutation(n)
            split = int(n * 0.8)
            X_train, X_test = X[idx[:split]], X[idx[split:]]
            y_train, y_test = y[idx[:split]], y[idx[split:]]

        self.model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=42
        )
        self.model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

        y_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred  = (y_proba > 0.5).astype(int)

        # Compute AUC manually if sklearn not available
        if use_sklearn:
            auc = roc_auc_score(y_test, y_proba)
        else:
            # Simple rank-based AUC approximation
            pos = y_proba[y_test == 1]
            neg = y_proba[y_test == 0]
            auc = float(np.mean(
                np.random.RandomState(0).choice(pos, 1000) >
                np.random.RandomState(1).choice(neg, 1000)
            ))

        self.is_trained = True
        self.model_version = f"telco-xgb-v{datetime.now().strftime('%Y%m%d%H%M')}"

        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self.model, f)

        logger.info(f"Model trained. AUC~{auc:.4f}, version={self.model_version}")
        return {
            "roc_auc": round(auc, 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "model_version": self.model_version
        }

    def predict(self, features: dict) -> dict:
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model not trained. POST /train first.")

        X = np.array([[features.get(f, 0.0) for f in self.FEATURES]])
        score = float(self.model.predict_proba(X)[0][1])

        if score > 0.80:
            action  = "URGENT_COUPON_30"
            risk    = "CRITICAL"
            message = "Client en danger critique – coupon 30% recommandé immédiatement"
        elif score > 0.50:
            action  = "RETENTION_EMAIL"
            risk    = "HIGH"
            message = "Client à risque – email de réengagement à envoyer"
        elif score > 0.30:
            action  = "MANAGER_ALERT"
            risk    = "MEDIUM"
            message = "Client à surveiller – alerte manager"
        else:
            action  = "NONE"
            risk    = "LOW"
            message = "Client stable"

        return {
            "churn_score":   round(score, 4),
            "risk_level":    risk,
            "action":        action,
            "message":       message,
            "model_version": self.model_version,
        }
