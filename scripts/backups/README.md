# Backup Scripts

These are **reference copies** of the backup scripts. The live versions run from `/home/jpuser/backups/scripts/`.

## Installation

On a fresh server:

```bash
# Copy scripts to backup location
sudo mkdir -p /home/jpuser/backups/{scripts,daily,snapshots,logs}
sudo cp scripts/backups/*.sh /home/jpuser/backups/scripts/
sudo chown -R jpuser:jpuser /home/jpuser/backups
sudo chmod +x /home/jpuser/backups/scripts/*.sh

# Install cron (run as jpuser, not root)
sudo -u jpuser crontab <<EOF
# Daily full backup at 5 AM (source + DB, 30-day retention)
0 5 * * * /home/jpuser/backups/scripts/daily_backup.sh

# Every 15 min DB snapshot (24-hour rolling retention)
*/15 * * * * /home/jpuser/backups/scripts/snapshot_backup.sh
EOF

# Verify cron
sudo -u jpuser crontab -l
```

## Scripts

| Script | Purpose | Schedule |
|--------|---------|----------|
| `daily_backup.sh` | Full source tar + DB dump + git state | Daily 5 AM |
| `snapshot_backup.sh` | Compressed DB dump only | Every 15 min |
| `status.sh` | CLI health check | Manual |

## Logs

- `/home/jpuser/backups/logs/daily.log` — full daily backup output
- `/home/jpuser/backups/logs/snapshot.log` — every snapshot run (rotated at 500 lines)

## Admin UI

Monitor and trigger backups at: `/admin/backups` in the admin panel.
