@echo off
echo Starting Unitum ML Service on http://localhost:8000 ...
echo Swagger UI: http://localhost:8000/docs
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
