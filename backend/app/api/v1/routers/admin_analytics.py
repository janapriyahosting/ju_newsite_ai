from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.search_log import SearchLog
from backend.app.models.session_log import SessionLog
from backend.app.models.customer import Customer

router = APIRouter(prefix="/admin", tags=["admin-analytics"])


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days)

    # Search logs
    sr = await db.execute(
        select(SearchLog).where(SearchLog.created_at >= start_dt)
        .order_by(SearchLog.created_at.desc()).limit(200)
    )
    searches = sr.scalars().all()

    # Sessions
    sess_r = await db.execute(
        select(SessionLog).where(SessionLog.created_at >= start_dt)
        .order_by(SessionLog.last_seen_at.desc()).limit(200)
    )
    sessions = sess_r.scalars().all()

    # Build customer map
    cids = list({s.customer_id for s in list(searches) + list(sessions) if s.customer_id})
    cmap: dict = {}
    if cids:
        cr = await db.execute(select(Customer).where(Customer.id.in_(cids)))
        for c in cr.scalars().all():
            cmap[c.id] = c

    # Top queries
    qcounts: dict = {}
    for s in searches:
        q = (s.query or "").strip()
        if q:
            qcounts[q] = qcounts.get(q, 0) + 1
    top_queries = sorted(qcounts.items(), key=lambda x: -x[1])[:10]

    # Daily searches
    daily: dict = {}
    for s in searches:
        if s.created_at:
            day = s.created_at.strftime("%Y-%m-%d")
            daily[day] = daily.get(day, 0) + 1

    durations = [s.duration_seconds for s in sessions if s.duration_seconds]
    avg_dur = round(sum(durations) / len(durations)) if durations else 0

    def cname(cid): return cmap[cid].name if cid and cid in cmap else None
    def cemail(cid): return cmap[cid].email if cid and cid in cmap else None

    return {
        "summary": {
            "total_searches": len(searches),
            "total_sessions": len(sessions),
            "customer_sessions": sum(1 for s in sessions if s.is_customer),
            "avg_duration_seconds": avg_dur,
        },
        "searches": [
            {
                "id": str(s.id), "query": s.query,
                "results_count": s.results_count or 0,
                "customer_name": cname(s.customer_id),
                "customer_email": cemail(s.customer_id),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            } for s in searches
        ],
        "sessions": [
            {
                "session_id": s.session_id,
                "customer_name": cname(s.customer_id),
                "customer_email": cemail(s.customer_id),
                "is_customer": s.is_customer,
                "page_path": s.page_path,
                "duration_seconds": s.duration_seconds or 0,
                "page_views": s.page_views or 1,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
            } for s in sessions
        ],
        "top_queries": [{"query": q, "count": c} for q, c in top_queries],
        "daily_searches": [{"date": d, "count": c} for d, c in sorted(daily.items())],
    }
