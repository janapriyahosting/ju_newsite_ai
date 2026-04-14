import uuid
from sqlalchemy import String, Text, Numeric, ForeignKey, Boolean, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base


class HomeLoanRequest(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "home_loan_requests"

    customer_id:      Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=True
    )
    unit_id:          Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True
    )

    # ── Applicant Details ──
    name:             Mapped[str] = mapped_column(String(255), nullable=False)
    phone:            Mapped[str] = mapped_column(String(20), nullable=False)
    email:            Mapped[str] = mapped_column(String(255), nullable=True)
    pan:              Mapped[str] = mapped_column(String(20), nullable=True)
    aadhar:           Mapped[str] = mapped_column(String(20), nullable=True)
    dob:              Mapped[str] = mapped_column(String(20), nullable=True)
    address_line1:    Mapped[str] = mapped_column(String(500), nullable=True)
    address_line2:    Mapped[str] = mapped_column(String(500), nullable=True)
    city:             Mapped[str] = mapped_column(String(100), nullable=True)
    pincode:          Mapped[str] = mapped_column(String(10), nullable=True)
    state:            Mapped[str] = mapped_column(String(100), nullable=True)
    country:          Mapped[str] = mapped_column(String(100), default="India")

    # ── Applicant Employment ──
    employment_type:      Mapped[str] = mapped_column(String(50), nullable=True)
    gross_monthly_income: Mapped[str] = mapped_column(Numeric(14, 2), nullable=True)
    current_obligations:  Mapped[str] = mapped_column(Numeric(14, 2), nullable=True)
    organisation:         Mapped[str] = mapped_column(String(255), nullable=True)
    work_experience:      Mapped[str] = mapped_column(String(50), nullable=True)
    payslips_url:         Mapped[str] = mapped_column(String(500), nullable=True)
    form16_url:           Mapped[str] = mapped_column(String(500), nullable=True)

    # ── Co-Applicant (JSON blob) ──
    has_co_applicant: Mapped[bool] = mapped_column(Boolean, default=False)
    co_applicant:     Mapped[dict] = mapped_column(JSON, nullable=True)  # same structure as applicant

    # ── Loan / Property ──
    loan_amount:      Mapped[str] = mapped_column(Numeric(14, 2), nullable=True)
    property_value:   Mapped[str] = mapped_column(Numeric(14, 2), nullable=True)

    # ── Property Context (denormalized for Salesforce) ──
    unit_number:      Mapped[str] = mapped_column(String(50), nullable=True)
    tower_name:       Mapped[str] = mapped_column(String(255), nullable=True)
    project_name:     Mapped[str] = mapped_column(String(255), nullable=True)

    # ── Admin ──
    status:           Mapped[str] = mapped_column(String(30), default="new")
    notes:            Mapped[str] = mapped_column(Text, nullable=True)
    admin_remarks:    Mapped[str] = mapped_column(Text, nullable=True)
    assigned_to:      Mapped[str] = mapped_column(String(255), nullable=True)

    # Relationships
    customer = relationship("Customer")
    unit = relationship("Unit")

    def __repr__(self):
        return f"<HomeLoanRequest {self.name} - {self.status}>"
