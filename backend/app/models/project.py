from sqlalchemy import String, Boolean, Text, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Project(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "projects"

    name:        Mapped[str]  = mapped_column(String(255), nullable=False)
    slug:        Mapped[str]  = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str]  = mapped_column(Text, nullable=True)
    location:    Mapped[str]  = mapped_column(String(500), nullable=True)
    address:     Mapped[str]  = mapped_column(Text, nullable=True)
    city:        Mapped[str]  = mapped_column(String(100), nullable=True)
    state:       Mapped[str]  = mapped_column(String(100), nullable=True)
    pincode:     Mapped[str]  = mapped_column(String(10), nullable=True)
    lat:         Mapped[float] = mapped_column(Numeric(10, 8), nullable=True)
    lng:         Mapped[float] = mapped_column(Numeric(11, 8), nullable=True)
    rera_number: Mapped[str]  = mapped_column(String(100), nullable=True)
    amenities:   Mapped[dict] = mapped_column(JSON, default=list)
    images:      Mapped[dict] = mapped_column(JSON, default=list)
    brochure_url: Mapped[str] = mapped_column(String(500), nullable=True)
    video_url:   Mapped[str]  = mapped_column(String(500), nullable=True)
    is_active:   Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    towers: Mapped[list["Tower"]] = relationship(
        "Tower", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Project {self.name}>"
