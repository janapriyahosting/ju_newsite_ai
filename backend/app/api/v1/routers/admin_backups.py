"""
Admin Backups Router — Monitor backup system status, recent backups, manual runs,
schedule management, download, and restore.
"""
import os
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from backend.app.api.v1.routers.admin_auth import verify_admin_token

router = APIRouter(prefix="/admin/backups", tags=["Admin Backups"])

# Config
BACKUP_ROOT = Path("/home/jpuser/backups")
DAILY_DIR = BACKUP_ROOT / "daily"
SNAPSHOTS_DIR = BACKUP_ROOT / "snapshots"
LOGS_DIR = BACKUP_ROOT / "logs"
SCRIPTS_DIR = BACKUP_ROOT / "scripts"
PRE_RESTORE_DIR = BACKUP_ROOT / "pre_restore"

# Owner of the crontab that holds the backup schedules.
# The API typically runs as root (pm2), but the backup jobs live in jpuser's
# crontab so the scripts execute as jpuser with the right file ownership.
# Overridable via env var in case the deployment user differs.
CRON_USER = os.environ.get("BACKUP_CRON_USER", "jpuser")


def _crontab_cmd(*extra: str) -> list:
    """Build a `crontab` invocation that targets CRON_USER when possible.
    Falls back to the current user's crontab if -u isn't permitted
    (e.g. backend not running as root)."""
    # When already running as CRON_USER, -u is unnecessary (and some systems
    # disallow `crontab -u <self>` unless root).
    try:
        import pwd
        current_user = pwd.getpwuid(os.geteuid()).pw_name
    except Exception:
        current_user = ""
    if current_user and current_user != CRON_USER:
        return ["crontab", "-u", CRON_USER, *extra]
    return ["crontab", *extra]


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
            _crontab_cmd("-l"), capture_output=True, text=True, timeout=5,
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
    """Tail a backup log file (daily.log / snapshot.log / restore.log)."""
    if log_name not in ("daily.log", "snapshot.log", "restore.log"):
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


# ══════════════════════════════════════════════════════════════════════════════
# Schedule Management (CRON CRUD)
# ══════════════════════════════════════════════════════════════════════════════

CRON_MARKER_START = "# BEGIN_ADMIN_MANAGED_BACKUPS"
CRON_MARKER_END = "# END_ADMIN_MANAGED_BACKUPS"

# Only allow scripts from our SCRIPTS_DIR — can't add arbitrary commands
ALLOWED_SCRIPTS = {
    "daily_backup.sh", "snapshot_backup.sh", "restore_backup.sh",
}

# Cron expression validation — basic sanity check
CRON_RE = re.compile(r'^(\S+\s+){4}\S+$')


class Schedule(BaseModel):
    id: str                     # unique id (hash of schedule+command)
    schedule: str               # cron expression
    script: str                 # script filename (basename)
    description: str = ""
    enabled: bool = True
    managed: bool = True        # True if managed by admin (inside markers)


class ScheduleCreate(BaseModel):
    schedule: str = Field(..., description="Cron expression e.g. '0 5 * * *'")
    script: str = Field(..., description="Script filename in /home/jpuser/backups/scripts/")
    description: str = ""

    def validate_fields(self) -> None:
        if not CRON_RE.match(self.schedule.strip()):
            raise HTTPException(400, f"Invalid cron expression: '{self.schedule}'. Expected 5 fields.")
        if self.script not in ALLOWED_SCRIPTS:
            raise HTTPException(400, f"Script must be one of: {', '.join(sorted(ALLOWED_SCRIPTS))}")


class ScheduleUpdate(BaseModel):
    schedule: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


def _read_crontab_raw() -> str:
    result = subprocess.run(_crontab_cmd("-l"), capture_output=True, text=True, timeout=5)
    if result.returncode != 0 and "no crontab" not in result.stderr.lower():
        return ""
    return result.stdout


def _write_crontab_raw(content: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".cron") as tf:
        tf.write(content)
        tf_path = tf.name
    try:
        result = subprocess.run(_crontab_cmd(tf_path), capture_output=True, text=True, timeout=5)
        if result.returncode != 0:
            raise HTTPException(500, f"Failed to write crontab: {result.stderr}")
    finally:
        os.unlink(tf_path)


