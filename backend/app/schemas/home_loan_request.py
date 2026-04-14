from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import field_validator
from backend.app.schemas.base import BaseSchema, BaseResponseSchema, validate_phone, validate_name, validate_email_format


class HomeLoanRequestCreate(BaseSchema):
    # Applicant
    name: str
    phone: str
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhar: Optional[str] = None
    dob: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"

    # Applicant Employment
    employment_type: Optional[str] = None
    gross_monthly_income: Optional[float] = None
    current_obligations: Optional[float] = None
    organisation: Optional[str] = None
    work_experience: Optional[str] = None

    # Co-Applicant
    has_co_applicant: bool = False
    co_applicant: Optional[Dict[str, Any]] = None

    # Loan
    loan_amount: Optional[float] = None
    property_value: Optional[float] = None
    unit_id: Optional[UUID] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return validate_name(v)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v)

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        return validate_email_format(v) if v else v


class HomeLoanRequestUpdate(BaseSchema):
    status: Optional[str] = None
    admin_remarks: Optional[str] = None
    assigned_to: Optional[str] = None


class HomeLoanRequestResponse(BaseResponseSchema):
    name: str
    phone: str
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhar: Optional[str] = None
    dob: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    employment_type: Optional[str] = None
    gross_monthly_income: Optional[float] = None
    current_obligations: Optional[float] = None
    organisation: Optional[str] = None
    work_experience: Optional[str] = None
    payslips_url: Optional[str] = None
    form16_url: Optional[str] = None
    has_co_applicant: bool = False
    co_applicant: Optional[Dict[str, Any]] = None
    loan_amount: Optional[float] = None
    property_value: Optional[float] = None
    unit_id: Optional[UUID] = None
    unit_number: Optional[str] = None
    tower_name: Optional[str] = None
    project_name: Optional[str] = None
    customer_id: Optional[UUID] = None
    status: str = "new"
    notes: Optional[str] = None
    admin_remarks: Optional[str] = None
    assigned_to: Optional[str] = None
