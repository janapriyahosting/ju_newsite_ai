from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Coupon(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "coupons"

    code:           Mapped[str]   = mapped_column(String(50), unique=True, nullable=False)
    description:    Mapped[str]   = mapped_column(String(500), nullable=True)
    discount_type:  Mapped[str]   = mapped_column(String(20), nullable=False)   # percentage, fixed
    discount_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    min_amount:     Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    max_discount:   Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    usage_limit:    Mapped[int]   = mapped_column(Integer, nullable=True)
    used_count:     Mapped[int]   = mapped_column(Integer, default=0)
    valid_from:     Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_until:    Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active:      Mapped[bool]  = mapped_column(Boolean, default=True)
    applicable_to:  Mapped[dict]  = mapped_column(JSON, default=dict)  # unit types, projects

    def __repr__(self):
        return f"<Coupon {self.code}>"
