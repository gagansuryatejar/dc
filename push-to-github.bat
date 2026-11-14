@echo off
setlocal enabledelayedexpansion
title NEXUS AI - Push to GitHub
cd /d "%~dp0"

echo ====================================================
echo   NEXUS AI - Push to GitHub Repository
echo   Target: https://github.com/gagansuryatejar/dc.git
echo ====================================================
echo.

:: 1. Verify Git installation
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/downloads
    pause
    exit /b 1
)

:: 2. Initialize Git if not already initialized
if not exist ".git" (
    echo [1/5] Initializing Git repository...
    git init
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to initialize git repository.
        pause
        exit /b 1
    )
) else (
    echo [1/5] Existing Git repository detected.
)

:: 3. Configure branch and remote
echo [2/5] Setting up branch and remote...
git branch -M main

git remote get-url origin >nul 2>&1
if %ERRORLEVEL% equ 0 (
    git remote set-url origin https://github.com/gagansuryatejar/dc.git
    echo   Remote 'origin' updated to https://github.com/gagansuryatejar/dc.git
) else (
    git remote add origin https://github.com/gagansuryatejar/dc.git
    echo   Remote 'origin' added as https://github.com/gagansuryatejar/dc.git
)

:: 4. Verify sensitive files are ignored
if not exist ".gitignore" (
    echo [ERROR] .gitignore is missing! Aborting to prevent leaking secrets.
    pause
    exit /b 1
)

:: 5. Stage files and commit
echo [3/5] Staging files (including pre-built dist/ and root index.js)...
git add .

echo [4/5] Creating commit...
git commit -m "perf: unlock full unconstrained resources for Coder 2GB plan (NVMe tuning, 1.5GB heap, deep memory)" 2>nul
if %ERRORLEVEL% neq 0 (
    echo   (Working tree clean or commit already made)
)

:: 6. Push to GitHub
echo [5/5] Pushing to GitHub (origin main)...
echo.
echo If prompted, sign in to your GitHub account in the pop-up window.
echo.

git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTICE] Normal push failed (possibly remote has an existing README or branch).
    echo Attempting rebase and push...
    git pull origin main --rebase 2>nul
    git push -u origin main
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo   SUCCESS! All files pushed to GitHub:
    echo   https://github.com/gagansuryatejar/dc
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo   [ATTENTION]
    echo   If GitHub authentication was required or if the
    echo   repository already contains files, run:
    echo     git push -u origin main --force
    echo ====================================================
)

echo.
pause
