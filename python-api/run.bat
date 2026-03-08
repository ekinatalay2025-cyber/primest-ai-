@echo off
cd /d "%~dp0"
if not exist "venv" (
    echo Python sanal ortam oluşturuluyor...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo.
echo PRIMEST AI Python API baslatiliyor: http://localhost:8000
echo.
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
