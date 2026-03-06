from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from backend.app.schemas.base import BaseSchema, BaseResponseSchema


class BookingCreate(BaseSchema):
    unit_id: UUID
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class BookingResponse(BaseResponseSchema):
    customer_id: UUID
    unit_id: UUID
    coupon_id: Optional[UUID]
    booking_amount: Decimal
    total_amount: Decimal
    discount_amount: Decimal
    status: str
    payment_status: str
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    sf_opportunity_id: Optional[str]
    notes: Optional[str]
    booked_at: Optional[datetime]
    confirmed_at: Optional[datetime]


class PaymentVerify(BaseSchema):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
