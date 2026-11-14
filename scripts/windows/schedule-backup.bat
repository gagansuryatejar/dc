@echo off
TITLE NEXUS AI — Windows Task Scheduler Daily Backup Configurator
COLOR 0A

echo ====================================================
echo   NEXUS AI - Daily Database Backup Scheduler
echo   Registers Windows Task to snapshot SQLite at 03:00 AM
echo ====================================================
echo.

cd /d "%~dp0..\.."

set TASK_NAME=NEXUS-AI-DailyBackup
set SCRIPT_PATH=%~dp0backup-db.ps1

echo Registering Windows Scheduled Task: %TASK_NAME%...
schtasks /create /tn "%TASK_NAME%" /tr "powershell.exe -ExecutionPolicy Bypass -NoProfile -File \"%SCRIPT_PATH%\"" /sc daily /st 03:00 /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo [SUCCESS] Windows Scheduled Task '%TASK_NAME%' registered!
    echo Backups will run every morning at 03:00 AM.
    echo Retention policy: Preserves latest 5 backups and prunes backups > 7 days.
    echo ====================================================
) else (
    echo.
    echo [ERROR] Failed to register task. Please run this script as Administrator.
)

pause
