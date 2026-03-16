from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from uuid import UUID
from decimal import Decimal
from backend.app.core.database import get_db
from backend.app.models.unit import Unit
from backend.app.models.tower import Tower
from backend.app.models.project import Project
from backend.app.schemas.unit import (
    UnitCreate, UnitUpdate, UnitResponse, UnitListResponse
)

router = APIRouter(prefix="/units", tags=["units"])


@router.get("", response_model=UnitListResponse)
async def list_units(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    unit_type: Optional[str] = None,
    bedrooms: Optional[int] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    min_area: Optional[Decimal] = None,
    max_area: Optional[Decimal] = None,
    max_down_payment: Optional[Decimal] = None,
    max_emi: Optional[Decimal] = None,
    facing: Optional[str] = None,
    floor_number: Optional[int] = None,
    status: Optional[str] = "available",
    is_trending: Optional[bool] = None,
    is_featured: Optional[bool] = None,
    tower_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    filters = []

    if unit_type:
        filters.append(Unit.unit_type.ilike(f"%{unit_type}%"))
    if bedrooms:
        filters.append(Unit.bedrooms == bedrooms)
    if min_price:
        filters.append(Unit.base_price >= min_price)
    if max_price:
        filters.append(Unit.base_price <= max_price)
    if min_area:
        filters.append(Unit.area_sqft >= min_area)
    if max_area:
        filters.append(Unit.area_sqft <= max_area)
    if max_down_payment:
        filters.append(Unit.down_payment <= max_down_payment)
    if max_emi:
        filters.append(Unit.emi_estimate <= max_emi)
    if facing:
        filters.append(Unit.facing.ilike(f"%{facing}%"))
    if floor_number:
        filters.append(Unit.floor_number == floor_number)
    if status:
        filters.append(Unit.status == status)
    if is_trending is not None:
        filters.append(Unit.is_trending == is_trending)
    if is_featured is not None:
        filters.append(Unit.is_featured == is_featured)
    if tower_id:
        filters.append(Unit.tower_id == tower_id)
    if project_id:
        filters.append(Tower.project_id == project_id)
        query_base = select(Unit).join(Tower)
    else:
        query_base = select(Unit)

    query = query_base.where(and_(*filters)) if filters else query_base
    count_q = select(func.count()).select_from(query.subquery())

    total = (await db.execute(count_q)).scalar()
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Unit.is_trending.desc(), Unit.created_at.desc())
        .offset(offset).limit(page_size)
    )
    units = result.scalars().all()

    return UnitListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=-(-total // page_size),
        items=units,
    )


@router.get("/trending", response_model=UnitListResponse)
async def trending_units(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Unit)
        .where(Unit.is_trending == True, Unit.status == "available")
        .order_by(Unit.view_count.desc())
        .limit(limit)
    )
    units = result.scalars().all()
    return UnitListResponse(total=len(units), page=1, page_size=limit,
                            total_pages=1, items=units)


@router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(unit_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    # Increment view count
    unit.view_count += 1
    await db.flush()
    await db.refresh(unit)
    await db.refresh(unit)
    return unit


@router.post("", response_model=UnitResponse, status_code=201)
async def create_unit(data: UnitCreate, db: AsyncSession = Depends(get_db)):
    unit_data = data.model_dump()
    unit_data.pop("embedding", None)
    unit = Unit(**unit_data)
    db.add(unit)
    await db.flush()
    await db.refresh(unit)
    return unit


@router.patch("/{unit_id}", response_model=UnitResponse)
async def update_unit(
    unit_id: UUID,
    data: UnitUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(unit, key, value)
    await db.flush()
    await db.refresh(unit)
    return unit
