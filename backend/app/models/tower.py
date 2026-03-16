import uuid
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Tower(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "towers"

    project_id:    Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name:          Mapped[str]  = mapped_column(String(100), nullable=False)
    description:   Mapped[str]  = mapped_column(Text, nullable=True)
    total_floors:  Mapped[int]  = mapped_column(Integer, nullable=False)
    total_units:   Mapped[int]  = mapped_column(Integer, default=0)
    svg_floor_plan: Mapped[str] = mapped_column(Text, nullable=True)
    amenities:     Mapped[dict] = mapped_column(JSON, default=list)
    brochure_url:  Mapped[str]  = mapped_column(String(500), nullable=True)
    images:        Mapped[dict] = mapped_column(JSON, default=list)
    video_url:     Mapped[str]  = mapped_column(Text, nullable=True)
    walkthrough_url: Mapped[str] = mapped_column(Text, nullable=True)
    floor_plans:   Mapped[dict] = mapped_column(JSON, default=list)
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="towers")
    units:   Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="tower", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Tower {self.name}>"
