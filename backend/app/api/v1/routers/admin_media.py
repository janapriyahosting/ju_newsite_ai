"""Admin Media Upload + Section Builder + Series Media"""
import os, uuid, json, mimetypes, re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select as sa_select, text as sa_text, func
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit
from typing import List, Any, Optional


def _extract_series(unit_number: str) -> str:
    """Extract series code = last 2 numeric digits of unit_number.
    101 → '01', 205 → '05', A-301 → '01', B12 → '12'
    """
    digits = re.sub(r'[^0-9]', '', unit_number)
    if len(digits) >= 2:
        return digits[-2:]
    return digits.zfill(2) if digits else '00'

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
    import json as _json
    from sqlalchemy import text as _text
    if media_type in ARRAY_FIELDS:
        current = getattr(obj, media_type, None) or []
        if not isinstance(current, list): current = []
        new_val = current + [url]
        await db.execute(_text(f"UPDATE {Model.__tablename__} SET {media_type} = :v WHERE id = :id"),
                         {"v": _json.dumps(new_val), "id": str(eid)})
    else:
        await db.execute(_text(f"UPDATE {Model.__tablename__} SET {media_type} = :v WHERE id = :id"),
                         {"v": url, "id": str(eid)})
    await db.commit()
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
    import json as _json
    from sqlalchemy import text as _text
    if media_type in ARRAY_FIELDS:
        current = getattr(obj, media_type, None) or []
        new_val = [u for u in current if u != url]
        await db.execute(_text(f"UPDATE {Model.__tablename__} SET {media_type} = :v WHERE id = :id"),
                         {"v": _json.dumps(new_val), "id": str(eid)})
    else:
        await db.execute(_text(f"UPDATE {Model.__tablename__} SET {media_type} = :v WHERE id = :id"),
                         {"v": None, "id": str(eid)})
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
            {"key":"documents","label":"Brochure","visible":True,"fields":["brochure_url"]},
        ],
        "unit": [
            {"key":"overview","label":"Overview","visible":True,"fields":["unit_type","bedrooms","bathrooms","area_sqft","base_price","status"]},
            {"key":"details","label":"Details","visible":True,"fields":["floor_number","facing","carpet_area","price_per_sqft","down_payment","emi_estimate","balconies"]},
            {"key":"gallery","label":"Photos","visible":True,"fields":["images"]},
            {"key":"floor_plan","label":"Floor Plan","visible":True,"fields":["floor_plan_img","floor_plans"]},
            {"key":"media","label":"Video & Tour","visible":True,"fields":["video_url","walkthrough_url"]},
            {"key":"series_media","label":"Series Media","visible":True,"fields":["series_floor_plan_2d","series_floor_plan_3d","series_model_flat_video","series_tower_elevation","series_project_video","series_project_image","series_walkthrough_video","series_brochure","series_unit_image"]},
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


# ── Series Media ────────────────────────────────────────────────────────────────

SERIES_MEDIA_TYPES = [
    "floor_plan_2d",
    "floor_plan_3d",
    "model_flat_video",
    "tower_elevation",
    "project_video",
    "project_image",
    "walkthrough_video",
    "brochure",
    "unit_image",
]

# Human-readable folder names for on-disk storage
SERIES_FOLDER_MAP = {
    "floor_plan_2d":    "2D",
    "floor_plan_3d":    "3D",
    "model_flat_video": "Model Flat Video",
    "tower_elevation":  "Tower Elevation",
    "project_video":    "Project Video",
    "project_image":    "Project Image",
    "walkthrough_video":"Walk Through Video",
    "brochure":         "Brochure",
    "unit_image":       "Unit Image",
}

SERIES_MEDIA_ROOT = os.path.join(MEDIA_ROOT, "series")


@router.get("/series-media")
async def list_series_media(
    project_id: str = Query(""),
    tower_id:   str = Query(""),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    """List all series media, optionally filtered by project or tower."""
    where_clauses = ["1=1"]
    params: dict = {}
    if project_id:
        where_clauses.append("sm.project_id = :project_id")
        params["project_id"] = project_id
    if tower_id:
        where_clauses.append("sm.tower_id = :tower_id")
        params["tower_id"] = tower_id
    where = " AND ".join(where_clauses)

    rows = await db.execute(sa_text(f"""
        SELECT sm.id, sm.project_id, sm.tower_id, sm.series_code, sm.facing,
               sm.area_sqft, sm.media_type, sm.label, sm.file_url, sm.file_name,
               sm.created_at,
               p.name  AS project_name,
               t.name  AS tower_name
        FROM   unit_series_media sm
        JOIN   projects p ON p.id = sm.project_id
        JOIN   towers   t ON t.id = sm.tower_id
        WHERE  {where}
        ORDER  BY p.name, t.name, sm.series_code, sm.media_type
    """), params)
    items = []
    for r in rows.mappings():
        items.append({
            "id":           str(r["id"]),
            "project_id":   str(r["project_id"]),
            "tower_id":     str(r["tower_id"]),
            "project_name": r["project_name"],
            "tower_name":   r["tower_name"],
            "series_code":  r["series_code"],
            "facing":       r["facing"],
            "area_sqft":    str(r["area_sqft"]) if r["area_sqft"] else None,
            "media_type":   r["media_type"],
            "label":        r["label"],
            "file_url":     r["file_url"],
            "file_name":    r["file_name"],
            "created_at":   r["created_at"].isoformat() if r["created_at"] else None,
        })
    return {"items": items, "total": len(items)}


@router.post("/series-media/upload")
async def upload_series_media(
    file:        UploadFile      = File(...),
    project_id:  str             = Form(...),
    tower_id:    str             = Form(...),
    series_code: str             = Form(...),
    media_type:  str             = Form(...),
    facing:      str             = Form(""),
    area_sqft:   str             = Form(""),
    label:       str             = Form(""),
    db:          AsyncSession    = Depends(get_db),
    admin:       dict            = Depends(verify_admin_token),
):
    """Upload a media file for a unit series."""
    if media_type not in SERIES_MEDIA_TYPES:
        raise HTTPException(400, f"Invalid media_type. Must be one of: {', '.join(SERIES_MEDIA_TYPES)}")

    ct = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if ct not in ALLOWED:
        raise HTTPException(400, f"File type not allowed: {ct}")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 50MB)")

    # Validate project and tower
    try:
        pid = uuid.UUID(project_id)
        tid = uuid.UUID(tower_id)
    except Exception:
        raise HTTPException(400, "Invalid project_id or tower_id UUID")

    proj = (await db.execute(sa_select(Project).where(Project.id == pid))).scalar_one_or_none()
    if not proj: raise HTTPException(404, "Project not found")
    twr  = (await db.execute(sa_select(Tower).where(Tower.id == tid))).scalar_one_or_none()
    if not twr:  raise HTTPException(404, "Tower not found")

    # Build human-readable folder: /media/series/{ProjectName}/{TowerName}/{MediaFolder}/
    import re as _re
    def _safe_name(name: str) -> str:
        """Make a filesystem-safe folder name from project/tower name."""
        return _re.sub(r'[^\w\s\-]', '', name).strip().replace(' ', '_') or 'unnamed'

    proj_folder = _safe_name(proj.name)
    tower_folder = _safe_name(twr.name)
    media_folder = SERIES_FOLDER_MAP.get(media_type, media_type)

    sc   = series_code.strip()
    face = (facing.strip() or "any").lower()
    area = area_sqft.strip() or "any"
    ext  = os.path.splitext(file.filename or "file")[1].lower() or ".jpg"
    safe_filename = f"{sc}-{face}-{area}-{media_type}{ext}"

    folder = os.path.join(SERIES_MEDIA_ROOT, proj_folder, tower_folder, media_folder)
    _ensure(folder)
    filepath = os.path.join(folder, safe_filename)
    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"/media/series/{proj_folder}/{tower_folder}/{media_folder}/{safe_filename}"

    area_val = float(area_sqft) if area_sqft.strip() else None
    facing_val = facing.strip() or None

    await db.execute(sa_text("""
        INSERT INTO unit_series_media
            (id, project_id, tower_id, series_code, facing, area_sqft,
             media_type, label, file_url, file_name)
        VALUES
            (gen_random_uuid(), :project_id, :tower_id, :series_code, :facing, :area_sqft,
             :media_type, :label, :file_url, :file_name)
    """), {
        "project_id":  str(pid),
        "tower_id":    str(tid),
        "series_code": series_code.strip(),
        "facing":      facing_val,
        "area_sqft":   area_val,
        "media_type":  media_type,
        "label":       label.strip() or None,
        "file_url":    file_url,
        "file_name":   safe_filename,
    })
    await db.commit()
    return {
        "file_url":    file_url,
        "file_name":   safe_filename,
        "series_code": series_code.strip(),
        "media_type":  media_type,
        "facing":      facing_val,
        "area_sqft":   area_val,
    }


@router.delete("/series-media/{media_id}")
async def delete_series_media(
    media_id: str,
    db:       AsyncSession = Depends(get_db),
    admin:    dict         = Depends(verify_admin_token),
):
    row = (await db.execute(sa_text(
        "SELECT file_url, file_name FROM unit_series_media WHERE id = :id"
    ), {"id": media_id})).mappings().one_or_none()
    if not row:
        raise HTTPException(404, "Series media not found")

    await db.execute(sa_text("DELETE FROM unit_series_media WHERE id = :id"), {"id": media_id})
    await db.commit()

    # Delete the physical file
    if row["file_url"].startswith("/media/"):
        fp = os.path.join(MEDIA_ROOT, row["file_url"][len("/media/"):])
        if os.path.exists(fp):
            os.remove(fp)
    return {"deleted": True}


@router.get("/series-media/preview-units")
async def preview_matching_units(
    tower_id:    str = Query(...),
    series_code: str = Query(...),
    facing:      str = Query(""),
    area_sqft:   str = Query(""),
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    """Return units in this tower that match the given series / facing / area."""
    try: tid = uuid.UUID(tower_id)
    except: raise HTTPException(400, "Invalid tower_id")

    result = await db.execute(
        sa_select(Unit).where(Unit.tower_id == tid)
    )
    units = result.scalars().all()

    matched = []
    for u in units:
        if _extract_series(u.unit_number) != series_code.strip():
            continue
        if facing and u.facing and u.facing.lower() != facing.lower():
            continue
        if area_sqft:
            try:
                if abs(float(str(u.area_sqft or 0)) - float(area_sqft)) > 1:
                    continue
            except ValueError:
                pass
        matched.append({
            "id":          str(u.id),
            "unit_number": u.unit_number,
            "floor":       u.floor_number,
            "facing":      u.facing,
            "area_sqft":   str(u.area_sqft) if u.area_sqft else None,
            "status":      u.status,
        })

    matched.sort(key=lambda x: x["floor"] or 0)
    return {"matched": matched, "count": len(matched)}


@router.get("/series-media/resolve/{unit_id}")
async def resolve_series_media_for_unit(
    unit_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    """Resolve all series media for a unit (used by public and admin)."""
    return await _resolve_series_media(unit_id, db)


async def _resolve_series_media(unit_id: str, db: AsyncSession) -> dict:
    """Internal helper: resolve series media for a unit."""
    try: uid = uuid.UUID(unit_id)
    except: return {}
    result = await db.execute(sa_select(Unit).where(Unit.id == uid))
    unit = result.scalar_one_or_none()
    if not unit: return {}

    series_code = _extract_series(unit.unit_number)
    area_val = float(str(unit.area_sqft)) if unit.area_sqft else None

    # Match: same tower + series, then filter by facing/area (null = wildcard)
    rows = await db.execute(sa_text("""
        SELECT id, media_type, facing, area_sqft, file_url, label
        FROM   unit_series_media
        WHERE  tower_id    = :tower_id
          AND  series_code = :series_code
          AND  (facing   IS NULL OR LOWER(facing)   = LOWER(:facing))
          AND  (area_sqft IS NULL OR ABS(area_sqft - :area) < 2)
        ORDER  BY
            (facing    IS NOT NULL) DESC,
            (area_sqft IS NOT NULL) DESC
    """), {
        "tower_id":    str(unit.tower_id),
        "series_code": series_code,
        "facing":      unit.facing or "",
        "area":        area_val or 0,
    })

    media: dict[str, list] = {}
    for r in rows.mappings():
        mt = r["media_type"]
        media.setdefault(mt, []).append({
            "id":       str(r["id"]),
            "url":      r["file_url"],
            "label":    r["label"],
            "facing":   r["facing"],
            "area_sqft": str(r["area_sqft"]) if r["area_sqft"] else None,
        })
    return {"series_code": series_code, "media": media}
