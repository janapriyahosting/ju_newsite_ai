from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import UUIDMixin
from backend.app.core.database import Base


class AssistantChatLog(UUIDMixin, Base):
    """One row per chat turn (user or assistant). Grouped by session_id.
    Attribution fields are populated on the first user turn of a session
    and then left null on subsequent turns to avoid duplication."""
    __tablename__ = "assistant_chat_logs"

    session_id:    Mapped[str]           = mapped_column(String(100), nullable=False, index=True)
    visitor_id:    Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    role:          Mapped[str]           = mapped_column(String(20), nullable=False)  # 'user' | 'assistant'
    content:       Mapped[str]           = mapped_column(Text, nullable=False)

    intent:        Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    provider:      Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    page:          Mapped[Optional[str]] = mapped_column(String(20),  nullable=True)
    page_entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action_type:   Mapped[Optional[str]] = mapped_column(String(40),  nullable=True)
    action_url:    Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latency_ms:    Mapped[Optional[int]] = mapped_column(Integer,     nullable=True)

    # Visitor / attribution — only on first user turn of each session.
    ip_address:    Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    user_agent:    Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    referrer:      Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    landing_page:  Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    utm_source:    Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_medium:    Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_campaign:  Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_term:      Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_content:   Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cookies:       Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at:    Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )
