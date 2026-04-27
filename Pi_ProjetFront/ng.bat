@echo off
chcp 65001 >nul

REM Demarrer Git Service en arriere-plan
if not defined GIT_SERVICE_STARTED (
    set GIT_SERVICE_STARTED=1
    echo [Git Service] Demarrage...
    start "Git Service" /min cmd /c "cd ..\git-service && python -m venv .venv 2>nul && .venv\Scripts\activate && pip install -r requirements.txt -q && python main.py"
    echo [Git Service] Attente 5 secondes...
    timeout /t 5 /nobreak >nul
    echo [Git Service] OK!
    echo.
)

REM Lancer Angular
call npx ng %*