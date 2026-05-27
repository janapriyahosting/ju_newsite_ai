#!/usr/bin/env python
"""Crawl the public site into the `site_pages` table.

Run from the project root with the venv python:

    .venv/bin/python scripts/crawl_site.py

Scheduled nightly via cron (see crontab for user jpuser). Safe to run anytime;
it upserts and never deletes rows.
"""
import asyncio
import logging
import sys
from pathlib import Path

# Allow `backend.app...` imports when run as a standalone script.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.app.core.database import AsyncSessionLocal, engine  # noqa: E402
from backend.app.services.site_crawler import crawl_all, BASE_URL  # noqa: E402

# The shared engine echoes all SQL when settings.DEBUG is on. Turn echo off on
# this engine instance (and lower the logger) so the nightly cron log isn't
# drowned in SQL — this is a one-shot batch script, not the API.
engine.echo = False
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)


async def main() -> int:
    print(f"[crawl_site] crawling {BASE_URL} ...")
    async with AsyncSessionLocal() as db:
        summary = await crawl_all(db)
    for line in summary["ok"]:
        print(f"  ok   {line}")
    for url, reason in summary["failed"]:
        print(f"  FAIL {url}: {reason}")
    print(f"[crawl_site] done — {len(summary['ok'])} ok, {len(summary['failed'])} failed")
    # Non-zero exit only if nothing succeeded, so cron surfaces a total outage.
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
