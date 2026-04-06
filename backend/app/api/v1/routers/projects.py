from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit
from backend.app.schemas.project import (
    ProjectCreate, ProjectUpdate,
    ProjectResponse, ProjectListResponse,
)
from backend.app.schemas.tower import TowerResponse, TowerListResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    city: Optional[str] = None,
    is_featured: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Project).where(Project.is_active == True)
    count_query = select(func.count()).select_from(Project).where(Project.is_active == True)

    if city:
        query = query.where(Project.city.ilike(f"%{city}%"))
        count_query = count_query.where(Project.city.ilike(f"%{city}%"))
    if is_featured is not None:
        query = query.where(Project.is_featured == is_featured)
        count_query = count_query.where(Project.is_featured == is_featured)

    total = (await db.execute(count_query)).scalar()
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    projects = result.scalars().all()

    # Compute min/max price per project from available units
    items = []
    for p in projects:
        price_result = await db.execute(
            select(func.min(Unit.base_price), func.max(Unit.base_price))
            .join(Tower, Unit.tower_id == Tower.id)
            .where(Tower.project_id == p.id, Unit.status == "available", Unit.base_price.isnot(None))
        )
        min_price, max_price = price_result.one()

        # Serialize project columns
        d = {col.name: getattr(p, col.name) for col in p.__table__.columns}
        # Convert UUID/datetime
        for k, v in d.items():
            if hasattr(v, 'hex'):
                d[k] = str(v)
            elif hasattr(v, 'isoformat'):
                d[k] = v.isoformat()
        d["min_price"] = str(min_price) if min_price else None
        d["max_price"] = str(max_price) if max_price else None
        items.append(d)

    # Thumbnail = first image from media uploads
    for item in items:
        item["thumbnail"] = (item.get("images") or [None])[0] or None

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": -(-total // page_size),
        "items": items,
    }


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_active == True)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/towers/all")
async def get_all_towers(db: AsyncSession = Depends(get_db)):
    """Return all active towers with their project info — used by store page filters."""
    result = await db.execute(
        select(Tower, Project.name, Project.location, Project.city)
        .join(Project, Tower.project_id == Project.id)
        .where(Tower.is_active == True, Project.is_active == True)
        .order_by(Project.name, Tower.name)
    )
    rows = result.all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "project_id": str(t.project_id),
            "project_name": project_name,
            "location": location or "",
            "city": city or "",
        }
        for t, project_name, location, city in rows
    ]


@router.get("/{project_id}/towers", response_model=TowerListResponse)
async def get_project_towers(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tower).where(Tower.project_id == project_id, Tower.is_active == True)
    )
    towers = result.scalars().all()
    items = []
    for t in towers:
        resp = TowerResponse.model_validate(t)
        resp.thumbnail = t.images[0] if t.images else None
        items.append(resp)
    return TowerListResponse(total=len(towers), items=items)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate, db: AsyncSession = Depends(get_db)
):
    project = Project(**data.model_dump())
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(project, key, value)
    await db.flush()
    await db.refresh(project)
    return project