def _schedule_id(schedule: str, script: str) -> str:
    """Deterministic ID from schedule expression + script basename."""
    import hashlib
    # Always use just the script basename for consistency across create/parse
    script_name = os.path.basename(script)
    return hashlib.sha1(f"{schedule}|{script_name}".encode()).hexdigest()[:12]


def _parse_schedules() -> List[Schedule]:
    """Parse crontab into structured schedules."""
    raw = _read_crontab_raw()
    schedules = []
    in_managed_block = False
    last_desc = ""

    for line in raw.splitlines():
        stripped = line.strip()

        if stripped == CRON_MARKER_START:
            in_managed_block = True
            continue
        if stripped == CRON_MARKER_END:
            in_managed_block = False
            continue

        if not stripped:
            last_desc = ""
            continue

        if stripped.startswith("#"):
            # Comment — capture as description for next line (if managed block)
            last_desc = stripped.lstrip("# ").strip()
            continue

        # Cron entry — 5 fields + command
        parts = stripped.split(None, 5)
        if len(parts) < 6:
            continue

        schedule = " ".join(parts[:5])
        command = parts[5]

        # Check if it's a backup script
        script = None
        for s in ALLOWED_SCRIPTS:
            if s in command:
                script = s
                break
        if not script:
            continue  # Skip non-backup cron jobs

        # Determine enabled status (commented out line starts with #)
        enabled = not stripped.startswith("#")

        schedules.append(Schedule(
            id=_schedule_id(schedule, script),
            schedule=schedule,
            script=script,
            description=last_desc,
            enabled=enabled,
            managed=in_managed_block,
        ))
        last_desc = ""

    return schedules


def _render_crontab(schedules: List[Schedule]) -> str:
    """Render schedules + preserve non-backup cron entries."""
    raw = _read_crontab_raw()

    # Collect non-backup lines (outside our management)
    preserved_lines = []
    in_managed_block = False
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped == CRON_MARKER_START:
            in_managed_block = True
            continue
        if stripped == CRON_MARKER_END:
            in_managed_block = False
            continue
        if in_managed_block:
            continue
        # Also skip backup-related lines outside markers (legacy)
        if any(s in line for s in ALLOWED_SCRIPTS):
            continue
        preserved_lines.append(line)

    # Build managed block
    managed = [CRON_MARKER_START]
    for sch in schedules:
        if sch.description:
            managed.append(f"# {sch.description}")
        cmd = f"{sch.schedule} /home/jpuser/backups/scripts/{sch.script}"
        if not sch.enabled:
            cmd = "# " + cmd
        managed.append(cmd)
    managed.append(CRON_MARKER_END)

    output = "\n".join(preserved_lines).rstrip() + "\n\n" + "\n".join(managed) + "\n"
    return output


@router.get("/schedules", response_model=List[Schedule])
async def list_schedules(_: dict = Depends(verify_admin_token)):
    """List all backup cron schedules."""
    return _parse_schedules()


@router.post("/schedules", response_model=Schedule, status_code=201)
async def create_schedule(data: ScheduleCreate, _: dict = Depends(verify_admin_token)):
    """Create a new backup cron schedule."""
    data.validate_fields()

    schedules = _parse_schedules()
    new_sch = Schedule(
        id=_schedule_id(data.schedule, data.script),
        schedule=data.schedule,
        script=data.script,
        description=data.description,
        enabled=True,
        managed=True,
    )

    # Check for duplicate
    if any(s.id == new_sch.id for s in schedules):
        raise HTTPException(409, "A schedule with the same expression and script already exists")

    schedules.append(new_sch)
    _write_crontab_raw(_render_crontab(schedules))
    return new_sch


@router.patch("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(schedule_id: str, data: ScheduleUpdate, _: dict = Depends(verify_admin_token)):
    """Update an existing backup schedule."""
    schedules = _parse_schedules()
    target = next((s for s in schedules if s.id == schedule_id), None)
    if not target:
        raise HTTPException(404, "Schedule not found")

    if data.schedule is not None:
        if not CRON_RE.match(data.schedule.strip()):
            raise HTTPException(400, "Invalid cron expression")
        target.schedule = data.schedule
    if data.description is not None:
        target.description = data.description
    if data.enabled is not None:
        target.enabled = data.enabled

    # Regenerate id since schedule may have changed
    target.id = _schedule_id(target.schedule, target.script)

    _write_crontab_raw(_render_crontab(schedules))
    return target


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: str, _: dict = Depends(verify_admin_token)):
    """Delete a backup schedule."""
    schedules = _parse_schedules()
    new_list = [s for s in schedules if s.id != schedule_id]
    if len(new_list) == len(schedules):
        raise HTTPException(404, "Schedule not found")

    _write_crontab_raw(_render_crontab(new_list))


