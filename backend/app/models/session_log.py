from datetime import datetime
from typing import Optional
import uuid
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import UUIDMixin
from backend.app.core.database import Base


class SessionLog(UUIDMixin, Base):
    __tablename__ = "session_logs"

    session_id:       Mapped[str]                 = mapped_column(String(100), nullable=False, index=True)
    visitor_id:       Mapped[Optional[str]]        = mapped_column(String(100), nullable=True)
    customer_id:      Mapped[Optional[uuid.UUID]]  = mapped_column(ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address:       Mapped[Optional[str]]        = mapped_column(String(50), nullable=True)
    user_agent:       Mapped[Optional[str]]        = mapped_column(Text, nullable=True)
    page_path:        Mapped[Optional[str]]        = mapped_column(String(500), nullable=True)
    referrer:         Mapped[Optional[str]]        = mapped_column(String(500), nullable=True)
    started_at:       Mapped[Optional[datetime]]   = mapped_column(nullable=True)
    last_seen_at:     Mapped[Optional[datetime]]   = mapped_column(nullable=True)
    duration_seconds: Mapped[int]                  = mapped_column(Integer, default=0)
    page_views:       Mapped[int]                  = mapped_column(Integer, default=1)
    is_customer:      Mapped[bool]                 = mapped_column(Boolean, default=False)
    created_at:       Mapped[Optional[datetime]]   = mapped_column(nullable=True)
