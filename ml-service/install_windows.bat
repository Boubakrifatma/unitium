@echo off
echo =========================================
echo  Unitum ML Service - Windows Installer
echo  Teste avec Python 3.11 a 3.14
echo =========================================
echo.
python --version
echo.
echo [1/2] Installation des dependances...
python -m pip install --upgrade pip
python -m pip install ^
  fastapi==0.115.0 ^
  "uvicorn[standard]==0.30.6" ^
  xgboost==3.2.0 ^
  pandas==3.0.2 ^
  numpy==2.4.4 ^
  pydantic==2.12.5 ^
  pydantic-core==2.41.5
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] Installation echouee.
    pause
    exit /b 1
)
echo.
echo [2/2] Demarrage du service ML sur http://localhost:8000 ...
echo       Swagger UI : http://localhost:8000/docs
echo       Health     : http://localhost:8000/health
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
