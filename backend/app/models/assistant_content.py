from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import TimeStampMixin
from backend.app.core.database import Base


class AssistantContent(TimeStampMixin, Base):
    """
    Key/value store for content rendered inside the in-app ProactiveAssistant
    widget — RiseUp tab copy, Callback tab phone number, etc. Single row per
    section, keyed by `key` (e.g. "riseup", "callback"). Admins edit via
    /admin/assistant-content; the widget pulls via GET /assistant/content.
    """
    __tablename__ = "assistant_content"

    key:  Mapped[str]  = mapped_column(String(64), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
