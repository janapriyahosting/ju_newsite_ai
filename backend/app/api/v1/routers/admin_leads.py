from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
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


# ── Lead activities ──────────────────────────────────────────────────────────

def _serialize_activity(a: LeadActivity) -> dict:
    return {
        "id": str(a.id),
        "lead_id": str(a.lead_id),
        "activity_type": a.activity_type,
        "subject": a.subject,
        "notes": a.notes,
        "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "status": a.status,
        "source": a.source,
        "assigned_to": a.assigned_to,
        "created_by": a.created_by,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


@router.get("/leads/{lead_id}/activities")
async def list_lead_activities(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    """All activities for a single lead, newest first by scheduled time
    (falls back to created_at when scheduled_at is null)."""
    res = await db.execute(
        select(LeadActivity)
        .where(LeadActivity.lead_id == lead_id)
        .order_by(
            func.coalesce(LeadActivity.scheduled_at, LeadActivity.created_at).desc()
        )
    )
    return {"items": [_serialize_activity(a) for a in res.scalars().all()]}


@router.post("/leads/{lead_id}/activities")
async def create_lead_activity(
    lead_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    """Sales reps log a manual activity (call, meeting, note) on a lead."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    activity_type = (data.get("activity_type") or "note").strip()
    subject = (data.get("subject") or "").strip()
    if not subject:
        raise HTTPException(400, "subject is required")
    scheduled_at = data.get("scheduled_at")
    if scheduled_at:
        try:
            scheduled_at = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            raise HTTPException(400, "scheduled_at must be ISO-8601")
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=activity_type,
        subject=subject,
        notes=(data.get("notes") or None),
        scheduled_at=scheduled_at,
        status=(data.get("status") or "pending"),
        source=(data.get("source") or "admin"),
        assigned_to=(data.get("assigned_to") or None),
        created_by=(admin.get("username") if isinstance(admin, dict) else "admin"),
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return _serialize_activity(activity)


@router.patch("/leads/activities/{activity_id}")
async def update_lead_activity(
    activity_id: UUID, data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    """Update status/notes/scheduling of an existing activity."""
    res = await db.execute(select(LeadActivity).where(LeadActivity.id == activity_id))
    activity = res.scalar_one_or_none()
    if not activity:
        raise HTTPException(404, "Activity not found")
    if "status" in data:
        activity.status = data["status"]
        # Auto-stamp completed_at when an admin marks the activity done.
        if activity.status == "completed" and not activity.completed_at:
            activity.completed_at = datetime.utcnow()
        elif activity.status != "completed":
            activity.completed_at = None
    if "notes" in data:
        activity.notes = data["notes"]
    if "subject" in data and data["subject"]:
        activity.subject = data["subject"]
    if "scheduled_at" in data:
        sa = data["scheduled_at"]
        if sa:
            try:
                activity.scheduled_at = datetime.fromisoformat(sa.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                raise HTTPException(400, "scheduled_at must be ISO-8601")
        else:
            activity.scheduled_at = None
    if "assigned_to" in data:
        activity.assigned_to = data["assigned_to"] or None
    await db.commit()
    await db.refresh(activity)
    return _serialize_activity(activity)


@router.delete("/leads/activities/{activity_id}")
async def delete_lead_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    res = await db.execute(select(LeadActivity).where(LeadActivity.id == activity_id))
    activity = res.scalar_one_or_none()
    if not activity:
        raise HTTPException(404, "Activity not found")
    await db.delete(activity)
    await db.commit()
    return {"deleted": True}
