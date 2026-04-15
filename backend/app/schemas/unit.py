from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class UnitCreate(BaseSchema):
    tower_id: UUID
    unit_number: str
    floor_number: int
    unit_type: Optional[str] = None       # 1BHK, 2BHK, 3BHK, villa, plot
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    balconies: int = 0
    area_sqft: Optional[Decimal] = None
    carpet_area: Optional[Decimal] = None
    plot_area: Optional[Decimal] = None
    base_price: Optional[Decimal] = None
    price_per_sqft: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    emi_estimate: Optional[Decimal] = None
    token_amount: Decimal = Decimal("20000")
    facing: Optional[str] = None
    floor_plan_img: Optional[str] = None
    status: str = "available"
    amenities: List[str] = []
    images: List[str] = []
    is_trending: bool = False
    is_featured: bool = False


class UnitUpdate(BaseSchema):
    unit_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    balconies: Optional[int] = None
    area_sqft: Optional[Decimal] = None
    carpet_area: Optional[Decimal] = None
    base_price: Optional[Decimal] = None
    price_per_sqft: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    emi_estimate: Optional[Decimal] = None
    token_amount: Optional[Decimal] = None
    facing: Optional[str] = None
    floor_plan_img: Optional[str] = None
    status: Optional[str] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    is_trending: Optional[bool] = None
    is_featured: Optional[bool] = None


class UnitResponse(BaseResponseSchema):
    tower_id: UUID
    unit_number: str
    floor_number: int
    unit_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    balconies: int = 0
    area_sqft: Optional[Decimal] = None
    carpet_area: Optional[Decimal] = None
    plot_area: Optional[Decimal] = None
    base_price: Optional[Decimal] = None
    price_per_sqft: Optional[Decimal] = None
    down_payment: Optional[Decimal] = None
    emi_estimate: Optional[Decimal] = None
    token_amount: Optional[Decimal] = Decimal("20000")
    facing: Optional[str] = None
    floor_plan_img: Optional[str] = None
    status: str = "available"
    amenities: List = []
    images: List = []
    floor_plans: List = []
    video_url: Optional[str] = None
    walkthrough_url: Optional[str] = None
    dimensions: List = []
    brochure_url: Optional[str] = None
    is_trending: bool = False
    is_featured: bool = False
    view_count: int = 0
    thumbnail: Optional[str] = None
    custom_fields: Optional[dict] = None


class UnitFilterParams(BaseSchema):
    unit_type: Optional[str] = None
    bedrooms: Optional[int] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_area: Optional[Decimal] = None
    max_area: Optional[Decimal] = None
    max_down_payment: Optional[Decimal] = None
    max_emi: Optional[Decimal] = None
    facing: Optional[str] = None
    floor_number: Optional[int] = None
    status: str = "available"
    is_trending: Optional[bool] = None
    tower_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    page: int = 1
    page_size: int = 20


class UnitListResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[UnitResponse]
