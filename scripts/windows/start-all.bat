@echo off
TITLE NEXUS AI — Full Stack Launcher (Bot + Dashboard)
COLOR 0B

echo ====================================================
echo   NEXUS AI - Full Stack Launcher
echo   Optimized for HP All-in-One (Windows 10, 4GB RAM)
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

:: Check PM2
where pm2 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] PM2 detected. Launching bot and dashboard under PM2 process manager...
    call pm2 start ecosystem.config.cjs
    call pm2 status
    echo.
    echo NEXUS AI is running in the background via PM2.
    echo To view bot logs:       pm2 logs nexus-bot
    echo To view dashboard logs: pm2 logs nexus-dashboard
    echo To stop all services:   pm2 stop all
    echo.
    pause
    exit /b 0
)

echo [INFO] PM2 not found in PATH. Launching bot and dashboard in separate terminal windows...
start "NEXUS AI - Bot Process" cmd /k "scripts\windows\start-bot.bat"
start "NEXUS AI - Web Dashboard" cmd /k "scripts\windows\start-dashboard.bat"

echo.
echo Both NEXUS AI Bot and Web Dashboard have been launched in dedicated windows.
echo Dashboard URL: http://localhost:3000
echo.
pause
