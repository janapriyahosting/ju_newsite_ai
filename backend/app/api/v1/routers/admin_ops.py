"""
Admin Ops Router
File: backend/app/api/v1/routers/admin_ops.py

Endpoints:
  GET    /admin/ops/github-token   → { configured, last_updated, preview, username }
  POST   /admin/ops/github-token   → write /home/jpuser/.github-token.env

The env file is read by git's global credential.helper for shell pushes.
The running app never reads the token — this endpoint just maintains the file.
"""
import os
import re
import stat
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.api.v1.routers.admin_auth import verify_admin_token

router = APIRouter(prefix="/admin/ops", tags=["Admin - Ops"])

# The git credential helper sources this file. jpuser owns it (mode 600).
TOKEN_ENV_PATH = Path("/home/jpuser/.github-token.env")
DEFAULT_USERNAME = "janapriyahosting"


class GithubTokenUpdate(BaseModel):
    token: str = Field(..., min_length=20, max_length=500)
    username: Optional[str] = None


def _parse_env_file(path: Path) -> dict[str, str]:
    """Minimal KEY=VALUE parser. Ignores comments and blank lines."""
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip()
    return out


def _mask(token: str) -> str:
    if not token:
        return ""
    if len(token) <= 8:
        return "•" * len(token)
    return f"{token[:4]}…{token[-4:]}"


@router.get("/github-token")
def get_github_token_status(_admin=Depends(verify_admin_token)):
    """Return token-presence metadata. Never returns the raw token."""
    if not TOKEN_ENV_PATH.exists():
        return {
            "configured": False,
            "last_updated": None,
            "preview": None,
            "username": DEFAULT_USERNAME,
            "path": str(TOKEN_ENV_PATH),
        }
    env = _parse_env_file(TOKEN_ENV_PATH)
    token = env.get("GITHUB_TOKEN", "")
    mtime = datetime.fromtimestamp(TOKEN_ENV_PATH.stat().st_mtime).isoformat()
    return {
        "configured": bool(token),
        "last_updated": mtime,
        "preview": _mask(token) if token else None,
        "username": env.get("GITHUB_USERNAME", DEFAULT_USERNAME),
        "path": str(TOKEN_ENV_PATH),
    }


@router.post("/github-token")
def set_github_token(data: GithubTokenUpdate, _admin=Depends(verify_admin_token)):
    token = data.token.strip()
    username = (data.username or DEFAULT_USERNAME).strip()

    # GitHub PAT shapes: classic ghp_, fine-grained github_pat_, server-to-server ghs_.
    if not re.match(r"^(ghp_|github_pat_|ghs_|gho_|ghu_)[A-Za-z0-9_]{20,}$", token):
        raise HTTPException(
            status_code=400,
            detail="Token doesn't look like a GitHub PAT (expected prefix ghp_/github_pat_/ghs_).",
        )
    if not re.match(r"^[A-Za-z0-9-]+$", username):
        raise HTTPException(status_code=400, detail="Invalid username format.")

    content = (
        "# Managed by /admin/ops — do not edit by hand.\n"
        "# Git's global credential.helper sources this file.\n"
        f"GITHUB_USERNAME={username}\n"
        f"GITHUB_TOKEN={token}\n"
    )

    tmp = TOKEN_ENV_PATH.with_suffix(".env.tmp")
    try:
        tmp.write_text(content)
        os.chmod(tmp, stat.S_IRUSR | stat.S_IWUSR)  # 600
        os.replace(tmp, TOKEN_ENV_PATH)
    except OSError as e:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to write token file: {e}")

    mtime = datetime.fromtimestamp(TOKEN_ENV_PATH.stat().st_mtime).isoformat()
    return {
        "ok": True,
        "configured": True,
        "last_updated": mtime,
        "preview": _mask(token),
        "username": username,
        "path": str(TOKEN_ENV_PATH),
    }
