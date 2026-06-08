"""Salesforce live unit-availability service for the homepage assistant.

Salesforce is the AUTHORITY on which curated units are available. The local
Postgres DB supplies the rich card fields (price / area / BHK / facing /
images); the two are matched by (normalised project, unit number). Validated
overlay coverage across the curated allowlist is ~77% — the misses are blocks
that have no rows in the local DB yet (Elysium/Phase-I, Sitara/Block-B(Old),
Bahiti/Block-4C). Those simply won't be recommendable until their local data
is loaded; the assistant only ever surfaces units it has price/area for.

This module is FAIL-SAFE. If Salesforce is not configured (no creds) or any
query fails, `get_available_unit_keys()` returns ``None`` and the caller falls
back to the local ``status='available'`` flag — the homepage never breaks
because Salesforce is unreachable.

Going live (one-time, by an admin who has the org creds):
  1. ``.venv/bin/pip install simple-salesforce``  (already pinned in
     backend/requirements.txt; just install it into the running venv)
  2. Set SF_USERNAME / SF_PASSWORD / SF_SECURITY_TOKEN in .env
  3. Run ``describe_unit_fields()`` once and confirm the project/block field
     API names, then set SF_UNIT_PROJECT_FIELD / SF_UNIT_BLOCK_FIELD if the
     defaults (Project__c / Block__c) are wrong for the org.
"""
from __future__ import annotations

import asyncio
import logging
import re
import threading
import time
from typing import Optional

from backend.app.core.config import settings

log = logging.getLogger(__name__)


# --- Curated inventory allowlist -------------------------------------------
# The ONLY inventory the homepage assistant will ever surface. Key is the
# normalised project name (see ``norm_project``); value is the set of allowed
# block / tower names, or ``None`` to allow every block in that project. Block
# strings match BOTH Salesforce's block/tower values and the local
# ``towers.name`` values exactly (verified against both systems).
CURATED_INVENTORY: dict[str, Optional[set[str]]] = {
    "nilevalley": {"Block-6", "Block-2B"},
    "bahiti":     {"Block-8A", "Block-8B", "Block-4A", "Block-4B", "Block-4C"},
    "firstlight": None,
    "sitara":     None,
    "lakefront":  {"Block-C1", "Block-D"},
    "altair":     None,
    "elysium":    None,
}


def norm_project(s: Optional[str]) -> str:
    """Normalise a project name for cross-system matching: lowercase, drop all
    non-alphanumerics. Maps SF 'Nilevalley' and local 'NileValley' → 'nilevalley'."""
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def norm_unit(s: Optional[str]) -> str:
    """Normalise a unit number: trim + uppercase. SF unit names equal local
    ``unit_number`` exactly once cased (e.g. 'B-1001', '4A1101', 'C1-003')."""
    return (s or "").strip().upper()


def is_curated(project: Optional[str], block: Optional[str]) -> bool:
    """True if this (project, block) is in the curated allowlist."""
    np = norm_project(project)
    if np not in CURATED_INVENTORY:
        return False
    allowed = CURATED_INVENTORY[np]
    return allowed is None or block in allowed


def allowlist_where(proj_norm_expr: str, block_col: str) -> tuple[str, dict]:
    """Build a SQL WHERE fragment + bind params enforcing the curated allowlist.

    ``proj_norm_expr`` must be a SQL expression yielding the *normalised* project
    name (same normalisation as ``norm_project``); ``block_col`` is the raw
    tower/block column. Kept in lockstep with CURATED_INVENTORY so the SQL gate
    and the SF gate can never drift.
    """
    ors: list[str] = []
    params: dict[str, str] = {}
    for i, (np, blocks) in enumerate(CURATED_INVENTORY.items()):
        params[f"alp{i}"] = np
        if blocks is None:
            ors.append(f"({proj_norm_expr} = :alp{i})")
        else:
            placeholders = []
            for j, b in enumerate(sorted(blocks)):
                key = f"alb{i}_{j}"
                params[key] = b
                placeholders.append(f":{key}")
            ors.append(
                f"({proj_norm_expr} = :alp{i} AND {block_col} IN ({', '.join(placeholders)}))"
            )
    return "(" + " OR ".join(ors) + ")", params


# --- Salesforce client + availability query --------------------------------

_client = None  # cached simple_salesforce.Salesforce
_client_lock = threading.Lock()


def _get_client():
    """Return a cached Salesforce client, or None if creds are not configured.
    Raises only on an actual auth failure (caller treats that as 'unavailable')."""
    global _client
    if _client is not None:
        return _client
    if not (settings.SF_USERNAME and settings.SF_PASSWORD and settings.SF_SECURITY_TOKEN):
        return None
    with _client_lock:
        if _client is not None:
            return _client
        from simple_salesforce import Salesforce  # lazy: optional dependency

        _client = Salesforce(
            username=settings.SF_USERNAME,
            password=settings.SF_PASSWORD,
            security_token=settings.SF_SECURITY_TOKEN,
            domain=settings.SF_DOMAIN or "login",
        )
    return _client


