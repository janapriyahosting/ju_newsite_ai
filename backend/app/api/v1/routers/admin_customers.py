from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
import uuid

from backend.app.core.database import get_db
from backend.app.models.customer import Customer
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.api.v1.routers.auth import hash_password

router = APIRouter(prefix="/admin/customers", tags=["admin-customers"])

@router.get("")
async def list_customers(
    skip: int = 0, limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin_token)
):
    result = await db.execute(
        select(Customer).order_by(desc(Customer.created_at)).offset(skip).limit(limit)
    )
    customers = result.scalars().all()
    total = await db.scalar(select(func.count()).select_from(Customer))
    return {"items": [
        {"id": str(c.id), "name": c.name, "email": c.email, "phone": c.phone,
         "is_active": c.is_active, "is_verified": c.is_verified,
         "created_at": str(c.created_at)}
        for c in customers
    ], "total": total}

@router.get("/stats")
async def customer_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin_token)
):
    total = await db.scalar(select(func.count()).select_from(Customer))
    active = await db.scalar(select(func.count()).select_from(Customer).where(Customer.is_active == True))
    verified = await db.scalar(select(func.count()).select_from(Customer).where(Customer.is_verified == True))
    # Last 30 days
    since = datetime.utcnow() - timedelta(days=30)
    recent = await db.scalar(
        select(func.count()).select_from(Customer).where(Customer.created_at >= since)
    )
    # Last 7 days
    since7 = datetime.utcnow() - timedelta(days=7)
    this_week = await db.scalar(
        select(func.count()).select_from(Customer).where(Customer.created_at >= since7)
    )
    return {
        "total_registrations": total,
        "active_customers": active,
        "verified_customers": verified,
        "registrations_last_30_days": recent,
        "registrations_last_7_days": this_week,
    }

@router.post("/{customer_id}/reset-password")
async def admin_reset_password(
    customer_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin_token)
):
    result = await db.execute(select(Customer).where(Customer.id == uuid.UUID(customer_id)))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    new_pw = data.get("new_password", "")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    customer.password_hash = hash_password(new_pw)
    await db.flush()
    return {"message": f"Password reset for {customer.email}"}

@router.patch("/{customer_id}/toggle-active")
async def toggle_active(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(verify_admin_token)
):
    result = await db.execute(select(Customer).where(Customer.id == uuid.UUID(customer_id)))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_active = not customer.is_active
    await db.flush()
    return {"is_active": customer.is_active, "message": f"Customer {'activated' if customer.is_active else 'deactivated'}"}


@router.get("/recent-logins")
async def recent_logins(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    result = await db.execute(
        select(Customer)
        .where(Customer.last_login.isnot(None))
        .order_by(Customer.last_login.desc())
        .limit(limit)
    )
    customers = result.scalars().all()
    return [
        {"id": str(c.id), "name": c.name, "email": c.email,
         "phone": c.phone, "last_login": c.last_login.isoformat() if c.last_login else None,
         "is_active": c.is_active}
        for c in customers
    ]


@router.get("/registrations/chart")
async def registration_chart(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, cast
    from sqlalchemy.types import Date as SADate
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    result = await db.execute(
        select(
            cast(Customer.created_at, SADate).label("date"),
            func.count(Customer.id).label("count")
        )
        .where(Customer.created_at >= start)
        .group_by(cast(Customer.created_at, SADate))
        .order_by(cast(Customer.created_at, SADate))
    )
    rows = result.all()
    return [{"date": str(r.date), "count": r.count} for r in rows]
