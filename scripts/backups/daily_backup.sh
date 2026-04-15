#!/bin/bash
# Janapriya Upscale — Daily Full Backup
# Runs: Every day at 5:00 AM via cron
# Retention: 30 days

set -e  # Exit on error

# ── Config ────────────────────────────────────────────────────────────────
PROJECT_DIR="/home/jpuser/projects/janapriyaupscale"
BACKUP_ROOT="/home/jpuser/backups/daily"
LOG_FILE="/home/jpuser/backups/logs/daily.log"
DB_CONTAINER="jpus_postgres"
DB_USER="janapriya_user"
DB_NAME="janapriya_db"
RETENTION_DAYS=30

TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/backup_$TS"

# ── Logging ───────────────────────────────────────────────────────────────
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Starting daily backup → $BACKUP_DIR"

# ── Prepare ───────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── 1. Database dump ──────────────────────────────────────────────────────
log "[1/4] Dumping database..."
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/db_dump.sql" 2>> "$LOG_FILE"; then
  DB_SIZE=$(du -h "$BACKUP_DIR/db_dump.sql" | cut -f1)
  log "  ✓ Database dumped ($DB_SIZE)"
else
  log "  ✗ Database dump FAILED"
  exit 1
fi

# ── 2. Source tarball (excluding heavy/regeneratable dirs) ────────────────
log "[2/4] Creating source tarball..."
cd "$(dirname "$PROJECT_DIR")"
tar -czf "$BACKUP_DIR/source.tar.gz" \
  --exclude="$(basename "$PROJECT_DIR")/frontend/node_modules" \
  --exclude="$(basename "$PROJECT_DIR")/frontend/.next" \
  --exclude="$(basename "$PROJECT_DIR")/.venv" \
  --exclude="$(basename "$PROJECT_DIR")/backend/.venv" \
  --exclude="$(basename "$PROJECT_DIR")/.git" \
  --exclude="*/__pycache__" \
  --exclude="*.pyc" \
  "$(basename "$PROJECT_DIR")" 2>> "$LOG_FILE"
SRC_SIZE=$(du -h "$BACKUP_DIR/source.tar.gz" | cut -f1)
log "  ✓ Source archived ($SRC_SIZE)"

# ── 3. Git metadata ───────────────────────────────────────────────────────
log "[3/4] Saving git state..."
cd "$PROJECT_DIR"
git log -20 --oneline > "$BACKUP_DIR/git_log.txt" 2>&1 || true
git rev-parse HEAD > "$BACKUP_DIR/git_head.txt" 2>&1 || true
git status > "$BACKUP_DIR/git_status.txt" 2>&1 || true
HEAD_HASH=$(cat "$BACKUP_DIR/git_head.txt")
log "  ✓ Git HEAD: $HEAD_HASH"

# ── 4. Retention: delete backups older than N days ────────────────────────
log "[4/4] Cleaning old backups (retention: $RETENTION_DAYS days)..."
DELETED=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" -mtime +$RETENTION_DAYS -print -exec rm -rf {} \; 2>/dev/null | wc -l)
log "  ✓ Deleted $DELETED old backup(s)"

# ── Summary ───────────────────────────────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
KEPT_COUNT=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "backup_*" | wc -l)
log "Daily backup complete: $TOTAL_SIZE"
log "Total daily backups retained: $KEPT_COUNT"
log "=========================================="
