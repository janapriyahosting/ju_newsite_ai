from typing import Optional, Dict, Any
from pydantic import EmailStr
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class CustomerRegister(BaseSchema):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str


class CustomerLogin(BaseSchema):
    email: EmailStr
    password: str


class CustomerUpdate(BaseSchema):
    name: Optional[str] = None
    phone: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class CustomerResponse(BaseResponseSchema):
    name: str
    email: str
    phone: Optional[str]
    is_verified: bool
    is_active: bool
    preferences: Dict


class TokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerResponse
