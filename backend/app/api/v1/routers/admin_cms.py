"""
CMS Admin Router — Pages SEO, Sections, Site Settings
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.cms import CmsPage, CmsSection, SiteSetting, StoreFilter

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


# ── Filter Links ──────────────────────────────────────────────────────────────
from sqlalchemy import text as _text

@router.get("/cms/filter-links")
async def list_filter_links(db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)):
    r = await db.execute(_text("SELECT id, label, url, filters, sort_order, created_at FROM filter_links ORDER BY sort_order, created_at"))
    return [{"id": str(row.id), "label": row.label, "url": row.url, "filters": row.filters, "sort_order": row.sort_order,
             "created_at": row.created_at.isoformat() if row.created_at else None} for row in r.fetchall()]

@router.get("/cms/public/filter-links")
async def list_filter_links_public(db: AsyncSession = Depends(get_db)):
    r = await db.execute(_text("SELECT id, label, url, filters, sort_order FROM filter_links ORDER BY sort_order, created_at"))
    return [{"id": str(row.id), "label": row.label, "url": row.url, "filters": row.filters} for row in r.fetchall()]

class FilterLinkCreate(BaseModel):
    label: str
    url: str
    filters: Optional[dict] = None

@router.post("/cms/filter-links")
async def create_filter_link(data: FilterLinkCreate, db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)):
    import json
    new_id = uuid.uuid4()
    await db.execute(_text(
        "INSERT INTO filter_links (id, label, url, filters) VALUES (:id, :label, :url, :filters)"
    ), {"id": new_id, "label": data.label, "url": data.url, "filters": json.dumps(data.filters) if data.filters else None})
    await db.commit()
    return {"id": str(new_id), "label": data.label, "url": data.url}

@router.delete("/cms/filter-links/{link_id}")
async def delete_filter_link(link_id: uuid.UUID, db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)):
    await db.execute(_text("DELETE FROM filter_links WHERE id = :id"), {"id": link_id})
    await db.commit()
    return {"detail": "Deleted"}


# ── Store Filters (admin-managed filters for the store page) ─────────────────

class StoreFilterCreate(BaseModel):
    filter_key: str
    filter_label: str
    filter_type: str = "pills"  # pills, select, range_slider, button_group, checkbox
    field_name: Optional[str] = None  # unit column to filter on
    options: Optional[list] = None
    config: Optional[dict] = None
    is_active: bool = True
    is_quick_filter: bool = False
    sort_order: int = 0

class StoreFilterUpdate(BaseModel):
    filter_label: Optional[str] = None
    filter_type: Optional[str] = None
    field_name: Optional[str] = None
    options: Optional[list] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None
    is_quick_filter: Optional[bool] = None
    sort_order: Optional[int] = None

class StoreFilterReorder(BaseModel):
    order: list  # [{id: uuid, sort_order: int}, ...]


@router.get("/cms/store-filters")
async def list_store_filters(db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(StoreFilter).order_by(StoreFilter.sort_order))
    return [row_to_dict(f) for f in r.scalars().all()]


@router.get("/cms/public/store-filters")
async def list_store_filters_public(db: AsyncSession = Depends(get_db)):
    r = await db.execute(
        select(StoreFilter)
        .where(StoreFilter.is_active == True)
        .order_by(StoreFilter.sort_order)
    )
    return [row_to_dict(f) for f in r.scalars().all()]


@router.post("/cms/store-filters", status_code=201)
async def create_store_filter(data: StoreFilterCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    existing = await db.execute(select(StoreFilter).where(StoreFilter.filter_key == data.filter_key))
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Filter with key '{data.filter_key}' already exists")
    f = StoreFilter(**data.model_dump())
    db.add(f)
    await db.commit()
    await db.refresh(f)
    return row_to_dict(f)


@router.patch("/cms/store-filters/{filter_id}")
async def update_store_filter(filter_id: uuid.UUID, data: StoreFilterUpdate, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(StoreFilter).where(StoreFilter.id == filter_id))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Filter not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    await db.commit()
    await db.refresh(f)
    return row_to_dict(f)


@router.delete("/cms/store-filters/{filter_id}", status_code=204)
async def delete_store_filter(filter_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    r = await db.execute(select(StoreFilter).where(StoreFilter.id == filter_id))
    f = r.scalar_one_or_none()
    if not f:
        raise HTTPException(404, "Filter not found")
    await db.delete(f)
    await db.commit()


@router.patch("/cms/store-filters-reorder")
async def reorder_store_filters(data: StoreFilterReorder, db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    for item in data.order:
        await db.execute(
            update(StoreFilter)
            .where(StoreFilter.id == uuid.UUID(item["id"]))
            .values(sort_order=item["sort_order"])
        )
    await db.commit()
    return {"detail": "Reordered"}


# ── Unit field introspection (for building filters from data) ────────────────

# Built-in unit columns that make sense as filters
_BUILTIN_FIELDS = [
    {"field": "unit_type",     "label": "Unit Type",      "type": "string",  "suggested_filter": "pills"},
    {"field": "bedrooms",      "label": "Bedrooms",       "type": "int",     "suggested_filter": "button_group"},
    {"field": "bathrooms",     "label": "Bathrooms",      "type": "int",     "suggested_filter": "button_group"},
    {"field": "balconies",     "label": "Balconies",      "type": "int",     "suggested_filter": "button_group"},
    {"field": "facing",        "label": "Facing",         "type": "string",  "suggested_filter": "pills"},
    {"field": "status",        "label": "Status",         "type": "string",  "suggested_filter": "select"},
    {"field": "floor_number",  "label": "Floor Number",   "type": "int",     "suggested_filter": "pills"},
    {"field": "base_price",    "label": "Base Price",     "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "area_sqft",     "label": "Area (sqft)",    "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "carpet_area",   "label": "Carpet Area",    "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "plot_area",     "label": "Plot Area",      "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "price_per_sqft","label": "Price per sqft", "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "down_payment",  "label": "Down Payment",   "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "emi_estimate",  "label": "EMI Estimate",   "type": "numeric", "suggested_filter": "range_slider"},
    {"field": "is_trending",   "label": "Trending",       "type": "bool",    "suggested_filter": "checkbox"},
    {"field": "is_featured",   "label": "Featured",       "type": "bool",    "suggested_filter": "checkbox"},
]

# Map field_config.field_type → introspection type + suggested filter
_FIELD_TYPE_MAP = {
    "text":        ("string",  "pills"),
    "number":      ("int",     "button_group"),
    "decimal":     ("numeric", "range_slider"),
    "currency":    ("numeric", "range_slider"),
    "boolean":     ("bool",    "checkbox"),
    "select":      ("string",  "select"),
    "multiselect": ("string",  "pills"),
    "date":        ("string",  "select"),
    "email":       ("string",  "select"),
    "phone":       ("string",  "select"),
    "url":         ("string",  "select"),
    "textarea":    ("string",  "select"),
}

_BUILTIN_KEYS = {f["field"] for f in _BUILTIN_FIELDS}

# Field types not useful for filtering
_SKIP_FIELD_TYPES = {"url", "textarea", "email", "phone"}

# Field keys that are internal / media / not useful as store filters
_SKIP_FIELD_KEYS = {
    "description", "sfdc_unit_id", "sfdc_project_id", "alias_permalink",
    "listing_id", "floor_plan_url", "add_on_video", "gallery", "attachments",
    "rooms_and_sizes", "type_your_search_here", "downpayment",
    "series_floor_plan_3d", "series_floor_plan_2d", "series_model_flat_video",
    "series_tower_elevation", "series_project_video", "series_project_image",
    "series_walkthrough_video", "series_brochure", "series_unit_image",
    "media_series",
}

from backend.app.models.field_config import FieldConfig


@router.get("/cms/store-filters/unit-fields")
async def list_unit_fields(db: AsyncSession = Depends(get_db), _: dict = Depends(verify_admin_token)):
    """Return all unit fields (built-in + custom) that can be used to build store filters."""
    fields = list(_BUILTIN_FIELDS)

    # Load custom fields from field_configs
    r = await db.execute(
        select(FieldConfig)
        .where(FieldConfig.entity == "unit", FieldConfig.is_custom == True)
        .order_by(FieldConfig.sort_order)
    )
    for fc in r.scalars().all():
        # Skip built-in fields already listed and internal/media fields
        if fc.field_key in _BUILTIN_KEYS or fc.field_key in _SKIP_FIELD_KEYS:
            continue
        if fc.field_type in _SKIP_FIELD_TYPES:
            continue

        type_info = _FIELD_TYPE_MAP.get(fc.field_type, ("string", "pills"))
        entry = {
            "field": fc.field_key,
            "label": fc.label,
            "type": type_info[0],
            "suggested_filter": type_info[1],
            "custom": True,
        }
        # Include predefined options from field_config if available
        if fc.field_options:
            entry["predefined_options"] = fc.field_options
        fields.append(entry)

    return fields


@router.get("/cms/store-filters/field-values")
async def get_field_values(
    field: str = Query(..., description="Unit field name"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Return distinct values for a unit field (built-in or custom), for auto-populating filter options."""

    # Check if it's a built-in field
    builtin_meta = next((f for f in _BUILTIN_FIELDS if f["field"] == field), None)

    if builtin_meta:
        # Direct column query on units table
        r = await db.execute(_text(
            f"SELECT DISTINCT {field} AS val FROM units "
            f"WHERE {field} IS NOT NULL ORDER BY val"
        ))
        values = [row.val for row in r.fetchall()]

        if builtin_meta["type"] == "numeric":
            r2 = await db.execute(_text(
                f"SELECT MIN({field}) AS min_val, MAX({field}) AS max_val FROM units "
                f"WHERE {field} IS NOT NULL"
            ))
            row = r2.fetchone()
            return {
                "field": field,
                "values": [float(v) for v in values],
                "min": float(row.min_val) if row.min_val else 0,
                "max": float(row.max_val) if row.max_val else 0,
            }
        elif builtin_meta["type"] == "int":
            return {"field": field, "values": [int(v) for v in values]}
        elif builtin_meta["type"] == "bool":
            return {"field": field, "values": [True, False]}
        else:
            return {"field": field, "values": [str(v) for v in values]}

    # Otherwise, check if it's a custom field
    fc_result = await db.execute(
        select(FieldConfig).where(FieldConfig.entity == "unit", FieldConfig.field_key == field)
    )
    fc = fc_result.scalar_one_or_none()
    if not fc:
        raise HTTPException(400, f"Field '{field}' not found")

    # Query distinct values from custom_field_values
    r = await db.execute(_text(
        "SELECT DISTINCT cfv.value AS val "
        "FROM custom_field_values cfv "
        "WHERE cfv.field_config_id = :fc_id AND cfv.value IS NOT NULL "
        "ORDER BY val"
    ), {"fc_id": fc.id})
    raw_values = [row.val for row in r.fetchall()]

    # Also include predefined options from field_config if any
    predefined = fc.field_options or []

    type_info = _FIELD_TYPE_MAP.get(fc.field_type, ("string", "pills"))

    if type_info[0] == "numeric":
        nums = []
        for v in raw_values:
            try: nums.append(float(v))
            except (TypeError, ValueError): pass
        return {
            "field": field,
            "values": nums,
            "min": min(nums) if nums else 0,
            "max": max(nums) if nums else 0,
            "predefined_options": predefined,
        }
    elif type_info[0] == "int":
        ints = []
        for v in raw_values:
            try: ints.append(int(v))
            except (TypeError, ValueError): pass
        return {"field": field, "values": ints, "predefined_options": predefined}
    elif type_info[0] == "bool":
        return {"field": field, "values": [True, False], "predefined_options": predefined}
    else:
        # Merge predefined options with actual values
        str_values = [str(v) for v in raw_values if v]
        # Add predefined options that don't already exist in values
        all_values = list(dict.fromkeys(str_values + [str(o) for o in predefined]))
        return {"field": field, "values": all_values, "predefined_options": predefined}
