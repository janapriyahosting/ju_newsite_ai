"""Crawl the public website and store cleaned page text in `site_pages`.

The assistant reads these rows to answer questions about any page on the site
(about, technology, home-loan, etc.) — content that does NOT live in the
projects/units tables. Run via scripts/crawl_site.py on a schedule.

We fetch the server-rendered HTML of each page from the running Next.js app
(localhost:3000 by default), isolate the <main> content, strip tags with a
stdlib HTMLParser (no extra deps), collapse whitespace, and upsert.
"""
from __future__ import annotations

import os
import re
from html.parser import HTMLParser
from typing import Optional

import httpx
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession


# Base URL of the running frontend. Override with SITE_CRAWL_BASE_URL if the
# site runs on a different host/port.
BASE_URL = os.environ.get("SITE_CRAWL_BASE_URL", "http://localhost:3000").rstrip("/")

# Curated list of informational page paths worth feeding the assistant. Dynamic
# per-project / per-unit pages are intentionally excluded — that data already
# lives in the projects/units tables and the search_units tool. These are the
# pages whose prose/marketing content the assistant otherwise can't see.
PAGE_PATHS: list[str] = [
    "/",
    "/about",
    "/technology",
    "/blog",
    "/contact",
    "/projects",
    "/site-visit",
    "/welcome",
]
# Deliberately excluded: /store, /property-search, /compare — client-rendered
# search UIs whose server HTML is a thin loading/"0 properties" snapshot that
# would mislead the model. Live inventory is served by the search_units tool.

SUMMARY_LEN = 280
MAX_TEXT_LEN = 12000  # cap stored text so a runaway page can't bloat the prompt/tool

# Tags whose text content we never want (scripts, styles, embedded SVG paths).
_DROP_RE = re.compile(
    r"<(script|style|noscript|template|svg)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_MAIN_OPEN_RE = re.compile(r"<main\b[^>]*>", re.IGNORECASE)
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)

# Block-level tags that should produce a line break in the extracted text.
_BLOCK_TAGS = {
    "p", "div", "br", "li", "ul", "ol", "section", "article", "header",
    "footer", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "table", "blockquote",
}


class _TextExtractor(HTMLParser):
    """Collects visible text, inserting newlines at block boundaries."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _BLOCK_TAGS:
            self._parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _BLOCK_TAGS:
            self._parts.append("\n")

    def handle_data(self, data: str) -> None:
        if data.strip():
            self._parts.append(data)

    def get_text(self) -> str:
        return "".join(self._parts)


def _collapse(text: str) -> str:
    """Trim each line, drop blanks, collapse runs of whitespace."""
    lines = [re.sub(r"[ \t ]+", " ", ln).strip() for ln in text.splitlines()]
    out: list[str] = []
    for ln in lines:
        if ln:
            out.append(ln)
    return "\n".join(out)


def _strip_nav(text: str) -> str:
    """Every page renders the shared Navbar inside <main>, leaking a constant
    header (e.g. "Home…Enquire Now") into the extracted text. Drop everything
    up to and including the nav's trailing "Enquire Now" CTA when it appears
    near the start, so we only keep the page's own content."""
    idx = text.find("Enquire Now")
    if 0 <= idx <= 160:
        return text[idx + len("Enquire Now"):].lstrip(" |\n")
    return text


def extract_main_text(html: str) -> str:
    """Return cleaned text from the page's <main> region (or whole body)."""
    html = _COMMENT_RE.sub(" ", html)
    html = _DROP_RE.sub(" ", html)

    # Isolate the <main>...</main> region if present — pages here wrap their
    # content in a single <main>, which excludes the shared chrome/footer.
    m = _MAIN_OPEN_RE.search(html)
    if m:
        end = html.rfind("</main>")
        region = html[m.end():end] if end > m.end() else html[m.end():]
    else:
        region = html

    parser = _TextExtractor()
    parser.feed(region)
    return _strip_nav(_collapse(parser.get_text()))


def extract_title(html: str) -> str:
    m = _TITLE_RE.search(html)
    if not m:
        return ""
    # convert_charrefs handled by a quick unescape on the title text.
    raw = re.sub(r"\s+", " ", m.group(1)).strip()
    return raw[:255]


async def crawl_page(client: httpx.AsyncClient, path: str) -> dict:
    """Fetch + clean a single page. Returns a row dict (never raises)."""
    url = path  # stored key is the path, e.g. "/about"
    try:
        resp = await client.get(BASE_URL + path, timeout=20.0)
        if resp.status_code != 200:
            return {"url": url, "ok": False, "reason": f"HTTP {resp.status_code}"}
        html = resp.text
        text = extract_main_text(html)[:MAX_TEXT_LEN]
        if len(text) < 40:
            return {"url": url, "ok": False, "reason": "no meaningful text"}
        title = extract_title(html)
        summary = text[:SUMMARY_LEN].rsplit(" ", 1)[0] if len(text) > SUMMARY_LEN else text
        return {
            "url": url,
            "ok": True,
            "title": title,
            "summary": summary,
            "text": text,
            "char_count": len(text),
        }
    except Exception as e:
        return {"url": url, "ok": False, "reason": f"{type(e).__name__}: {e}"}


async def _upsert(db: AsyncSession, row: dict) -> None:
    """Upsert a crawled page. On failure, keep last-good text but flag inactive."""
    if row["ok"]:
        await db.execute(sa_text("""
            INSERT INTO site_pages (url, title, summary, text, char_count, is_active, updated_at)
            VALUES (:url, :title, :summary, :text, :char_count, TRUE, now())
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                summary = EXCLUDED.summary,
                text = EXCLUDED.text,
                char_count = EXCLUDED.char_count,
                is_active = TRUE,
                updated_at = now()
        """), row)
    else:
        # Page errored this run — mark inactive but don't clobber prior text.
        await db.execute(sa_text("""
            UPDATE site_pages SET is_active = FALSE, updated_at = now()
            WHERE url = :url
        """), {"url": row["url"]})


async def crawl_all(db: AsyncSession, paths: Optional[list[str]] = None) -> dict:
    """Crawl every page in PAGE_PATHS (or the given list) and upsert. Returns a
    summary dict {ok: [...], failed: [(path, reason), ...]}."""
    paths = paths or PAGE_PATHS
    ok: list[str] = []
    failed: list[tuple[str, str]] = []
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for path in paths:
            row = await crawl_page(client, path)
            await _upsert(db, row)
            if row["ok"]:
                ok.append(f"{row['url']} ({row['char_count']} chars)")
            else:
                failed.append((row["url"], row["reason"]))
    await db.commit()
    return {"ok": ok, "failed": failed}
