@echo off
setlocal enabledelayedexpansion
title NEXUS AI — Local PC Runner
color 0b
cd /d "%~dp0"

echo ====================================================
echo   NEXUS AI - Running Locally on Your PC
echo   Full Feature Check (Bot + Web Dashboard)
echo ====================================================
echo.

:: 1. Verify Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    pause
    exit /b 1
)

:: 2. Launch
echo [1/3] Deploying 32 Slash Commands to your server...
call npm run deploy:commands
echo.

:: 4. Start Web Dashboard in background
echo [2/3] Starting Standalone Web Dashboard on port 3000...
start "NEXUS AI Dashboard" cmd /k "node dist\dashboard\server.js"

:: 5. Open Web Dashboard in browser
start http://localhost:3000

:: 6. Launch NEXUS AI Discord Bot
echo [3/3] Launching NEXUS AI Bot Engine...
echo.
echo ====================================================
echo   NEXUS AI is now ONLINE in your Discord server!
echo   Web Dashboard: http://localhost:3000
echo   Press Ctrl+C to stop the bot anytime.
echo ====================================================
echo.

node index.js
pause
