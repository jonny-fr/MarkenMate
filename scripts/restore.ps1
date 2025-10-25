# PostgreSQL Restore Script for Windows (PowerShell)
# Restores a PostgreSQL database from a backup file

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

# Load environment variables from .env if it exists
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.+)\s*$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

# Configuration
$CONTAINER_NAME = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { "markenmate-postgres" }
$POSTGRES_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "markenmate" }
$POSTGRES_DB = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "markenmate" }
$BACKUP_DIR = ".\backups"

# Check if backup file is provided
if (-not $BackupFile) {
    Write-Host "❌ Error: No backup file specified" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\scripts\restore.ps1 <backup_file>"
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-ChildItem "$BACKUP_DIR\backup_*.sql.gz" -ErrorAction SilentlyContinue | 
        Select-Object Name, @{Name="Size";Expression={"{0:N2} KB" -f ($_.Length / 1KB)}}, LastWriteTime | 
        Format-Table -AutoSize
    exit 1
}

# Check if file exists
if (-not (Test-Path $BackupFile)) {
    # Try looking in backup directory
    $fullPath = Join-Path $BACKUP_DIR $BackupFile
    if (Test-Path $fullPath) {
        $BackupFile = $fullPath
    }
    else {
        Write-Host "❌ Error: Backup file not found: $BackupFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host "⚠️  WARNING: This will replace the current database with the backup!" -ForegroundColor Yellow
Write-Host "📁 Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "❌ Restore cancelled" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Starting restore of database '$POSTGRES_DB'..." -ForegroundColor Cyan

# Restore backup
try {
    Get-Content $BackupFile -Raw | docker run --rm -i alpine gunzip | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB
    Write-Host "✅ Database restored successfully!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Restore failed: $_" -ForegroundColor Red
    exit 1
}
