from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from uuid import UUID
from decimal import Decimal
from jose import jwt, JWTError
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.unit import Unit
from backend.app.models.tower import Tower
from backend.app.models.project import Project
from backend.app.models.booking import Booking
from backend.app.schemas.unit import (
    UnitCreate, UnitUpdate, UnitResponse, UnitListResponse
)
from sqlalchemy import text as sa_text

router = APIRouter(prefix="/units", tags=["units"])


async def _attach_custom_fields(units: list, db: AsyncSession) -> list:
    """Attach custom field values (including thumbnail) to each unit response."""
    if not units:
        return units
    try:
        unit_ids = [str(u.id) for u in units]
        placeholders = ", ".join(f"'{uid}'" for uid in unit_ids)
        # Fetch ALL custom field values for these units
        rows = await db.execute(sa_text(f"""
            SELECT cfv.entity_id::text AS uid, fc.field_key, cfv.value
            FROM custom_field_values cfv
            JOIN field_configs fc ON fc.id = cfv.field_config_id
            WHERE cfv.entity_id::text IN ({placeholders})
              AND cfv.value IS NOT NULL
        """))
        # Build lookup: unit_id -> {field_key: value}
        lookup: dict = {}
        for r in rows.mappings():
            uid = str(r["uid"])
            val = r["value"]
            if val is not None and val != "":
                lookup.setdefault(uid, {})[r["field_key"]] = val

        results = []
        for u in units:
            resp = UnitResponse.model_validate(u)
            fields = lookup.get(str(u.id), {})
            # Thumbnail: prefer 3D, fallback 2D
            resp.thumbnail = fields.get("series_floor_plan_3d") or fields.get("series_floor_plan_2d") or None
            # Attach all custom fields
            resp.custom_fields = fields
            results.append(resp)
        return results
    except Exception as e:
        import traceback; traceback.print_exc()
        return [UnitResponse.model_validate(u) for u in units]


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
    items = await _attach_custom_fields(units, db)

    return UnitListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=-(-total // page_size),
        items=items,
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
    items = await _attach_custom_fields(units, db)
    return UnitListResponse(total=len(units), page=1, page_size=limit,
                            total_pages=1, items=items)


@router.get("/{unit_id}", response_model=UnitResponse)
async def get_unit(
    unit_id: UUID,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    # Block public access to booked/sold units — allow the customer who booked it
    if unit.status in ("booked", "sold"):
        allowed = False
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ", 1)[1]
                payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
                customer_id = payload.get("sub")
                if customer_id:
                    booking = await db.execute(
                        select(Booking).where(
                            Booking.unit_id == unit_id,
                            Booking.customer_id == UUID(customer_id),
                        )
                    )
                    if booking.scalar_one_or_none():
                        allowed = True
            except (JWTError, ValueError):
                pass
        if not allowed:
            raise HTTPException(status_code=403, detail="This unit is no longer available")
    # Increment view count
    unit.view_count += 1
    await db.flush()
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


@router.get("/{unit_id}/series-media")
async def get_unit_series_media(unit_id: UUID, db: AsyncSession = Depends(get_db)):
    """Public: resolve inherited series media for a unit."""
    from backend.app.api.v1.routers.admin_media import _resolve_series_media
    return await _resolve_series_media(str(unit_id), db)


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
