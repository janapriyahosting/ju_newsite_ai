import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class LeadActivity(UUIDMixin, TimeStampMixin, Base):
    """A scheduled or logged action against a Lead — callbacks, notes,
    site-visit reminders, follow-ups. Sales reps see these on the lead
    detail page so they know what was promised and when."""
    __tablename__ = "lead_activities"

    lead_id:        Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    activity_type:  Mapped[str]  = mapped_column(String(40), nullable=False)
    subject:        Mapped[str]  = mapped_column(String(255), nullable=False)
    notes:          Mapped[str]  = mapped_column(Text, nullable=True)
    scheduled_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    status:         Mapped[str]  = mapped_column(String(20), default="pending", nullable=False)
    source:         Mapped[str]  = mapped_column(String(50), nullable=True)
    assigned_to:    Mapped[str]  = mapped_column(String(255), nullable=True)
    created_by:     Mapped[str]  = mapped_column(String(255), nullable=True)
    extra_data:     Mapped[dict] = mapped_column(JSON, default=dict)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="activities")

    def __repr__(self):
        return f"<LeadActivity {self.activity_type} {self.status}>"
