import re
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime, date
from uuid import UUID

# ── Shared Validators ─────────────────────────────────────────────────────────

PHONE_REGEX = re.compile(r"^[6-9]\d{9}$")
AADHAR_REGEX = re.compile(r"^\d{12}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
PINCODE_REGEX = re.compile(r"^\d{6}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def validate_phone(v: str) -> str:
    """Strip whitespace, remove +91/0 prefix, reject anything non-numeric."""
    if not v:
        return v
    cleaned = re.sub(r"[\s\-\(\)\+]", "", v)
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Invalid phone number. Must be a valid 10-digit Indian mobile number.")
    return cleaned


def validate_email_format(v: str) -> str:
    """Validate email format if provided."""
    if not v:
        return v
    if not EMAIL_REGEX.match(v):
        raise ValueError("Invalid email address format.")
    return v.lower().strip()


def validate_aadhar(v: str) -> str:
    """Validate Aadhar: exactly 12 digits."""
    if not v:
        return v
    cleaned = re.sub(r"\s", "", v)
    if not AADHAR_REGEX.match(cleaned):
        raise ValueError("Aadhar must be exactly 12 digits.")
    return cleaned


def validate_pan(v: str) -> str:
    """Validate PAN: format ABCDE1234F."""
    if not v:
        return v
    cleaned = v.upper().strip()
    if not PAN_REGEX.match(cleaned):
        raise ValueError("PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter).")
    return cleaned


def validate_pincode(v: str) -> str:
    """Validate Indian pincode: exactly 6 digits."""
    if not v:
        return v
    cleaned = re.sub(r"\s", "", v)
    if not PINCODE_REGEX.match(cleaned):
        raise ValueError("Pincode must be exactly 6 digits.")
    return cleaned


def validate_name(v: str) -> str:
    """Validate name: min 2 chars, max 255, no special chars."""
    if not v:
        return v
    v = v.strip()
    if len(v) < 2:
        raise ValueError("Name must be at least 2 characters.")
    if len(v) > 255:
        raise ValueError("Name must not exceed 255 characters.")
    return v


def validate_dob_18plus(v: str) -> str:
    """Validate date of birth: must be 18+."""
    if not v:
        return v
    try:
        dob = datetime.strptime(v, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Date of birth must be in YYYY-MM-DD format.")
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 18:
        raise ValueError("Must be at least 18 years old.")
    if age > 120:
        raise ValueError("Invalid date of birth.")
    return v


def validate_positive_number(v):
    """Validate number is positive if provided."""
    if v is not None and v < 0:
        raise ValueError("Must be a positive number.")
    return v


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
