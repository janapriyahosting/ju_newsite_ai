from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.unit import Unit
from backend.app.models.project import Project
from backend.app.models.assistant_flow import AssistantFlow
import re

router = APIRouter(prefix="/assistant", tags=["assistant"])

MEDIA_BASE = "http://173.168.0.81:8000"

RISEUP_CONTEXT = """
RiseUp by Janapriya Upscale:
- Customer pays only 80% of unit cost upfront; remaining 20% at possession (within 6 months of handover)
- On the 80%: 10% or 20% down payment depending on loan profile; bank funds the rest
- Example: ₹1 Cr unit → pay for ₹80L → DP ₹8L (10%) → Bank ₹72L → possession ₹20L after 2 yrs
- Benefit: buy a bigger home on a smaller budget; interest only on 80% during construction
- Learn more: riseup.house
"""

BROCHURE_KEYWORDS = ["brochure", "pdf", "catalogue", "catalog", "floor plan", "floorplan",
                     "document", "details", "send", "share", "download", "get the"]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class AssistantRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[dict] = None
    session_id: Optional[str] = None

class AssistantResponse(BaseModel):
    reply: str
    suggested_units: List[dict] = []
    show_callback_form: bool = False
    show_riseup: bool = False
    riseup_data: Optional[dict] = None
    brochure: Optional[dict] = None   # {name, url, type: "unit"|"project"}

class FlowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: str = "on_open"
    is_active: bool = True
    steps: list = []

class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[str] = None
    is_active: Optional[bool] = None
    steps: Optional[list] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt(p: float) -> str:
    if p >= 10_000_000: return f"₹{p/10_000_000:.1f} Cr"
    if p >= 100_000:    return f"₹{p/100_000:.0f}L"
    return f"₹{p:,.0f}"

def _riseup_data(unit_price: float) -> dict:
    return {
        "unit_price":      round(unit_price),
        "riseup_price":    round(unit_price * 0.8),
        "possession_amount": round(unit_price * 0.2),
        "down_payment_10": round(unit_price * 0.8 * 0.1),
        "down_payment_20": round(unit_price * 0.8 * 0.2),
        "bank_loan_90":    round(unit_price * 0.8 * 0.9),
        "bank_loan_80":    round(unit_price * 0.8 * 0.8),
    }

async def _find_brochure(query: str, db: AsyncSession) -> Optional[dict]:
    """Detect brochure request and find the matching unit/project brochure URL."""
    q = query.lower()

    # Check if this is a brochure request at all
    if not any(kw in q for kw in BROCHURE_KEYWORDS):
        return None

    # Try to find a unit number mentioned (e.g. "A-502", "unit B301")
    unit_match = re.search(r'\b([a-z0-9]+-\d+|\d+[a-z]-\d+|[a-z]\d+-\d+)\b', q)
    if unit_match:
        token = unit_match.group(1).upper()
        res = await db.execute(
            select(Unit).where(Unit.unit_number.ilike(f"%{token}%")).limit(1)
        )
        unit = res.scalar_one_or_none()
        if unit and unit.brochure_url:
            url = unit.brochure_url if unit.brochure_url.startswith("http") else f"{MEDIA_BASE}{unit.brochure_url}"
            return {"name": unit.unit_number, "url": url, "type": "unit"}

    # Try to find a project name mentioned
    res = await db.execute(select(Project).where(Project.is_active == True))
    projects = res.scalars().all()
    for p in projects:
        if p.name.lower() in q or any(word in q for word in p.name.lower().split() if len(word) > 3):
            if p.brochure_url:
                url = p.brochure_url if p.brochure_url.startswith("http") else f"{MEDIA_BASE}{p.brochure_url}"
                return {"name": p.name, "url": url, "type": "project"}
            # No brochure uploaded yet
            return {"name": p.name, "url": None, "type": "project"}

    # Generic brochure request — return first active project brochure
    res = await db.execute(
        select(Project).where(and_(Project.is_active == True, Project.brochure_url.isnot(None))).limit(1)
    )
    p = res.scalar_one_or_none()
    if p:
        url = p.brochure_url if p.brochure_url.startswith("http") else f"{MEDIA_BASE}{p.brochure_url}"
        return {"name": p.name, "url": url, "type": "project"}

    return {"name": "Janapriya Upscale", "url": None, "type": "project"}


# ── Chat endpoint ─────────────────────────────────────────────────────────────

