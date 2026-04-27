from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
import os
from model_engine import predict, predict_ml, THRESHOLD
from claude_scorer import get_text_risk_score

app = Flask(__name__)

# ── Health ────────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    api_key_set = bool(os.environ.get("GROQ_API_KEY"))
    return jsonify({
        "status":       "ok",
        "model":        "XGB+RF+GB+LR Ensemble · SMOTE · 4 features",
        "groq_api_key": "configuree" if api_key_set else "manquante — mode ml_only",
        "inputs": {
            "ml_fields":   ["estimated_hours", "priority", "due_in_days", "user_workload"],
            "text_fields": ["task_title", "task_description", "category"]
        },
        "threshold": THRESHOLD
    })

# ── Predict ───────────────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict_single():
    b = request.get_json(force=True)
    miss = [k for k in ["estimated_hours", "priority", "due_in_days", "user_workload"] if k not in b]
    if miss:
        return jsonify({"error": f"Champs manquants : {miss}"}), 400

    text_risk   = None
    groq_meta   = {}

    if b.get("task_title") and b.get("task_description"):
        try:
            cr        = get_text_risk_score(
                task_title       = b["task_title"],
                task_description = b["task_description"],
                category         = b.get("category", "")
            )
            text_risk = cr["text_risk_score"]
            groq_meta = {
                "text_risk_score": text_risk,
                "reasoning":       cr["reasoning"],
                "source":          cr["source"]
            }
        except Exception as e:
            groq_meta = {"groq_warning": str(e)}

    try:
        result = predict(
            estimated_hours = float(b["estimated_hours"]),
            priority        = str(b["priority"]),
            due_in_days     = float(b["due_in_days"]),
            user_workload   = float(b["user_workload"]),
            text_risk_score = text_risk
        )
        result.update(groq_meta)
        result["inputs"] = {
            "estimated_hours":  b["estimated_hours"],
            "priority":         b["priority"],
            "due_in_days":      b["due_in_days"],
            "user_workload":    b["user_workload"],
            "task_title":       b.get("task_title"),
            "task_description": b.get("task_description"),
        }
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

# ── Batch ─────────────────────────────────────────────────────────────────────
@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    body = request.get_json(force=True)
    if not isinstance(body, list):
        return jsonify({"error": "JSON array requis"}), 400

    results = []
    for i, t in enumerate(body):
        try:
            text_risk = None
            groq_meta = {}
            if t.get("task_title") and t.get("task_description"):
                try:
                    cr        = get_text_risk_score(
                        t["task_title"], t["task_description"], t.get("category", "")
                    )
                    text_risk = cr["text_risk_score"]
                    groq_meta = {
                        "text_risk_score": text_risk,
                        "reasoning":       cr["reasoning"],
                        "source":          cr["source"]
                    }
                except Exception as e:
                    groq_meta = {"groq_warning": str(e)}

            res = predict(
                float(t["estimated_hours"]), str(t["priority"]),
                float(t["due_in_days"]),     float(t["user_workload"]),
                text_risk_score=text_risk
            )
            res.update({"index": i, **groq_meta})
            results.append(res)
        except Exception as e:
            results.append({"index": i, "error": str(e)})

    return jsonify({
        "count":           len(results),
        "high_risk_count": sum(1 for r in results if r.get("high_risk")),
        "predictions":     results
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)