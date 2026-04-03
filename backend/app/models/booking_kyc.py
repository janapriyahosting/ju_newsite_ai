import uuid
from sqlalchemy import String, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class BookingKYC(UUIDMixin, TimeStampMixin, Base):
    """
    KYC details collected during booking.
    One-to-one with Booking.
    """
    __tablename__ = "booking_kyc"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )

    # ── Correspondence Address ────────────────────────────────────────────
    corr_address:  Mapped[str] = mapped_column(Text, nullable=True)
    corr_city:     Mapped[str] = mapped_column(String(100), nullable=True)
    corr_state:    Mapped[str] = mapped_column(String(100), nullable=True)
    corr_pincode:  Mapped[str] = mapped_column(String(10), nullable=True)

    # ── Permanent Address ─────────────────────────────────────────────────
    perm_same_as_corr: Mapped[bool] = mapped_column(Boolean, default=False)
    perm_address:  Mapped[str] = mapped_column(Text, nullable=True)
    perm_city:     Mapped[str] = mapped_column(String(100), nullable=True)
    perm_state:    Mapped[str] = mapped_column(String(100), nullable=True)
    perm_pincode:  Mapped[str] = mapped_column(String(10), nullable=True)

    # ── Co-Applicant Details ──────────────────────────────────────────────
    co_applicant_name:     Mapped[str] = mapped_column(String(255), nullable=True)
    co_applicant_phone:    Mapped[str] = mapped_column(String(20), nullable=True)
    co_applicant_email:    Mapped[str] = mapped_column(String(255), nullable=True)
    co_applicant_relation: Mapped[str] = mapped_column(String(100), nullable=True)  # spouse, parent, sibling, other
    co_applicant_aadhar:   Mapped[str] = mapped_column(String(12), nullable=True)
    co_applicant_pan:      Mapped[str] = mapped_column(String(10), nullable=True)

    # ── Employment Details ────────────────────────────────────────────────
    employer_name:   Mapped[str] = mapped_column(String(255), nullable=True)
    designation:     Mapped[str] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(50), nullable=True)   # salaried, self-employed, business, retired
    monthly_salary:  Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    work_experience: Mapped[str] = mapped_column(String(50), nullable=True)   # e.g. "5 years"

    # ── Existing Loans ────────────────────────────────────────────────────
    has_existing_loans: Mapped[bool] = mapped_column(Boolean, default=False)
    existing_loan_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    existing_loan_emi:    Mapped[float] = mapped_column(Numeric(15, 2), nullable=True)
    loan_details:         Mapped[str] = mapped_column(Text, nullable=True)  # free text

    # ── KYC Documents ─────────────────────────────────────────────────────
    aadhar_number:   Mapped[str] = mapped_column(String(12), nullable=True)
    aadhar_name:     Mapped[str] = mapped_column(String(255), nullable=True)  # name as per Aadhar
    pan_number:      Mapped[str] = mapped_column(String(10), nullable=True)
    pan_name:        Mapped[str] = mapped_column(String(255), nullable=True)  # name as per PAN
    date_of_birth:   Mapped[str] = mapped_column(String(20), nullable=True)   # YYYY-MM-DD

    # ── Extra ─────────────────────────────────────────────────────────────
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Relationship
    booking: Mapped["Booking"] = relationship("Booking", backref="kyc")

    def __repr__(self):
        return f"<BookingKYC booking={self.booking_id}>"
