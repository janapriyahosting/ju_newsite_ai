from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from decimal import Decimal
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.unit import Unit
from backend.app.models.project import Project
from backend.app.models.tower import Tower

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/units")
async def list_units(
    page: int = 1, page_size: int = 20,
    status: str = "", unit_type: str = "",
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    q = select(Unit)
    if status:    q = q.where(Unit.status == status)
    if unit_type: q = q.where(Unit.unit_type == unit_type)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(
        q.order_by(Unit.created_at.desc())
        .offset((page-1)*page_size).limit(page_size)
    )
    units = result.scalars().all()
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [
            {
                "id": str(u.id), "unit_number": u.unit_number,
                "unit_type": u.unit_type, "bedrooms": u.bedrooms,
                "floor_number": u.floor_number, "facing": u.facing,
                "area_sqft": str(u.area_sqft) if u.area_sqft else None,
                "base_price": str(u.base_price) if u.base_price else None,
                "emi_estimate": str(u.emi_estimate) if u.emi_estimate else None,
                "status": u.status, "is_trending": u.is_trending,
                "view_count": u.view_count,
                "tower_id": str(u.tower_id) if u.tower_id else None,
            }
            for u in units
        ]
    }

@router.patch("/units/{unit_id}")
async def update_unit(
    unit_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit: raise HTTPException(404, "Unit not found")
    allowed = ["status", "base_price", "emi_estimate", "down_payment",
               "is_trending", "is_featured", "facing", "floor_number"]
    for k, v in data.items():
        if k in allowed:
            if k in ["base_price","emi_estimate","down_payment"] and v:
                setattr(unit, k, Decimal(str(v)))
            else:
                setattr(unit, k, v)
    await db.flush()
    return {"id": str(unit.id), "status": unit.status}

@router.get("/projects")
async def list_projects(
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return {
        "total": len(projects),
        "items": [
            {
                "id": str(p.id), "name": p.name, "location": p.location,
                "city": p.city, "rera_number": p.rera_number,
                "is_active": p.is_active, "is_featured": p.is_featured,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in projects
        ]
    }
