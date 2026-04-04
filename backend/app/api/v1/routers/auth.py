import os
import re
import uuid
import asyncio
import warnings
import mimetypes
from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from datetime import datetime, timedelta
warnings.filterwarnings("ignore", ".*bcrypt.*")

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.schemas.customer import CustomerResponse, TokenResponse
from backend.app.services.sms import send_otp_sms, generate_otp
from backend.app.schemas.base import validate_phone, validate_email_format, validate_name
from passlib.context import CryptContext

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# In-memory OTP store — keyed by phone
# Format: { "9876543210": {"otp": "123456", "exp": datetime, "purpose": "auth"} }
_otp_store: dict = {}


def create_token(customer_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    return jwt.encode(
        {"sub": customer_id, "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


async def get_current_customer(authorization: str = Header(None), db: AsyncSession = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        customer_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(Customer).where(Customer.id == uuid.UUID(customer_id)))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


# ── OTP: Send ────────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(data: dict):
    """
    Send OTP to a phone number.
    Body: { "phone": "9876543210", "purpose": "auth" }
    Purpose: auth | lead | site_visit | brochure
    """
    raw_phone = data.get("phone", "").strip()
    try:
        phone = validate_phone(raw_phone)
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid phone number. Must be a valid 10-digit Indian mobile number.")

    # Rate limit: don't allow resend within 30 seconds
    existing = _otp_store.get(phone)
    if existing and (datetime.utcnow() - existing.get("sent_at", datetime.min)).total_seconds() < 30:
        raise HTTPException(429, "OTP already sent. Please wait 30 seconds before retrying.")

    otp = generate_otp(6)
    purpose = data.get("purpose", "auth")
    _otp_store[phone] = {
        "otp": otp,
        "exp": datetime.utcnow() + timedelta(minutes=5),
        "purpose": purpose,
        "sent_at": datetime.utcnow(),
    }
    sent = await send_otp_sms(phone, otp)
    # Dev fallback: log OTP if SMS fails
    if not sent:
        print(f"[DEV OTP] Phone: {phone} OTP: {otp}")
    return {"sent": True, "dev_otp": otp if settings.DEBUG and not sent else None}


# ── OTP: Verify + Auto Login/Register ────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(data: dict, db: AsyncSession = Depends(get_db)):
    """
    Verify OTP and login/register customer.
    Body: { "phone": "...", "otp": "...", "mode": "login"|"register", "name": "...", "email": "...", "consent": true }
    mode=login  → rejects if user not found (returns 404 with not_found flag)
    mode=register → creates new user if not found
    """
    try:
        phone = validate_phone(data.get("phone", "").strip())
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid phone number")
    otp_code = data.get("otp", "").strip()
    if not re.match(r"^\d{6}$", otp_code):
        raise HTTPException(400, "OTP must be exactly 6 digits")
    mode = data.get("mode", "register")  # default to register for backward compat
    name = data.get("name", "").strip()[:255]
    email_raw = data.get("email", "").strip()[:255] or None
    try:
        email = validate_email_format(email_raw) if email_raw else None
    except ValueError:
        raise HTTPException(400, "Invalid email address format.")
    consent = bool(data.get("consent", False))

    stored = _otp_store.get(phone)
    if not stored or stored["otp"] != otp_code or datetime.utcnow() > stored["exp"]:
        raise HTTPException(400, "Invalid or expired OTP")

    del _otp_store[phone]  # consume OTP

    # Find existing customer by phone
    result = await db.execute(select(Customer).where(Customer.phone == phone))
    customer = result.scalar_one_or_none()

    if not customer:
        if mode == "login":
            # Login mode: user must already exist
            raise HTTPException(404, "Account not found. Please register first.")
        # Register mode: create new user
        customer = Customer(
            name=name or phone,
            phone=phone,
            email=email,
            is_verified=True,
            marketing_consent=consent,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
        # Fire welcome notification for new registration
        from backend.app.services.notification_engine import fire_notification_background
        asyncio.create_task(fire_notification_background(
            "welcome", {
                "customer_name": customer.name,
                "customer_phone": customer.phone or "",
                "customer_email": customer.email or "",
            },
            recipient_phone=customer.phone, recipient_email=customer.email,
        ))
    else:
        # Existing user — update
        customer.is_verified = True
        if name and (not customer.name or customer.name == customer.phone):
            customer.name = name
        if email and not customer.email:
            customer.email = email
        if consent:
            customer.marketing_consent = True
        customer.last_login = datetime.utcnow()
        await db.flush()

    await db.commit()
    await db.refresh(customer)
    token = create_token(str(customer.id))
    # Build response dict manually to avoid lazy-load issues
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": {
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "profile_pic": customer.profile_pic,
            "is_verified": customer.is_verified,
            "is_active": customer.is_active,
            "preferences": customer.preferences or {},
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "updated_at": customer.updated_at.isoformat() if customer.updated_at else None,
        },
    }


# ── OTP: Standalone Verify (for forms — no login needed) ─────────────────────

@router.post("/verify-phone")
async def verify_phone_only(data: dict):
    """
    Verify OTP without creating a session/token.
    Used by contact form, site visit, brochure download.
    Body: { "phone": "9876543210", "otp": "123456" }
    Returns: { "verified": true, "phone": "9876543210" }
    """
    try:
        phone = validate_phone(data.get("phone", "").strip())
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid phone number")
    otp_code = data.get("otp", "").strip()
    if not re.match(r"^\d{6}$", otp_code):
        raise HTTPException(400, "OTP must be exactly 6 digits")

    stored = _otp_store.get(phone)
    if not stored or stored["otp"] != otp_code or datetime.utcnow() > stored["exp"]:
        raise HTTPException(400, "Invalid or expired OTP")

    del _otp_store[phone]
    return {"verified": True, "phone": phone}


# ── Get Current User ─────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(customer: Customer = Depends(get_current_customer)):
    return {
        "id": str(customer.id),
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "profile_pic": customer.profile_pic,
        "is_verified": customer.is_verified,
        "is_active": customer.is_active,
        "preferences": customer.preferences or {},
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
    }


# ── Profile: Update Name ────────────────────────────────────────────────────

@router.patch("/profile")
async def update_profile(
    data: dict,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Update customer name (no OTP needed)."""
    name = data.get("name", "").strip()
    if name:
        try:
            name = validate_name(name)
        except (ValueError, TypeError):
            raise HTTPException(400, "Name must be 2-255 characters")
        customer.name = name
        await db.commit()
        await db.refresh(customer)
    return {
        "id": str(customer.id), "name": customer.name,
        "email": customer.email, "phone": customer.phone,
        "profile_pic": customer.profile_pic,
        "is_verified": customer.is_verified, "is_active": customer.is_active,
    }


# ── Profile: Upload Profile Pic ─────────────────────────────────────────────

MEDIA_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "media")
ALLOWED_IMG = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/profile/pic")
async def upload_profile_pic(
    file: UploadFile = File(...),
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace profile picture."""
    ct = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if ct not in ALLOWED_IMG:
        raise HTTPException(400, "Only JPEG, PNG, WebP, and GIF images are allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image too large (max 5MB)")

    ext = os.path.splitext(file.filename or "photo.jpg")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(MEDIA_ROOT, "customer", "profile")
    os.makedirs(folder, exist_ok=True)

    # Delete old pic if exists
    if customer.profile_pic:
        old_path = os.path.join(MEDIA_ROOT, "..", customer.profile_pic.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    filepath = os.path.join(folder, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/media/customer/profile/{filename}"
    customer.profile_pic = url
    await db.commit()
    await db.refresh(customer)
    return {"profile_pic": url}


@router.delete("/profile/pic")
async def delete_profile_pic(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Remove profile picture."""
    if customer.profile_pic:
        old_path = os.path.join(MEDIA_ROOT, "..", customer.profile_pic.lstrip("/"))
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass
        customer.profile_pic = None
        await db.commit()
    return {"profile_pic": None}


# ── Profile: Send OTP for Phone/Email Change ────────────────────────────────

@router.post("/profile/send-otp")
async def profile_send_otp(
    data: dict,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """
    Send OTP to verify a new phone or email before updating.
    Body: { "type": "phone", "value": "9876543210" }
       or { "type": "email", "value": "new@email.com" }
    """
    change_type = data.get("type", "").strip()
    value = data.get("value", "").strip()

    if change_type == "phone":
        try:
            phone = validate_phone(value)
        except (ValueError, TypeError):
            raise HTTPException(400, "Invalid phone number")
        # Check if already taken by another customer
        existing = await db.execute(
            select(Customer).where(Customer.phone == phone, Customer.id != customer.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, "This phone number is already registered to another account")
        # Rate limit
        stored = _otp_store.get(f"profile_{phone}")
        if stored and (datetime.utcnow() - stored.get("sent_at", datetime.min)).total_seconds() < 30:
            raise HTTPException(429, "OTP already sent. Wait 30 seconds.")
        otp = generate_otp(6)
        _otp_store[f"profile_{phone}"] = {
            "otp": otp, "exp": datetime.utcnow() + timedelta(minutes=5),
            "purpose": "profile_phone", "sent_at": datetime.utcnow(),
            "customer_id": str(customer.id),
        }
        sent = await send_otp_sms(phone, otp)
        if not sent:
            print(f"[DEV OTP] Profile phone change: {phone} OTP: {otp}")
        return {"sent": True, "type": "phone", "dev_otp": otp if settings.DEBUG and not sent else None}

    elif change_type == "email":
        try:
            email = validate_email_format(value)
        except (ValueError, TypeError):
            raise HTTPException(400, "Invalid email address")
        existing = await db.execute(
            select(Customer).where(Customer.email == email, Customer.id != customer.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, "This email is already registered to another account")
        otp = generate_otp(6)
        _otp_store[f"profile_{email}"] = {
            "otp": otp, "exp": datetime.utcnow() + timedelta(minutes=5),
            "purpose": "profile_email", "sent_at": datetime.utcnow(),
            "customer_id": str(customer.id),
        }
        print(f"[Profile] Sending email OTP to {email}: {otp}")
        from backend.app.services.email import _send_email_sync
        html = (
            '<div style="font-family:Lato,Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">'
            '<h2 style="color:#2A3887;">Verify Your Email</h2>'
            '<p>Your OTP for verifying your new email on Janapriya Upscale is:</p>'
            f'<div style="background:#F0F4FF;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">'
            f'<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2A3887;">{otp}</span>'
            '</div>'
            '<p style="color:#666;font-size:13px;">Valid for 5 minutes. Do not share this code.</p>'
            '</div>'
        )
        import asyncio as _aio
        sent = await _aio.to_thread(
            _send_email_sync, email, "Verify Your Email - Janapriya Upscale", html
        )
        print(f"[Profile] Email OTP send result: {sent}")
        if not sent:
            print(f"[DEV OTP] Profile email change: {email} OTP: {otp}")
        return {"sent": True, "type": "email", "dev_otp": otp if settings.DEBUG and not sent else None}

    else:
        raise HTTPException(400, "type must be 'phone' or 'email'")


# ── Profile: Verify OTP and Update Phone/Email ──────────────────────────────

@router.post("/profile/verify-update")
async def profile_verify_and_update(
    data: dict,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify OTP and update phone or email.
    Body: { "type": "phone", "value": "9876543210", "otp": "123456" }
       or { "type": "email", "value": "new@email.com", "otp": "123456" }
    """
    change_type = data.get("type", "").strip()
    value = data.get("value", "").strip()
    otp_code = data.get("otp", "").strip()

    if not re.match(r"^\d{6}$", otp_code):
        raise HTTPException(400, "OTP must be exactly 6 digits")

    key = f"profile_{value}"
    stored = _otp_store.get(key)
    if not stored or stored["otp"] != otp_code or datetime.utcnow() > stored["exp"]:
        raise HTTPException(400, "Invalid or expired OTP")
    if stored.get("customer_id") != str(customer.id):
        raise HTTPException(400, "OTP does not match your account")

    del _otp_store[key]

    if change_type == "phone":
        phone = validate_phone(value)
        customer.phone = phone
    elif change_type == "email":
        email = validate_email_format(value)
        customer.email = email
    else:
        raise HTTPException(400, "type must be 'phone' or 'email'")

    await db.commit()
    await db.refresh(customer)
    return {
        "updated": True, "type": change_type,
        "id": str(customer.id), "name": customer.name,
        "email": customer.email, "phone": customer.phone,
        "profile_pic": customer.profile_pic,
        "is_verified": customer.is_verified, "is_active": customer.is_active,
    }
