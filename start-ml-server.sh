#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ML_SERVICE_DIR="$PROJECT_ROOT/m2_ml_service"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  M2 ML Service Startup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# ── Step 1: Verify project structure ────────────────────────────────────────
echo -e "\n${YELLOW}[1/5] Verifying project structure...${NC}"
if [ ! -d "$ML_SERVICE_DIR" ]; then
    echo -e "${RED}❌ Error: m2_ml_service directory not found at $ML_SERVICE_DIR${NC}"
    exit 1
fi
if [ ! -f "$ML_SERVICE_DIR/main.py" ]; then
    echo -e "${RED}❌ Error: main.py not found inside m2_ml_service/${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project directory verified${NC}"

# ── Step 2: Resolve Python command ──────────────────────────────────────────
echo -e "\n${YELLOW}[2/5] Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}❌ Error: Python not found. Please install Python 3.8+${NC}"
    exit 1
fi
PYTHON_VERSION=$($PYTHON --version 2>&1)
echo -e "${GREEN}✓ $PYTHON_VERSION (using '$PYTHON')${NC}"

# ── Step 3: Install / upgrade dependencies ──────────────────────────────────
echo -e "\n${YELLOW}[3/5] Installing Python dependencies...${NC}"
cd "$ML_SERVICE_DIR"
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ Error: requirements.txt not found in $ML_SERVICE_DIR${NC}"
    exit 1
fi
$PYTHON -m pip install --quiet --upgrade pip
$PYTHON -m pip install --quiet -r requirements.txt
echo -e "${GREEN}✓ Dependencies ready${NC}"

# ── Step 4: Always re-export ML artifacts from live DB ──────────────────────
# Re-exporting every startup ensures artifacts stay in sync with the database
# (new seeds, reseeds, or template changes are automatically picked up).
echo -e "\n${YELLOW}[4/5] Exporting PIB artifacts from database (valigg)...${NC}"
echo -e "      This syncs templates and member profiles with the live DB."

mkdir -p models

if $PYTHON scripts/export_pib_artifacts.py; then
    echo -e "${GREEN}✓ Artifacts exported successfully${NC}"
    # Print a quick summary of what was generated
    if [ -f "models/model_metadata.json" ]; then
        TEMPLATE_COUNT=$(python3 -c "import json; d=json.load(open('models/model_metadata.json')); print(d.get('templateCount','?'))" 2>/dev/null || echo "?")
        PROFILE_COUNT=$(python3 -c "import json; d=json.load(open('models/model_metadata.json')); print(d.get('profileCount','?'))" 2>/dev/null || echo "?")
        echo -e "      templates=${TEMPLATE_COUNT}  member_profiles=${PROFILE_COUNT}"
    fi
else
    echo -e "${RED}❌ Artifact export failed.${NC}"
    echo -e "   Make sure MySQL is running and the 'valigg' database exists."
    echo -e "   Spring Boot must have started at least once so the schema and seed data are present."
    echo ""
    # If stale artifacts exist from a previous run, offer to continue with them
    if [ -f "models/template_embeddings.npy" ] && [ -f "models/template_metadata.csv" ]; then
        echo -e "${YELLOW}⚠ Stale artifacts found from a previous run.${NC}"
        echo -e "  Starting the ML server with stale artifacts — template recommendations"
        echo -e "  may not match the current database state. Re-run this script after"
        echo -e "  MySQL and Spring Boot are both running to refresh them."
        echo ""
    else
        echo -e "${RED}No artifacts found at all. Cannot start ML service.${NC}"
        echo -e "  1. Start MySQL"
        echo -e "  2. Start Spring Boot (runs the seeders automatically)"
        echo -e "  3. Run this script again"
        exit 1
    fi
fi

# ── Step 5: Start FastAPI server ─────────────────────────────────────────────
echo -e "\n${YELLOW}[5/5] Starting FastAPI server...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Server: http://localhost:8000${NC}"
echo -e "${GREEN}  Health: http://localhost:8000/health${NC}"
echo -e "${GREEN}  Capabilities: http://localhost:8000/api/v1/ml/capabilities${NC}"
echo -e "${BLUE}  Ctrl+C to stop${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
