from typing import Optional, Dict, Any
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class LeadCreate(BaseSchema):
    name: str
    phone: str
    email: Optional[str] = None
    source: Optional[str] = "website"
    interest: Optional[str] = None
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
    email: Optional[str]
    source: Optional[str]
    status: str
    interest: Optional[str]
    budget_min: Optional[str]
    budget_max: Optional[str]
    message: Optional[str]
    sf_lead_id: Optional[str]
    assigned_to: Optional[str]
