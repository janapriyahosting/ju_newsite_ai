from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.site_visit import SiteVisit

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
    for k, v in data.items():
        if k in ["status", "notes"]: setattr(visit, k, v)
    await db.flush()
    return {"id": str(visit.id), "status": visit.status}
