from sqlalchemy import String, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import TimeStampMixin
from backend.app.core.database import Base


class SitePage(TimeStampMixin, Base):
    """
    Crawled, cleaned text of a public website page (e.g. /about, /technology).

    Populated by the site crawler (scripts/crawl_site.py) on a schedule. The
    assistant uses these rows two ways:
      - a short index (path + title + summary) is injected into the system
        prompt via _build_site_context, so the model knows what pages exist;
      - the `read_page` tool pulls a single page's full `text` on demand.

    Keyed by `url` — the page path, e.g. "/about" (no host).
    """
    __tablename__ = "site_pages"

    url:        Mapped[str]  = mapped_column(String(255), primary_key=True)
    title:      Mapped[str]  = mapped_column(String(255), default="", nullable=False)
    # Short summary used in the prompt index — first ~280 chars of cleaned text.
    summary:    Mapped[str]  = mapped_column(Text, default="", nullable=False)
    # Full cleaned page text, served by the read_page tool.
    text:       Mapped[str]  = mapped_column(Text, default="", nullable=False)
    char_count: Mapped[int]  = mapped_column(Integer, default=0, nullable=False)
    # Crawler sets False when a page 404s / errors so the index can skip it
    # without losing the last-good text.
    is_active:  Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
