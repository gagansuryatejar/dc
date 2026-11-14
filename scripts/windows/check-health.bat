@echo off
TITLE NEXUS AI — Windows Production Host Health Checker
COLOR 0E

echo ====================================================
echo   NEXUS AI - Windows 10 Host System Diagnostics
echo   Optimized for HP All-in-One (4GB RAM)
echo ====================================================
echo.

cd /d "%~dp0..\.."

echo [1/4] Checking Node.js Runtime...
node -v 2>nul
if %ERRORLEVEL% neq 0 (
    echo   FAIL: Node.js not detected.
) else (
    echo   OK: Node.js installed.
)

echo.
echo [2/4] Checking SQLite Database Status...
if exist "data\nexus.db" (
    for %%F in ("data\nexus.db") do echo   OK: Database found (Size: %%~zF bytes)
) else (
    echo   WARN: data\nexus.db not found. Has prisma db push been executed?
)

echo.
echo [3/4] Checking PM2 Service Status...
where pm2 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    call pm2 status
) else (
    echo   INFO: PM2 not installed globally. Checking active Node processes:
    tasklist /FI "IMAGENAME eq node.exe"
)

echo.
echo [4/4] Testing Web Dashboard HTTP Port (3000)...
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:3000/health' -TimeoutSec 3; Write-Host '  OK: Dashboard response: ' ($res | ConvertTo-Json -Compress) -ForegroundColor Green } catch { Write-Host '  WARN: Dashboard is not responding on http://localhost:3000' -ForegroundColor Yellow }"

echo.
echo ====================================================
echo Diagnostic check complete.
echo ====================================================
pause
