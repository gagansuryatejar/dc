@echo off
TITLE NEXUS AI — Remote Dashboard Tunnel (Cloudflare)
COLOR 0B

echo ====================================================
echo   NEXUS AI - Secure Remote Web Dashboard Tunnel
echo ====================================================
echo.

where cloudflared >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Cloudflare Tunnel (cloudflared) is not installed in PATH.
    echo To install cloudflared on Windows:
    echo   winget install Cloudflare.cloudflared
    echo.
    echo Once installed, rerun this script to get an instant public HTTPS tunnel.
    echo Alternatively, you can use ngrok:
    echo   ngrok http 3000
    echo.
    pause
    exit /b 1
)

echo Starting Cloudflare Tunnel for http://localhost:3000...
echo Your secure, temporary HTTPS URL will appear below:
echo.
cloudflared tunnel --url http://localhost:3000
