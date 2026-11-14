@echo off
TITLE NEXUS AI — Windows PM2 Service Installer
COLOR 0E

echo ====================================================
echo   NEXUS AI - Windows Startup Service Configuration
echo   Configures PM2 to run NEXUS AI automatically on boot
echo ====================================================
echo.

cd /d "%~dp0..\.."

where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Installing PM2 and pm2-windows-startup globally...
    call npm install -g pm2 pm2-windows-startup
)

echo Starting services from ecosystem.config.cjs...
call pm2 start ecosystem.config.cjs

echo Saving current PM2 process list...
call pm2 save

echo Installing PM2 startup hook for Windows...
call pm2-startup install

echo.
echo ====================================================
echo [SUCCESS] NEXUS AI is configured to start automatically on Windows boot.
echo Web Dashboard: http://localhost:3000
echo ====================================================
pause
