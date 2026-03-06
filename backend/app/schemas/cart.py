from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from backend.app.schemas.base import BaseSchema, BaseResponseSchema
from backend.app.schemas.unit import UnitResponse


class CartItemCreate(BaseSchema):
    unit_id: UUID


class CartItemResponse(BaseResponseSchema):
    customer_id: UUID
    unit_id: UUID
    unit: Optional[UnitResponse] = None


class CartResponse(BaseSchema):
    items: List[CartItemResponse]
    total_items: int
    subtotal: Optional[Decimal] = None
