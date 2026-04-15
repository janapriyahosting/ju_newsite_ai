#!/bin/bash
# Janapriya Upscale — 15-Minute Database Snapshot
# Runs: Every 15 minutes via cron (*/15 * * * *)
# Retention: 24 hours (96 snapshots) — rolling

# Config
BACKUP_ROOT="/home/jpuser/backups/snapshots"
LOG_FILE="/home/jpuser/backups/logs/snapshot.log"
DB_CONTAINER="jpus_postgres"
DB_USER="janapriya_user"
DB_NAME="janapriya_db"
RETENTION_MINUTES=1440   # 24 hours × 60
MAX_LOG_LINES=500        # Rotate log — keep last 500 lines (~5 days of runs)

TS=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="$BACKUP_ROOT/snapshot_$TS.sql.gz"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

mkdir -p "$BACKUP_ROOT"
mkdir -p "$(dirname "$LOG_FILE")"

# Dump + compress inline
START_TIME=$(date +%s)
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$SNAPSHOT_FILE"; then
  ELAPSED=$(($(date +%s) - START_TIME))
  SIZE=$(du -h "$SNAPSHOT_FILE" | cut -f1)
  log "OK snapshot_$TS.sql.gz ($SIZE, ${ELAPSED}s)"
else
  log "ERROR snapshot_$TS FAILED — pg_dump returned error"
  rm -f "$SNAPSHOT_FILE"  # Remove empty/partial file
  exit 1
fi

# Retention: delete snapshots older than 24 hours
DELETED=$(find "$BACKUP_ROOT" -maxdepth 1 -name "snapshot_*.sql.gz" -mmin +$RETENTION_MINUTES -print -delete 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "Retention: deleted $DELETED old snapshot(s) (>24h)"
fi

# Log rotation — keep only last MAX_LOG_LINES lines
if [ -f "$LOG_FILE" ]; then
  LINE_COUNT=$(wc -l < "$LOG_FILE")
  if [ "$LINE_COUNT" -gt "$MAX_LOG_LINES" ]; then
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
  fi
fi
