@echo off
setlocal enabledelayedexpansion

REM Colors
set "RESET=[0m"
set "BLUE=[34m"
set "GREEN=[32m"
set "YELLOW=[33m"

echo.
echo %BLUE%=====================================================
echo   M2 ML Service Startup Script
echo =====================================================%RESET%

REM Set project paths
set "PROJECT_ROOT=%~dp0"
set "ML_SERVICE_DIR=%PROJECT_ROOT%m2_ml_service"

REM Step 1: Verify project structure
echo.
echo %YELLOW%[1/5] Verifying project structure...%RESET%
if not exist "%ML_SERVICE_DIR%" (
    echo Error: m2_ml_service directory not found at %ML_SERVICE_DIR%
    exit /b 1
)
echo %GREEN%[OK] Project directory found%RESET%

REM Step 2: Check Python installation
echo.
echo %YELLOW%[2/5] Checking Python installation...%RESET%
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python not found. Please install Python 3.8+
    echo Download from: https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set "PYTHON_VERSION=%%i"
echo %GREEN%[OK] %PYTHON_VERSION% found%RESET%

REM Step 3: Install dependencies
echo.
echo %YELLOW%[3/5] Installing Python dependencies...%RESET%
cd /d "%ML_SERVICE_DIR%"
if not exist "requirements.txt" (
    echo Error: requirements.txt not found in %ML_SERVICE_DIR%
    exit /b 1
)
pip install -q -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    exit /b 1
)
echo %GREEN%[OK] Dependencies installed%RESET%

REM Step 4: Check for artifacts
echo.
echo %YELLOW%[4/5] Checking ML artifacts...%RESET%
if not exist "models\template_embeddings.npy" (
    echo.
    echo %YELLOW%   Warning: ML artifacts not found.%RESET%
    echo %YELLOW%   Attempting to export artifacts (requires MySQL running)...%RESET%
    python scripts/export_pib_artifacts.py
    if errorlevel 1 (
        echo %YELLOW%   [WARNING] Artifact export failed (this is OK if MySQL isn't running)%RESET%
        echo %YELLOW%   Run 'python scripts/export_pib_artifacts.py' manually once MySQL is ready%RESET%
    ) else (
        echo %GREEN%[OK] Artifacts exported%RESET%
    )
) else (
    echo %GREEN%[OK] Artifacts already present%RESET%
)

REM Step 5: Start the server
echo.
echo %YELLOW%[5/5] Starting FastAPI server...%RESET%
echo.
echo %BLUE%=====================================================
echo %GREEN%Server launching at http://localhost:8000
echo %BLUE%Ctrl+C to stop
echo =====================================================%RESET%
echo.

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
if errorlevel 1 (
    echo Error: Failed to start server
    pause
    exit /b 1
)
