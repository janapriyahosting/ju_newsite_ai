import csv, io, uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, or_, and_
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token, require_superadmin
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit

router = APIRouter(prefix="/admin", tags=["Admin - CRUD"])

class BulkDeleteRequest(BaseModel):
    ids: List[str]

class BulkUpdateItem(BaseModel):
    id: str
    fields: dict

class BulkUpdateRequest(BaseModel):
    items: List[BulkUpdateItem]

def paginate(total, page, page_size):
    return {"total": total, "page": page, "page_size": page_size,
            "total_pages": max(1, -(-total // page_size))}

def model_to_dict(obj):
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if hasattr(val, 'hex'): val = str(val)
        elif hasattr(val, 'isoformat'): val = val.isoformat()
        result[col.name] = val
    return result

UNIT_FIELDS = ["tower_id","unit_number","floor_number","unit_type","bedrooms","bathrooms",
               "balconies","area_sqft","carpet_area","plot_area","base_price","price_per_sqft",
               "down_payment","emi_estimate","facing","status","amenities","images",
               "is_trending","is_featured","description","floor_plan_img","floor_plans","video_url","walkthrough_url","dimensions"]

CSV_COLUMNS = ["unit_number","floor_number","unit_type","bedrooms","bathrooms","balconies",
               "area_sqft","carpet_area","base_price","price_per_sqft","down_payment",
               "emi_estimate","facing","status","is_trending","is_featured","description"]

# ── PROJECTS ──────────────────────────────────────────────────────────────────
@router.get("/projects/list")
async def list_projects(page:int=Query(1,ge=1), page_size:int=Query(20,ge=1,le=100),
    search:Optional[str]=None, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    q = select(Project); cq = select(func.count()).select_from(Project)
    if search:
        s=f"%{search}%"
        q=q.where(or_(Project.name.ilike(s),Project.city.ilike(s),Project.locality.ilike(s)))
        cq=cq.where(or_(Project.name.ilike(s),Project.city.ilike(s),Project.locality.ilike(s)))
    total=(await db.execute(cq)).scalar()
    items=(await db.execute(q.order_by(Project.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return {"items":[model_to_dict(p) for p in items],**paginate(total,page,page_size)}

@router.post("/projects/bulk-delete",status_code=200)
async def bulk_delete_projects(data:BulkDeleteRequest, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    ids=[uuid.UUID(i) for i in data.ids]
    await db.execute(delete(Project).where(Project.id.in_(ids))); await db.commit()
    return {"deleted":len(ids)}

@router.post("/projects/{project_id}/duplicate",status_code=201)
async def duplicate_project(project_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Project).where(Project.id==uuid.UUID(project_id)))
    orig=r.scalar_one_or_none()
    if not orig: raise HTTPException(404,"Project not found")
    d=model_to_dict(orig); d.pop("id"); d.pop("created_at"); d.pop("updated_at")
    d["name"]=f"{d['name']} (Copy)"; d["is_active"]=False
    np=Project(**{k:v for k,v in d.items() if hasattr(Project,k)})
    db.add(np); await db.commit(); await db.refresh(np); return model_to_dict(np)

@router.post("/projects",status_code=201)
async def create_project(data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    import re as _re
    allowed=["name","slug","location","address","city","state","pincode","rera_number",
             "description","amenities","lat","lng","is_active","is_featured","images","brochure_url","video_url"]
    filtered = {k:v for k,v in data.items() if k in allowed}
    # Auto-generate slug from name if not provided
    if not filtered.get("slug") and filtered.get("name"):
        base = _re.sub(r"[^a-z0-9]+", "-", filtered["name"].lower()).strip("-")
        # Ensure uniqueness by checking DB
        from sqlalchemy import func as _func
        count = (await db.execute(
            select(_func.count()).select_from(Project).where(Project.slug.like(f"{base}%"))
        )).scalar()
        filtered["slug"] = f"{base}-{count+1}" if count else base
    p=Project(**filtered)
    db.add(p); await db.commit(); await db.refresh(p); return model_to_dict(p)

@router.get("/projects/{project_id}")
async def get_project(project_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Project).where(Project.id==uuid.UUID(project_id)))
    p=r.scalar_one_or_none()
    if not p: raise HTTPException(404,"Project not found")
    return model_to_dict(p)

@router.patch("/projects/{project_id}")
async def update_project(project_id:str, data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Project).where(Project.id==uuid.UUID(project_id)))
    p=r.scalar_one_or_none()
    if not p: raise HTTPException(404,"Project not found")
    allowed=["name","slug","description","city","location","address","state","pincode","locality","rera_number","total_units","possession_date","is_active","is_featured","images","video_url","walkthrough_url","brochure_url","floor_plans","amenities","lat","lng"]
    bool_fields_p = {"is_active","is_featured"}
    for k,v in data.items():
        if k not in allowed: continue
        if k in bool_fields_p:
            if isinstance(v, bool): setattr(p, k, v)
            elif isinstance(v, str): setattr(p, k, v.lower() in ("true","1","yes"))
            elif isinstance(v, int): setattr(p, k, bool(v))
        else:
            setattr(p, k, v)
    await db.commit(); await db.refresh(p); return model_to_dict(p)

@router.delete("/projects/{project_id}",status_code=204)
async def delete_project(project_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    r=await db.execute(select(Project).where(Project.id==uuid.UUID(project_id)))
    p=r.scalar_one_or_none()
    if not p: raise HTTPException(404,"Project not found")
    await db.delete(p); await db.commit()

# ── TOWERS ────────────────────────────────────────────────────────────────────
@router.get("/towers/list")
async def list_towers(page:int=Query(1,ge=1), page_size:int=Query(20,ge=1,le=100),
    project_id:Optional[str]=None, search:Optional[str]=None,
    db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    q=select(Tower); cq=select(func.count()).select_from(Tower)
    if project_id:
        q=q.where(Tower.project_id==uuid.UUID(project_id))
        cq=cq.where(Tower.project_id==uuid.UUID(project_id))
    if search:
        s=f"%{search}%"; q=q.where(Tower.name.ilike(s)); cq=cq.where(Tower.name.ilike(s))
    total=(await db.execute(cq)).scalar()
    items=(await db.execute(q.order_by(Tower.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return {"items":[model_to_dict(t) for t in items],**paginate(total,page,page_size)}

@router.post("/towers/bulk-delete",status_code=200)
async def bulk_delete_towers(data:BulkDeleteRequest, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    ids=[uuid.UUID(i) for i in data.ids]
    await db.execute(delete(Tower).where(Tower.id.in_(ids))); await db.commit()
    return {"deleted":len(ids)}

@router.post("/towers/{tower_id}/duplicate",status_code=201)
async def duplicate_tower(tower_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Tower).where(Tower.id==uuid.UUID(tower_id)))
    orig=r.scalar_one_or_none()
    if not orig: raise HTTPException(404,"Tower not found")
    d=model_to_dict(orig); d.pop("id"); d.pop("created_at"); d.pop("updated_at")
    d["name"]=f"{d['name']} (Copy)"; d["is_active"]=False
    if d.get("project_id"): d["project_id"]=uuid.UUID(d["project_id"])
    nt=Tower(**{k:v for k,v in d.items() if hasattr(Tower,k)})
    db.add(nt); await db.commit(); await db.refresh(nt); return model_to_dict(nt)

@router.post("/towers",status_code=201)
async def create_tower(data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    allowed=["project_id","name","total_floors","total_units","description","is_active"]
    if "project_id" in data and data["project_id"]: data["project_id"]=uuid.UUID(data["project_id"])
    t=Tower(**{k:v for k,v in data.items() if k in allowed})
    db.add(t); await db.commit(); await db.refresh(t); return model_to_dict(t)

@router.get("/towers/{tower_id}")
async def get_tower(tower_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Tower).where(Tower.id==uuid.UUID(tower_id)))
    t=r.scalar_one_or_none()
    if not t: raise HTTPException(404,"Tower not found")
    return model_to_dict(t)

@router.patch("/towers/{tower_id}")
async def update_tower(tower_id:str, data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Tower).where(Tower.id==uuid.UUID(tower_id)))
    t=r.scalar_one_or_none()
    if not t: raise HTTPException(404,"Tower not found")
    allowed=["name","total_floors","total_units","description","is_active","images","video_url","walkthrough_url","floor_plans","svg_floor_plan"]
    int_fields = {"total_floors","total_units"}
    bool_fields = {"is_active","is_featured"}
    for k,v in data.items():
        if k not in allowed: continue
        if k in int_fields:
            try: setattr(t, k, int(v)) if v not in (None,"") else None
            except (ValueError,TypeError): pass
        elif k in bool_fields:
            if isinstance(v, bool): setattr(t, k, v)
            elif isinstance(v, str): setattr(t, k, v.lower() in ("true","1","yes"))
            elif isinstance(v, int): setattr(t, k, bool(v))
        else:
            setattr(t, k, v)
    await db.commit(); await db.refresh(t); return model_to_dict(t)

@router.delete("/towers/{tower_id}",status_code=204)
async def delete_tower(tower_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    r=await db.execute(select(Tower).where(Tower.id==uuid.UUID(tower_id)))
    t=r.scalar_one_or_none()
    if not t: raise HTTPException(404,"Tower not found")
    await db.delete(t); await db.commit()

# ── UNITS ─────────────────────────────────────────────────────────────────────
@router.get("/units/all")
async def list_units_admin(page:int=Query(1,ge=1), page_size:int=Query(20,ge=1,le=100),
    search:Optional[str]=None, tower_id:Optional[str]=None, project_id:Optional[str]=None,
    status_filter:Optional[str]=Query(None,alias="status"), unit_type:Optional[str]=None,
    db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    q=select(Unit); cq=select(func.count()).select_from(Unit)
    filters=[]
    if tower_id: filters.append(Unit.tower_id==uuid.UUID(tower_id))
    if status_filter: filters.append(Unit.status==status_filter)
    if unit_type: filters.append(Unit.unit_type.ilike(f"%{unit_type}%"))
    if search:
        s=f"%{search}%"
        filters.append(or_(Unit.unit_number.ilike(s),Unit.unit_type.ilike(s),Unit.facing.ilike(s)))
    if filters:
        q=q.where(and_(*filters)); cq=cq.where(and_(*filters))
    if project_id:
        q=q.join(Tower,Unit.tower_id==Tower.id).where(Tower.project_id==uuid.UUID(project_id))
        cq=cq.join(Tower,Unit.tower_id==Tower.id).where(Tower.project_id==uuid.UUID(project_id))
    total=(await db.execute(cq)).scalar()
    items=(await db.execute(q.order_by(Unit.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
    return {"items":[model_to_dict(u) for u in items],**paginate(total,page,page_size)}

@router.get("/units/csv-template")
async def get_csv_template(_:dict=Depends(verify_admin_token)):
    out=io.StringIO(); w=csv.writer(out); w.writerow(CSV_COLUMNS)
    w.writerow(["A101","1","1BHK","1","1","1","650","580","4500000","6923","900000","35000","East","available","false","false","Sample unit"])
    out.seek(0)
    return StreamingResponse(io.BytesIO(out.getvalue().encode()),media_type="text/csv",
        headers={"Content-Disposition":"attachment; filename=units_import_template.csv"})

@router.post("/units/bulk-delete",status_code=200)
async def bulk_delete_units(data:BulkDeleteRequest, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    ids=[uuid.UUID(i) for i in data.ids]
    await db.execute(delete(Unit).where(Unit.id.in_(ids))); await db.commit()
    return {"deleted":len(ids)}

@router.patch("/units/bulk-update",status_code=200)
async def bulk_update_units(data:BulkUpdateRequest, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    updated=0
    for item in data.items:
        r=await db.execute(select(Unit).where(Unit.id==uuid.UUID(item.id)))
        u=r.scalar_one_or_none()
        if u:
            [setattr(u,k,v) for k,v in item.fields.items() if k in UNIT_FIELDS]
            updated+=1
    await db.commit(); return {"updated":updated}

@router.post("/units/csv-import",status_code=200)
async def csv_import_units(tower_id:str, file:UploadFile=File(...),
    db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    if not file.filename.endswith(".csv"): raise HTTPException(400,"Only .csv files accepted")
    try: tower_uuid=uuid.UUID(tower_id)
    except: raise HTTPException(400,"Invalid tower_id")
    tower=(await db.execute(select(Tower).where(Tower.id==tower_uuid))).scalar_one_or_none()
    if not tower: raise HTTPException(404,"Tower not found")
    content=await file.read(); text=content.decode("utf-8-sig")
    reader=csv.DictReader(io.StringIO(text))
    created=0; errors=[]
    bool_f={"is_trending","is_featured"}; int_f={"floor_number","bedrooms","bathrooms","balconies"}
    float_f={"area_sqft","carpet_area","plot_area","base_price","price_per_sqft","down_payment","emi_estimate"}
    for i,row in enumerate(reader,start=2):
        try:
            ud={"tower_id":tower_uuid}
            for col in CSV_COLUMNS:
                val=row.get(col,"").strip()
                if col in bool_f: ud[col]=val.lower() in ("true","1","yes")
                elif col in int_f: ud[col]=int(val) if val else None
                elif col in float_f: ud[col]=float(val) if val else None
                else: ud[col]=val if val else None
            db.add(Unit(**{k:v for k,v in ud.items() if k in UNIT_FIELDS+["tower_id"]})); created+=1
        except Exception as e: errors.append({"row":i,"error":str(e)})
    if created>0: await db.commit()
    return {"created":created,"errors":errors,"total_rows":created+len(errors)}

@router.post("/units/{unit_id}/duplicate",status_code=201)
async def duplicate_unit(unit_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Unit).where(Unit.id==uuid.UUID(unit_id)))
    orig=r.scalar_one_or_none()
    if not orig: raise HTTPException(404,"Unit not found")
    d=model_to_dict(orig); d.pop("id"); d.pop("created_at"); d.pop("updated_at")
    d["unit_number"]=f"{d['unit_number']}-COPY"; d["status"]="available"; d["is_trending"]=False
    if d.get("tower_id"): d["tower_id"]=uuid.UUID(d["tower_id"])
    nu=Unit(**{k:v for k,v in d.items() if k in UNIT_FIELDS})
    db.add(nu); await db.commit(); await db.refresh(nu); return model_to_dict(nu)

@router.post("/units",status_code=201)
async def create_unit(data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    if "tower_id" in data and data["tower_id"]: data["tower_id"]=uuid.UUID(data["tower_id"])
    u=Unit(**{k:v for k,v in data.items() if k in UNIT_FIELDS})
    db.add(u); await db.commit(); await db.refresh(u); return model_to_dict(u)

@router.get("/units/{unit_id}")
async def get_unit_admin(unit_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Unit).where(Unit.id==uuid.UUID(unit_id)))
    u=r.scalar_one_or_none()
    if not u: raise HTTPException(404,"Unit not found")
    return model_to_dict(u)

@router.patch("/units/{unit_id}")
async def update_unit(unit_id:str, data:dict, db:AsyncSession=Depends(get_db), _:dict=Depends(verify_admin_token)):
    r=await db.execute(select(Unit).where(Unit.id==uuid.UUID(unit_id)))
    u=r.scalar_one_or_none()
    if not u: raise HTTPException(404,"Unit not found")
    [setattr(u,k,v) for k,v in data.items() if k in UNIT_FIELDS]
    await db.commit(); await db.refresh(u); return model_to_dict(u)

@router.delete("/units/{unit_id}",status_code=204)
async def delete_unit(unit_id:str, db:AsyncSession=Depends(get_db), _:dict=Depends(require_superadmin)):
    r=await db.execute(select(Unit).where(Unit.id==uuid.UUID(unit_id)))
    u=r.scalar_one_or_none()
    if not u: raise HTTPException(404,"Unit not found")
    await db.delete(u); await db.commit()
