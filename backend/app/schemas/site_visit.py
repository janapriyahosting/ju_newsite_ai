from typing import Optional
from datetime import datetime
from uuid import UUID
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class SiteVisitCreate(BaseSchema):
    name: str
    phone: str
    email: Optional[str] = None
    project_id: Optional[UUID] = None
    visit_date: datetime
    visit_time: Optional[str] = None
    notes: Optional[str] = None


class SiteVisitUpdate(BaseSchema):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    visit_date: Optional[datetime] = None
    visit_time: Optional[str] = None


class SiteVisitResponse(BaseResponseSchema):
    name: str
    phone: str
    email: Optional[str]
    project_id: Optional[UUID]
    visit_date: datetime
    visit_time: Optional[str]
    status: str
    notes: Optional[str]
    assigned_to: Optional[str]
    reminder_sent: bool
