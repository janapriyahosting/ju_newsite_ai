from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from decimal import Decimal
from backend.app.core.database import get_db
from backend.app.models.booking import Booking
from backend.app.models.unit import Unit
from backend.app.models.coupon import Coupon
from backend.app.api.v1.routers.auth import get_current_customer
from backend.app.models.customer import Customer
from fastapi import Header
from backend.app.schemas.booking import BookingCreate, BookingResponse
from datetime import datetime

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=201)
async def create_booking(data: BookingCreate, customer: Customer = Depends(get_current_customer), db: AsyncSession = Depends(get_db)):
    # Get unit
    result = await db.execute(select(Unit).where(Unit.id == data.unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    if unit.status != "available":
        raise HTTPException(status_code=400, detail="Unit is not available")

    total_amount = unit.base_price or Decimal('0')
    booking_amount = total_amount * Decimal('0.1')
    discount_amount = Decimal('0')
    coupon_id = None

    # Apply coupon if provided
    if data.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(
                Coupon.code == data.coupon_code.upper(),
                Coupon.is_active == True
            )
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            coupon_id = coupon.id
            if coupon.discount_type == "percentage":
                discount_amount = booking_amount * (Decimal(str(coupon.discount_value)) / 100)
                if coupon.max_discount:
                    discount_amount = min(discount_amount, Decimal(str(coupon.max_discount)))
            else:
                discount_amount = Decimal(str(coupon.discount_value))
            coupon.used_count += 1

    booking = Booking(
        customer_id=customer.id,
        unit_id=data.unit_id,
        coupon_id=coupon_id,
        booking_amount=booking_amount,
        total_amount=total_amount,
        discount_amount=discount_amount,
        status="pending",
        payment_status="unpaid",
        notes=data.notes,
        booked_at=datetime.utcnow(),
    )
    db.add(booking)

    # Mark unit as on-hold
    unit.status = "hold"
    await db.flush()
    await db.refresh(booking)
    return booking


@router.get("", response_model=list[BookingResponse])
async def list_my_bookings(customer: Customer = Depends(get_current_customer), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Booking).where(Booking.customer_id == customer.id).order_by(Booking.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking
