"""Admin Media Upload + Section Builder"""
import os, uuid, json, mimetypes
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select as sa_select
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit
from typing import List, Any

router = APIRouter(prefix="/admin", tags=["Admin - Media"])
MEDIA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../media"))
SECTIONS_DIR = os.path.join(MEDIA_ROOT, "_sections")
ALLOWED = {"image/jpeg","image/png","image/webp","image/gif","application/pdf","video/mp4","video/webm"}
MAX_SIZE = 50 * 1024 * 1024
MODEL_MAP = {"project": Project, "tower": Tower, "unit": Unit}
ARRAY_FIELDS = {"images", "floor_plans"}

def _ensure(p): os.makedirs(p, exist_ok=True)

@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...), entity: str = Form(...),
    entity_id: str = Form(...), media_type: str = Form(...),
    db: AsyncSession = Depends(get_db), admin: dict = Depends(verify_admin_token),
):
    ct = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if ct not in ALLOWED: raise HTTPException(400, f"File type not allowed: {ct}")
    content = await file.read()
    if len(content) > MAX_SIZE: raise HTTPException(400, "File too large (max 50MB)")
    Model = MODEL_MAP.get(entity)
    if not Model: raise HTTPException(400, f"Unknown entity: {entity}")
    try: eid = uuid.UUID(entity_id)
    except: raise HTTPException(400, "Invalid entity_id UUID")
    result = await db.execute(sa_select(Model).where(Model.id == eid))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, f"{entity} not found")
    ext = os.path.splitext(file.filename or "file")[1].lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(MEDIA_ROOT, entity, media_type)
    _ensure(folder)
    with open(os.path.join(folder, filename), "wb") as f: f.write(content)
    url = f"/media/{entity}/{media_type}/{filename}"
    if media_type in ARRAY_FIELDS:
        current = getattr(obj, media_type, None) or []
        if not isinstance(current, list): current = []
        setattr(obj, media_type, current + [url])
    else:
        setattr(obj, media_type, url)
    await db.commit(); await db.refresh(obj)
    return {"url": url, "filename": filename, "media_type": media_type, "entity": entity, "entity_id": entity_id}

@router.delete("/upload")
async def delete_media(
    entity: str = Query(...), entity_id: str = Query(...),
    media_type: str = Query(...), url: str = Query(...),
    db: AsyncSession = Depends(get_db), admin: dict = Depends(verify_admin_token),
):
    Model = MODEL_MAP.get(entity)
    if not Model: raise HTTPException(400, "Unknown entity")
    try: eid = uuid.UUID(entity_id)
    except: raise HTTPException(400, "Invalid entity_id UUID")
    result = await db.execute(sa_select(Model).where(Model.id == eid))
    obj = result.scalar_one_or_none()
    if not obj: raise HTTPException(404, f"{entity} not found")
    if media_type in ARRAY_FIELDS:
        current = getattr(obj, media_type, None) or []
        setattr(obj, media_type, [u for u in current if u != url])
    else:
        setattr(obj, media_type, None)
    await db.commit()
    if url.startswith("/media/"):
        fp = os.path.join(MEDIA_ROOT, url[len("/media/"):])
        if os.path.exists(fp): os.remove(fp)
    return {"deleted": True, "url": url}

def _section_path(entity):
    _ensure(SECTIONS_DIR)
    return os.path.join(SECTIONS_DIR, f"{entity}.json")

def _defaults(entity):
    d = {
        "project": [
            {"key":"overview","label":"Overview","visible":True,"fields":["description","location","address","city","state","rera_number"]},
            {"key":"gallery","label":"Photos","visible":True,"fields":["images"]},
            {"key":"floor_plans","label":"Floor Plans","visible":True,"fields":["floor_plans"]},
            {"key":"media","label":"Video & Tour","visible":True,"fields":["video_url","walkthrough_url"]},
            {"key":"documents","label":"Documents","visible":True,"fields":["brochure_url"]},
            {"key":"amenities","label":"Amenities","visible":True,"fields":["amenities"]},
            {"key":"location","label":"Location Map","visible":True,"fields":["lat","lng"]},
        ],
        "tower": [
            {"key":"overview","label":"Overview","visible":True,"fields":["description","total_floors","total_units"]},
            {"key":"gallery","label":"Photos","visible":True,"fields":["images"]},
            {"key":"floor_plans","label":"Floor Plans","visible":True,"fields":["floor_plans","svg_floor_plan"]},
            {"key":"media","label":"Video & Tour","visible":True,"fields":["video_url","walkthrough_url"]},
        ],
        "unit": [
            {"key":"overview","label":"Overview","visible":True,"fields":["unit_type","bedrooms","bathrooms","area_sqft","base_price","status"]},
            {"key":"details","label":"Details","visible":True,"fields":["floor_number","facing","carpet_area","price_per_sqft","down_payment","emi_estimate","balconies"]},
            {"key":"gallery","label":"Photos","visible":True,"fields":["images"]},
            {"key":"floor_plan","label":"Floor Plan","visible":True,"fields":["floor_plan_img","floor_plans"]},
            {"key":"media","label":"Video & Tour","visible":True,"fields":["video_url","walkthrough_url"]},
            {"key":"amenities","label":"Amenities","visible":True,"fields":["amenities"]},
        ],
    }
    return d.get(entity, [])

def _load(entity):
    p = _section_path(entity)
    if not os.path.exists(p): return _defaults(entity)
    data = json.load(open(p))
    # Always return a plain list
    if isinstance(data, list): return data
    if isinstance(data, dict): return data.get("sections", _defaults(entity))
    return _defaults(entity)

@router.get("/sections/public/{entity}")
async def sections_public(entity: str):
    return _load(entity)

@router.get("/sections/{entity}")
async def sections_get(entity: str, admin: dict = Depends(verify_admin_token)):
    return _load(entity)

@router.post("/sections/{entity}")
async def sections_save(entity: str, data: List[Any], admin: dict = Depends(verify_admin_token)):
    p = _section_path(entity)
    json.dump(data, open(p,"w"), indent=2)
    return {"saved": True, "entity": entity, "sections": len(data)}
