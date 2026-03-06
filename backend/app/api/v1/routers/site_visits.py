from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.models.site_visit import SiteVisit
from backend.app.schemas.site_visit import (
    SiteVisitCreate, SiteVisitUpdate, SiteVisitResponse
)

router = APIRouter(prefix="/site-visits", tags=["site-visits"])


@router.post("", response_model=SiteVisitResponse, status_code=201)
async def request_site_visit(
    data: SiteVisitCreate,
    db: AsyncSession = Depends(get_db),
):
    visit = SiteVisit(**data.model_dump())
    db.add(visit)
    await db.flush()
    await db.refresh(visit)
    return visit


@router.get("", response_model=list[SiteVisitResponse])
async def list_site_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(SiteVisit)
    if status:
        query = query.where(SiteVisit.status == status)

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(SiteVisit.visit_date.asc()).offset(offset).limit(page_size)
    )
    return result.scalars().all()


@router.get("/{visit_id}", response_model=SiteVisitResponse)
async def get_site_visit(visit_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SiteVisit).where(SiteVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
    return visit


@router.patch("/{visit_id}", response_model=SiteVisitResponse)
async def update_site_visit(
    visit_id: UUID,
    data: SiteVisitUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SiteVisit).where(SiteVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Site visit not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(visit, key, value)
    await db.flush()
    await db.refresh(visit)
    return visit
