from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore", ".*bcrypt.*")

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.schemas.customer import (
    CustomerRegister, CustomerLogin,
    CustomerResponse, TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(customer_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    return jwt.encode(
        {"sub": customer_id, "exp": expire},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: CustomerRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    customer = Customer(
        name=data.name,
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)

    token = create_token(str(customer.id))
    return TokenResponse(access_token=token, customer=customer)


@router.post("/login", response_model=TokenResponse)
async def login(data: CustomerLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    customer = result.scalar_one_or_none()

    if not customer or not customer.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(data.password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not customer.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_token(str(customer.id))
    return TokenResponse(access_token=token, customer=customer)

from fastapi import Header
from jose import JWTError
import uuid

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

@router.get("/me", response_model=CustomerResponse)
async def get_me(customer: Customer = Depends(get_current_customer)):
    return customer

@router.post("/change-password")
async def change_password(
    data: dict,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.get("current_password",""), customer.password_hash or ""):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_pw = data.get("new_password","")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    customer.password_hash = hash_password(new_pw)
    await db.flush()
    return {"message": "Password updated successfully"}

import random, string as _string
from backend.app.services.sms import send_otp_sms, generate_otp
from backend.app.models.customer import Customer

# In-memory OTP store (use Redis in production)
_otp_store: dict = {}  # phone -> {"otp": "123456", "exp": datetime}

@router.post("/send-otp")
async def send_otp(data: dict, db: AsyncSession = Depends(get_db)):
    phone = data.get("phone", "").strip()
    if not phone or len(phone) < 10:
        raise HTTPException(400, "Valid phone number required")
    otp = generate_otp(6)
    from datetime import datetime, timedelta
    _otp_store[phone] = {"otp": otp, "exp": datetime.utcnow() + timedelta(minutes=5)}
    sent = await send_otp_sms(phone, otp)
    # Dev fallback: log OTP if SMS fails
    if not sent:
        print(f"[DEV OTP] Phone: {phone} OTP: {otp}")
    return {"sent": True, "dev_otp": otp if not sent else None}

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: dict, db: AsyncSession = Depends(get_db)):
    phone = data.get("phone", "").strip()
    otp = data.get("otp", "").strip()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    consent = data.get("consent", False)
    
    stored = _otp_store.get(phone)
    from datetime import datetime
    if not stored or stored["otp"] != otp or datetime.utcnow() > stored["exp"]:
        raise HTTPException(400, "Invalid or expired OTP")
    
    del _otp_store[phone]  # consume OTP
    
    # Find or create customer
    result = await db.execute(select(Customer).where(Customer.phone == phone))
    customer = result.scalar_one_or_none()
    if not customer:
        result2 = await db.execute(select(Customer).where(Customer.email == email)) if email else None
        customer = result2.scalar_one_or_none() if result2 else None
    if not customer:
        customer = Customer(
            name=name or phone,
            phone=phone,
            email=email or None,
            marketing_consent=consent,
        )
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
    else:
        if consent:
            customer.marketing_consent = True
        await db.flush()
    
    token = create_token(str(customer.id))
    return TokenResponse(access_token=token, customer=customer)