@router.post("/chat", response_model=AssistantResponse)
async def assistant_chat(data: AssistantRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GROQ_API_KEY:
        return AssistantResponse(
            reply="I'm here to help! Please call us at +91 40 1234 5678 or fill the callback form.",
            show_callback_form=True,
        )

    ctx = data.context or {}
    search_query = ctx.get("search_query", "")
    budget       = float(ctx.get("budget", 0) or 0)
    results_count = int(ctx.get("results_count", -1))
    last_user_msg = data.messages[-1].content if data.messages else ""

    # Check for brochure request first (no LLM needed)
    brochure = await _find_brochure(last_user_msg, db)

    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)

        budget_str = _fmt(budget) if budget else "not specified"

        system_prompt = f"""You are a warm, helpful real estate assistant for Janapriya Upscale, Hyderabad.

{RISEUP_CONTEXT}

Context: searched="{search_query}", results={results_count}, budget={budget_str}

Rules:
- 2-3 short sentences only. No markdown, no bullet points.
- If budget is a concern or 0 results, mention RiseUp naturally.
- If they ask for a brochure and one is available, say you're sharing it below.
- If no brochure is available, apologise and offer a callback.
- If they seem stuck, offer to connect with a sales advisor."""

        groq_messages = [{"role": "system", "content": system_prompt}]
        for msg in data.messages[-6:]:
            groq_messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=groq_messages,
            temperature=0.7,
            max_tokens=180,
        )
        reply = response.choices[0].message.content.strip()

        rl = reply.lower()
        show_riseup   = any(w in rl for w in ["riseup", "rise up", "80%", "possession"])
        show_callback = results_count == 0 or any(w in rl for w in ["call", "advisor", "connect", "team"])

        # Suggest RiseUp-affordable units when no results
        suggested = []
        if results_count == 0 and budget:
            ceiling = budget / 0.8 * 1.05
            res = await db.execute(
                select(Unit).where(and_(
                    Unit.status == "available",
                    Unit.base_price <= ceiling,
                    Unit.base_price >= budget * 0.85,
                )).order_by(Unit.is_trending.desc()).limit(3)
            )
            suggested = [
                {"id": str(u.id), "unit_number": u.unit_number, "unit_type": u.unit_type,
                 "base_price": float(u.base_price or 0), "bedrooms": u.bedrooms,
                 "area_sqft": float(u.area_sqft or 0), "images": u.images or [],
                 "riseup_price": round(float(u.base_price or 0) * 0.8)}
                for u in res.scalars().all()
            ]

        riseup_data_val = _riseup_data(budget if results_count != 0 else budget / 0.8) if budget else None

        return AssistantResponse(
            reply=reply,
            suggested_units=suggested,
            show_callback_form=show_callback,
            show_riseup=show_riseup,
            riseup_data=riseup_data_val,
            brochure=brochure,
        )

    except Exception as e:
        print(f"[Assistant] Error: {e}")
        return AssistantResponse(
            reply="I'd love to help you find your perfect home! Let me connect you with our sales team.",
            show_callback_form=True,
            brochure=brochure,
        )


# ── Flow endpoints (public) ───────────────────────────────────────────────────

@router.get("/flows/active")
async def get_active_flows(trigger: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(AssistantFlow).where(AssistantFlow.is_active == True)
    if trigger:
        q = q.where(AssistantFlow.trigger == trigger)
    res = await db.execute(q)
    flows = res.scalars().all()
    return [{"id": str(f.id), "name": f.name, "trigger": f.trigger, "steps": f.steps} for f in flows]


# ── Admin flow CRUD ───────────────────────────────────────────────────────────

@router.get("/admin/flows")
async def admin_list_flows(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AssistantFlow).order_by(AssistantFlow.created_at.desc()))
    flows = res.scalars().all()
    return [
        {"id": str(f.id), "name": f.name, "description": f.description,
         "trigger": f.trigger, "is_active": f.is_active,
         "steps": f.steps, "created_at": f.created_at.isoformat()}
        for f in flows
    ]

@router.post("/admin/flows", status_code=201)
async def admin_create_flow(data: FlowCreate, db: AsyncSession = Depends(get_db)):
    flow = AssistantFlow(
        name=data.name, description=data.description,
        trigger=data.trigger, is_active=data.is_active, steps=data.steps,
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return {"id": str(flow.id), "name": flow.name, "trigger": flow.trigger,
            "is_active": flow.is_active, "steps": flow.steps}

@router.put("/admin/flows/{flow_id}")
async def admin_update_flow(flow_id: str, data: FlowUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AssistantFlow).where(AssistantFlow.id == flow_id))
    flow = res.scalar_one_or_none()
    if not flow:
        raise HTTPException(404, "Flow not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(flow, field, val)
    await db.commit()
    await db.refresh(flow)
    return {"id": str(flow.id), "name": flow.name, "trigger": flow.trigger,
            "is_active": flow.is_active, "steps": flow.steps}

@router.delete("/admin/flows/{flow_id}", status_code=204)
async def admin_delete_flow(flow_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AssistantFlow).where(AssistantFlow.id == flow_id))
    flow = res.scalar_one_or_none()
    if not flow:
        raise HTTPException(404, "Flow not found")
    await db.delete(flow)
    await db.commit()
