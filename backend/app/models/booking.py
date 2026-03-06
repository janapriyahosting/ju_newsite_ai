import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Booking(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "bookings"

    customer_id:         Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False
    )
    unit_id:             Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id"), nullable=False
    )
    coupon_id:           Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id"), nullable=True
    )
    booking_amount:      Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    total_amount:        Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    discount_amount:     Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    status:              Mapped[str]   = mapped_column(String(30), default="pending")      # pending, confirmed, cancelled
    payment_status:      Mapped[str]   = mapped_column(String(20), default="unpaid")       # unpaid, partial, paid
    razorpay_order_id:   Mapped[str]   = mapped_column(String(100), nullable=True)
    razorpay_payment_id: Mapped[str]   = mapped_column(String(100), nullable=True)
    razorpay_signature:  Mapped[str]   = mapped_column(String(255), nullable=True)
    sf_opportunity_id:   Mapped[str]   = mapped_column(String(50), nullable=True)          # Salesforce Opportunity ID
    notes:               Mapped[str]   = mapped_column(Text, nullable=True)
    booked_at:           Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="bookings")
    unit:     Mapped["Unit"]     = relationship("Unit", back_populates="bookings")
    coupon:   Mapped["Coupon"]   = relationship("Coupon")

    def __repr__(self):
        return f"<Booking {self.id} - {self.status}>"
