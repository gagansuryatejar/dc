@echo off
TITLE NEXUS AI — Production Windows Host Runner
COLOR 0B

echo ====================================================
echo   NEXUS AI - Windows 10 Host Launcher
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
echo [%date% %time%] Starting NEXUS AI Bot process... >> logs\runner.log
echo Starting NEXUS AI Bot...

node --max-old-space-size=350 --expose-gc dist\index.js

set EXIT_CODE=%ERRORLEVEL%
echo [%date% %time%] Bot process terminated with exit code %EXIT_CODE% >> logs\runner.log
echo [WARN] Bot process exited with code %EXIT_CODE%.

if %EXIT_CODE% equ 0 (
    echo Bot stopped gracefully. Exiting launcher.
    pause
    exit /b 0
)

echo Recovering and restarting in 5 seconds... (Press Ctrl+C to abort)
timeout /t 5 /nobreak >nul
goto loop