def _available_statuses() -> list[str]:
    raw = settings.SF_AVAILABLE_STATUSES or "Available"
    return [s.strip() for s in raw.split(",") if s.strip()]


def _resolve_field(record: dict, field_path: str):
    """Read a field that may be a relationship path, e.g. 'Project__r.Name'.
    simple_salesforce returns nested dicts for relationship fields."""
    cur = record
    for part in field_path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _soql_select_field(field_path: str) -> str:
    """A relationship value is selected via its __r path; a plain field by name.
    Either way the configured value is already the SOQL select token."""
    return field_path


def _query_available_keys() -> Optional[frozenset[tuple[str, str]]]:
    """Query Salesforce for all available units, filter to the curated
    allowlist, and return the set of (norm_project, norm_unit) keys. Returns
    None on any failure so the caller can fall back to local availability."""
    try:
        client = _get_client()
    except Exception as e:  # auth failure
        log.warning("Salesforce auth failed; falling back to local availability: %s", e)
        return None
    if client is None:
        return None

    try:
        obj = settings.SF_UNIT_OBJECT
        f_name = settings.SF_UNIT_NAME_FIELD
        f_proj = settings.SF_UNIT_PROJECT_FIELD
        f_block = settings.SF_UNIT_BLOCK_FIELD
        f_status = settings.SF_UNIT_STATUS_FIELD

        statuses = _available_statuses()
        in_list = ", ".join("'" + s.replace("'", r"\'") + "'" for s in statuses)
        select = ", ".join(
            dict.fromkeys(  # de-dupe while preserving order
                [_soql_select_field(f_name), _soql_select_field(f_proj), _soql_select_field(f_block)]
            )
        )
        soql = f"SELECT {select} FROM {obj} WHERE {f_status} IN ({in_list})"

        res = client.query_all(soql)
        keys: set[tuple[str, str]] = set()
        for rec in res.get("records", []):
            project = _resolve_field(rec, f_proj)
            block = _resolve_field(rec, f_block)
            name = _resolve_field(rec, f_name)
            if is_curated(project, block):
                keys.add((norm_project(project), norm_unit(name)))
        if not keys:
            # ~430 curated units are expected; 0 matches almost always means the
            # project/block field API names are wrong. Fall back rather than
            # silently showing an empty homepage.
            log.warning(
                "Salesforce returned %d records but 0 matched the curated allowlist "
                "— check SF_UNIT_PROJECT_FIELD/SF_UNIT_BLOCK_FIELD; falling back to "
                "local availability",
                len(res.get("records", [])),
            )
            return None
        log.info("Salesforce availability: %d curated units available", len(keys))
        return frozenset(keys)
    except Exception as e:
        log.warning("Salesforce availability query failed; using local availability: %s", e)
        return None


# --- TTL cache + async wrapper ---------------------------------------------

_cache: dict = {"keys": None, "ts": 0.0}
_cache_lock = threading.Lock()


def _get_available_unit_keys_sync() -> Optional[frozenset[tuple[str, str]]]:
    ttl = settings.SF_CACHE_TTL_SECONDS
    now = time.monotonic()
    with _cache_lock:
        if _cache["keys"] is not None and (now - _cache["ts"]) < ttl:
            return _cache["keys"]
    keys = _query_available_keys()
    if keys is not None:  # only cache successful results; keep retrying on failure
        with _cache_lock:
            _cache["keys"] = keys
            _cache["ts"] = time.monotonic()
    return keys


async def get_available_unit_keys() -> Optional[frozenset[tuple[str, str]]]:
    """Async-safe accessor. simple_salesforce is blocking (requests-based), so
    the query runs in a worker thread to avoid stalling the event loop.

    Returns a frozenset of (norm_project, norm_unit) for curated + available
    units, or None when Salesforce is unconfigured/unreachable (→ caller falls
    back to local ``status='available'``)."""
    return await asyncio.to_thread(_get_available_unit_keys_sync)


def describe_unit_fields() -> Optional[list[dict]]:
    """Diagnostic: list the Unit object's field API names/labels/types so an
    admin can confirm SF_UNIT_PROJECT_FIELD / SF_UNIT_BLOCK_FIELD. Returns None
    if Salesforce is not configured."""
    client = _get_client()
    if client is None:
        return None
    meta = getattr(client, settings.SF_UNIT_OBJECT).describe()
    return [
        {"name": f["name"], "label": f["label"], "type": f["type"], "relationshipName": f.get("relationshipName")}
        for f in meta["fields"]
    ]
