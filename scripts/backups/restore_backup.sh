#!/bin/bash
# Janapriya Upscale — Database Restore
# Usage: restore_backup.sh <source_file>
#   source_file: absolute path to .sql or .sql.gz file
#
# Safety:
#   - Creates a pre-restore snapshot FIRST (rollback option)
#   - Drops and recreates the target database
#   - Logs every step
set -u  # error on unset variable

SOURCE="${1:-}"
LOG_FILE="/home/jpuser/backups/logs/restore.log"
DB_CONTAINER="jpus_postgres"
DB_USER="janapriya_user"
DB_NAME="janapriya_db"
PRE_RESTORE_DIR="/home/jpuser/backups/pre_restore"

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$PRE_RESTORE_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ── Validate input ────────────────────────────────────────────────────────
if [ -z "$SOURCE" ]; then
  log "ERROR: no source file specified. Usage: $0 <file>"
  exit 1
fi

if [ ! -f "$SOURCE" ]; then
  log "ERROR: source file not found: $SOURCE"
  exit 1
fi

# Guardrail: only allow files under /home/jpuser/backups/
case "$SOURCE" in
  /home/jpuser/backups/*) ;;
  *)
    log "ERROR: refusing to restore from path outside /home/jpuser/backups/: $SOURCE"
    exit 1
    ;;
esac

log "=========================================="
log "RESTORE starting from: $SOURCE"

# ── 1. Create a safety snapshot of current state ──────────────────────────
SAFETY_TS=$(date +%Y%m%d_%H%M%S)
SAFETY_FILE="$PRE_RESTORE_DIR/pre_restore_$SAFETY_TS.sql.gz"
log "[1/4] Creating pre-restore safety backup..."
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$SAFETY_FILE"; then
  SAFE_SIZE=$(du -h "$SAFETY_FILE" | cut -f1)
  log "  ✓ Safety backup: $SAFETY_FILE ($SAFE_SIZE)"
else
  log "  ✗ Safety backup FAILED — aborting restore"
  rm -f "$SAFETY_FILE"
  exit 1
fi

# ── 2. Drop existing connections + drop/recreate DB ───────────────────────
log "[2/4] Terminating existing connections + recreating database..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid<>pg_backend_pid()" \
  >> "$LOG_FILE" 2>&1

docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME" >> "$LOG_FILE" 2>&1
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME" >> "$LOG_FILE" 2>&1
log "  ✓ Database reset"

# ── 3. Restore from source ────────────────────────────────────────────────
log "[3/4] Restoring from source..."
START_TIME=$(date +%s)

case "$SOURCE" in
  *.sql.gz)
    gunzip -c "$SOURCE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1
    RC=$?
    ;;
  *.sql)
    cat "$SOURCE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" >> "$LOG_FILE" 2>&1
    RC=$?
    ;;
  *)
    log "  ✗ Unsupported file format: $SOURCE"
    exit 1
    ;;
esac

ELAPSED=$(($(date +%s) - START_TIME))

if [ "$RC" -ne 0 ]; then
  log "  ✗ Restore FAILED (rc=$RC) — database may be in inconsistent state"
  log "  → Rollback: $0 $SAFETY_FILE"
  exit 1
fi
log "  ✓ Restored in ${ELAPSED}s"

# ── 4. Verify + cleanup ───────────────────────────────────────────────────
log "[4/4] Verifying..."
TABLE_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' ')
log "  ✓ $TABLE_COUNT tables restored"

# Retain only last 10 pre-restore backups
find "$PRE_RESTORE_DIR" -name "pre_restore_*.sql.gz" -type f -printf '%T@ %p\n' | \
  sort -rn | awk 'NR>10 {print $2}' | xargs -r rm -f

log "RESTORE complete from: $(basename "$SOURCE")"
log "Safety backup kept at: $SAFETY_FILE"
log "=========================================="
