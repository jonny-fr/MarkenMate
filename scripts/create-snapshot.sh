#!/bin/bash
# PostgreSQL Snapshot Script
# Creates a named snapshot of the current database state

set -e

# Load environment variables
source .env 2>/dev/null || true

# Configuration
CONTAINER_NAME="${POSTGRES_CONTAINER:-markenmate-postgres}"
POSTGRES_USER="${POSTGRES_USER:-markenmate}"
POSTGRES_DB="${POSTGRES_DB:-markenmate}"
SNAPSHOT_DIR="./snapshots"

# Check if snapshot name is provided
if [ -z "$1" ]; then
    echo "❌ Error: No snapshot name specified"
    echo ""
    echo "Usage: $0 <snapshot_name>"
    echo ""
    echo "Example: $0 before-migration"
    exit 1
fi

SNAPSHOT_NAME="$1"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_FILE="snapshot_${SNAPSHOT_NAME}_${TIMESTAMP}.sql.gz"

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

echo "📸 Creating snapshot '${SNAPSHOT_NAME}'..."

# Create snapshot using pg_dump inside the container
docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"

if [ $? -eq 0 ]; then
    SNAPSHOT_SIZE=$(du -h "${SNAPSHOT_DIR}/${SNAPSHOT_FILE}" | cut -f1)
    echo "✅ Snapshot created successfully!"
    echo "📁 File: ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
    echo "📊 Size: ${SNAPSHOT_SIZE}"
    echo ""
    echo "To restore this snapshot, run:"
    echo "  ./scripts/restore.sh ${SNAPSHOT_DIR}/${SNAPSHOT_FILE}"
else
    echo "❌ Snapshot creation failed!"
    exit 1
fi
