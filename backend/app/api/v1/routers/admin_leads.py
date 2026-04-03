from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.lead import Lead
from backend.app.services.lead_scoring import compute_lead_score, score_all_leads

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/leads")
async def list_leads(
    page: int = 1, page_size: int = 20,
    status: str = "", source: str = "",
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    q = select(Lead)
    if status: q = q.where(Lead.status == status)
    if source: q = q.where(Lead.source == source)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(
        q.order_by(Lead.created_at.desc())
        .offset((page-1)*page_size).limit(page_size)
    )
    leads = result.scalars().all()
    return {
        "total": total, "page": page, "page_size": page_size,
        "items": [
            {
                "id": str(l.id), "name": l.name, "phone": l.phone,
                "email": l.email, "interest": l.interest,
                "project_interest": l.project_interest,
                "budget_min": str(l.budget_min) if l.budget_min else None,
                "budget_max": str(l.budget_max) if l.budget_max else None,
                "status": l.status, "source": l.source,
                "message": l.message, "notes": l.notes,
                "assigned_to": l.assigned_to,
                "lead_score": l.lead_score,
                "score_details": l.score_details,
                "sf_lead_id": l.sf_lead_id,
                "extra_data": l.extra_data,
                "utm_source": l.utm_source,
                "utm_medium": l.utm_medium,
                "utm_campaign": l.utm_campaign,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leads
        ]
    }

@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead: raise HTTPException(404, "Lead not found")
    allowed = ["status", "notes", "assigned_to"]
    for k, v in data.items():
        if k in allowed: setattr(lead, k, v)
    await db.flush()
    return {"id": str(lead.id), "status": lead.status}

@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead: raise HTTPException(404, "Lead not found")
    await db.delete(lead)
    return {"deleted": True}

@router.post("/leads/rescore")
async def rescore_all_leads(
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    """Recompute lead scores for all leads."""
    count = await score_all_leads(db)
    return {"rescored": count}

@router.post("/leads/{lead_id}/rescore")
async def rescore_one_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    """Recompute score for a single lead."""
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead: raise HTTPException(404, "Lead not found")
    score, details = await compute_lead_score(lead, db)
    lead.lead_score = score
    lead.score_details = details
    await db.commit()
    return {"lead_id": str(lead.id), "score": score, "details": details}
