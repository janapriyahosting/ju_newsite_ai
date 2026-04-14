import hmac
import hashlib
import asyncio
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
from backend.app.services.notification_engine import fire_notification_background

router = APIRouter(prefix="/bookings", tags=["bookings"])

RZP_API = "https://api.razorpay.com/v1"


def _fmt_amount(amount) -> str:
    """Format amount to readable INR string."""
    n = float(amount) if amount else 0
    if n >= 10000000:
        return f"Rs.{n/10000000:.2f} Cr"
    if n >= 100000:
        return f"Rs.{n/100000:.1f} L"
    return f"Rs.{n:,.0f}"


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
    booking_amount = Decimal(str(unit.token_amount)) if unit.token_amount else Decimal('20000')
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
                try:
                    rzp_err = resp.json()
                    err_desc = rzp_err.get("error", {}).get("description", "Unknown payment error")
                except Exception:
                    err_desc = "Payment gateway returned an error"
                raise HTTPException(status_code=400, detail=err_desc)
            rzp_order = resp.json()
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail="Unable to connect to payment gateway. Please try again.")

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

    # Rescore leads for this customer
    try:
        from backend.app.services.lead_scoring import rescore_leads_for_customer
        await rescore_leads_for_customer(customer.id, customer.phone or "", db)
    except Exception:
        pass

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

    # Send booking confirmation notifications via engine
    if unit:
        project_name = "Janapriya Upscale"
        try:
            tower = (await db.execute(select(Tower).where(Tower.id == unit.tower_id))).scalar_one_or_none()
            if tower:
                proj = (await db.execute(select(Project).where(Project.id == tower.project_id))).scalar_one_or_none()
                if proj:
                    project_name = proj.name
        except Exception:
            pass
        booking_ctx = {
            "customer_name": customer.name,
            "customer_email": customer.email or "",
            "customer_phone": customer.phone or "",
            "unit_number": unit.unit_number,
            "project_name": project_name,
            "booking_amount": _fmt_amount(booking.booking_amount),
            "total_amount": _fmt_amount(booking.total_amount),
            "payment_id": data.razorpay_payment_id,
            "booking_id": str(booking.id)[:8].upper(),
            "booked_at": booking.confirmed_at.strftime("%d %b %Y") if booking.confirmed_at else "",
            "amount": str(int(float(booking.booking_amount))) if booking.booking_amount else "0",
            "transaction_id": data.razorpay_payment_id,
        }
        asyncio.create_task(fire_notification_background(
            "booking_confirmed", booking_ctx,
            recipient_phone=customer.phone, recipient_email=customer.email,
        ))
        asyncio.create_task(fire_notification_background(
            "payment_received", booking_ctx,
            recipient_phone=customer.phone, recipient_email=customer.email,
        ))

    return {
        "status": "success",
        "booking_id": str(booking.id),
        "payment_id": data.razorpay_payment_id,
        "booking_status": booking.status,
        "payment_status": booking.payment_status,
    }


@router.get("/{booking_id}/receipt")
async def get_payment_receipt(
    booking_id: UUID,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get payment receipt for a confirmed booking."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == customer.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.payment_status != "paid" or not booking.razorpay_payment_id:
        raise HTTPException(status_code=400, detail="No payment found for this booking")

    # Fetch payment details from Razorpay
    razorpay_data = None
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{RZP_API}/payments/{booking.razorpay_payment_id}",
                    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
                )
                if resp.status_code == 200:
                    razorpay_data = resp.json()
        except Exception as e:
            print(f"[Receipt] Razorpay fetch error: {e}")

    # Load unit, tower, project
    unit = (await db.execute(select(Unit).where(Unit.id == booking.unit_id))).scalar_one_or_none()
    project_name = "Janapriya Upscale"
    tower_name = ""
    if unit:
        tower = (await db.execute(select(Tower).where(Tower.id == unit.tower_id))).scalar_one_or_none()
        if tower:
            tower_name = tower.name
            proj = (await db.execute(select(Project).where(Project.id == tower.project_id))).scalar_one_or_none()
            if proj:
                project_name = proj.name

    receipt = {
        "booking_id": str(booking.id),
        "customer_name": customer.name,
        "customer_email": customer.email,
        "customer_phone": customer.phone,
        "unit_number": unit.unit_number if unit else None,
        "unit_type": unit.unit_type if unit else None,
        "project_name": project_name,
        "tower_name": tower_name,
        "booking_amount": str(booking.booking_amount),
        "total_amount": str(booking.total_amount),
        "discount_amount": str(booking.discount_amount),
        "payment_status": booking.payment_status,
        "booking_status": booking.status,
        "razorpay_payment_id": booking.razorpay_payment_id,
        "razorpay_order_id": booking.razorpay_order_id,
        "booked_at": booking.booked_at.isoformat() if booking.booked_at else None,
        "confirmed_at": booking.confirmed_at.isoformat() if booking.confirmed_at else None,
    }

    # Add Razorpay payment details if available
    if razorpay_data:
        receipt["payment_method"] = razorpay_data.get("method", "")
        receipt["payment_amount_paise"] = razorpay_data.get("amount", 0)
        receipt["payment_currency"] = razorpay_data.get("currency", "INR")
        receipt["payment_email"] = razorpay_data.get("email", "")
        receipt["payment_contact"] = razorpay_data.get("contact", "")
        receipt["payment_created_at"] = razorpay_data.get("created_at", None)
        receipt["bank"] = razorpay_data.get("bank", "")
        receipt["wallet"] = razorpay_data.get("wallet", "")
        receipt["vpa"] = razorpay_data.get("vpa", "")
        receipt["card_last4"] = razorpay_data.get("card", {}).get("last4", "") if razorpay_data.get("card") else ""
        receipt["card_network"] = razorpay_data.get("card", {}).get("network", "") if razorpay_data.get("card") else ""

    return receipt


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
