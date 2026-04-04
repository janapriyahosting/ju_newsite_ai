import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.models.site_visit import SiteVisit
from backend.app.schemas.site_visit import SiteVisitCreate, SiteVisitUpdate, SiteVisitResponse
from backend.app.api.v1.routers.auth import get_current_customer
from backend.app.services.notification_engine import fire_notification_background

router = APIRouter(prefix="/site-visits", tags=["site-visits"])

@router.post("", response_model=SiteVisitResponse, status_code=201)
async def request_site_visit(
    data: SiteVisitCreate,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    visit_data = data.model_dump()
    # Attach customer_id from token if logged in
    if authorization and authorization.startswith("Bearer "):
        try:
            customer = await get_current_customer(authorization=authorization, db=db)
            visit_data["customer_id"] = customer.id
        except Exception:
            pass  # Allow anonymous bookings
    visit = SiteVisit(**visit_data, status="pending")
    db.add(visit)
    await db.flush()
    await db.refresh(visit)

    # Fire site_visit_requested notification
    asyncio.create_task(fire_notification_background(
        "site_visit_requested", {
            "customer_name": visit.name or "",
            "customer_phone": visit.phone or "",
            "customer_email": visit.email or "",
            "visit_date": visit.visit_date.strftime("%d %b %Y") if visit.visit_date else "",
            "visit_time": visit.visit_time or "",
            "project_name": "",
        },
        recipient_phone=visit.phone, recipient_email=visit.email,
    ))
    return visit

@router.get("", response_model=list[SiteVisitResponse])
async def list_my_site_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_customer=Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    """Returns only the logged-in customer's site visits."""
    query = select(SiteVisit).where(SiteVisit.customer_id == current_customer.id)
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(SiteVisit.visit_date.asc()).offset(offset).limit(page_size)
    )
    return result.scalars().all()

@router.get("/{visit_id}", response_model=SiteVisitResponse)
async def get_site_visit(
    visit_id: UUID,
    current_customer=Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SiteVisit).where(
            SiteVisit.id == visit_id,
            SiteVisit.customer_id == current_customer.id
        )
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
    return visit

@router.patch("/{visit_id}", response_model=SiteVisitResponse)
async def update_site_visit(
    visit_id: UUID,
    data: SiteVisitUpdate,
    current_customer=Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SiteVisit).where(
            SiteVisit.id == visit_id,
            SiteVisit.customer_id == current_customer.id
        )
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(visit, key, value)
    await db.flush()
    await db.refresh(visit)
    return visit
