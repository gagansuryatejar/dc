@echo off
TITLE NEXUS AI — Standalone Web Dashboard Launcher
COLOR 0A

echo ====================================================
echo   NEXUS AI - Web Dashboard Launcher
echo   Optimized for HP All-in-One (4GB RAM)
echo ====================================================
echo.

cd /d "%~dp0..\.."

:: Create logs directory if missing
if not exist "logs" mkdir "logs"
if not exist "data" mkdir "data"

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: Auto restart loop
:loop
echo [%date% %time%] Starting NEXUS AI Web Dashboard server... >> logs\dashboard-runner.log
echo Starting NEXUS AI Web Dashboard on port 3000...

node --max-old-space-size=100 dist\dashboard\server.js

set EXIT_CODE=%ERRORLEVEL%
echo [%date% %time%] Dashboard server terminated with exit code %EXIT_CODE% >> logs\dashboard-runner.log
echo [WARN] Dashboard server exited with code %EXIT_CODE%.

if %EXIT_CODE% equ 0 (
    echo Dashboard server stopped gracefully. Exiting launcher.
    pause
    exit /b 0
)

echo Recovering and restarting in 5 seconds... (Press Ctrl+C to abort)
timeout /t 5 /nobreak >nul
goto loop
