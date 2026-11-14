# ====================================================
# NEXUS AI - Push to GitHub Repository
# Target: https://github.com/gagansuryatejar/dc.git
# ====================================================

Set-Location -Path $PSScriptRoot

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  NEXUS AI - Push to GitHub Repository" -ForegroundColor Cyan
Write-Host "  Target: https://github.com/gagansuryatejar/dc.git" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Install Git from https://git-scm.com/downloads" -ForegroundColor Yellow
    exit 1
}

# 2. Initialize
if (-not (Test-Path ".git")) {
    Write-Host "[1/5] Initializing Git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "[1/5] Existing Git repository detected." -ForegroundColor Green
}

# 3. Branch & Remote
Write-Host "[2/5] Setting up branch and remote..." -ForegroundColor Yellow
git branch -M main

$hasOrigin = git remote | Where-Object { $_ -eq "origin" }
if ($hasOrigin) {
    git remote set-url origin https://github.com/gagansuryatejar/dc.git
    Write-Host "  Updated remote 'origin'" -ForegroundColor Green
} else {
    git remote add origin https://github.com/gagansuryatejar/dc.git
    Write-Host "  Added remote 'origin'" -ForegroundColor Green
}

# 4. Stage & Commit
Write-Host "[3/5] Staging files (respecting .gitignore)..." -ForegroundColor Yellow
git add .

Write-Host "[4/5] Creating commit..." -ForegroundColor Yellow
git commit -m "feat: NEXUS AI production release v1.1.0 with NEXUS HEART voice companion"

# 5. Push
Write-Host "[5/5] Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Normal push failed (remote might have initial commit). Pulling with rebase..." -ForegroundColor Yellow
    git pull origin main --rebase
    git push -u origin main
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Project pushed to https://github.com/gagansuryatejar/dc" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "If the remote repository already has commits, you can force push:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main --force" -ForegroundColor White
}
