import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class SiteVisit(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "site_visits"

    customer_id:  Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True
    )
    project_id:   Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    name:         Mapped[str]      = mapped_column(String(255), nullable=False)
    phone:        Mapped[str]      = mapped_column(String(20), nullable=False)
    email:        Mapped[str]      = mapped_column(String(255), nullable=True)
    visit_date:   Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    visit_time:   Mapped[str]      = mapped_column(String(20), nullable=True)  # "10:00 AM"
    status:       Mapped[str]      = mapped_column(String(30), default="pending")  # pending, confirmed, completed, cancelled
    notes:        Mapped[str]      = mapped_column(Text, nullable=True)
    assigned_to:  Mapped[str]      = mapped_column(String(255), nullable=True)
    reminder_sent: Mapped[bool]    = mapped_column(Boolean, default=False)
    sf_event_id:  Mapped[str]      = mapped_column(String(50), nullable=True)  # Salesforce Event ID

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="site_visits")
    project:  Mapped["Project"]  = relationship("Project")

    def __repr__(self):
        return f"<SiteVisit {self.name} - {self.visit_date}>"
