"""
Lead Scoring Engine (0–100)

Scores are computed from behavioural signals captured in session_logs,
plus lead-level attributes (source, UTM, project interest, etc.).

Score Breakdown:
  - Time on site:        0–15 pts  (>5min=15, >2min=10, >1min=5)
  - Pages visited:       0–15 pts  (>10=15, >5=10, >2=5)
  - Unit pages viewed:   0–15 pts  (>5=15, >3=10, >1=5)
  - Return visits:       0–10 pts  (>3=10, >1=5)
  - Enquiry submitted:   +10 pts   (the lead itself)
  - Site visit booked:   +10 pts
  - Booking made:        +10 pts
  - Brochure downloaded: +5 pts    (page_path contains 'brochure')
  - Has email:           +5 pts
  - UTM campaign lead:   +5 pts
  Total max: 100
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.models.session_log import SessionLog
from backend.app.models.lead import Lead
from backend.app.models.site_visit import SiteVisit
from backend.app.models.booking import Booking


async def compute_lead_score(lead: Lead, db: AsyncSession) -> tuple[int, dict]:
    """Compute score for a lead. Returns (score, details_dict)."""
    details = {}
    phone = lead.phone

    # ── Session-based signals ────────────────────────────────────────────
    # Find sessions by customer_id (if linked) or by matching phone in visitors
    sessions = []
    if lead.customer_id:
        result = await db.execute(
            select(SessionLog).where(SessionLog.customer_id == lead.customer_id)
        )
        sessions = result.scalars().all()

    total_duration = sum(s.duration_seconds or 0 for s in sessions)
    total_pages = sum(s.page_views or 0 for s in sessions)
    unit_views = sum(1 for s in sessions if s.page_path and '/units/' in s.page_path)
    return_visits = len(sessions)

    # Time on site (0-15)
    if total_duration > 300:
        details['time_on_site'] = 15
    elif total_duration > 120:
        details['time_on_site'] = 10
    elif total_duration > 60:
        details['time_on_site'] = 5
    else:
        details['time_on_site'] = 0

    # Pages visited (0-15)
    if total_pages > 10:
        details['pages_visited'] = 15
    elif total_pages > 5:
        details['pages_visited'] = 10
    elif total_pages > 2:
        details['pages_visited'] = 5
    else:
        details['pages_visited'] = 0

    # Unit pages viewed (0-15)
    if unit_views > 5:
        details['unit_views'] = 15
    elif unit_views > 3:
        details['unit_views'] = 10
    elif unit_views > 0:
        details['unit_views'] = 5
    else:
        details['unit_views'] = 0

    # Return visits (0-10)
    if return_visits > 3:
        details['return_visits'] = 10
    elif return_visits > 1:
        details['return_visits'] = 5
    else:
        details['return_visits'] = 0

    # Brochure download signal (0-5)
    brochure_views = sum(1 for s in sessions if s.page_path and 'brochure' in (s.page_path or '').lower())
    details['brochure_download'] = 5 if brochure_views > 0 else 0

    # ── Lead-level signals ───────────────────────────────────────────────

    # Enquiry submitted (the lead exists = 10 pts)
    details['enquiry_submitted'] = 10

    # Site visit booked (0-10)
    if lead.customer_id:
        sv_count = (await db.execute(
            select(func.count()).select_from(SiteVisit).where(SiteVisit.customer_id == lead.customer_id)
        )).scalar() or 0
    else:
        sv_count = (await db.execute(
            select(func.count()).select_from(SiteVisit).where(SiteVisit.phone == phone)
        )).scalar() or 0
    details['site_visit_booked'] = 10 if sv_count > 0 else 0

    # Booking made (0-10)
    if lead.customer_id:
        bk_count = (await db.execute(
            select(func.count()).select_from(Booking).where(Booking.customer_id == lead.customer_id)
        )).scalar() or 0
    else:
        bk_count = 0
    details['booking_made'] = 10 if bk_count > 0 else 0

    # Has email (0-5)
    details['has_email'] = 5 if lead.email else 0

    # UTM campaign (0-5)
    details['utm_campaign'] = 5 if lead.utm_source else 0

    # ── Total ────────────────────────────────────────────────────────────
    score = min(100, sum(details.values()))
    details['total'] = score

    return score, details


async def rescore_leads_for_customer(customer_id, phone: str, db: AsyncSession) -> int:
    """Find leads by customer_id or phone, link customer_id if missing, and rescore.
    Returns count of leads updated."""
    from backend.app.models.customer import Customer
    # Find leads by customer_id or phone
    result = await db.execute(
        select(Lead).where(
            (Lead.customer_id == customer_id) | (Lead.phone == phone)
        )
    )
    leads = result.scalars().all()
    count = 0
    for lead in leads:
        if not lead.customer_id and customer_id:
            lead.customer_id = customer_id
        score, details = await compute_lead_score(lead, db)
        if score != lead.lead_score:
            lead.lead_score = score
            lead.score_details = details
            count += 1
    if count:
        await db.flush()
    return count


async def score_all_leads(db: AsyncSession) -> int:
    """Recompute scores for all leads. Returns count updated."""
    result = await db.execute(select(Lead))
    leads = result.scalars().all()
    count = 0
    for lead in leads:
        score, details = await compute_lead_score(lead, db)
        lead.lead_score = score
        lead.score_details = details
        count += 1
    await db.commit()
    return count
