from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class BaseResponseSchema(BaseSchema):
    id: UUID
    created_at: datetime
    updated_at: datetime


class PaginationParams(BaseSchema):
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseSchema):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list
