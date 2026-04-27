#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ML_SERVICE_DIR="$PROJECT_ROOT/m2_ml_service"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  M2 ML Service Startup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Step 1: Verify project structure
echo -e "\n${YELLOW}[1/5] Verifying project structure...${NC}"
if [ ! -d "$ML_SERVICE_DIR" ]; then
    echo "❌ Error: m2_ml_service directory not found at $ML_SERVICE_DIR"
    exit 1
fi
echo -e "${GREEN}✓ Project directory found${NC}"

# Step 2: Check Python installation
echo -e "\n${YELLOW}[2/5] Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 not found. Please install Python 3.8+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ $PYTHON_VERSION found${NC}"

# Step 3: Install dependencies
echo -e "\n${YELLOW}[3/5] Installing Python dependencies...${NC}"
cd "$ML_SERVICE_DIR"
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found in $ML_SERVICE_DIR"
    exit 1
fi
python3 -m pip install  -r requirements.txt 
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Export artifacts (if models directory is empty)
echo -e "\n${YELLOW}[4/5] Checking ML artifacts...${NC}"
if [ ! -f "$ML_SERVICE_DIR/models/template_embeddings.npy" ] || [ ! -f "$ML_SERVICE_DIR/models/template_metadata.csv" ]; then
    echo -e "${YELLOW}   Exporting PIB artifacts (requires MySQL running)...${NC}"
    if python3 scripts/export_pib_artifacts.py; then
        echo -e "${GREEN}✓ Artifacts exported${NC}"
    else
        echo -e "${YELLOW}⚠ Artifact export failed (this is OK if MySQL isn't running yet)${NC}"
        echo -e "${YELLOW}   Run 'python scripts/export_pib_artifacts.py' manually once MySQL is ready${NC}"
    fi
else
    echo -e "${GREEN}✓ Artifacts already present${NC}"
fi

# Step 5: Start the server
echo -e "\n${YELLOW}[5/5] Starting FastAPI server...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Server launching at http://localhost:8000${NC}"
echo -e "${BLUE}Ctrl+C to stop${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
