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


@router.get("", response_model=ProjectListResponse)
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

    return ProjectListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=-(-total // page_size),
        items=projects,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_active == True)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/towers", response_model=TowerListResponse)
async def get_project_towers(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tower).where(Tower.project_id == project_id, Tower.is_active == True)
    )
    towers = result.scalars().all()
    return TowerListResponse(total=len(towers), items=towers)


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