# ══════════════════════════════════════════════════════════════════════════════
# Download Backup Files
# ══════════════════════════════════════════════════════════════════════════════

def _safe_resolve(requested: str, allowed_roots: List[Path]) -> Path:
    """Resolve path and ensure it stays inside allowed roots."""
    p = Path(requested).resolve()
    for root in allowed_roots:
        try:
            p.relative_to(root.resolve())
            if p.exists():
                return p
        except ValueError:
            continue
    raise HTTPException(404, "File not found or not accessible")


@router.get("/download/snapshot/{filename}")
async def download_snapshot(filename: str, _: dict = Depends(verify_admin_token)):
    """Download a snapshot file by name."""
    if not re.match(r'^snapshot_\d{8}_\d{6}\.sql\.gz$', filename):
        raise HTTPException(400, "Invalid snapshot filename")
    path = SNAPSHOTS_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Snapshot not found")
    return FileResponse(
        path, media_type="application/gzip",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/download/daily/{backup_name}/{file_type}")
async def download_daily(backup_name: str, file_type: str, _: dict = Depends(verify_admin_token)):
    """Download a file from a daily backup (file_type: db | source)."""
    if not re.match(r'^backup_\d{8}_\d{6}$', backup_name):
        raise HTTPException(400, "Invalid backup name")
    if file_type not in ("db", "source"):
        raise HTTPException(400, "file_type must be 'db' or 'source'")

    backup_dir = DAILY_DIR / backup_name
    if not backup_dir.exists():
        raise HTTPException(404, "Backup not found")

    if file_type == "db":
        path = backup_dir / "db_dump.sql"
        media = "application/sql"
        download_name = f"{backup_name}_db_dump.sql"
    else:
        path = backup_dir / "source.tar.gz"
        media = "application/gzip"
        download_name = f"{backup_name}_source.tar.gz"

    if not path.exists():
        raise HTTPException(404, f"{file_type} file not in this backup")

    return FileResponse(
        path, media_type=media,
        filename=download_name,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )


# ══════════════════════════════════════════════════════════════════════════════
# Restore from Backup
# ══════════════════════════════════════════════════════════════════════════════

class RestoreRequest(BaseModel):
    source_type: str = Field(..., description="'snapshot' or 'daily'")
    source_name: str = Field(..., description="Filename (snapshot) or backup folder (daily)")
    confirmation: str = Field(..., description="Must be 'RESTORE' to confirm")


def _run_restore_background(source_path: str) -> None:
    """Run restore script in background."""
    script_path = SCRIPTS_DIR / "restore_backup.sh"
    try:
        subprocess.Popen(
            ["bash", str(script_path), source_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except Exception:
        pass


@router.post("/restore")
async def restore_backup(
    data: RestoreRequest,
    background_tasks: BackgroundTasks,
    _: dict = Depends(verify_admin_token),
):
    """
    Restore database from a backup. DESTRUCTIVE — replaces current DB.
    A safety snapshot is auto-taken before the restore.
    """
    if data.confirmation != "RESTORE":
        raise HTTPException(400, "Confirmation text must be 'RESTORE' exactly")

    if data.source_type == "snapshot":
        if not re.match(r'^snapshot_\d{8}_\d{6}\.sql\.gz$', data.source_name):
            raise HTTPException(400, "Invalid snapshot filename")
        source_path = SNAPSHOTS_DIR / data.source_name
    elif data.source_type == "daily":
        if not re.match(r'^backup_\d{8}_\d{6}$', data.source_name):
            raise HTTPException(400, "Invalid daily backup name")
        source_path = DAILY_DIR / data.source_name / "db_dump.sql"
    else:
        raise HTTPException(400, "source_type must be 'snapshot' or 'daily'")

    if not source_path.exists():
        raise HTTPException(404, f"Source file not found: {source_path}")

    script = SCRIPTS_DIR / "restore_backup.sh"
    if not script.exists():
        raise HTTPException(500, "Restore script not installed")

    background_tasks.add_task(_run_restore_background, str(source_path))

    return {
        "detail": f"Restore started from {data.source_name}. Safety backup being taken automatically.",
        "source_path": str(source_path),
        "estimated_time_seconds": 30,
        "log_endpoint": "/admin/backups/logs/restore.log",
    }


@router.get("/pre-restore-backups")
async def list_pre_restore_backups(_: dict = Depends(verify_admin_token)):
    """List auto-safety backups taken before restores (last 10)."""
    return _list_backups(PRE_RESTORE_DIR, "pre_restore_*.sql.gz", limit=10)


# ══════════════════════════════════════════════════════════════════════════════
# Source File Browser + Restore (from daily backup tarball)
# ══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path("/home/jpuser/projects/janapriyaupscale")
STAGING_ROOT = Path("/tmp/source_stage")

# Project subpath used inside source.tar.gz — the tarball starts with this top folder
TAR_TOP_DIR = "janapriyaupscale"

# File extensions OK to preview as text
PREVIEWABLE_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".yaml", ".yml",
    ".toml", ".ini", ".sh", ".env", ".html", ".css", ".scss", ".sql", ".conf",
    ".gitignore", ".dockerignore", ".editorconfig",
}
PREVIEW_MAX_BYTES = 500_000   # 500KB text preview cap


class TreeEntry(BaseModel):
    name: str
    path: str           # relative to project root
    type: str           # "file" or "dir"
    size: int = 0
    size_human: str = ""


def _stage_dir_for(backup_name: str) -> Path:
    return STAGING_ROOT / backup_name


def _ensure_staged(backup_name: str) -> Path:
    """Extract source.tar.gz to staging dir if not already there. Returns the project subdir."""
    if not re.match(r'^backup_\d{8}_\d{6}$', backup_name):
        raise HTTPException(400, "Invalid backup name")

    tarball = DAILY_DIR / backup_name / "source.tar.gz"
    if not tarball.exists():
        raise HTTPException(404, f"No source.tar.gz in {backup_name}")

    stage = _stage_dir_for(backup_name)
    marker = stage / ".extracted"

    if marker.exists():
        return stage / TAR_TOP_DIR

    stage.mkdir(parents=True, exist_ok=True)
    # Extract
    result = subprocess.run(
        ["tar", "-xzf", str(tarball), "-C", str(stage)],
        capture_output=True, text=True, timeout=300,
    )
    if result.returncode != 0:
        raise HTTPException(500, f"Extraction failed: {result.stderr[:500]}")
    marker.touch()
    return stage / TAR_TOP_DIR


def _safe_join(base: Path, relpath: str) -> Path:
    """Join base + relpath and ensure result is still inside base."""
    # Normalize: strip leading slashes, reject .. traversal after resolve
    rel = relpath.lstrip("/").replace("\\", "/")
    target = (base / rel).resolve()
    base_resolved = base.resolve()
    if not str(target).startswith(str(base_resolved)):
        raise HTTPException(400, "Invalid path (outside allowed root)")
    return target


@router.post("/daily/{backup_name}/source/extract")
async def extract_source(backup_name: str, _: dict = Depends(verify_admin_token)):
    """Extract the daily backup's source.tar.gz to a staging directory for browsing."""
    stage_project = _ensure_staged(backup_name)
    total_size = _folder_size(stage_project)
    return {
        "backup": backup_name,
        "stage_path": str(stage_project),
        "size_bytes": total_size,
        "size_human": _human_size(total_size),
        "ready": True,
    }


@router.get("/daily/{backup_name}/source/tree", response_model=List[TreeEntry])
async def list_source_tree(
    backup_name: str,
    path: str = "",
    _: dict = Depends(verify_admin_token),
):
    """List contents of a directory within the staged source."""
    stage_project = _ensure_staged(backup_name)
    target = _safe_join(stage_project, path) if path else stage_project

    if not target.exists():
        raise HTTPException(404, f"Path not found: {path}")
    if not target.is_dir():
        raise HTTPException(400, f"Path is not a directory: {path}")

    entries: List[TreeEntry] = []
    for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        # Skip hidden bookkeeping
        if child.name == ".extracted":
            continue
        rel_path = str(child.relative_to(stage_project))
        try:
            size = child.stat().st_size if child.is_file() else 0
        except Exception:
            size = 0
        entries.append(TreeEntry(
            name=child.name,
            path=rel_path,
            type="dir" if child.is_dir() else "file",
            size=size,
            size_human=_human_size(size) if size else "",
        ))
    return entries


@router.get("/daily/{backup_name}/source/file")
async def get_source_file(
    backup_name: str,
    path: str,
    preview: bool = False,
    _: dict = Depends(verify_admin_token),
):
    """Download a file from the staged source, or preview if text and small."""
    stage_project = _ensure_staged(backup_name)
    target = _safe_join(stage_project, path)

    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    if preview:
        ext = target.suffix.lower()
        size = target.stat().st_size
        if ext not in PREVIEWABLE_EXTS and target.name not in {".gitignore", ".dockerignore"}:
            return {"preview": False, "reason": "Not a text file", "size": size}
        if size > PREVIEW_MAX_BYTES:
            return {"preview": False, "reason": f"File too large ({_human_size(size)} > {_human_size(PREVIEW_MAX_BYTES)})", "size": size}
        try:
            content = target.read_text(encoding="utf-8", errors="replace")
            return {"preview": True, "content": content, "size": size, "path": path}
        except Exception as e:
            return {"preview": False, "reason": str(e), "size": size}

    return FileResponse(
        target, filename=target.name,
        headers={"Content-Disposition": f'attachment; filename="{target.name}"'},
    )


class RestoreFileRequest(BaseModel):
    path: str = Field(..., description="Relative path within the project (e.g. 'frontend/src/app/page.tsx')")
    confirmation: str = Field(..., description="Must be 'RESTORE_FILE' to confirm")


@router.post("/daily/{backup_name}/source/restore-file")
async def restore_source_file(
    backup_name: str,
    data: RestoreFileRequest,
    _: dict = Depends(verify_admin_token),
):
    """
    Restore a single file from a daily backup to the live project.
    If the file currently exists, a timestamped .bak copy is saved first.
    """
    if data.confirmation != "RESTORE_FILE":
        raise HTTPException(400, "Confirmation must be 'RESTORE_FILE' exactly")

    stage_project = _ensure_staged(backup_name)
    source_file = _safe_join(stage_project, data.path)
    if not source_file.exists() or not source_file.is_file():
        raise HTTPException(404, f"File not in backup: {data.path}")

    target_file = _safe_join(PROJECT_ROOT, data.path)
    target_file.parent.mkdir(parents=True, exist_ok=True)

    # Safety: keep a .bak of the current file if it exists
    bak_path: Optional[Path] = None
    if target_file.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        bak_path = target_file.with_suffix(target_file.suffix + f".{ts}.bak")
        try:
            shutil.copy2(target_file, bak_path)
        except Exception as e:
            raise HTTPException(500, f"Could not create .bak safety copy: {e}")

    try:
        shutil.copy2(source_file, target_file)
    except Exception as e:
        raise HTTPException(500, f"Restore failed: {e}")

    # Log the action
    log_path = LOGS_DIR / "restore.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "a") as f:
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        bak_note = f" (backed up original to {bak_path.name})" if bak_path else " (no prior file)"
        f.write(f"[{ts}] FILE_RESTORE: {data.path} from {backup_name}{bak_note}\n")

    return {
        "detail": "File restored successfully",
        "path": data.path,
        "backup_source": backup_name,
        "safety_backup": str(bak_path) if bak_path else None,
        "size": target_file.stat().st_size,
    }


@router.delete("/daily/{backup_name}/source/stage", status_code=204)
async def cleanup_staging(backup_name: str, _: dict = Depends(verify_admin_token)):
    """Remove the staged extraction directory (frees disk)."""
    if not re.match(r'^backup_\d{8}_\d{6}$', backup_name):
        raise HTTPException(400, "Invalid backup name")
    stage = _stage_dir_for(backup_name)
    if stage.exists():
        shutil.rmtree(stage, ignore_errors=True)


@router.get("/source-stages")
async def list_source_stages(_: dict = Depends(verify_admin_token)):
    """List currently staged (extracted) source directories."""
    if not STAGING_ROOT.exists():
        return []
    items = []
    for entry in STAGING_ROOT.iterdir():
        if not entry.is_dir():
            continue
        marker = entry / ".extracted"
        if not marker.exists():
            continue
        size = _folder_size(entry)
        items.append({
            "backup_name": entry.name,
            "path": str(entry),
            "size_bytes": size,
            "size_human": _human_size(size),
            "extracted_at": datetime.fromtimestamp(marker.stat().st_mtime).isoformat(),
        })
    return items
