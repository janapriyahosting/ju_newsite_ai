import uuid
from sqlalchemy import String, Text, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Lead(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "leads"

    customer_id:    Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True
    )
    name:           Mapped[str]  = mapped_column(String(255), nullable=False)
    email:          Mapped[str]  = mapped_column(String(255), nullable=True)
    phone:          Mapped[str]  = mapped_column(String(20), nullable=False)
    source:         Mapped[str]  = mapped_column(String(50), nullable=True)   # website, referral, walk-in
    status:         Mapped[str]  = mapped_column(String(30), default="new")   # new, contacted, qualified, lost, converted
    interest:       Mapped[str]  = mapped_column(String(100), nullable=True)  # 2BHK, 3BHK etc
    project_interest: Mapped[str] = mapped_column(String(255), nullable=True)  # e.g. "Janapriya Meadows"
    budget_min:     Mapped[str]  = mapped_column(String(50), nullable=True)
    budget_max:     Mapped[str]  = mapped_column(String(50), nullable=True)
    message:        Mapped[str]  = mapped_column(Text, nullable=True)
    notes:          Mapped[str]  = mapped_column(Text, nullable=True)
    sf_lead_id:     Mapped[str]  = mapped_column(String(50), nullable=True)   # Salesforce Lead ID
    assigned_to:    Mapped[str]  = mapped_column(String(255), nullable=True)  # Sales rep
    utm_source:     Mapped[str]  = mapped_column(String(100), nullable=True)
    utm_medium:     Mapped[str]  = mapped_column(String(100), nullable=True)
    utm_campaign:   Mapped[str]  = mapped_column(String(100), nullable=True)
    lead_score:     Mapped[int]  = mapped_column(Integer, default=0)    # 0-100
    score_details:  Mapped[dict] = mapped_column(JSON, default=dict)  # breakdown
    extra_data:     Mapped[dict] = mapped_column(JSON, default=dict)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="leads")

    def __repr__(self):
        return f"<Lead {self.name} - {self.status}>"
