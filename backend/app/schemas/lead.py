from typing import Optional, Dict, Any
from pydantic import field_validator
from backend.app.schemas.base import BaseSchema, BaseResponseSchema, validate_phone, validate_name, validate_email_format


class LeadCreate(BaseSchema):
    name: str
    phone: str

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

    email: Optional[str] = None
    source: Optional[str] = "website"
    interest: Optional[str] = None
    project_interest: Optional[str] = None
    budget_min: Optional[str] = None
    budget_max: Optional[str] = None
    message: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}


class LeadUpdate(BaseSchema):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    interest: Optional[str] = None


class LeadResponse(BaseResponseSchema):
    name: str
    phone: str
    email: Optional[str] = None
    source: Optional[str] = None
    status: str
    interest: Optional[str] = None
    project_interest: Optional[str] = None
    budget_min: Optional[str] = None
    budget_max: Optional[str] = None
    message: Optional[str] = None
    notes: Optional[str] = None
    lead_score: int = 0
    score_details: Optional[Dict[str, Any]] = None
    sf_lead_id: Optional[str] = None
    assigned_to: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
