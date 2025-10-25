#!/bin/bash
# PostgreSQL Backup Script
# Creates a timestamped backup of the PostgreSQL database

set -e

# Load environment variables
source .env 2>/dev/null || true

# Configuration
CONTAINER_NAME="${POSTGRES_CONTAINER:-markenmate-postgres}"
POSTGRES_USER="${POSTGRES_USER:-markenmate}"
POSTGRES_DB="${POSTGRES_DB:-markenmate}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup of database '${POSTGRES_DB}'..."

# Create backup using pg_dump inside the container
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup completed successfully!"
    echo "📁 File: ${BACKUP_DIR}/${BACKUP_FILE}"
    echo "📊 Size: ${BACKUP_SIZE}"
    
    # Keep only the last 10 backups
    echo "🧹 Cleaning up old backups (keeping last 10)..."
    ls -t "${BACKUP_DIR}"/backup_*.sql.gz | tail -n +11 | xargs -r rm --
    echo "✅ Cleanup complete!"
else
    echo "❌ Backup failed!"
    exit 1
fi
