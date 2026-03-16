from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from uuid import UUID
from decimal import Decimal
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.unit import Unit
from backend.app.models.project import Project
from backend.app.models.tower import Tower
import json

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

    decimal_fields = {"base_price", "emi_estimate", "down_payment", "price_per_sqft", "area_sqft", "carpet_area"}
    json_fields = {"dimensions", "images", "floor_plans", "amenities"}
    allowed = {
        "status", "base_price", "emi_estimate", "down_payment", "price_per_sqft",
        "is_trending", "is_featured", "facing", "floor_number", "unit_type",
        "bedrooms", "bathrooms", "area_sqft", "carpet_area", "description",
        "dimensions", "images", "floor_plan_img", "floor_plans",
        "video_url", "walkthrough_url", "amenities",
    }

    scalar_sets = {}
    json_sets = {}

    for k, v in data.items():
        if k not in allowed:
            continue
        if k in decimal_fields and v is not None:
            scalar_sets[k] = Decimal(str(v))
        elif k in json_fields:
            json_sets[k] = v if isinstance(v, list) else []
        else:
            scalar_sets[k] = v

    # Apply scalar updates via ORM
    for k, v in scalar_sets.items():
        setattr(unit, k, v)

    # Apply JSON updates via raw SQL to guarantee persistence
    if json_sets:
        set_parts = ", ".join(f"{k} = :{k}" for k in json_sets)
        params = {k: json.dumps(v) for k, v in json_sets.items()}
        params["unit_id"] = str(unit_id)
        await db.execute(
            text(f"UPDATE units SET {set_parts} WHERE id = :unit_id"),
            params
        )

    await db.commit()
    await db.refresh(unit)
    return {
        "id": str(unit.id),
        "status": unit.status,
        "dimensions": unit.dimensions or [],
    }

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


from backend.app.models.tower import Tower

@router.get("/towers")
async def list_towers(
    project_id: str = "",
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    from sqlalchemy import select as sel
    from backend.app.models.project import Project
    q = sel(Tower)
    if project_id:
        from uuid import UUID as _UUID
        q = q.where(Tower.project_id == _UUID(project_id))
    result = await db.execute(q.order_by(Tower.created_at.desc()))
    towers = result.scalars().all()
    return {
        "total": len(towers),
        "items": [
            {
                "id": str(t.id), "name": t.name,
                "project_id": str(t.project_id),
                "total_floors": t.total_floors,
                "total_units": t.total_units,
                "amenities": t.amenities or [],
                "brochure_url": t.brochure_url,
            }
            for t in towers
        ]
    }

@router.get("/towers/{tower_id}")
async def get_tower(
    tower_id: UUID, db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Tower).where(Tower.id == tower_id))
    tower = result.scalar_one_or_none()
    if not tower: raise HTTPException(404, "Tower not found")
    return {
        "id": str(tower.id), "name": tower.name,
        "project_id": str(tower.project_id),
        "total_floors": tower.total_floors,
        "total_units": tower.total_units,
        "amenities": tower.amenities or [],
        "video_url": tower.video_url,
        "walkthrough_url": tower.walkthrough_url,
        "brochure_url": tower.brochure_url,
    }

@router.patch("/towers/{tower_id}")
async def update_tower(
    tower_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Tower).where(Tower.id == tower_id))
    tower = result.scalar_one_or_none()
    if not tower: raise HTTPException(404, "Tower not found")
    allowed = {"amenities", "video_url", "walkthrough_url", "images", "floor_plans"}
    json_fields = {"amenities", "images", "floor_plans"}
    import json as _json
    json_updates = {}
    for k, v in data.items():
        if k in allowed:
            if k in json_fields:
                json_updates[k] = v if isinstance(v, list) else []
            else:
                setattr(tower, k, v)
    if json_updates:
        set_parts = ", ".join(f"{k} = :{k}" for k in json_updates)
        params = {k: _json.dumps(v) for k, v in json_updates.items()}
        params["tower_id"] = str(tower_id)
        await db.execute(text(f"UPDATE towers SET {set_parts} WHERE id = :tower_id"), params)
    await db.commit()
    await db.refresh(tower)
    return {"id": str(tower.id), "name": tower.name, "amenities": tower.amenities or []}
