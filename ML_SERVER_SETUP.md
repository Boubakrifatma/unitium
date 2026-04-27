# M2 ML Service Setup & Startup Guide

## Quick Start (Recommended)

### On Windows
```bash
start-ml-server.bat
```

### On macOS / Linux
```bash
bash start-ml-server.sh
```

These scripts handle everything automatically:
1. ✅ Verify Python installation
2. ✅ Install dependencies from `requirements.txt`
3. ✅ Export ML artifacts (if MySQL is running)
4. ✅ Start the FastAPI server on http://localhost:8000

---

## Manual Setup (If Scripts Don't Work)

### Prerequisites
- **Python 3.8+** installed (download from https://www.python.org/)
- **MySQL 8.0+** running with the `PiProjet` database (for artifact export)
- **uvicorn** will be installed by pip

### Step 1: Navigate to ML Service Directory
```bash
cd m2_ml_service
```

### Step 2: Install Dependencies (one time)
```bash
python3 pip install -r requirements.txt
```

This installs:
- `fastapi` — web framework
- `numpy`, `pandas` — data processing
- `sklearn` — machine learning
- `joblib` — model serialization
- `pymysql` — MySQL connector
- `sentence-transformers` — optional embeddings

### Step 3: Export ML Artifacts (one time, requires MySQL)
```bash
python scripts/export_pib_artifacts.py
```

This generates:
- `models/template_embeddings.npy` — template embeddings (384-dim vectors)
- `models/template_metadata.csv` — template name/type/description
- `models/role_classifier.joblib` — logistic regression model for team roles
- `models/role_thresholds.json` — role prediction thresholds
- `models/member_profiles.csv` — workspace member ML scores
- `models/model_metadata.json` — generation timestamp and config

**Optional:** If you want artifacts in a custom directory:
```bash
python scripts/export_pib_artifacts.py --out-dir /path/to/custom/models/dir
```

### Step 4: Start the Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Server is ready at http://localhost:8000

---

## Available Endpoints

### Health Check
```
GET http://localhost:8000/health
```
Response: `{"status": "ok"}`

### Project Bootstrap (Main Endpoint)
```
POST http://localhost:8000/api/v1/ml/project-bootstrap
Content-Type: application/json

{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "input_type": "text",
  "description": "A data warehouse project for analytics",
  "document_base64": null,
  "document_filename": null
}
```

Response:
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "stage1": {
    "embedding": [0.1, 0.2, ...],
    "project_type": "DATA_ENGINEERING",
    "complexity": "high",
    "domain_tags": ["analytics", "data"],
    "detected_mode": "structured",
    "constraints": []
  },
  "stage2": {
    "status": "ready",
    "template_matches": [...]
  },
  "stage3": {
    "status": "ready",
    "role_predictions": [...]
  },
  "stage4": {
    "status": "ready",
    "member_recommendations": [...]
  }
}
```

---

## CLI Bootstrap (Direct Python Invocation)

Use this to run bootstrap inference without an HTTP server (useful for batch processing):

```bash
python scripts/run_bootstrap_cli.py --input payload.json
```

Create `payload.json`:
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "input_type": "text",
  "description": "A SaaS platform with microservices"
}
```

Output goes to stdout as JSON.

With custom models directory:
```bash
python scripts/run_bootstrap_cli.py --input payload.json --models-dir /path/to/models
```

---

## Integration with Spring Boot

The Spring Boot backend at port 8084 calls the ML service. Configure it via environment variable:

```bash
export ML_SERVICE_URL=http://localhost:8000
# Then start Spring Boot
cd Pi_Projet
mvn spring-boot:run
```

Or set it in `application.properties`:
```properties
ml.service.url=${ML_SERVICE_URL:http://localhost:8000}
ml.service.base-url=${ML_SERVICE_URL:http://localhost:8000}
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
→ Run `pip install -r requirements.txt`

### "Address already in use" on port 8000
→ Change the port: `uvicorn main:app --port 8001`

### MySQL connection error during artifact export
→ Make sure MySQL is running and `PiProjet` database exists
→ Check DB credentials in environment:
```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=PiProjet
export DB_USER=root
export DB_PASS=""
```

### "SentenceTransformer model not found"
→ First run will download `all-MiniLM-L6-v2` (40MB). This is normal.
→ Or use fallback deterministic embeddings (no download needed, set in code)

---

## Development Tips

### Enable Debug Logging
```bash
PYTHONUNBUFFERED=1 uvicorn main:app --log-level debug --port 8000 --reload
```

### Run in Production Mode (No Hot Reload)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Check Server Health
```bash
curl http://localhost:8000/health
```

---

## Architecture

```
m2_ml_service/
├── main.py                          # FastAPI app entry, lifespan setup
├── requirements.txt                 # Python dependencies
├── models/                          # ML artifacts (generated)
│   ├── template_embeddings.npy
│   ├── template_metadata.csv
│   ├── role_classifier.joblib
│   ├── role_thresholds.json
│   └── member_profiles.csv
├── routers/
│   └── bootstrap.py                 # HTTP POST /api/v1/ml/project-bootstrap
├── services/
│   └── bootstrap_service.py         # 4-stage ML pipeline
├── schemas/
│   └── bootstrap_schema.py          # Pydantic request/response models
├── scripts/
│   ├── export_pib_artifacts.py      # Generate ML artifacts from DB
│   ├── run_bootstrap_cli.py         # CLI wrapper (no HTTP server)
│   └── seed_pib_training_data.py    # Populate test data
└── training/
    └── ...                          # ML model training scripts
```

---

## Testing

### Test Bootstrap Endpoint
```bash
curl -X POST http://localhost:8000/api/v1/ml/project-bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "test-ws-id",
    "input_type": "text",
    "description": "a mobile app"
  }'
```

### Test CLI Bootstrap
```bash
echo '{"workspace_id":"test-ws-id","input_type":"text","description":"a mobile app"}' > test.json
python scripts/run_bootstrap_cli.py --input test.json
```
