@echo off
chcp 65001 >nul
echo ========================================
echo   FFmpeg PATH'e Ekleme
echo ========================================
echo.

set "FFMPEG_PATH="

if exist "C:\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_PATH=C:\ffmpeg\bin"
if exist "C:\ffmpeg\ffmpeg-7.0-essentials_build\bin\ffmpeg.exe" set "FFMPEG_PATH=C:\ffmpeg\ffmpeg-7.0-essentials_build\bin"
if exist "C:\ffmpeg\ffmpeg-6.0-essentials_build\bin\ffmpeg.exe" set "FFMPEG_PATH=C:\ffmpeg\ffmpeg-6.0-essentials_build\bin"
if exist "%USERPROFILE%\Downloads\ffmpeg-7.0-essentials_build\bin\ffmpeg.exe" set "FFMPEG_PATH=%USERPROFILE%\Downloads\ffmpeg-7.0-essentials_build\bin"
if exist "%USERPROFILE%\Downloads\ffmpeg\bin\ffmpeg.exe" set "FFMPEG_PATH=%USERPROFILE%\Downloads\ffmpeg\bin"

if "%FFMPEG_PATH%"=="" (
    echo FFmpeg BULUNAMADI!
    echo.
    echo 1. ffmpeg-release-essentials.zip indir
    echo 2. Zip'i C:\ffmpeg klasorune cikart
    echo 3. Sonuc: C:\ffmpeg\bin\ffmpeg.exe olmali
    echo.
    echo Veya zip'i nereye cikarttigini buraya yaz,
    echo setx PATH ile ekleyecegim.
    echo.
    pause
    exit /b 1
)

echo FFmpeg bulundu: %FFMPEG_PATH%
echo.
echo PATH'e ekleniyor (kalici)...
setx PATH "%PATH%;%FFMPEG_PATH%"
echo.
echo TAMAMLANDI!
echo.
echo ONEMLI: Yeni bir terminal ac ve "ffmpeg -version" yaz.
echo Bu pencereyi kapat, BASLA.bat ac.
echo.
pause
