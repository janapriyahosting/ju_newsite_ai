import hmac
import hashlib
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from decimal import Decimal
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.booking import Booking
from backend.app.models.unit import Unit
from backend.app.models.tower import Tower
from backend.app.models.project import Project
from backend.app.models.coupon import Coupon
from backend.app.models.field_config import FieldConfig
from backend.app.api.v1.routers.auth import get_current_customer
from backend.app.models.customer import Customer
from backend.app.schemas.booking import BookingCreate, BookingResponse, PaymentVerify
from backend.app.models.booking_kyc import BookingKYC
from backend.app.schemas.booking_kyc import BookingKYCCreate, BookingKYCResponse

router = APIRouter(prefix="/bookings", tags=["bookings"])

RZP_API = "https://api.razorpay.com/v1"


@router.post("", status_code=201)
async def create_booking(
    data: BookingCreate,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
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

    payable = booking_amount - discount_amount
    # Amount in paise for Razorpay (INR × 100)
    amount_paise = int(payable * 100)

    # Create Razorpay order via API
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{RZP_API}/orders",
                json={
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"booking_{str(data.unit_id)[:8]}_{str(customer.id)[:8]}",
                    "notes": {
                        "unit_id": str(data.unit_id),
                        "unit_number": unit.unit_number,
                        "customer_name": customer.name,
                        "customer_phone": customer.phone or "",
                    },
                },
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
            rzp_order = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {str(e)}")

    booking = Booking(
        customer_id=customer.id,
        unit_id=data.unit_id,
        coupon_id=coupon_id,
        booking_amount=booking_amount,
        total_amount=total_amount,
        discount_amount=discount_amount,
        status="pending",
        payment_status="unpaid",
        razorpay_order_id=rzp_order["id"],
        notes=data.notes,
        booked_at=datetime.utcnow(),
    )
    db.add(booking)

    # Mark unit as on-hold
    unit.status = "hold"
    await db.flush()
    await db.refresh(booking)
    await db.commit()

    return {
        "id": str(booking.id),
        "razorpay_order_id": rzp_order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount": amount_paise,
        "currency": "INR",
        "booking_amount": float(booking_amount),
        "discount_amount": float(discount_amount),
        "payable_amount": float(payable),
        "total_amount": float(total_amount),
        "status": booking.status,
        "payment_status": booking.payment_status,
        "unit_number": unit.unit_number,
        "customer_name": customer.name,
        "customer_email": customer.email,
        "customer_phone": customer.phone,
    }


@router.post("/verify-payment")
async def verify_payment(
    data: PaymentVerify,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature and confirm booking."""
    # Find booking by razorpay_order_id
    result = await db.execute(
        select(Booking).where(
            Booking.razorpay_order_id == data.razorpay_order_id,
            Booking.customer_id == customer.id,
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.payment_status == "paid":
        return {"status": "already_paid", "booking_id": str(booking.id)}

    # Verify signature
    message = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if expected_signature != data.razorpay_signature:
        booking.payment_status = "failed"
        await db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed — invalid signature")

    # Payment verified — update booking
    booking.razorpay_payment_id = data.razorpay_payment_id
    booking.razorpay_signature = data.razorpay_signature
    booking.payment_status = "paid"
    booking.status = "confirmed"
    booking.confirmed_at = datetime.utcnow()

    # Update unit status to booked
    unit_result = await db.execute(select(Unit).where(Unit.id == booking.unit_id))
    unit = unit_result.scalar_one_or_none()
    if unit:
        unit.status = "booked"

    await db.commit()
    await db.refresh(booking)

    return {
        "status": "success",
        "booking_id": str(booking.id),
        "payment_id": data.razorpay_payment_id,
        "booking_status": booking.status,
        "payment_status": booking.payment_status,
    }


@router.post("/kyc", response_model=BookingKYCResponse, status_code=201)
async def save_booking_kyc(
    data: BookingKYCCreate,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Save or update KYC details for a booking."""
    # Verify booking belongs to customer
    booking = (await db.execute(
        select(Booking).where(Booking.id == data.booking_id, Booking.customer_id == customer.id)
    )).scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    # If perm same as corr, copy addresses
    kyc_data = data.model_dump(exclude={"booking_id"})
    if data.perm_same_as_corr:
        kyc_data["perm_address"] = data.corr_address
        kyc_data["perm_city"] = data.corr_city
        kyc_data["perm_state"] = data.corr_state
        kyc_data["perm_pincode"] = data.corr_pincode

    # Upsert — check if KYC already exists for this booking
    existing = (await db.execute(
        select(BookingKYC).where(BookingKYC.booking_id == data.booking_id)
    )).scalar_one_or_none()

    if existing:
        for k, v in kyc_data.items():
            setattr(existing, k, v)
        kyc = existing
    else:
        kyc = BookingKYC(booking_id=data.booking_id, **kyc_data)
        db.add(kyc)

    await db.flush()
    await db.refresh(kyc)
    await db.commit()
    return kyc


@router.get("/kyc/{booking_id}", response_model=BookingKYCResponse)
async def get_booking_kyc(
    booking_id: UUID,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get KYC details for a booking."""
    booking = (await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == customer.id)
    )).scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")

    kyc = (await db.execute(
        select(BookingKYC).where(BookingKYC.booking_id == booking_id)
    )).scalar_one_or_none()
    if not kyc:
        raise HTTPException(404, "KYC not submitted yet")
    return kyc


def _booking_base(b: Booking) -> dict:
    return {
        "id": str(b.id),
        "customer_id": str(b.customer_id),
        "unit_id": str(b.unit_id),
        "coupon_id": str(b.coupon_id) if b.coupon_id else None,
        "booking_amount": str(b.booking_amount),
        "total_amount": str(b.total_amount),
        "discount_amount": str(b.discount_amount),
        "status": b.status,
        "payment_status": b.payment_status,
        "razorpay_order_id": b.razorpay_order_id,
        "razorpay_payment_id": b.razorpay_payment_id,
        "sf_opportunity_id": b.sf_opportunity_id,
        "notes": b.notes,
        "booked_at": b.booked_at.isoformat() if b.booked_at else None,
        "confirmed_at": b.confirmed_at.isoformat() if b.confirmed_at else None,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _unit_dict(u) -> dict:
    """Serialize all unit columns to a flat dict."""
    if not u:
        return {}
    d = {}
    for col in u.__table__.columns:
        val = getattr(u, col.name)
        if hasattr(val, 'hex'):
            val = str(val)
        elif hasattr(val, 'isoformat'):
            val = val.isoformat()
        d[col.name] = val
    return d


async def _enrich_booking(b: Booking, db: AsyncSession, visible_fields: list[str] | None = None) -> dict:
    """Enrich booking with unit, tower, project details. Filter unit fields by visible_fields if provided."""
    result = _booking_base(b)

    # Load unit
    unit = (await db.execute(select(Unit).where(Unit.id == b.unit_id))).scalar_one_or_none()
    if unit:
        unit_data = _unit_dict(unit)
        # Filter to visible fields if provided, always include core fields
        core_fields = {"id", "unit_number", "unit_type", "bedrooms", "bathrooms", "area_sqft",
                       "carpet_area", "base_price", "floor_number", "facing", "status", "images"}
        if visible_fields:
            allowed = core_fields | set(visible_fields)
            unit_data = {k: v for k, v in unit_data.items() if k in allowed}
        result["unit"] = unit_data

        # Load tower + project
        tower = (await db.execute(select(Tower).where(Tower.id == unit.tower_id))).scalar_one_or_none()
        if tower:
            result["tower"] = {"id": str(tower.id), "name": tower.name}
            project = (await db.execute(select(Project).where(Project.id == tower.project_id))).scalar_one_or_none()
            if project:
                result["project"] = {"id": str(project.id), "name": project.name, "city": project.city, "rera_number": project.rera_number}

    # Check if KYC exists
    kyc = (await db.execute(select(BookingKYC).where(BookingKYC.booking_id == b.id))).scalar_one_or_none()
    result["kyc_submitted"] = kyc is not None

    return result


@router.get("")
async def list_my_bookings(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Booking).where(Booking.customer_id == customer.id).order_by(Booking.created_at.desc())
    )
    bookings = result.scalars().all()

    # Get admin-configured visible fields for 'unit' entity (show_on_customer=True)
    fc_result = await db.execute(
        select(FieldConfig.field_key).where(
            FieldConfig.entity == "unit",
            FieldConfig.is_visible == True,
            FieldConfig.show_on_customer == True,
        )
    )
    visible_fields = [r[0] for r in fc_result.fetchall()]

    return [await _enrich_booking(b, db, visible_fields) for b in bookings]


@router.get("/{booking_id}")
async def get_booking(
    booking_id: UUID,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == customer.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return await _enrich_booking(booking, db)
