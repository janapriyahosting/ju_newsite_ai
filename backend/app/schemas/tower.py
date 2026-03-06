from typing import Optional, List
from uuid import UUID
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class TowerCreate(BaseSchema):
    project_id: UUID
    name: str
    description: Optional[str] = None
    total_floors: int
    total_units: int = 0
    svg_floor_plan: Optional[str] = None
    images: List[str] = []
    is_active: bool = True


class TowerUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    total_floors: Optional[int] = None
    total_units: Optional[int] = None
    svg_floor_plan: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None


class TowerResponse(BaseResponseSchema):
    project_id: UUID
    name: str
    description: Optional[str]
    total_floors: int
    total_units: int
    svg_floor_plan: Optional[str]
    images: List
    is_active: bool


class TowerListResponse(BaseSchema):
    total: int
    items: List[TowerResponse]
