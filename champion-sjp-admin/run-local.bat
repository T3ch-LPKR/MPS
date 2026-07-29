@echo off
cd /d "%~dp0"

echo ============================================
echo   Champion SJP Admin - LOKAL (test)
echo   Folder: %cd%
echo ============================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm/Node.js tidak ditemukan di PATH.
  echo Install Node.js dulu dari https://nodejs.org lalu buka ulang .bat ini.
  echo.
  cmd /k
)

if not exist "node_modules\" (
  echo Install dependencies pertama kali ^(~1-2 menit^)...
  call npm install
  echo.
)

echo Menjalankan server dev...
echo.
echo   ^>^>^> Tunggu tulisan "Ready", lalu buka browser: http://localhost:3000
echo   ^>^>^> BERHENTI: tekan Ctrl+C  (jendela TETAP terbuka, tidak menutup)
echo.

REM cmd /k = jendela tetap hidup walau server berhenti / error
cmd /k "npm run dev"
