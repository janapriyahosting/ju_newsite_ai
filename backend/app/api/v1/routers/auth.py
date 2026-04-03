from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
from datetime import datetime, timedelta
import uuid
import warnings
warnings.filterwarnings("ignore", ".*bcrypt.*")

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.schemas.customer import CustomerResponse, TokenResponse
from backend.app.services.sms import send_otp_sms, generate_otp
from backend.app.schemas.base import validate_phone
from passlib.context import CryptContext
import re

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
    email = data.get("email", "").strip()[:255] or None
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

@router.get("/me", response_model=CustomerResponse)
async def get_me(customer: Customer = Depends(get_current_customer)):
    return customer
