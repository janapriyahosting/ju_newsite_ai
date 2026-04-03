from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import field_validator
from backend.app.schemas.base import (
    BaseSchema, BaseResponseSchema,
    validate_phone, validate_email_format, validate_aadhar, validate_pan,
    validate_pincode, validate_name, validate_dob_18plus, validate_positive_number,
)


class BookingKYCCreate(BaseSchema):
    booking_id: UUID

    # Correspondence Address
    corr_address: Optional[str] = None
    corr_city: Optional[str] = None
    corr_state: Optional[str] = None
    corr_pincode: Optional[str] = None

    # Permanent Address
    perm_same_as_corr: bool = False
    perm_address: Optional[str] = None
    perm_city: Optional[str] = None
    perm_state: Optional[str] = None
    perm_pincode: Optional[str] = None

    # Co-Applicant
    co_applicant_name: Optional[str] = None
    co_applicant_phone: Optional[str] = None
    co_applicant_email: Optional[str] = None
    co_applicant_relation: Optional[str] = None
    co_applicant_aadhar: Optional[str] = None
    co_applicant_pan: Optional[str] = None

    # Employment
    employer_name: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_salary: Optional[float] = None
    work_experience: Optional[str] = None

    # Loans
    has_existing_loans: bool = False
    existing_loan_amount: Optional[float] = None
    existing_loan_emi: Optional[float] = None
    loan_details: Optional[str] = None

    # KYC Documents
    aadhar_number: Optional[str] = None
    aadhar_name: Optional[str] = None
    pan_number: Optional[str] = None
    pan_name: Optional[str] = None
    date_of_birth: Optional[str] = None

    extra_data: Optional[Dict[str, Any]] = {}

    # ── Validators ────────────────────────────────────────────────────────

    @field_validator("corr_pincode", "perm_pincode")
    @classmethod
    def check_pincode(cls, v):
        return validate_pincode(v)

    @field_validator("co_applicant_phone")
    @classmethod
    def check_co_phone(cls, v):
        return validate_phone(v) if v else v

    @field_validator("co_applicant_email")
    @classmethod
    def check_co_email(cls, v):
        return validate_email_format(v) if v else v

    @field_validator("aadhar_number", "co_applicant_aadhar")
    @classmethod
    def check_aadhar(cls, v):
        return validate_aadhar(v)

    @field_validator("pan_number", "co_applicant_pan")
    @classmethod
    def check_pan(cls, v):
        return validate_pan(v)

    @field_validator("aadhar_name", "pan_name", "co_applicant_name")
    @classmethod
    def check_name(cls, v):
        return validate_name(v) if v else v

    @field_validator("date_of_birth")
    @classmethod
    def check_dob(cls, v):
        return validate_dob_18plus(v)

    @field_validator("monthly_salary", "existing_loan_amount", "existing_loan_emi")
    @classmethod
    def check_positive(cls, v):
        return validate_positive_number(v)


class BookingKYCResponse(BaseResponseSchema):
    booking_id: UUID
    corr_address: Optional[str] = None
    corr_city: Optional[str] = None
    corr_state: Optional[str] = None
    corr_pincode: Optional[str] = None
    perm_same_as_corr: bool = False
    perm_address: Optional[str] = None
    perm_city: Optional[str] = None
    perm_state: Optional[str] = None
    perm_pincode: Optional[str] = None
    co_applicant_name: Optional[str] = None
    co_applicant_phone: Optional[str] = None
    co_applicant_email: Optional[str] = None
    co_applicant_relation: Optional[str] = None
    co_applicant_aadhar: Optional[str] = None
    co_applicant_pan: Optional[str] = None
    employer_name: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_salary: Optional[float] = None
    work_experience: Optional[str] = None
    has_existing_loans: bool = False
    existing_loan_amount: Optional[float] = None
    existing_loan_emi: Optional[float] = None
    loan_details: Optional[str] = None
    aadhar_number: Optional[str] = None
    aadhar_name: Optional[str] = None
    pan_number: Optional[str] = None
    pan_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None
