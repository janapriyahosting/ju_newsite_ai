"""
Admin Media Upload Router
POST /admin/upload  → upload image/pdf/video thumbnail
DELETE /admin/media → delete a file
"""
import os, uuid, mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles

from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.api.v1.routers.admin_crud import model_to_dict, get_db, select
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select as sa_select
from pydantic import BaseModel
from typing import Optional
import shutil

router = APIRouter(prefix="/admin", tags=["Admin - Media"])

MEDIA_ROOT = os.path.join(os.path.dirname(__file__), "../../../../media")
ALLOWED_IMAGE = {"image/jpeg","image/png","image/webp","image/gif"}
ALLOWED_DOC   = {"application/pdf"}
ALLOWED_ALL   = ALLOWED_IMAGE | ALLOWED_DOC | {"video/mp4","video/webm"}
MAX_SIZE      = 50 * 1024 * 1024  # 50MB

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity: str = Form(...),          # project | tower | unit
    entity_id: str = Form(...),       # UUID string
    media_type: str = Form(...),      # images | floor_plans | floor_plan_img | video_url | walkthrough_url | brochure_url
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    # Validate mime
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or ""
    if content_type not in ALLOWED_ALL:
        raise HTTPException(400, f"File type not allowed: {content_type}")

    # Read + size check
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 50MB)")

    # Save file
    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(MEDIA_ROOT, entity, media_type)
    ensure_dir(folder)
    filepath = os.path.join(folder, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/media/{entity}/{media_type}/{filename}"

    # Update DB record
    try:
        eid = uuid.UUID(entity_id)
    except:
        raise HTTPException(400, "Invalid entity_id")

    MODEL_MAP = {"project": Project, "tower": Tower, "unit": Unit}
    Model = MODEL_MAP.get(entity)
    if not Model:
        raise HTTPException(400, f"Unknown entity: {entity}")

    result = await db.execute(sa_select(Model).where(Model.id == eid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, f"{entity} not found")

    # Array fields: images, floor_plans
    # Single fields: floor_plan_img, video_url, walkthrough_url, brochure_url
    if media_type in ("images", "floor_plans"):
        current = getattr(obj, media_type, None) or []
        if not isinstance(current, list):
            current = []
        current.append(url)
        setattr(obj, media_type, current)
    else:
        setattr(obj, media_type, url)

    await db.commit()
    await db.refresh(obj)
    return {"url": url, "filename": filename, "media_type": media_type, "entity": entity, "entity_id": entity_id}


@router.delete("/upload")
async def delete_media(
    entity: str,
    entity_id: str,
    media_type: str,
    url: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    try:
        eid = uuid.UUID(entity_id)
    except:
        raise HTTPException(400, "Invalid entity_id")

    MODEL_MAP = {"project": Project, "tower": Tower, "unit": Unit}
    Model = MODEL_MAP.get(entity)
    if not Model:
        raise HTTPException(400, "Unknown entity")

    result = await db.execute(sa_select(Model).where(Model.id == eid))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, f"{entity} not found")

    # Remove from DB
    if media_type in ("images", "floor_plans"):
        current = getattr(obj, media_type, None) or []
        updated = [u for u in current if u != url]
        setattr(obj, media_type, updated)
    else:
        setattr(obj, media_type, None)

    await db.commit()

    # Delete file from disk
    if url.startswith("/media/"):
        filepath = os.path.join(MEDIA_ROOT, url[len("/media/"):])
        if os.path.exists(filepath):
            os.remove(filepath)

    return {"deleted": True, "url": url}


class SectionConfig(BaseModel):
    entity: str
    entity_id: Optional[str] = None   # None = default config
    sections: list                     # [{key, label, fields:[field_keys], visible}]


# Store section configs in a simple JSON file per entity type
SECTIONS_DIR = os.path.join(MEDIA_ROOT, "_sections")

@router.get("/sections/{entity}")
async def get_section_config(entity: str, admin: dict = Depends(verify_admin_token)):
    ensure_dir(SECTIONS_DIR)
    path = os.path.join(SECTIONS_DIR, f"{entity}.json")
    if os.path.exists(path):
        import json
        with open(path) as f:
            return json.load(f)
    # Return default sections
    return _default_sections(entity)

@router.get("/sections/public/{entity}")
async def get_public_section_config(entity: str):
    """No auth — used by detail pages."""
    ensure_dir(SECTIONS_DIR)
    path = os.path.join(SECTIONS_DIR, f"{entity}.json")
    if os.path.exists(path):
        import json
        with open(path) as f:
            return json.load(f)
    return _default_sections(entity)

@router.post("/sections/{entity}")
async def save_section_config(entity: str, data: dict, admin: dict = Depends(verify_admin_token)):
    import json
    ensure_dir(SECTIONS_DIR)
    path = os.path.join(SECTIONS_DIR, f"{entity}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return {"saved": True}

def _default_sections(entity: str):
    defaults = {
        "project": [
            {"key":"overview",   "label":"Overview",    "visible":True,  "fields":["description","location","address","city","rera_number"]},
            {"key":"media",      "label":"Photos & Media","visible":True, "fields":["images","video_url","walkthrough_url","brochure_url"]},
            {"key":"floor_plans","label":"Floor Plans", "visible":True,  "fields":["floor_plans"]},
            {"key":"amenities",  "label":"Amenities",   "visible":True,  "fields":["amenities"]},
            {"key":"location",   "label":"Location",    "visible":True,  "fields":["lat","lng","pincode"]},
        ],
        "tower": [
            {"key":"overview",   "label":"Overview",    "visible":True,  "fields":["description","total_floors","total_units"]},
            {"key":"media",      "label":"Photos & Media","visible":True, "fields":["images","video_url","walkthrough_url"]},
            {"key":"floor_plans","label":"Floor Plans", "visible":True,  "fields":["floor_plans","svg_floor_plan"]},
        ],
        "unit": [
            {"key":"overview",   "label":"Overview",    "visible":True,  "fields":["unit_type","bedrooms","bathrooms","area_sqft","base_price","status"]},
            {"key":"details",    "label":"Details",     "visible":True,  "fields":["floor_number","facing","carpet_area","price_per_sqft","down_payment","emi_estimate"]},
            {"key":"media",      "label":"Photos & Media","visible":True, "fields":["images","video_url","walkthrough_url"]},
            {"key":"floor_plan", "label":"Floor Plan",  "visible":True,  "fields":["floor_plan_img","floor_plans"]},
        ],
    }
    return defaults.get(entity, [])
