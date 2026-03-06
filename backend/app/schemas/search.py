from typing import Optional, List, Any, Dict
from decimal import Decimal
from backend.app.schemas.base import BaseSchema
from backend.app.schemas.unit import UnitResponse


class NLPSearchRequest(BaseSchema):
    query: str                              # "2BHK under 50 lakhs east facing"
    session_id: Optional[str] = None


class FilterSearchRequest(BaseSchema):
    unit_type: Optional[str] = None
    bedrooms: Optional[int] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_area: Optional[Decimal] = None
    max_area: Optional[Decimal] = None
    max_down_payment: Optional[Decimal] = None
    max_emi: Optional[Decimal] = None
    facing: Optional[str] = None
    floor_min: Optional[int] = None
    floor_max: Optional[int] = None
    amenities: Optional[List[str]] = None
    city: Optional[str] = None
    project_id: Optional[str] = None
    page: int = 1
    page_size: int = 20


class SearchResponse(BaseSchema):
    query: Optional[str] = None
    interpreted_as: Optional[Dict[str, Any]] = None   # What Claude understood
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[UnitResponse]
    suggestions: Optional[List[str]] = None            # Claude suggestions
    message: Optional[str] = None                      # Claude response message
