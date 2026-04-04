import uuid
from typing import Optional
from sqlalchemy import String, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class AssistantFlow(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "assistant_flows"

    name:        Mapped[str]            = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    # on_open → auto-launch when widget opens
    # on_no_results → launch after 0-result search
    # manual → only via quick-action button
    trigger:     Mapped[str]            = mapped_column(String(50), default="on_open", nullable=False)
    is_active:   Mapped[bool]           = mapped_column(Boolean, default=True, nullable=False)
    # list of step dicts — see admin UI for schema
    steps:       Mapped[list]           = mapped_column(JSON, default=list, nullable=False)
