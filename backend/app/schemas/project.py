from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from uuid import UUID
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class ProjectCreate(BaseSchema):
    name: str
    slug: str
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rera_number: Optional[str] = None
    amenities: List[str] = []
    images: List[str] = []
    brochure_url: Optional[str] = None
    video_url: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False


class ProjectUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    rera_number: Optional[str] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    brochure_url: Optional[str] = None
    video_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class ProjectResponse(BaseResponseSchema):
    name: str
    slug: str
    description: Optional[str]
    location: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    rera_number: Optional[str]
    amenities: List
    images: List
    brochure_url: Optional[str]
    video_url: Optional[str] = None
    walkthrough_url: Optional[str] = None
    floor_plans: Optional[list] = []
    is_active: bool
    is_featured: bool


class ProjectListResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[ProjectResponse]
