from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
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
    # Check existing
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

    if not customer or not verify_password(data.password, customer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not customer.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_token(str(customer.id))
    return TokenResponse(access_token=token, customer=customer)
