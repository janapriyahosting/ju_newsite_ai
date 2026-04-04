import uuid
from sqlalchemy import String, Boolean, Integer, Text, ForeignKey, JSON, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Unit(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "units"

    tower_id:      Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("towers.id", ondelete="CASCADE"), nullable=False
    )
    unit_number:   Mapped[str]   = mapped_column(String(50), nullable=False)
    floor_number:  Mapped[int]   = mapped_column(Integer, nullable=False)
    unit_type:     Mapped[str]   = mapped_column(String(20), nullable=True)   # 1BHK, 2BHK, 3BHK, villa, plot
    bedrooms:      Mapped[int]   = mapped_column(Integer, nullable=True)
    bathrooms:     Mapped[int]   = mapped_column(Integer, nullable=True)
    balconies:     Mapped[int]   = mapped_column(Integer, default=0)
    area_sqft:     Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    carpet_area:   Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    plot_area:     Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    base_price:    Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    price_per_sqft: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    down_payment:  Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    emi_estimate:  Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    token_amount:  Mapped[float] = mapped_column(Numeric(15, 2), default=20000)  # Booking token amount
    facing:        Mapped[str]   = mapped_column(String(20), nullable=True)   # North, South, East, West
    floor_plan_img: Mapped[str]  = mapped_column(String(500), nullable=True)
    status:        Mapped[str]   = mapped_column(String(20), default="available")  # available, booked, sold, hold
    amenities:     Mapped[dict]  = mapped_column(JSON, default=list)
    images:        Mapped[dict]  = mapped_column(JSON, default=list)
    video_url:     Mapped[str]   = mapped_column(String(500), nullable=True)
    walkthrough_url: Mapped[str] = mapped_column(String(500), nullable=True)
    floor_plans:   Mapped[dict]  = mapped_column(JSON, default=list)
    dimensions:      Mapped[dict]  = mapped_column(JSON, default=list)
    brochure_url:    Mapped[str]   = mapped_column(String(500), nullable=True)
    dimensions:      Mapped[dict]  = mapped_column(JSON, default=list)
    brochure_url:    Mapped[str]   = mapped_column(String(500), nullable=True)
    is_trending:   Mapped[bool]  = mapped_column(Boolean, default=False)
    is_featured:   Mapped[bool]  = mapped_column(Boolean, default=False)
    view_count:    Mapped[int]   = mapped_column(Integer, default=0)
    embedding:     Mapped[list]  = mapped_column(Vector(1536), nullable=True)  # pgvector AI embedding

    # Relationships
    tower:      Mapped["Tower"]           = relationship("Tower", back_populates="units")
    cart_items: Mapped[list["CartItem"]]  = relationship("CartItem", back_populates="unit")
    bookings:   Mapped[list["Booking"]]   = relationship("Booking", back_populates="unit")

    def __repr__(self):
        return f"<Unit {self.unit_number} Floor {self.floor_number}>"
