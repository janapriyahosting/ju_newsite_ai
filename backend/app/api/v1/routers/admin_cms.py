"""
CMS Admin Router — Pages SEO, Sections, Site Settings
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.cms import CmsPage, CmsSection, SiteSetting

router = APIRouter(tags=["CMS"])

def row_to_dict(obj):
    d = {}
    for c in obj.__table__.columns:
        v = getattr(obj, c.name)
        if hasattr(v, 'isoformat'): v = v.isoformat()
        elif hasattr(v, '__str__') and type(v).__name__ == 'UUID': v = str(v)
        d[c.name] = v
    return d

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class PageUpdate(BaseModel):
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image_url: Optional[str] = None
    canonical_url: Optional[str] = None
    is_active: Optional[bool] = None

class SectionUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    extra_data: Optional[dict] = None
    is_active: Optional[bool] = None
    sort_order: Optional[str] = None

class SectionCreate(BaseModel):
    section_key: str
    section_label: str
    page_key: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    body: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    extra_data: Optional[dict] = None
    sort_order: Optional[str] = "99"

class SettingsBulkUpdate(BaseModel):
    settings: dict  # {setting_key: value}

# ── CMS Pages (SEO) ───────────────────────────────────────────────────────────
@router.get("/cms/pages")
async def list_pages(db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(CmsPage).order_by(CmsPage.page_label))
    return [row_to_dict(p) for p in r.scalars().all()]

@router.get("/cms/pages/{page_key}")
async def get_page(page_key: str, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(CmsPage).where(CmsPage.page_key == page_key))
    p = r.scalar_one_or_none()
    if not p: raise HTTPException(404, "Page not found")
    return row_to_dict(p)

@router.patch("/cms/pages/{page_key}")
async def update_page(page_key: str, data: PageUpdate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(CmsPage).where(CmsPage.page_key == page_key))
    p = r.scalar_one_or_none()
    if not p: raise HTTPException(404, "Page not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.commit(); await db.refresh(p)
    return row_to_dict(p)

# ── Public SEO endpoint (no auth — for Next.js SSR) ──────────────────────────
@router.get("/cms/public/pages/{page_key}")
async def get_page_public(page_key: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(CmsPage).where(CmsPage.page_key == page_key, CmsPage.is_active == True))
    p = r.scalar_one_or_none()
    if not p: raise HTTPException(404, "Page not found")
    return row_to_dict(p)

# ── CMS Sections ──────────────────────────────────────────────────────────────
@router.get("/cms/sections")
async def list_sections(page_key: Optional[str] = None, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    q = select(CmsSection)
    if page_key: q = q.where(CmsSection.page_key == page_key)
    q = q.order_by(CmsSection.sort_order)
    r = await db.execute(q)
    return [row_to_dict(s) for s in r.scalars().all()]

@router.post("/cms/sections", status_code=201)
async def create_section(data: SectionCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    s = CmsSection(**data.model_dump())
    db.add(s); await db.commit(); await db.refresh(s)
    return row_to_dict(s)

@router.patch("/cms/sections/{section_key}")
async def update_section(section_key: str, data: SectionUpdate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(CmsSection).where(CmsSection.section_key == section_key))
    s = r.scalar_one_or_none()
    if not s: raise HTTPException(404, "Section not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit(); await db.refresh(s)
    return row_to_dict(s)

@router.delete("/cms/sections/{section_key}", status_code=204)
async def delete_section(section_key: str, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(CmsSection).where(CmsSection.section_key == section_key))
    s = r.scalar_one_or_none()
    if not s: raise HTTPException(404, "Section not found")
    await db.delete(s); await db.commit()

@router.get("/cms/public/sections/{page_key}")
async def get_sections_public(page_key: str, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(CmsSection).where(CmsSection.page_key == page_key, CmsSection.is_active == True).order_by(CmsSection.sort_order))
    return [row_to_dict(s) for s in r.scalars().all()]

# ── Site Settings ─────────────────────────────────────────────────────────────
@router.get("/cms/settings")
async def list_settings(group_key: Optional[str] = None, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    q = select(SiteSetting)
    if group_key: q = q.where(SiteSetting.group_key == group_key)
    q = q.order_by(SiteSetting.group_key, SiteSetting.sort_order)
    r = await db.execute(q)
    return [row_to_dict(s) for s in r.scalars().all()]

@router.patch("/cms/settings")
async def bulk_update_settings(data: SettingsBulkUpdate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    updated = []
    for key, value in data.settings.items():
        r = await db.execute(select(SiteSetting).where(SiteSetting.setting_key == key))
        s = r.scalar_one_or_none()
        if s:
            s.setting_value = str(value) if value is not None else ""
            updated.append(key)
    await db.commit()
    return {"updated": updated, "count": len(updated)}

@router.get("/cms/public/settings")
async def get_settings_public(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(SiteSetting).order_by(SiteSetting.group_key, SiteSetting.sort_order))
    return {s.setting_key: s.setting_value for s in r.scalars().all()}
