from typing import Optional
from datetime import datetime
from sqlalchemy import String, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class Customer(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "customers"

    name:          Mapped[str]  = mapped_column(String(255), nullable=False)
    email:         Mapped[str]  = mapped_column(String(255), unique=True, nullable=False)
    phone:         Mapped[str]  = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str]  = mapped_column(String(255), nullable=True)
    sf_contact_id: Mapped[str]  = mapped_column(String(50), nullable=True)   # Salesforce ID
    is_verified:   Mapped[bool] = mapped_column(Boolean, default=False)
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    preferences:   Mapped[dict] = mapped_column(JSON, default=dict)          # search preferences
    otp:           Mapped[str]  = mapped_column(String(10), nullable=True)
    otp_expiry:    Mapped[str]  = mapped_column(String(50), nullable=True)

    # Relationships
    cart_items:   Mapped[list["CartItem"]]    = relationship("CartItem", back_populates="customer")
    bookings:     Mapped[list["Booking"]]     = relationship("Booking", back_populates="customer")
    leads:        Mapped[list["Lead"]]        = relationship("Lead", back_populates="customer")
    site_visits:  Mapped[list["SiteVisit"]]   = relationship("SiteVisit", back_populates="customer")
    search_logs:  Mapped[list["SearchLog"]]   = relationship("SearchLog", back_populates="customer")

    def __repr__(self):
        return f"<Customer {self.email}>"
