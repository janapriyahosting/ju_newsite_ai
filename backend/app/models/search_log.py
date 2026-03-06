import uuid
from sqlalchemy import String, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class SearchLog(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "search_logs"

    customer_id:   Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    query:         Mapped[str] = mapped_column(Text, nullable=True)
    filters:       Mapped[dict] = mapped_column(JSON, default=dict)
    results_count: Mapped[int]  = mapped_column(Integer, default=0)
    session_id:    Mapped[str]  = mapped_column(String(100), nullable=True)
    ip_address:    Mapped[str]  = mapped_column(String(50), nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="search_logs")

    def __repr__(self):
        return f"<SearchLog {self.query}>"
