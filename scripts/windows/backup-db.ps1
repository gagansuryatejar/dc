# Automated SQLite Database Backup Script for Windows 10 Host
# Preserves data integrity and automatically rotates out old backup files.

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$DataDir = Join-Path $ProjectRoot "data"
$DbPath = Join-Path $DataDir "nexus.db"
$BackupDir = Join-Path $DataDir "backups"

if (-not (Test-Path $DbPath)) {
    Write-Warning "Primary SQLite database not found at $DbPath. Skipping backup."
    exit 0
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyy-MM-dd-HHmmss")
$BackupFile = Join-Path $BackupDir "nexus-backup-$Timestamp.db"

Write-Host "Creating SQLite database snapshot..." -ForegroundColor Cyan
Copy-Item -Path $DbPath -Destination $BackupFile -Force
$SizeKb = [math]::Round((Get-Item $BackupFile).Length / 1KB, 1)
Write-Host "Backup created: $BackupFile ($SizeKb KB)" -ForegroundColor Green

# Retention policy: Prune backups older than 7 days, keeping at least 5 latest backups
$AllBackups = Get-ChildItem -Path $BackupDir -Filter "nexus-backup-*.db" | Sort-Object CreationTime -Descending
if ($AllBackups.Count -gt 5) {
    $OldBackups = $AllBackups | Select-Object -Skip 5 | Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) }
    foreach ($File in $OldBackups) {
        Write-Host "Rotating old backup: $($File.Name)" -ForegroundColor Yellow
        Remove-Item $File.FullName -Force
    }
}

Write-Host "Database backup and retention cycle completed successfully." -ForegroundColor Cyan
