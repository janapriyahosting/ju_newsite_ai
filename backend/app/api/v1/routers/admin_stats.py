from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime, timedelta
from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.unit import Unit
from backend.app.models.project import Project
from backend.app.models.lead import Lead
from backend.app.models.site_visit import SiteVisit
from backend.app.models.booking import Booking
from backend.app.models.customer import Customer
from backend.app.models.search_log import SearchLog

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db), admin=Depends(verify_admin_token)):
    # Units
    total_units     = (await db.execute(select(func.count(Unit.id)))).scalar()
    available_units = (await db.execute(select(func.count(Unit.id)).where(Unit.status == "available"))).scalar()
    booked_units    = (await db.execute(select(func.count(Unit.id)).where(Unit.status == "booked"))).scalar()
    hold_units      = (await db.execute(select(func.count(Unit.id)).where(Unit.status == "hold"))).scalar()

    # Leads
    total_leads = (await db.execute(select(func.count(Lead.id)))).scalar()
    new_leads   = (await db.execute(select(func.count(Lead.id)).where(Lead.status == "new"))).scalar()

    # Recent leads (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_leads = (await db.execute(
        select(func.count(Lead.id)).where(Lead.created_at >= week_ago)
    )).scalar()

    # Site Visits
    total_visits   = (await db.execute(select(func.count(SiteVisit.id)))).scalar()
    pending_visits = (await db.execute(
        select(func.count(SiteVisit.id)).where(SiteVisit.status == "scheduled")
    )).scalar()

    # Bookings
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar()

    # Customers
    total_customers = (await db.execute(select(func.count(Customer.id)))).scalar()

    # Projects
    total_projects = (await db.execute(select(func.count(Project.id)))).scalar()

    # Search logs
    total_searches = (await db.execute(select(func.count(SearchLog.id)))).scalar()
    recent_searches = (await db.execute(
        select(func.count(SearchLog.id)).where(SearchLog.created_at >= week_ago)
    )).scalar()

    # Leads by source
    leads_by_source = (await db.execute(
        select(Lead.source, func.count(Lead.id))
        .group_by(Lead.source)
        .order_by(func.count(Lead.id).desc())
    )).all()

    # Units by type
    units_by_type = (await db.execute(
        select(Unit.unit_type, func.count(Unit.id))
        .group_by(Unit.unit_type)
        .order_by(func.count(Unit.id).desc())
    )).all()

    # Recent leads list
    recent_leads_list = (await db.execute(
        select(Lead).order_by(Lead.created_at.desc()).limit(5)
    )).scalars().all()

    # Upcoming visits
    upcoming_visits = (await db.execute(
        select(SiteVisit).where(SiteVisit.status == "scheduled")
        .order_by(SiteVisit.visit_date.asc()).limit(5)
    )).scalars().all()

    return {
        "units": {
            "total": total_units,
            "available": available_units,
            "booked": booked_units,
            "hold": hold_units,
        },
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "this_week": recent_leads,
        },
        "visits": {
            "total": total_visits,
            "pending": pending_visits,
        },
        "bookings": {"total": total_bookings},
        "customers": {"total": total_customers},
        "projects": {"total": total_projects},
        "searches": {
            "total": total_searches,
            "this_week": recent_searches,
        },
        "leads_by_source": [{"source": s or "direct", "count": c} for s, c in leads_by_source],
        "units_by_type": [{"type": t, "count": c} for t, c in units_by_type],
        "recent_leads": [
            {
                "id": str(l.id),
                "name": l.name,
                "phone": l.phone,
                "interest": l.interest,
                "status": l.status,
                "source": l.source,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in recent_leads_list
        ],
        "upcoming_visits": [
            {
                "id": str(v.id),
                "name": v.name,
                "phone": v.phone,
                "visit_date": v.visit_date.isoformat() if v.visit_date else None,
                "visit_time": v.visit_time,
                "status": v.status,
            }
            for v in upcoming_visits
        ],
    }
