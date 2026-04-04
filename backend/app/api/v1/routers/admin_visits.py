import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.site_visit import SiteVisit
from backend.app.services.notification_engine import fire_notification_background

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/visits")
async def list_visits(
    page: int = 1, page_size: int = 20, status: str = "",
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    q = select(SiteVisit)
    if status: q = q.where(SiteVisit.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(
        q.order_by(SiteVisit.visit_date.desc())
        .offset((page-1)*page_size).limit(page_size)
    )
    visits = result.scalars().all()
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [
            {
                "id": str(v.id), "name": v.name, "phone": v.phone,
                "email": v.email,
                "visit_date": v.visit_date.isoformat() if v.visit_date else None,
                "visit_time": v.visit_time, "status": v.status,
                "notes": v.notes,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in visits
        ]
    }

@router.patch("/visits/{visit_id}")
async def update_visit(
    visit_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    result = await db.execute(select(SiteVisit).where(SiteVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit: raise HTTPException(404, "Visit not found")
    old_status = visit.status
    for k, v in data.items():
        if k in ["status", "notes"]: setattr(visit, k, v)
    await db.flush()

    # Fire notification when status changes to confirmed
    if data.get("status") == "confirmed" and old_status != "confirmed":
        asyncio.create_task(fire_notification_background(
            "site_visit_confirmed", {
                "customer_name": visit.name or "",
                "customer_phone": visit.phone or "",
                "customer_email": visit.email or "",
                "visit_date": visit.visit_date.strftime("%d %b %Y") if visit.visit_date else "",
                "visit_time": visit.visit_time or "",
                "project_name": "",
            },
            recipient_phone=visit.phone, recipient_email=visit.email,
        ))

    return {"id": str(visit.id), "status": visit.status}
