# PostgreSQL Backup Script for Windows (PowerShell)
# Creates a timestamped backup of the PostgreSQL database

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
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "🔄 Starting backup of database '$POSTGRES_DB'..." -ForegroundColor Cyan

# Create backup using pg_dump inside the container
try {
    docker exec -t $CONTAINER_NAME pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists | docker run --rm -i alpine gzip > "$BACKUP_DIR\$BACKUP_FILE"
    
    $backupSize = (Get-Item "$BACKUP_DIR\$BACKUP_FILE").Length / 1KB
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "📁 File: $BACKUP_DIR\$BACKUP_FILE" -ForegroundColor Green
    Write-Host "📊 Size: $([math]::Round($backupSize, 2)) KB" -ForegroundColor Green
    
    # Keep only the last 10 backups
    Write-Host "🧹 Cleaning up old backups (keeping last 10)..." -ForegroundColor Yellow
    Get-ChildItem "$BACKUP_DIR\backup_*.sql.gz" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -Skip 10 | 
        Remove-Item -Force
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}
