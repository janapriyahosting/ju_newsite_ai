"""
Admin Backups Router — Monitor backup system status, recent backups, and trigger manual runs.
"""
import os
import shutil
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from backend.app.api.v1.routers.admin_auth import verify_admin_token

router = APIRouter(prefix="/admin/backups", tags=["Admin Backups"])

# Config
BACKUP_ROOT = Path("/home/jpuser/backups")
DAILY_DIR = BACKUP_ROOT / "daily"
SNAPSHOTS_DIR = BACKUP_ROOT / "snapshots"
LOGS_DIR = BACKUP_ROOT / "logs"
SCRIPTS_DIR = BACKUP_ROOT / "scripts"


# ── Response schemas ──────────────────────────────────────────────────────────

class BackupFile(BaseModel):
    name: str
    path: str
    size_bytes: int
    size_human: str
    created_at: str         # ISO 8601
    age_seconds: int
    age_human: str


class CronJob(BaseModel):
    schedule: str
    command: str
    description: str


class DiskUsage(BaseModel):
    total_gb: float
    used_gb: float
    free_gb: float
    percent_used: float
    backup_size_human: str


class BackupStatus(BaseModel):
    cron_jobs: List[CronJob]
    daily_backups: List[BackupFile]
    snapshots: List[BackupFile]
    daily_count: int
    snapshot_count: int
    daily_total_size_human: str
    snapshot_total_size_human: str
    recent_errors: List[str]
    disk: DiskUsage
    system_healthy: bool
    last_daily_at: Optional[str]
    last_snapshot_at: Optional[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _human_size(n: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024
    return f"{n:.1f} PB"


def _human_age(seconds: int) -> str:
    if seconds < 60: return f"{seconds}s ago"
    m = seconds // 60
    if m < 60: return f"{m}m ago"
    h = m // 60
    if h < 24: return f"{h}h {m % 60}m ago"
    d = h // 24
    return f"{d}d {h % 24}h ago"


def _folder_size(path: Path) -> int:
    try:
        result = subprocess.run(
            ["du", "-sb", str(path)],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            return int(result.stdout.split()[0])
    except Exception:
        pass
    total = 0
    try:
        for p in path.rglob("*"):
            if p.is_file():
                total += p.stat().st_size
    except Exception:
        pass
    return total


def _list_backups(root: Path, pattern: str, limit: int = 20) -> List[BackupFile]:
    if not root.exists():
        return []
    items = []
    now = time.time()
    for entry in sorted(root.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        try:
            stat = entry.stat()
            if entry.is_dir():
                size = _folder_size(entry)
            else:
                size = stat.st_size
            age = int(now - stat.st_mtime)
            items.append(BackupFile(
                name=entry.name,
                path=str(entry),
                size_bytes=size,
                size_human=_human_size(size),
                created_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
                age_seconds=age,
                age_human=_human_age(age),
            ))
        except Exception:
            continue
    return items


def _read_cron() -> List[CronJob]:
    try:
        result = subprocess.run(
            ["crontab", "-l"], capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return []
    except Exception:
        return []

    jobs = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 5)
        if len(parts) < 6:
            continue
        schedule = " ".join(parts[:5])
        command = parts[5]
        # Describe the schedule
        if "daily_backup.sh" in command:
            desc = "Daily full backup (source + database)"
        elif "snapshot_backup.sh" in command:
            desc = "Database snapshot (every 15 min, 24h retention)"
        else:
            desc = command
        jobs.append(CronJob(schedule=schedule, command=command, description=desc))
    return jobs


def _recent_errors(limit: int = 10) -> List[str]:
    if not LOGS_DIR.exists():
        return []
    errors = []
    for log_file in LOGS_DIR.glob("*.log"):
        try:
            with open(log_file, "r", errors="ignore") as f:
                for line in f:
                    if "ERROR" in line or "FAILED" in line:
                        errors.append(f"[{log_file.name}] {line.strip()}")
        except Exception:
            continue
    # Last N errors (most recent last in file → take tail)
    return errors[-limit:]


def _disk_usage() -> DiskUsage:
    try:
        total, used, free = shutil.disk_usage(str(BACKUP_ROOT))
        backup_size = _folder_size(BACKUP_ROOT)
        return DiskUsage(
            total_gb=round(total / (1024**3), 2),
            used_gb=round(used / (1024**3), 2),
            free_gb=round(free / (1024**3), 2),
            percent_used=round((used / total) * 100, 1),
            backup_size_human=_human_size(backup_size),
        )
    except Exception:
        return DiskUsage(total_gb=0, used_gb=0, free_gb=0, percent_used=0, backup_size_human="unknown")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status", response_model=BackupStatus)
async def get_backup_status(_: dict = Depends(verify_admin_token)):
    """Get overall backup system status — schedules, recent backups, errors, disk usage."""
    cron_jobs = _read_cron()
    daily = _list_backups(DAILY_DIR, "backup_*", limit=30)
    snapshots = _list_backups(SNAPSHOTS_DIR, "snapshot_*.sql.gz", limit=96)
    recent_errors = _recent_errors(limit=10)
    disk = _disk_usage()

    daily_total = sum(d.size_bytes for d in daily)
    snapshot_total = sum(s.size_bytes for s in snapshots)

    # Health check: at least 1 daily backup AND at least 1 snapshot within 20 min
    system_healthy = True
    if not daily:
        system_healthy = False
    if snapshots and snapshots[0].age_seconds > 20 * 60:
        system_healthy = False
    if len(recent_errors) > 0:
        system_healthy = False

    return BackupStatus(
        cron_jobs=cron_jobs,
        daily_backups=daily,
        snapshots=snapshots,
        daily_count=len(daily),
        snapshot_count=len(snapshots),
        daily_total_size_human=_human_size(daily_total),
        snapshot_total_size_human=_human_size(snapshot_total),
        recent_errors=recent_errors,
        disk=disk,
        system_healthy=system_healthy,
        last_daily_at=daily[0].created_at if daily else None,
        last_snapshot_at=snapshots[0].created_at if snapshots else None,
    )


@router.get("/logs/{log_name}")
async def get_log_tail(log_name: str, lines: int = 50, _: dict = Depends(verify_admin_token)):
    """Tail a backup log file (daily.log or snapshot.log)."""
    if log_name not in ("daily.log", "snapshot.log"):
        raise HTTPException(400, "Invalid log name")
    log_path = LOGS_DIR / log_name
    if not log_path.exists():
        return {"log": log_name, "lines": [], "message": "Log file not found (no runs yet)"}
    try:
        result = subprocess.run(
            ["tail", "-n", str(min(lines, 500)), str(log_path)],
            capture_output=True, text=True, timeout=5,
        )
        return {
            "log": log_name,
            "lines": result.stdout.splitlines(),
            "total_size": log_path.stat().st_size,
        }
    except Exception as e:
        raise HTTPException(500, f"Error reading log: {e}")


def _run_script_background(script_name: str) -> None:
    """Run a backup script in the background."""
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        return
    try:
        subprocess.Popen(
            ["bash", str(script_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except Exception:
        pass


@router.post("/run/daily")
async def trigger_daily_backup(
    background_tasks: BackgroundTasks,
    _: dict = Depends(verify_admin_token),
):
    """Trigger a daily backup manually (runs in background)."""
    script = SCRIPTS_DIR / "daily_backup.sh"
    if not script.exists():
        raise HTTPException(404, "Daily backup script not found")
    background_tasks.add_task(_run_script_background, "daily_backup.sh")
    return {"detail": "Daily backup started in background. Check status in ~1 minute."}


@router.post("/run/snapshot")
async def trigger_snapshot(
    background_tasks: BackgroundTasks,
    _: dict = Depends(verify_admin_token),
):
    """Trigger a snapshot backup manually."""
    script = SCRIPTS_DIR / "snapshot_backup.sh"
    if not script.exists():
        raise HTTPException(404, "Snapshot script not found")
    background_tasks.add_task(_run_script_background, "snapshot_backup.sh")
    return {"detail": "Snapshot backup started in background. Check status in ~5 seconds."}
