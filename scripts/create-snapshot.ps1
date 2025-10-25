# PostgreSQL Snapshot Script for Windows (PowerShell)
# Creates a named snapshot of the current database state

param(
    [Parameter(Mandatory=$true)]
    [string]$SnapshotName
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
$SNAPSHOT_DIR = ".\snapshots"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$SNAPSHOT_FILE = "snapshot_${SnapshotName}_${TIMESTAMP}.sql.gz"

# Create snapshot directory if it doesn't exist
if (-not (Test-Path $SNAPSHOT_DIR)) {
    New-Item -ItemType Directory -Path $SNAPSHOT_DIR | Out-Null
}

Write-Host "📸 Creating snapshot '$SnapshotName'..." -ForegroundColor Cyan

# Create snapshot using pg_dump inside the container
try {
    docker exec -t $CONTAINER_NAME pg_dump -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists | docker run --rm -i alpine gzip > "$SNAPSHOT_DIR\$SNAPSHOT_FILE"
    
    $snapshotSize = (Get-Item "$SNAPSHOT_DIR\$SNAPSHOT_FILE").Length / 1KB
    Write-Host "✅ Snapshot created successfully!" -ForegroundColor Green
    Write-Host "📁 File: $SNAPSHOT_DIR\$SNAPSHOT_FILE" -ForegroundColor Green
    Write-Host "📊 Size: $([math]::Round($snapshotSize, 2)) KB" -ForegroundColor Green
    Write-Host ""
    Write-Host "To restore this snapshot, run:" -ForegroundColor Yellow
    Write-Host "  .\scripts\restore.ps1 $SNAPSHOT_DIR\$SNAPSHOT_FILE" -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Snapshot creation failed: $_" -ForegroundColor Red
    exit 1
}
