import re
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from uuid import UUID

# Strict Indian mobile: exactly 10 digits, starts with 6-9
PHONE_REGEX = re.compile(r"^[6-9]\d{9}$")


def validate_phone(v: str) -> str:
    """Strip whitespace, remove +91/0 prefix, reject anything non-numeric."""
    if not v:
        return v
    cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
    # Strip leading country code or zero
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Invalid phone number. Must be a valid 10-digit Indian mobile number.")
    return cleaned


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
