#!/bin/bash
# Janapriya Upscale — Backup Status Monitor
# Quick health check of backup system

BACKUP_ROOT="/home/jpuser/backups"

echo "═══════════════════════════════════════════════════════════"
echo "  JANAPRIYA UPSCALE — BACKUP STATUS"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "═══════════════════════════════════════════════════════════"

# ── Cron jobs ──
echo ""
echo "📅 CRON SCHEDULE:"
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" | sed 's/^/   /'

# ── Daily backups ──
echo ""
echo "📦 DAILY BACKUPS ($BACKUP_ROOT/daily/):"
DAILY_COUNT=$(find "$BACKUP_ROOT/daily" -maxdepth 1 -type d -name "backup_*" 2>/dev/null | wc -l)
if [ "$DAILY_COUNT" -eq 0 ]; then
  echo "   (none yet — first daily backup will run at 5:00 AM)"
else
  echo "   Count: $DAILY_COUNT backup(s)"
  echo "   Latest:"
  find "$BACKUP_ROOT/daily" -maxdepth 1 -type d -name "backup_*" -printf '%T@ %p\n' 2>/dev/null | \
    sort -rn | head -3 | while read ts path; do
      size=$(du -sh "$path" 2>/dev/null | cut -f1)
      name=$(basename "$path")
      date_readable=$(date -d @${ts%.*} '+%Y-%m-%d %H:%M')
      echo "     $name ($size) — $date_readable"
    done
  TOTAL_DAILY_SIZE=$(du -sh "$BACKUP_ROOT/daily" 2>/dev/null | cut -f1)
  echo "   Total size: $TOTAL_DAILY_SIZE"
fi

# ── Snapshots ──
echo ""
echo "📸 SNAPSHOTS ($BACKUP_ROOT/snapshots/):"
SNAP_COUNT=$(find "$BACKUP_ROOT/snapshots" -maxdepth 1 -name "snapshot_*.sql.gz" 2>/dev/null | wc -l)
if [ "$SNAP_COUNT" -eq 0 ]; then
  echo "   (none yet — first snapshot will run at next :00/:15/:30/:45)"
else
  echo "   Count: $SNAP_COUNT snapshot(s) (retention: last 24 hours)"
  LATEST=$(find "$BACKUP_ROOT/snapshots" -maxdepth 1 -name "snapshot_*.sql.gz" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1)
  if [ -n "$LATEST" ]; then
    ts=${LATEST%% *}
    path=${LATEST#* }
    size=$(du -h "$path" 2>/dev/null | cut -f1)
    name=$(basename "$path")
    date_readable=$(date -d @${ts%.*} '+%Y-%m-%d %H:%M:%S')
    min_ago=$(( ($(date +%s) - ${ts%.*}) / 60 ))
    echo "   Latest: $name ($size) — $date_readable ($min_ago min ago)"
  fi
  TOTAL_SNAP_SIZE=$(du -sh "$BACKUP_ROOT/snapshots" 2>/dev/null | cut -f1)
  echo "   Total size: $TOTAL_SNAP_SIZE"
fi

# ── Logs ──
echo ""
echo "📝 LOGS ($BACKUP_ROOT/logs/):"
for log in "$BACKUP_ROOT/logs"/*.log; do
  [ -e "$log" ] || continue
  name=$(basename "$log")
  size=$(du -h "$log" | cut -f1)
  lines=$(wc -l < "$log")
  echo "   $name — $size, $lines lines"
done

# ── Recent errors ──
echo ""
echo "⚠️  RECENT ERRORS (last 5):"
ERRORS=$(grep -h "ERROR\|FAILED" "$BACKUP_ROOT/logs"/*.log 2>/dev/null | tail -5)
if [ -z "$ERRORS" ]; then
  echo "   (none — all clean ✓)"
else
  echo "$ERRORS" | sed 's/^/   /'
fi

# ── Disk usage ──
echo ""
echo "💾 DISK USAGE:"
TOTAL_BACKUP_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
echo "   Total backup directory: $TOTAL_BACKUP_SIZE"
df -h "$BACKUP_ROOT" | tail -1 | awk '{print "   Disk:  used " $3 " / " $2 " (" $5 " full)"}'

echo ""
echo "═══════════════════════════════════════════════════════════"
