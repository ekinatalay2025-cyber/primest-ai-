@echo off
chcp 65001 >nul
title PRIMEST AI - Python API
color 0A

echo.
echo ========================================
echo   PRIMEST AI - Python API Baslatiliyor
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Python kontrol ediliyor...
python --version 2>nul
if errorlevel 1 (
    echo.
    echo HATA: Python bulunamadi!
    echo Python 3.12 kur: https://www.python.org/downloads/release/python-3120/
    echo.
    pause
    exit /b 1
)
python -c "import sys; exit(0 if sys.version_info < (3, 14) else 1)" 2>nul
if errorlevel 1 (
    echo.
    echo UYARI: Python 3.14 tespit edildi. Bazi paketler calismayabilir.
    echo Python 3.12 onerilir: https://www.python.org/downloads/release/python-3120/
    echo.
    echo Devam etmek icin bir tusa bas...
    pause >nul
)
echo OK - Python var
echo.

echo [2/4] Sanal ortam olusturuluyor...
if not exist "venv\Scripts\activate.bat" (
    if exist "venv" rmdir /s /q venv
    python -m venv venv
    echo Sanal ortam olusturuldu.
) else (
    echo Sanal ortam zaten var.
)
echo.

echo [3/4] Paketler yukleniyor (ilk seferde 1-2 dk surebilir)...
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo OK
echo.

echo [4/4] API baslatiliyor...
echo.
echo ========================================
echo   HAZIR! Tarayicida test et:
echo   http://localhost:8000
echo ========================================
echo   Bu pencereyi KAPATMA - arka planda calisiyor
echo ========================================
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
