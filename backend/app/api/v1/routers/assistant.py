from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case, text as sa_text
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.unit import Unit
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.assistant_flow import AssistantFlow
from backend.app.models.assistant_chat_log import AssistantChatLog
from backend.app.models.assistant_content import AssistantContent
from backend.app.models.cms import AssistantFact, SiteSetting
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
import re
import time


# ── In-memory AI usage trackers ──────────────────────────────────────────────
# Groq exposes remaining quota via response headers on every call, so we just
# cache the latest snapshot. Gemini does not expose quota, so we count locally
# (resets on process restart — good enough for a day view).

GROQ_DAILY_LIMIT = 14400   # Groq free-tier default for llama-3.1-8b-instant

_groq_status: dict = {
    "remaining_requests": None,
    "limit_requests": None,
    "remaining_tokens": None,
    "limit_tokens": None,
    "reset_requests": None,
    "reset_tokens": None,
    "last_updated": None,
    "last_error": None,
    "last_error_at": None,
}

_gemini_status: dict = {
    "date": None,            # UTC date of the current window
    "calls_ok": 0,
    "calls_failed": 0,
    "last_error": None,
    "last_error_at": None,
    "last_updated": None,
}


def _record_groq_headers(headers, error: Optional[str] = None):
    try:
        def _get(key):
            if headers is None:
                return None
            try:
                return headers.get(key)
            except Exception:
                return None
        _groq_status["remaining_requests"] = _get("x-ratelimit-remaining-requests")
        _groq_status["limit_requests"]     = _get("x-ratelimit-limit-requests")
        _groq_status["remaining_tokens"]   = _get("x-ratelimit-remaining-tokens")
        _groq_status["limit_tokens"]       = _get("x-ratelimit-limit-tokens")
        _groq_status["reset_requests"]     = _get("x-ratelimit-reset-requests")
        _groq_status["reset_tokens"]       = _get("x-ratelimit-reset-tokens")
        _groq_status["last_updated"]       = datetime.now(timezone.utc).isoformat()
        if error:
            _groq_status["last_error"] = error
            _groq_status["last_error_at"] = _groq_status["last_updated"]
    except Exception:
        pass  # never break the chat flow on a stats write


def _record_gemini_call(success: bool, error: Optional[str] = None):
    today = datetime.now(timezone.utc).date().isoformat()
    if _gemini_status["date"] != today:
        _gemini_status["date"] = today
        _gemini_status["calls_ok"] = 0
        _gemini_status["calls_failed"] = 0
    if success:
        _gemini_status["calls_ok"] += 1
    else:
        _gemini_status["calls_failed"] += 1
        if error:
            _gemini_status["last_error"] = error
            _gemini_status["last_error_at"] = datetime.now(timezone.utc).isoformat()
    _gemini_status["last_updated"] = datetime.now(timezone.utc).isoformat()

router = APIRouter(prefix="/assistant", tags=["assistant"])

MEDIA_BASE = "http://173.168.0.81:8000"

RISEUP_CONTEXT = """
RiseUp by Janapriya Upscale — how the payment plan actually works.
TOTAL UNIT COST IS UNCHANGED. The customer still pays the full sticker price over time; RiseUp only changes WHEN. NEVER say the customer pays anything "upfront" — they don't.

Payment schedule on a unit of price P:
  1. 80% of P is paid in milestones across the construction period (per the project's construction-linked plan, typically ~24 months).
     - At booking the customer puts down 10% or 20% **of that 80%** as down payment (loan profile / their preference).
     - The remaining 80% or 90% **of that 80%** is funded by a bank home loan, disbursed in tranches as each construction milestone is reached — OR the customer may pay it from their own pocket if they don't want a loan.
     - The LAST construction milestone in the schedule is the "finishing demand" — this means the flat is ready for handover. By the time the finishing demand is paid, the entire 80% portion is closed and the unit is ready to hand over.
  2. The remaining 20% of P is paid 6 MONTHS AFTER handover (i.e. 6 months after the finishing demand / possession). This 20% can be funded via a top-up loan, savings, or fresh salary growth.

Worked example on a ₹1 Cr unit (P = ₹1 Cr) with a 24-month construction window:
  • RiseUp portion = 80% × ₹1 Cr = ₹80 L (paid milestone-by-milestone over those ~24 months).
     - 10% DP option → customer pays ₹8 L at booking; bank loan covers ₹72 L disbursed per construction plan.
     - 20% DP option → customer pays ₹16 L at booking; bank loan covers ₹64 L disbursed per construction plan.
  • Handover happens once the ₹80 L is closed.
  • Final 20% = ₹20 L, due 6 months AFTER handover (so at month ~30 from booking on a 24-month build).

What the customer effectively saves (this is the ONLY saving — they do NOT save on the unit price itself):
  • The home-loan principal during construction is sized to ~90% of the 80% (≈72% of P), not ~90% of the full price. So pre-EMI / construction-period interest is charged on a noticeably smaller base.
  • Approximate construction-period interest saved on a unit of price P, at ~9% loan rate over a typical 2-year (24-month) construction window:
       savings ≈ (90% of P – 90% of 80% of P) × 9% × 2 years
              = 18% of P × 9% × 2
              ≈ ~3% of P
  • The deferred 20% is NOT a "saving" — it is still owed, just paid 6 months after handover. Never describe it as a discount.

Additional benefit: the smaller construction-period outlay lets the customer comfortably afford a larger home than a regular 100%-during-construction plan would allow.

When the visitor asks "how much can I save / what does it cost on UNIT X":
  • If a UNIT_RISEUP block appears further down in this prompt with a specific unit price, USE THOSE EXACT NUMBERS. Do not write "₹X" or generic placeholders, and do not invent prices.
  • If no concrete unit price is in scope, ask which unit/project they're considering instead of guessing.

Wording rules — apply on EVERY reply about RiseUp:
  • Never use the word "upfront" or "now" for the 80%. It is paid in stages per the construction-linked plan.
  • Never say "after the 80% milestone" — instead say "6 months after handover" or "6 months after the finishing demand".
  • Always note the 24-month figure is typical and can vary by project.
  • Tone: warm, polite, plain English. Avoid jargon ("CLP", "tranche", "pre-EMI"). Speak the way a helpful sales rep would over the phone.
  • EVERY RiseUp reply MUST end with one short sentence stating how much the customer would save and why
    (construction-period home-loan interest), and acknowledging that the actual figure depends on the
    customer's loan rate and the project's construction timeline. Do NOT skip this — it is the most
    important part of the answer for the customer.
  • NO REPETITION. State each fact only once. Once both 10% and 20% down-payment options are explained,
    do not add a generic restatement like "The remaining ₹X will be funded by a bank loan" — that's already
    covered by the two options. Once you've described the 20% as "due 6 months after handover", don't also
    call it "the finishing demand, indicating the flat is ready for handover" in the next sentence — pick one
    framing per reply. Tighter is better.

Suggested reply structure (don't copy verbatim, but follow the spirit):
  1. State the unit's total price, then explain RiseUp's two parts (80% during construction, 20% six months after handover).
  2. Show both down-payment options on the 80% (10% or 20%) and what the bank loan covers.
  3. Close with: "On this unit, you would save approximately ₹[interest_saved] (~[interest_saved_pct]% of the price) in home-loan interest during construction, assuming a 9% loan over a 24-month build. Your actual savings will depend on your loan rate and the construction timeline."

Learn more: riseup.house
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

class AssistantAction(BaseModel):
    """Tells the frontend to navigate or offer a follow-up. Keeps the chat
    declarative — the assistant suggests, the UI renders the CTA."""
    type: str                                  # "navigate_store" | "navigate_unit" | "navigate_project" | "ask_which" | "none"
    url: Optional[str] = None                  # target URL for navigate_* actions
    label: Optional[str] = None                # button label, e.g. "View on Store page →"
    options: Optional[List[dict]] = None       # for ask_which: [{"label","value","url"}]
    params: dict = {}                          # echo of parsed filters for debugging


class AssistantResponse(BaseModel):
    reply: str
    suggested_units: List[dict] = []
    show_callback_form: bool = False
    show_riseup: bool = False
    riseup_data: Optional[dict] = None
    brochure: Optional[dict] = None   # {name, url, type: "unit"|"project"}
    floor_plans: Optional[dict] = None  # {name, type, plans: [{label, url}]}
    media: Optional[dict] = None        # {name, type, items: [{label, url, kind}]}
    lead_created: Optional[dict] = None # {phone, when, source} when assistant creates a callback lead
    action: Optional[AssistantAction] = None
    model_used: Optional[str] = None     # "claude:haiku" | "claude:sonnet" | "groq" | "gemini:..." | None
    escalated: bool = False              # True when Haiku handed off to Sonnet

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

_RISEUP_LOAN_RATE = 0.09          # typical home-loan rate, ~9% p.a.
_RISEUP_CONSTRUCTION_YEARS = 2.0  # typical construction window

def _riseup_data(unit_price: float) -> dict:
    """Compute the RiseUp breakdown plus an interest-savings estimate.
    Savings model: without RiseUp the customer's bank loan is sized to ~90% of P
    during construction; with RiseUp it's sized to 90% × 80% = 72% of P. The
    delta of ~18% of P accrues less interest over the construction window."""
    riseup_price      = unit_price * 0.8
    interest_full     = unit_price * 0.9 * _RISEUP_LOAN_RATE * _RISEUP_CONSTRUCTION_YEARS
    interest_riseup   = riseup_price * 0.9 * _RISEUP_LOAN_RATE * _RISEUP_CONSTRUCTION_YEARS
    interest_saved    = max(0.0, interest_full - interest_riseup)
    return {
        "unit_price":         round(unit_price),
        "riseup_price":       round(riseup_price),
        "possession_amount":  round(unit_price * 0.2),
        "down_payment_10":    round(riseup_price * 0.1),
        "down_payment_20":    round(riseup_price * 0.2),
        "bank_loan_90":       round(riseup_price * 0.9),
        "bank_loan_80":       round(riseup_price * 0.8),
        "interest_saved":     round(interest_saved),
        "interest_saved_pct": round(interest_saved / unit_price * 100, 1) if unit_price else 0.0,
        "loan_rate_pct":      _RISEUP_LOAN_RATE * 100,
        "construction_years": _RISEUP_CONSTRUCTION_YEARS,
    }

def _call_groq(system_prompt: str, messages: list) -> str:
    """Call Groq via with_raw_response so we can capture rate-limit headers.
    Raises on any error (including rate limits) so the caller can fall through."""
    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)
    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        groq_messages.append({"role": msg.role, "content": msg.content})
    try:
        raw = client.chat.completions.with_raw_response.create(
            model=settings.GROQ_MODEL,
            messages=groq_messages,
            temperature=0.2,
            max_tokens=260,
        )
    except Exception as e:
        # Rate-limit and other API errors — try to pull headers off the attached response.
        resp = getattr(e, "response", None)
        headers = getattr(resp, "headers", None) if resp is not None else None
        _record_groq_headers(headers, error=f"{type(e).__name__}: {e}")
        raise
    _record_groq_headers(raw.headers)
    response = raw.parse()
    return response.choices[0].message.content.strip()


async def _call_gemini(system_prompt: str, messages: list, model: Optional[str] = None) -> str:
    """Call Google's generativelanguage API (free tier) — works for both Gemini
    and Gemma models. Raises on any error so the caller can fall through.
    The API key is sent via the x-goog-api-key header so it never appears in
    URLs, exception messages, or logs.

    `model` lets the dispatcher pick a secondary Gemini/Gemma model on fallback;
    when omitted, uses settings.GEMINI_MODEL."""
    import httpx
    if not model:
        model = settings.GEMINI_MODEL
    is_gemma = model.lower().startswith("gemma")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    contents = []
    for idx, msg in enumerate(messages):
        role = "user" if msg.role == "user" else "model"
        text = msg.content
        # Gemma has no systemInstruction field; prepend the system prompt into
        # the first user turn so the model still sees our constraints.
        if is_gemma and idx == 0 and role == "user":
            text = f"{system_prompt}\n\nUser: {text}"
        contents.append({"role": role, "parts": [{"text": text}]})

    generation_config: dict = {"temperature": 0.2, "maxOutputTokens": 400}
    body: dict = {"contents": contents, "generationConfig": generation_config}
    if not is_gemma:
        body["systemInstruction"] = {"parts": [{"text": system_prompt}]}
        # Gemini flash-latest is a thinking model; Gemma is not. Disable thinking
        # for Gemini so it doesn't burn the output budget on hidden reasoning.
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}

    headers = {"x-goog-api-key": settings.GEMINI_API_KEY, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code >= 400:
                try:
                    err_detail = resp.json().get("error", {})
                    err_msg = f"HTTP {resp.status_code}: {err_detail.get('status', '')} — {err_detail.get('message', resp.text[:200])}"
                except Exception:
                    err_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
                raise RuntimeError(err_msg)
            data = resp.json()
    except Exception as e:
        _record_gemini_call(success=False, error=str(e))
        raise
    _record_gemini_call(success=True)
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


_FIND_UNITS_KEYWORDS = (
    "apartment", "flat", "property", "home", "house", "unit", "bhk",
    "spacious", "big", "large", "small", "compact", "affordable", "luxury",
    "budget", "under", "within", "below", "upto", "up to", "max",
    "salary", "income", "earn",
    "looking for", "show me", "find me", "suggest",
)
_BROCHURE_KEYWORDS_SHORT = ("brochure", "pdf", "catalog", "catalogue", "details document",
                            "floor plan", "floorplan", "floor-plan")
_VISIT_KEYWORDS = ("site visit", "visit", "schedule a visit", "tour the", "see it in person",
                   "book a visit", "site tour", "show me around", "come see")
_MEDIA_KEYWORDS = ("video", "walkthrough", "walk through", "walk-through",
                   "model flat", "model unit", "model home", "elevation",
                   "watch", "play")
_CALLBACK_KEYWORDS = ("callback", "call back", "call-back", "call me", "arrange a call",
                      "schedule a call", "phone me", "ring me", "give me a call")
_RISEUP_KEYWORDS = ("riseup", "rise up", "80%", "payment plan", "20% at possession", "final demand")


def _detect_intent(user_msg: str) -> str:
    """Classify the user's message into a coarse intent used for routing."""
    m = user_msg.lower()
    if any(k in m for k in _CALLBACK_KEYWORDS):
        return "callback"
    if any(k in m for k in _BROCHURE_KEYWORDS_SHORT):
        return "brochure"
    if any(k in m for k in _MEDIA_KEYWORDS):
        return "media"
    if any(k in m for k in _VISIT_KEYWORDS):
        return "site_visit"
    if any(k in m for k in _RISEUP_KEYWORDS):
        return "riseup"
    if any(k in m for k in _FIND_UNITS_KEYWORDS):
        return "find_units"
    return "general"


def _extract_salary_budget(user_msg: str) -> Optional[float]:
    """Pull a monthly salary out of messages like 'salary 1.5L' or 'my income
    is 2 lakh per month' and convert to a reasonable home-buying budget
    (≈ 60× monthly salary, a standard lender heuristic)."""
    m = user_msg.lower()
    # Match "salary/income/earn ... X [l|lakh|lac|lpa]"
    pat = re.search(
        r'(?:salary|income|earn(?:ing)?s?|i\s+earn|i\s+make|monthly)\s*(?:is|of|:)?\s*(?:rs\.?\s*|₹\s*)?'
        r'(\d+(?:\.\d+)?)\s*(lakh|lac|lpa|l\b|cr(?:ore)?)?',
        m
    )
    if not pat:
        return None
    val = float(pat.group(1))
    unit = (pat.group(2) or "l").strip()
    # Normalise to rupees per month
    if unit in ("cr", "crore"):
        monthly = val * 10_000_000
    elif unit in ("lakh", "lac", "l", "lpa"):
        monthly = val * 100_000
        # "lpa" means per annum; convert to monthly
        if unit == "lpa":
            monthly /= 12
    else:
        monthly = val
    # Typical home-buying budget for a salaried buyer: ~60× monthly income.
    return monthly * 60


async def _known_project_names(db: AsyncSession) -> list[str]:
    """List of active project names in their canonical DB casing, used for
    name-in-query detection."""
    res = await db.execute(
        select(Project.name).where(Project.is_active == True)
    )
    return [n for (n,) in res.all() if n]


def _build_store_url(user_msg: str, project_names: Optional[list[str]] = None) -> tuple[str, dict]:
    """Build a /store URL that pre-applies filters extracted from the user's
    query. If we can parse structured filters (budget / BHK / facing / project),
    we skip `q=` so the store doesn't fall into its NLP path (which only
    returns the top-20 trending units). If we can't parse anything, we
    pass `q=` as a best-effort hint to the store's NLP endpoint.
    Returns (url, params_dict_for_debug)."""
    from urllib.parse import urlencode
    params: dict = {}

    m = user_msg.lower()

    # Project-name detection — look for any active project name appearing in
    # the message (case-insensitive word-boundary match). Canonical DB casing
    # is kept so the store's string-equality-ignoring-case filter matches.
    if project_names:
        for pname in project_names:
            if re.search(rf'\b{re.escape(pname.lower())}\b', m):
                params["project"] = pname
                break

    # Salary → budget
    budget = _extract_salary_budget(user_msg)
    if budget:
        params["max_price"] = int(budget)
        params["min_price"] = int(budget * 0.4)

    # Direct budget: "under ₹80L", "budget 1cr", "within 60 lakh"
    pat = re.search(
        r'(?:budget(?:\s+is)?|under|below|upto|up\s+to|within|max(?:imum)?|less\s+than|not\s+more\s+than)\s*(?:rs\.?\s*|₹\s*)?'
        r'(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)',
        m
    )
    if pat:
        val = float(pat.group(1))
        unit_found = pat.group(2)
        if unit_found in ("cr", "crore"):
            params["max_price"] = int(val * 10_000_000)
        else:
            params["max_price"] = int(val * 100_000)

    # BHK / unit type
    bhk = re.search(r'(\d)\s*[- ]?\s*bhk', m)
    if bhk:
        params["unit_type"] = f"{bhk.group(1)}BHK"
    elif any(w in m for w in ("spacious", "big", "large", "4bhk", "4 bhk")):
        # "spacious" — bias to 3BHK+; store filter has no "3+" so we nudge to 3BHK
        params["unit_type"] = "3BHK"
    elif any(w in m for w in ("compact", "small", "studio")):
        params["unit_type"] = "1BHK"
    elif "villa" in m:
        params["unit_type"] = "Villa"
    elif "plot" in m:
        params["unit_type"] = "Plot"

    # Facing
    for f in ("east", "west", "north", "south"):
        if re.search(rf'\b{f}(?:-?(?:east|west))?\s+facing|facing\s+{f}', m):
            params["facing"] = f.title()
            break

    # If we didn't extract any structured filter, fall back to letting the
    # store's NLP endpoint try — otherwise we'd send them to an empty page.
    if not params:
        params["q"] = user_msg.strip()

    return "/store?" + urlencode(params), params


async def _load_assistant_facts(db: AsyncSession) -> tuple[dict, list[str]]:
    """Pull admin-curated facts and group them. Returns:
    - per_project: {project_id: ["topic: content", ...]} for active rows tied
      to a project (e.g. "Bahiti has no GST")
    - site_wide: ["topic: content", ...] for active rows with project_id NULL,
      plus any rows in `site_settings` with group_key='assistant_knowledge'
      so admins can drop quick rules in via the existing settings page."""
    per_project: dict = {}
    site_wide: list[str] = []
    try:
        rows = (await db.execute(
            select(AssistantFact)
            .where(AssistantFact.is_active == True)
            .order_by(AssistantFact.sort_order, AssistantFact.created_at)
        )).scalars().all()
        for f in rows:
            entry = f"{(f.topic or 'note').strip()}: {f.content.strip()}"
            if f.project_id is None:
                site_wide.append(entry)
            else:
                per_project.setdefault(f.project_id, []).append(entry)
    except Exception as e:
        # Table may not exist yet on a freshly-pulled branch — degrade gracefully.
        print(f"[Assistant] assistant_facts unavailable: {type(e).__name__}: {e}")

    try:
        srows = (await db.execute(
            select(SiteSetting).where(SiteSetting.group_key == "assistant_knowledge")
        )).scalars().all()
        for s in srows:
            if s.setting_value and s.setting_value.strip():
                site_wide.append(f"{(s.setting_label or s.setting_key).strip()}: {s.setting_value.strip()}")
    except Exception as e:
        print(f"[Assistant] site_settings (assistant_knowledge) unavailable: {type(e).__name__}: {e}")

    return per_project, site_wide


async def _build_site_context(db: AsyncSession) -> str:
    """Snapshot of the site's projects + unit availability.
    Passed to the LLM as the sole source of truth — it must not answer from
    general knowledge about other developers, prices, or localities."""
    res = await db.execute(
        select(Project).where(Project.is_active == True).order_by(Project.name)
    )
    projects = res.scalars().all()
    if not projects:
        return "SITE DATA: No projects are currently listed."

    facts_per_project, facts_site_wide = await _load_assistant_facts(db)

    lines = []
    for p in projects:
        # Prefer custom_fields.total_amount over base_price — some units have
        # base_price set to per-sqft rates, which gives misleading ₹X prices
        # in the LLM context.
        stats_sql = sa_text("""
            SELECT
                COUNT(u.id) AS total_units,
                COUNT(CASE WHEN u.status = 'available' THEN 1 END) AS available_units,
                MIN(CASE WHEN u.status = 'available' THEN effective_price END) AS min_price,
                MAX(CASE WHEN u.status = 'available' THEN effective_price END) AS max_price,
                MIN(CASE WHEN u.status = 'available' THEN u.floor_number END) AS min_floor,
                MAX(CASE WHEN u.status = 'available' THEN u.floor_number END) AS max_floor
            FROM (
                SELECT u.id, u.status, u.floor_number,
                    COALESCE(
                        NULLIF((
                            SELECT CASE
                                WHEN jsonb_typeof(cfv.value) = 'number'
                                    THEN CAST(cfv.value #>> '{}' AS NUMERIC)
                                WHEN jsonb_typeof(cfv.value) = 'string'
                                     AND (cfv.value #>> '{}') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                                    THEN CAST(cfv.value #>> '{}' AS NUMERIC)
                                ELSE NULL
                            END
                            FROM custom_field_values cfv
                            JOIN field_configs fc ON fc.id = cfv.field_config_id
                            WHERE cfv.entity_id = u.id
                              AND fc.field_key = 'total_amount'
                              AND fc.entity = 'unit'
                            LIMIT 1
                        ), 0),
                        u.base_price
                    ) AS effective_price
                FROM units u
                JOIN towers t ON u.tower_id = t.id
                WHERE t.project_id = :project_id
            ) u
        """)
        stats_row = (await db.execute(stats_sql, {"project_id": p.id})).mappings().one()
        total = stats_row["total_units"] or 0
        available = stats_row["available_units"] or 0
        min_p = stats_row["min_price"]
        max_p = stats_row["max_price"]
        min_floor = stats_row["min_floor"]
        max_floor = stats_row["max_floor"]

        # Breakdown of available units by facing
        facing_rows = await db.execute(
            select(Unit.facing, func.count())
            .join(Tower, Unit.tower_id == Tower.id)
            .where(Tower.project_id == p.id, Unit.status == "available", Unit.facing.isnot(None))
            .group_by(Unit.facing)
        )
        facing_counts = {(f or "Other").strip(): int(n) for f, n in facing_rows.all() if f}

        # Breakdown of available units by unit_type (e.g. 2BHK, 3BHK)
        type_rows = await db.execute(
            select(Unit.unit_type, func.count())
            .join(Tower, Unit.tower_id == Tower.id)
            .where(Tower.project_id == p.id, Unit.status == "available", Unit.unit_type.isnot(None))
            .group_by(Unit.unit_type)
        )
        type_counts = {(t or "").strip(): int(n) for t, n in type_rows.all() if t}

        bits = [f"- {p.name}"]
        loc = ", ".join(x for x in [p.location, p.city] if x)
        if loc:
            bits.append(f"({loc})")
        if total:
            bits.append(f"{total} units, {available or 0} available")
        if min_p:
            price_range = _fmt(float(min_p)) if min_p == max_p else f"{_fmt(float(min_p))}–{_fmt(float(max_p))}"
            bits.append(f"price {price_range}")
        if type_counts:
            bhk_desc = ", ".join(f"{k}:{v}" for k, v in sorted(type_counts.items()))
            bits.append(f"available by type [{bhk_desc}]")
        if facing_counts:
            facing_desc = ", ".join(f"{k}:{v}" for k, v in sorted(facing_counts.items()))
            bits.append(f"available by facing [{facing_desc}]")
        if min_floor is not None and max_floor is not None:
            if min_floor == max_floor:
                bits.append(f"floor {min_floor}")
            else:
                bits.append(f"floors {min_floor}–{max_floor}")
        if p.rera_number:
            bits.append(f"RERA {p.rera_number}")
        lines.append(" · ".join(bits))
        # Admin-curated facts scoped to this project (e.g. GST/amenity rules).
        for fact in facts_per_project.get(p.id, []):
            lines.append(f"    rule — {fact}")

    body = "SITE DATA (the only facts you may use):\n" + "\n".join(lines)
    if facts_site_wide:
        body += (
            "\n\nGLOBAL RULES (apply to every project unless a project-specific "
            "rule above contradicts them):\n"
            + "\n".join(f"- {f}" for f in facts_site_wide)
        )
    return body


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


async def _custom_brochure_url(db: AsyncSession, entity: str, entity_id) -> Optional[str]:
    """Fetch the 'series_brochure' custom-field value for the given entity,
    if one is configured and set. Brochures live here on this codebase rather
    than in the per-table brochure_url column — see /units/[id]/page.tsx for
    the same lookup on the frontend."""
    if not entity_id:
        return None
    sql = sa_text("""
        SELECT cfv.value #>> '{}' AS url
          FROM custom_field_values cfv
          JOIN field_configs fc ON fc.id = cfv.field_config_id
         WHERE fc.entity = :entity
           AND fc.field_key = 'series_brochure'
           AND cfv.entity_id = :entity_id
         LIMIT 1
    """)
    row = (await db.execute(sql, {"entity": entity, "entity_id": str(entity_id)})).first()
    if not row:
        return None
    return row[0] or None


# Custom-field keys that hold floor plans on units. Order matters — controls
# the order the buttons render in the chat.
_UNIT_PLAN_FIELDS = [
    ("series_floor_plan",    "Floor Plan"),
    ("series_floor_plan_2d", "2D Plan"),
    ("series_floor_plan_3d", "3D Plan"),
]


async def _unit_custom_plans(db: AsyncSession, unit_id) -> List[dict]:
    """Gather a unit's three series floor-plan custom fields (regular / 2D / 3D),
    skipping any that aren't set. Returns [{label, url}, …]."""
    sql = sa_text("""
        SELECT fc.field_key, cfv.value #>> '{}' AS url
          FROM custom_field_values cfv
          JOIN field_configs fc ON fc.id = cfv.field_config_id
         WHERE fc.entity = 'unit'
           AND fc.field_key = ANY(:keys)
           AND cfv.entity_id = :uid
    """)
    rows = (await db.execute(sql, {
        "keys": [k for k, _ in _UNIT_PLAN_FIELDS],
        "uid": str(unit_id),
    })).all()
    by_key = {r[0]: r[1] for r in rows if r[1]}
    out: List[dict] = []
    for key, label in _UNIT_PLAN_FIELDS:
        url = by_key.get(key)
        if url:
            out.append({"label": label, "url": url})
    return out


async def _collect_floor_plans(
    db: AsyncSession,
    *,
    page: str,
    page_unit_id: Optional[str],
    page_project_id: Optional[str],
    page_tower_id: Optional[str],
) -> Optional[dict]:
    """Return downloadable floor-plan links for the current page, if any.
    Shape: {name, type: "unit"|"project"|"tower", plans: [{label, url}]}.
    URLs may be images or PDFs; the frontend renders each as a download link.
    Returns None when the visitor isn't on a details page or no plans exist."""
    def _abs(u: str) -> str:
        return u if u.startswith("http") else f"{MEDIA_BASE}{u}"

    def _wrap(items: list, label_default: str) -> list:
        """Coerce a [str] list (legacy column) into [{label,url}]."""
        return [{"label": label_default if len(items) == 1 else f"{label_default} {i+1}",
                 "url": _abs(x)} for i, x in enumerate(items) if x]

    if page == "unit" and page_unit_id:
        res = await db.execute(select(Unit).where(Unit.id == page_unit_id))
        u = res.scalar_one_or_none()
        if u:
            plans: list = []
            # Series custom fields (Floor Plan / 2D / 3D) — preferred source.
            custom = await _unit_custom_plans(db, u.id)
            for p in custom:
                plans.append({"label": p["label"], "url": _abs(p["url"])})
            # Legacy column-based plans, as additional entries.
            for x in (u.floor_plans or []):
                if x: plans.append({"label": "Floor Plan", "url": _abs(x)})
            if u.floor_plan_img:
                plans.append({"label": "Floor Plan", "url": _abs(u.floor_plan_img)})
            # De-dupe by url, keep first label.
            seen = set(); deduped = []
            for p in plans:
                if p["url"] in seen: continue
                seen.add(p["url"]); deduped.append(p)
            if deduped:
                return {"name": u.unit_number, "type": "unit", "plans": deduped}
            # Unit has no plans — fall back to tower, then project.
            tower_res = await db.execute(select(Tower).where(Tower.id == u.tower_id))
            t = tower_res.scalar_one_or_none()
            if t:
                t_plans = _wrap(list(t.floor_plans or []), "Floor Plan")
                if t_plans:
                    return {"name": t.name, "type": "tower", "plans": t_plans}
                proj_res = await db.execute(select(Project).where(Project.id == t.project_id))
                p = proj_res.scalar_one_or_none()
                if p:
                    p_plans = _wrap(list(p.floor_plans or []), "Floor Plan")
                    if p_plans:
                        return {"name": p.name, "type": "project", "plans": p_plans}

    if page == "project" and page_project_id:
        res = await db.execute(select(Project).where(Project.id == page_project_id))
        p = res.scalar_one_or_none()
        if p:
            p_plans = _wrap(list(p.floor_plans or []), "Floor Plan")
            if p_plans:
                return {"name": p.name, "type": "project", "plans": p_plans}

    if page == "tower" and page_tower_id:
        res = await db.execute(select(Tower).where(Tower.id == page_tower_id))
        t = res.scalar_one_or_none()
        if t:
            t_plans = _wrap(list(t.floor_plans or []), "Floor Plan")
            if t_plans:
                return {"name": t.name, "type": "tower", "plans": t_plans}

    return None


# Custom-field keys that hold playable / viewable media on units. Order
# controls how items appear in the chat. `kind` flips the icon ▶ vs 🖼.
_UNIT_MEDIA_FIELDS = [
    ("series_walkthrough_video", "Walkthrough Video", "video"),
    ("series_model_flat_video",  "Model Flat Video",  "video"),
    ("series_project_video",     "Project Video",     "video"),
    ("series_tower_elevation",   "Tower Elevation",   "image"),
    ("series_unit_image",        "Unit Image",        "image"),
    ("series_project_image",     "Project Image",     "image"),
]
_TOWER_MEDIA_FIELDS = [
    ("series_tower_elevation",   "Tower Elevation",   "image"),
]
_PROJECT_MEDIA_FIELDS = [
    ("series_project_video",     "Project Video",     "video"),
    ("series_project_image",     "Project Image",     "image"),
]


async def _custom_media(db: AsyncSession, entity: str, entity_id, fields: list) -> List[dict]:
    """Pull a set of series_* media custom fields for an entity. Returns
    [{label, url, kind}] in the order given by `fields`."""
    if not entity_id:
        return []
    sql = sa_text("""
        SELECT fc.field_key, cfv.value #>> '{}' AS url
          FROM custom_field_values cfv
          JOIN field_configs fc ON fc.id = cfv.field_config_id
         WHERE fc.entity = :entity
           AND fc.field_key = ANY(:keys)
           AND cfv.entity_id = :eid
    """)
    rows = (await db.execute(sql, {
        "entity": entity,
        "keys": [k for k, _, _ in fields],
        "eid": str(entity_id),
    })).all()
    by_key = {r[0]: r[1] for r in rows if r[1]}
    out: List[dict] = []
    for key, label, kind in fields:
        url = by_key.get(key)
        if url:
            out.append({"label": label, "url": url, "kind": kind})
    return out


async def _collect_media(
    db: AsyncSession,
    *,
    page: str,
    page_unit_id: Optional[str],
    page_project_id: Optional[str],
    page_tower_id: Optional[str],
) -> Optional[dict]:
    """Return walkthroughs / videos / model-flat clips / elevations for the
    current page. Shape: {name, type, items: [{label, url, kind}]}.
    Falls back from unit → tower → project so a unit page that hasn't set its
    own media still surfaces the project-level walkthrough or elevation."""
    def _abs(u: str) -> str:
        return u if u.startswith("http") else f"{MEDIA_BASE}{u}"

    items: List[dict] = []
    name: Optional[str] = None
    container_type: Optional[str] = None

    if page == "unit" and page_unit_id:
        res = await db.execute(select(Unit).where(Unit.id == page_unit_id))
        u = res.scalar_one_or_none()
        if u:
            name, container_type = u.unit_number, "unit"
            items = await _custom_media(db, "unit", u.id, _UNIT_MEDIA_FIELDS)
            for col_url, col_label, col_kind in (
                (u.video_url, "Unit Video", "video"),
                (u.walkthrough_url, "Walkthrough", "video"),
            ):
                if col_url:
                    items.append({"label": col_label, "url": col_url, "kind": col_kind})
            if not items:
                # Climb to tower → project for media when unit has none.
                tower_res = await db.execute(select(Tower).where(Tower.id == u.tower_id))
                t = tower_res.scalar_one_or_none()
                if t:
                    items = await _custom_media(db, "tower", t.id, _TOWER_MEDIA_FIELDS)
                    if t.video_url:
                        items.append({"label": "Tower Video", "url": t.video_url, "kind": "video"})
                    if t.walkthrough_url:
                        items.append({"label": "Tower Walkthrough", "url": t.walkthrough_url, "kind": "video"})
                    if items:
                        name, container_type = t.name, "tower"
                    else:
                        proj_res = await db.execute(select(Project).where(Project.id == t.project_id))
                        p = proj_res.scalar_one_or_none()
                        if p:
                            items = await _custom_media(db, "project", p.id, _PROJECT_MEDIA_FIELDS)
                            if p.video_url:
                                items.append({"label": "Project Video", "url": p.video_url, "kind": "video"})
                            if p.walkthrough_url:
                                items.append({"label": "Project Walkthrough", "url": p.walkthrough_url, "kind": "video"})
                            if items:
                                name, container_type = p.name, "project"

    elif page == "tower" and page_tower_id:
        res = await db.execute(select(Tower).where(Tower.id == page_tower_id))
        t = res.scalar_one_or_none()
        if t:
            name, container_type = t.name, "tower"
            items = await _custom_media(db, "tower", t.id, _TOWER_MEDIA_FIELDS)
            if t.video_url: items.append({"label": "Tower Video", "url": t.video_url, "kind": "video"})
            if t.walkthrough_url: items.append({"label": "Tower Walkthrough", "url": t.walkthrough_url, "kind": "video"})

    elif page == "project" and page_project_id:
        res = await db.execute(select(Project).where(Project.id == page_project_id))
        p = res.scalar_one_or_none()
        if p:
            name, container_type = p.name, "project"
            items = await _custom_media(db, "project", p.id, _PROJECT_MEDIA_FIELDS)
            if p.video_url: items.append({"label": "Project Video", "url": p.video_url, "kind": "video"})
            if p.walkthrough_url: items.append({"label": "Project Walkthrough", "url": p.walkthrough_url, "kind": "video"})

    if not items or not name or not container_type:
        return None
    # Absolutize and de-duplicate by URL while keeping the first label.
    seen = set(); deduped: List[dict] = []
    for it in items:
        u = _abs(it["url"])
        if u in seen: continue
        seen.add(u)
        deduped.append({"label": it["label"], "url": u, "kind": it["kind"]})
    return {"name": name, "type": container_type, "items": deduped}


# ── Callback lead helpers ────────────────────────────────────────────────────

_PHONE_RE = re.compile(r"\b(?:\+?91[\s\-]?)?([6-9]\d{9})\b")

def _extract_phone(text: str) -> Optional[str]:
    """Return a normalized 10-digit Indian mobile number from `text`, or None."""
    if not text:
        return None
    m = _PHONE_RE.search(text)
    return m.group(1) if m else None


# Day-relative tokens map to a delta in days from "today".
_DAY_TOKENS = (
    ("day after tomorrow", 2),
    ("tomorrow", 1),
    ("today", 0),
    ("now", 0),
    ("this evening", 0),
    ("this afternoon", 0),
    ("this morning", 0),
)
_TIME_RE = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)\b", re.I)


def _parse_callback_time(text: str, now: Optional[datetime] = None) -> Optional[datetime]:
    """Best-effort parse of phrases like 'tomorrow 10am', 'today at 4 pm',
    'call me at 5pm'. Returns a timezone-aware datetime or None.
    Anchored to the current UTC time — close enough for sales scheduling
    (we're not booking calendar slots, just leaving a hint for the agent)."""
    if not text:
        return None
    m = _TIME_RE.search(text.lower())
    if not m:
        return None
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    period = m.group(3).replace(".", "").lower()
    if period.startswith("p") and hour < 12:
        hour += 12
    elif period.startswith("a") and hour == 12:
        hour = 0

    base = now or datetime.now(timezone.utc)
    delta = None
    low = text.lower()
    for token, d in _DAY_TOKENS:
        if token in low:
            delta = d
            break
    target = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if delta is not None:
        target = target + timedelta(days=delta)
    elif target < base:
        # No day token and the time has already passed today — assume tomorrow.
        target = target + timedelta(days=1)
    return target


async def _create_callback_lead(
    db: AsyncSession, *,
    phone: str,
    name: str,
    notes: str,
    scheduled_at: Optional[datetime] = None,
    project_interest: Optional[str] = None,
    visitor_meta: Optional[dict] = None,
) -> tuple[Optional[Lead], Optional[LeadActivity]]:
    """Persist a callback request as a Lead AND a scheduled LeadActivity so
    sales has both the contact record and a follow-up reminder with the
    visitor-stated time. Best-effort: returns (None, None) on failure."""
    try:
        meta = visitor_meta or {}
        lead = Lead(
            name=name or phone,
            phone=phone,
            source="assistant_callback",
            project_interest=project_interest,
            notes=notes,
            utm_source=meta.get("utm_source"),
            utm_medium=meta.get("utm_medium"),
            utm_campaign=meta.get("utm_campaign"),
            extra_data={"channel": "proactive_assistant"},
        )
        # Link to existing customer by phone if possible.
        from backend.app.models.customer import Customer
        cust = (await db.execute(select(Customer).where(Customer.phone == phone))).scalar_one_or_none()
        if cust:
            lead.customer_id = cust.id
        db.add(lead)
        await db.flush()
        await db.refresh(lead)

        when_str = scheduled_at.strftime("%a %d %b, %I:%M %p") if scheduled_at else "as soon as possible"
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type="callback",
            subject=f"Callback requested ({when_str})",
            notes=notes,
            scheduled_at=scheduled_at,
            status="pending",
            source="proactive_assistant",
            created_by="assistant",
        )
        db.add(activity)
        await db.commit()
        await db.refresh(lead)
        await db.refresh(activity)
        return lead, activity
    except Exception as e:
        print(f"[Assistant] _create_callback_lead failed: {type(e).__name__}: {e}")
        try:
            await db.rollback()
        except Exception:
            pass
        return None, None


# ── Chat endpoint ─────────────────────────────────────────────────────────────

async def _log_turns(
    db: AsyncSession,
    session_id: Optional[str],
    visitor_id: Optional[str],
    user_msg: str,
    reply: Optional[str],
    *,
    intent: Optional[str] = None,
    provider: Optional[str] = None,
    page: Optional[str] = None,
    page_entity_id: Optional[str] = None,
    action_type: Optional[str] = None,
    action_url: Optional[str] = None,
    latency_ms: Optional[int] = None,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    visitor_meta: Optional[dict] = None,
) -> None:
    """Persist a (user, assistant) turn pair. Never raises — chat path is never
    blocked by logging failures. Attribution (IP / UA / UTM / cookies) is stored
    only on the first user turn of each session to keep the table compact."""
    if not session_id:
        return
    try:
        # Has this session logged anything before? If not, attach visitor profile.
        first_q = await db.execute(
            select(func.count()).select_from(AssistantChatLog).where(AssistantChatLog.session_id == session_id)
        )
        is_first_turn = (first_q.scalar() or 0) == 0
        meta = visitor_meta or {}

        user_row = AssistantChatLog(
            session_id=session_id, visitor_id=visitor_id,
            role="user", content=user_msg,
            page=page, page_entity_id=page_entity_id, intent=intent,
        )
        if is_first_turn:
            user_row.ip_address   = client_ip
            user_row.user_agent   = user_agent
            user_row.referrer     = meta.get("referrer")
            user_row.landing_page = meta.get("landing_page")
            user_row.utm_source   = meta.get("utm_source")
            user_row.utm_medium   = meta.get("utm_medium")
            user_row.utm_campaign = meta.get("utm_campaign")
            user_row.utm_term     = meta.get("utm_term")
            user_row.utm_content  = meta.get("utm_content")
            user_row.cookies      = meta.get("cookies")
        db.add(user_row)

        if reply:
            db.add(AssistantChatLog(
                session_id=session_id, visitor_id=visitor_id,
                role="assistant", content=reply,
                intent=intent, provider=provider, page=page,
                page_entity_id=page_entity_id,
                action_type=action_type, action_url=action_url,
                latency_ms=latency_ms,
            ))
        await db.commit()
    except Exception as e:
        print(f"[Assistant] log_turns failed: {type(e).__name__}: {e}")
        try:
            await db.rollback()
        except Exception:
            pass


@router.post("/chat", response_model=AssistantResponse)
async def assistant_chat(data: AssistantRequest, request: Request, db: AsyncSession = Depends(get_db)):
    # If neither provider is configured, just offer the callback path.
    if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
        return AssistantResponse(
            reply="I'm here to help! Please call us at +91 40 1234 5678 or fill the callback form.",
            show_callback_form=True,
        )

    ctx = data.context or {}
    search_query = ctx.get("search_query", "")
    budget       = float(ctx.get("budget", 0) or 0)
    results_count = int(ctx.get("results_count", -1))
    last_user_msg = data.messages[-1].content if data.messages else ""

    # Page-context (where the visitor is right now)
    page = (ctx.get("page") or "").lower()
    page_project_id = ctx.get("project_id")
    page_unit_id    = ctx.get("unit_id")
    page_unit_number = ctx.get("unit_number")
    page_project_name = ctx.get("project_name")

    # Visitor identifiers (stable per browser) — reuse the existing
    # jp_visitor_id / jp_session_id the SessionTracker already populates.
    session_id = ctx.get("session_id") or data.session_id
    visitor_id = ctx.get("visitor_id")

    # Pull client IP (via proxy header if present). X-Forwarded-For can be a
    # comma list — the first entry is the original client.
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    client_ip = (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else None))
    user_agent = request.headers.get("user-agent")

    # Visitor meta (UTM/referrer/cookies) lives in ctx.visitor_meta and is
    # only saved on the first turn of a session (see _log_turns).
    visitor_meta = ctx.get("visitor_meta") or {}

    # Determine the entity id for the current page (if any) — used for log rows.
    page_entity_id = (
        ctx.get("unit_id") if page == "unit"
        else ctx.get("tower_id") if page == "tower"
        else ctx.get("project_id") if page == "project"
        else None
    )

    _t_start = time.monotonic()

    # Classify the user's intent so we can route to the right UI action
    intent = _detect_intent(last_user_msg)

    # Brochure handling is page-aware:
    # - On a unit page: return the unit's brochure directly.
    # - Elsewhere: fall back to fuzzy match; the _find_brochure helper figures
    #   out the nearest project/unit from the message text.
    brochure = None
    floor_plans = None
    media = None
    lead_created: Optional[dict] = None
    action: Optional[AssistantAction] = None
    page_tower_id = ctx.get("tower_id")
    if intent == "brochure":
        if page == "unit" and page_unit_id:
            unit_res = await db.execute(select(Unit).where(Unit.id == page_unit_id))
            u = unit_res.scalar_one_or_none()
            # Try the unit's column, then the unit's series_brochure custom
            # field, then walk up to tower/project (column or custom field).
            unit_brochure = (u.brochure_url if u else None) or (
                await _custom_brochure_url(db, "unit", page_unit_id) if u else None
            )
            if u and unit_brochure:
                url = unit_brochure if unit_brochure.startswith("http") else f"{MEDIA_BASE}{unit_brochure}"
                brochure = {"name": u.unit_number, "url": url, "type": "unit"}
            elif u:
                tower_res = await db.execute(select(Tower).where(Tower.id == u.tower_id))
                t = tower_res.scalar_one_or_none()
                fallback_url = None
                fallback_name = page_unit_number or "this unit"
                fallback_type = "unit"
                if t:
                    t_brochure = t.brochure_url or await _custom_brochure_url(db, "tower", t.id)
                    if t_brochure:
                        fallback_url = t_brochure
                        fallback_name = t.name
                        fallback_type = "tower"
                    else:
                        proj_res = await db.execute(select(Project).where(Project.id == t.project_id))
                        p = proj_res.scalar_one_or_none()
                        if p:
                            p_brochure = p.brochure_url or await _custom_brochure_url(db, "project", p.id)
                            if p_brochure:
                                fallback_url = p_brochure
                                fallback_name = p.name
                                fallback_type = "project"
                if fallback_url:
                    url = fallback_url if fallback_url.startswith("http") else f"{MEDIA_BASE}{fallback_url}"
                    brochure = {"name": fallback_name, "url": url, "type": fallback_type}
                else:
                    brochure = {"name": fallback_name, "url": None, "type": "unit"}
            else:
                brochure = {"name": page_unit_number or "this unit", "url": None, "type": "unit"}
        elif page == "project" and page_project_id:
            proj_res = await db.execute(select(Project).where(Project.id == page_project_id))
            p = proj_res.scalar_one_or_none()
            p_brochure = (p.brochure_url if p else None) or await _custom_brochure_url(db, "project", page_project_id)
            if p and p_brochure:
                url = p_brochure if p_brochure.startswith("http") else f"{MEDIA_BASE}{p_brochure}"
                brochure = {"name": p.name, "url": url, "type": "project"}
            else:
                brochure = {"name": page_project_name or "this project", "url": None, "type": "project"}
        else:
            brochure = await _find_brochure(last_user_msg, db)
            # If no unit/project matched, prompt the visitor to pick one.
            if not brochure or brochure.get("url") is None:
                proj_res = await db.execute(
                    select(Project).where(Project.is_active == True).order_by(Project.name)
                )
                projects = proj_res.scalars().all()
                if projects:
                    action = AssistantAction(
                        type="ask_which",
                        label="Pick a project for its brochure",
                        options=[
                            {"label": p.name, "value": str(p.id), "url": f"/projects/{p.slug}#enquire"}
                            for p in projects
                        ],
                    )

        # On a details page, also surface downloadable floor plans next to the
        # brochure — visitors often want both.
        floor_plans = await _collect_floor_plans(
            db,
            page=page,
            page_unit_id=page_unit_id,
            page_project_id=page_project_id,
            page_tower_id=page_tower_id,
        )

    # Site-visit intent: route the visitor to the booking form. Project context
    # (if known) is appended as a query param so the page can pre-fill it later.
    if intent == "site_visit":
        sv_url = "/site-visit"
        if page_project_id:
            sv_url += f"?project_id={page_project_id}"
        elif page_project_name:
            from urllib.parse import quote_plus
            sv_url += f"?project={quote_plus(page_project_name)}"
        action = AssistantAction(
            type="navigate_site_visit",
            url=sv_url,
            label="Book a site visit →",
        )

    # Media intent: pull videos / walkthroughs / model-flat clips / elevations
    # for the current page (with fallback up the unit→tower→project chain).
    if intent == "media":
        media = await _collect_media(
            db,
            page=page,
            page_unit_id=page_unit_id,
            page_project_id=page_project_id,
            page_tower_id=page_tower_id,
        )

    # Callback intent: try to find a phone number anywhere in the recent
    # conversation (covers "9885700553 and call me tomorrow 10am" — phone may
    # be in the same turn or a previous one). When we have it, persist a Lead
    # AND a scheduled LeadActivity so sales sees both the contact and the
    # promised follow-up time on the lead detail page.
    if intent == "callback":
        recent_text = " ".join(m.content for m in data.messages[-6:] if m.role == "user")
        phone_found = _extract_phone(recent_text)
        if phone_found:
            scheduled_at = _parse_callback_time(recent_text)
            notes = "\n".join(m.content for m in data.messages[-6:] if m.role == "user")
            lead, activity = await _create_callback_lead(
                db, phone=phone_found,
                name=phone_found,  # name unknown; sales rep fills in on contact
                notes=notes,
                scheduled_at=scheduled_at,
                project_interest=page_project_name,
                visitor_meta=visitor_meta,
            )
            if lead:
                lead_created = {
                    "phone": phone_found,
                    "lead_id": str(lead.id),
                    "activity_id": str(activity.id) if activity else None,
                    "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
                    "scheduled_label": scheduled_at.strftime("%a %d %b, %I:%M %p") if scheduled_at else None,
                    "source": "assistant_callback",
                }

    budget_str = _fmt(budget) if budget else "not specified"
    site_context = await _build_site_context(db)

    # Build the store action for find_units intent so the LLM can reference
    # the fact that we're navigating the visitor to the store page.
    store_url = None
    store_params: dict = {}
    if intent == "find_units":
        known_projects = await _known_project_names(db)
        store_url, store_params = _build_store_url(last_user_msg, project_names=known_projects)
        action = AssistantAction(
            type="navigate_store",
            url=store_url,
            label="See matching units on the Store page →",
            params=store_params,
        )

    # Salary-driven budget inference for the LLM's awareness
    salary_budget = _extract_salary_budget(last_user_msg) if intent == "find_units" else None

    # Where is the visitor right now?
    page_hint = ""
    if page == "unit" and page_unit_number:
        page_hint = f"\nThe visitor is viewing UNIT {page_unit_number}."
        # Pull the actual unit price (preferring the custom 'total_amount'
        # field which includes GST etc.) so the LLM gives concrete numbers
        # instead of generic "₹X" placeholders for RiseUp questions.
        if page_unit_id:
            unit_price_sql = sa_text("""
                SELECT
                    u.unit_number,
                    u.unit_type,
                    COALESCE(
                        NULLIF((
                            SELECT CASE
                                WHEN jsonb_typeof(cfv.value) = 'number'
                                    THEN CAST(cfv.value #>> '{}' AS NUMERIC)
                                WHEN jsonb_typeof(cfv.value) = 'string'
                                     AND (cfv.value #>> '{}') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                                    THEN CAST(cfv.value #>> '{}' AS NUMERIC)
                                ELSE NULL
                            END
                            FROM custom_field_values cfv
                            JOIN field_configs fc ON fc.id = cfv.field_config_id
                            WHERE cfv.entity_id = u.id
                              AND fc.field_key = 'total_amount'
                              AND fc.entity = 'unit'
                            LIMIT 1
                        ), 0),
                        u.base_price
                    ) AS price
                FROM units u
                WHERE u.id = :uid
            """)
            row = (await db.execute(unit_price_sql, {"uid": str(page_unit_id)})).mappings().first()
            if row and row["price"]:
                price = float(row["price"])
                rd = _riseup_data(price)
                page_hint += (
                    f"\n\nUNIT_RISEUP — concrete numbers for UNIT {row['unit_number']}"
                    f"{(' (' + row['unit_type'] + ')') if row['unit_type'] else ''}:"
                    f"\n  Total unit price (P)          = {_fmt(price)}"
                    f"\n  RiseUp 80% portion            = {_fmt(rd['riseup_price'])} (paid in milestones over the construction-linked plan, typically ~24 months)"
                    f"\n  Booking down payment 10% opt  = {_fmt(rd['down_payment_10'])} at booking (bank loan covers {_fmt(rd['bank_loan_90'])} disbursed per construction milestones)"
                    f"\n  Booking down payment 20% opt  = {_fmt(rd['down_payment_20'])} at booking (bank loan covers {_fmt(rd['bank_loan_80'])} disbursed per construction milestones)"
                    f"\n  Final 20%                     = {_fmt(rd['possession_amount'])} (due 6 MONTHS AFTER handover; the finishing demand is the last construction milestone and means the flat is ready to hand over)"
                    f"\n  Estimated interest saved      = {_fmt(rd['interest_saved'])} (~{rd['interest_saved_pct']}% of P,"
                    f" assuming a {int(rd['loan_rate_pct'])}% loan over a {int(rd['construction_years'])}-year construction window;"
                    f" actual savings vary with loan rate, tenure, and the project's construction timeline)"
                    f"\nUse these exact figures when answering RiseUp / pricing / savings questions for this unit."
                    f"\nNever describe the 80% as paid 'upfront' — it is paid milestone-by-milestone as construction progresses."
                    f"\nWhen citing the savings, ALWAYS note it is an estimate of construction-period home-loan"
                    f" interest saved (not a discount on the unit price), and that actual savings depend on the customer's loan rate."
                )
    elif page == "project" and page_project_name:
        page_hint = f"\nThe visitor is viewing PROJECT {page_project_name}."
    elif page == "tower":
        page_hint = "\nThe visitor is viewing a TOWER detail page."
    elif page == "store":
        page_hint = "\nThe visitor is on the Store (units) page."

    action_hint = ""
    if action and action.type == "navigate_store":
        max_p = store_params.get("max_price")
        action_hint = (
            f"\nThe frontend is about to navigate the visitor to the Store page with filters applied "
            f"(q={store_params.get('q')!r}"
            + (f", budget≤{_fmt(max_p)}" if max_p else "")
            + f"). Tell them matching results will open on the Store page."
        )
        if salary_budget:
            action_hint += f" Their monthly salary implies a rough budget of {_fmt(salary_budget)}."
    elif action and action.type == "ask_which":
        action_hint = "\nWe don't yet know which project/unit they mean. Ask them which project they'd like the brochure for — the UI will show the list as buttons."
    elif action and action.type == "navigate_site_visit":
        action_hint = (
            "\nThe frontend is showing a 'Book a site visit' button that opens our scheduling form. "
            "Confirm warmly in one short sentence that they can pick a date and time below."
        )

    if brochure and brochure.get("url"):
        action_hint += (
            f"\nThe brochure for {brochure['name']} is being shown below the reply with a "
            "download button — confirm you're sharing it. Do NOT say it's unavailable."
        )
    elif intent == "brochure" and brochure and not brochure.get("url"):
        action_hint += (
            f"\nNo brochure is on file for {brochure['name']} yet. Apologise briefly and "
            "offer a callback so the team can email it across."
        )

    if floor_plans:
        action_hint += (
            f"\nDownloadable floor plans for {floor_plans['name']} are being shown below the reply — "
            "tell them you're sharing the floor plans."
        )

    if media and media.get("items"):
        labels = ", ".join(it["label"] for it in media["items"])
        action_hint += (
            f"\nThe following media for {media['name']} is being shown below the reply: {labels}. "
            "Confirm in one short sentence that they can watch/view it below."
        )
    elif intent == "media":
        action_hint += (
            "\nWe don't have a video or walkthrough on file for this page yet. Apologise briefly and "
            "offer a callback so the sales team can share one."
        )

    if intent == "callback":
        if lead_created:
            when = lead_created.get("scheduled_label") or "the time they mentioned"
            action_hint += (
                f"\nA callback request has been logged for +91 {lead_created['phone']} scheduled "
                f"for {when}. Confirm warmly in one short sentence that the team will reach out then."
            )
        else:
            action_hint += (
                "\nThe visitor wants a callback but we don't have their phone yet. Ask them to share "
                "a 10-digit mobile number and a preferred time."
            )

    system_prompt = f"""You are Priya, a senior sales advisor at Janapriya Upscale — a leading residential developer in Hyderabad. You are speaking with a website visitor. Your goal is to genuinely understand what they need, recommend the right home from our catalog, and warmly guide them toward booking a site visit so they can experience the property in person.

{site_context}

{RISEUP_CONTEXT}
{page_hint}{action_hint}

Visitor context: searched="{search_query}", results={results_count}, budget={budget_str}

HOW TO BEHAVE — like a real sales advisor, not a search engine:

1. **Be warm and human.** Greet visitors naturally. Use a friendly, confident tone. Sound like a person, not a chatbot. Write 2-4 short sentences per turn. No markdown, no bullet points, no numbered lists — prose only.

2. **Qualify before you recommend.** Before pitching a specific unit, learn the visitor's situation. Ask 1-2 short qualifying questions per turn (never more, never an interrogation). Across the conversation, try to learn:
   - Who they're buying for (family with kids? parents? self-use? investment?)
   - Their timeline (ready to book? exploring for 3-6 months? just looking?)
   - Budget and how flexible it is
   - Location, facing, floor, area preferences
   - Whether they need a home loan
   Spread these naturally across turns. Don't ask everything at once.

3. **Curate — don't dump search results.** When you call search_units, the system returns several matches but you should pick the SINGLE BEST one (occasionally two) to actually recommend. Describe it like a person would: "There's a beautiful 3BHK on the 12th floor in Bahiti, east-facing, ₹68L — perfect for morning light. With RiseUp the down payment comes to under ₹14L." Don't list 5 units. Don't say "here are 8 options" — that's a search engine, not a sales advisor.

4. **Always be moving toward a site visit.** The site visit is the conversion. After you've made a recommendation that fits them, invite them warmly: "Would you like to come see it this weekend? Seeing the home in person makes everything click." When they agree, confirm and tell them the booking button is right below.

5. **Handle hesitation with our actual value props.**
   - "Budget tight" → RiseUp lets you pay only 80% during construction; the final 20% is due 6 months after handover, so you save lakhs in home-loan interest during the build period.
   - "Need to think" → Offer to send a brochure or schedule a relaxed site visit, no pressure.
   - "Comparing options" → Don't name competitors. Steer back to what makes THIS project special (location, RiseUp, amenities, the actual unit you recommended).

6. **Capture their phone naturally.** When the visitor shows clear buying intent (asks about pricing, wants to book, asks for brochure), ask warmly: "Could I have your number so a senior advisor can call you with the full details and walk you through the next steps?" — never as the first ask, only after you've added value.

STRICT GUARDRAILS — these override everything above:

- ONLY use facts from SITE DATA and the RiseUp description above. Never invent projects, prices, locations, amenities, or availability that aren't listed. Never use your general training knowledge about Hyderabad, real estate, or any developer.
- Never name, compare to, or recommend other developers, builders, or competitor properties. If asked about competitors, alternatives, market comparisons, reviews, or ratings, reply: "I can only share information about Janapriya Upscale's own projects. Would you like me to connect you with our sales team?"
- If the visitor asks for a detail we don't have (specific unit not in SITE DATA, possession dates, legal/tax advice), say you don't have that exact detail on hand and offer to have a senior advisor call them.
- The `available by type` and `available by facing` counts in SITE DATA are INDEPENDENT — never multiply or intersect them to claim a combination count.
- If they ask for a brochure or floor plan and one is available, say you're sharing it below. If none is available, apologise and offer a callback.
- Exception to the "2-4 sentences" rule: detailed RiseUp/EMI/pricing math may run to 5-6 sentences when explicitly asked. Still prose, still no markdown."""

    recent_msgs = data.messages[-6:]

    # Cascade: Claude (Haiku→Sonnet) → Groq → primary Gemini/Gemma → secondary Gemini/Gemma → canned reply.
    reply = None
    provider_used = None
    claude_units: list[dict] = []
    claude_escalated = False
    if settings.ANTHROPIC_API_KEY:
        try:
            from backend.app.services.claude_chat import run_claude_turn
            result = await run_claude_turn(system_prompt, recent_msgs, db)
            if result.get("text"):
                reply = result["text"]
                claude_units = result.get("suggested_units") or []
                claude_escalated = bool(result.get("escalated"))
                # "claude:haiku" or "claude:sonnet" — match the existing
                # provider_used naming (e.g. "gemini:gemini-2.0-flash").
                model = result.get("model_used", "")
                tag = "sonnet" if "sonnet" in model else "haiku"
                provider_used = f"claude:{tag}"
        except Exception as e:
            print(f"[Assistant] Claude failed ({type(e).__name__}: {e}); trying Groq")
    if reply is None and settings.GROQ_API_KEY:
        try:
            reply = _call_groq(system_prompt, recent_msgs)
            provider_used = "groq"
        except Exception as e:
            print(f"[Assistant] Groq failed ({type(e).__name__}: {e}); trying Gemini primary")
    if reply is None and settings.GEMINI_API_KEY:
        try:
            reply = await _call_gemini(system_prompt, recent_msgs, model=settings.GEMINI_MODEL)
            provider_used = f"gemini:{settings.GEMINI_MODEL}"
        except Exception as e:
            print(f"[Assistant] Gemini primary ({settings.GEMINI_MODEL}) failed ({type(e).__name__}: {e})")
    if reply is None and settings.GEMINI_API_KEY and settings.GEMINI_MODEL_FALLBACK:
        try:
            reply = await _call_gemini(system_prompt, recent_msgs, model=settings.GEMINI_MODEL_FALLBACK)
            provider_used = f"gemini:{settings.GEMINI_MODEL_FALLBACK}"
        except Exception as e:
            print(f"[Assistant] Gemini fallback ({settings.GEMINI_MODEL_FALLBACK}) failed ({type(e).__name__}: {e})")
    if reply is None:
        fallback_reply = "Our assistant is briefly unavailable — please share your number and we'll call you back shortly."
        await _log_turns(
            db, session_id, visitor_id, last_user_msg, fallback_reply,
            intent=intent, provider=None,
            page=page, page_entity_id=page_entity_id,
            action_type=action.type if action else None,
            action_url=action.url if action else None,
            latency_ms=int((time.monotonic() - _t_start) * 1000),
            client_ip=client_ip, user_agent=user_agent, visitor_meta=visitor_meta,
        )
        return AssistantResponse(
            reply=fallback_reply,
            show_callback_form=True,
            brochure=brochure,
            floor_plans=floor_plans,
            media=media,
            lead_created=lead_created,
            action=action,
        )

    rl = reply.lower()
    show_riseup   = any(w in rl for w in ["riseup", "rise up", "80%", "possession"])
    show_callback = results_count == 0 or any(w in rl for w in ["call", "advisor", "connect", "team"])
    # Don't compete with the dedicated site-visit CTA — the form on /site-visit
    # already collects name, phone, and OTP.
    if action and action.type == "navigate_site_visit":
        show_callback = False
    # And once we've already logged the callback request, hide the form too.
    if lead_created:
        show_callback = False

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
             "is_riseup_eligible": bool(u.is_riseup_eligible),
             "riseup_price": round(float(u.base_price or 0) * 0.8) if u.is_riseup_eligible else 0}
            for u in res.scalars().all()
        ]

    riseup_data_val = _riseup_data(budget if results_count != 0 else budget / 0.8) if budget else None

    print(f"[Assistant] Served reply via {provider_used} (intent={intent})")
    await _log_turns(
        db, session_id, visitor_id, last_user_msg, reply,
        intent=intent, provider=provider_used,
        page=page, page_entity_id=page_entity_id,
        action_type=action.type if action else None,
        action_url=action.url if action else None,
        latency_ms=int((time.monotonic() - _t_start) * 1000),
        client_ip=client_ip, user_agent=user_agent, visitor_meta=visitor_meta,
    )
    # Claude's tool-driven matches take precedence over the RiseUp budget fallback;
    # we only fall back to `suggested` if Claude didn't find anything.
    final_units = claude_units if claude_units else suggested

    return AssistantResponse(
        reply=reply,
        suggested_units=final_units,
        show_callback_form=show_callback,
        show_riseup=show_riseup,
        riseup_data=riseup_data_val,
        brochure=brochure,
        floor_plans=floor_plans,
        media=media,
        lead_created=lead_created,
        action=action,
        model_used=provider_used,
        escalated=claude_escalated,
    )


# ── Admin: live AI usage status ───────────────────────────────────────────────

@router.post("/admin/ai-usage/test")
async def admin_ai_usage_test(
    provider: str,
    question: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Fire a test query at a specific provider (groq|gemini) using the same
    site-scoped system prompt production uses. Verifies connectivity *and*
    that the model follows the site-data-only rules. Counts against that
    provider's free-tier quota, so use sparingly."""
    provider = provider.lower()
    q = question or "Name two Janapriya Upscale projects in Sainikpuri in one short sentence."

    site_context = await _build_site_context(db)
    system_prompt = f"""You are the Janapriya Upscale website assistant. Use ONLY the SITE DATA below.

{site_context}

{RISEUP_CONTEXT}

Rules: answer in 1-2 short sentences. Only use facts from SITE DATA. Never name competitors or invent projects. If the answer isn't in SITE DATA, say so."""

    msg = SimpleNamespace(role="user", content=q)
    try:
        if provider == "groq":
            if not settings.GROQ_API_KEY:
                raise HTTPException(400, "Groq not configured")
            reply = _call_groq(system_prompt, [msg])
        elif provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise HTTPException(400, "Gemini not configured")
            reply = await _call_gemini(system_prompt, [msg])
        else:
            raise HTTPException(400, "provider must be 'groq' or 'gemini'")
        return {"ok": True, "provider": provider, "reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        return {"ok": False, "provider": provider, "error": f"{type(e).__name__}: {e}"}


@router.get("/admin/ai-usage/live")
async def admin_ai_usage_live():
    """Live (in-memory) usage snapshot for Groq + Gemini.
    Groq numbers come straight from the provider's response headers on every
    call; Gemini numbers are counted locally since the last process restart."""

    def _to_int(v):
        try:
            return int(v) if v is not None else None
        except (ValueError, TypeError):
            return None

    groq = {
        "configured": bool(settings.GROQ_API_KEY),
        "model": settings.GROQ_MODEL,
        "limit_requests": _to_int(_groq_status.get("limit_requests")) or GROQ_DAILY_LIMIT,
        "remaining_requests": _to_int(_groq_status.get("remaining_requests")),
        "limit_tokens": _to_int(_groq_status.get("limit_tokens")),
        "remaining_tokens": _to_int(_groq_status.get("remaining_tokens")),
        "reset_requests": _groq_status.get("reset_requests"),
        "reset_tokens": _groq_status.get("reset_tokens"),
        "last_updated": _groq_status.get("last_updated"),
        "last_error": _groq_status.get("last_error"),
        "last_error_at": _groq_status.get("last_error_at"),
        "source": "provider_headers",
    }

    today = datetime.now(timezone.utc).date().isoformat()
    if _gemini_status.get("date") != today:
        # Haven't seen a request today yet — show a fresh zeroed window.
        gem_ok = 0
        gem_fail = 0
    else:
        gem_ok = _gemini_status.get("calls_ok", 0)
        gem_fail = _gemini_status.get("calls_failed", 0)

    daily_limit = settings.GEMINI_DAILY_LIMIT
    gemini = {
        "configured": bool(settings.GEMINI_API_KEY),
        "model": settings.GEMINI_MODEL,
        "fallback_model": settings.GEMINI_MODEL_FALLBACK or None,
        "daily_limit": daily_limit,
        "calls_today": gem_ok + gem_fail,
        "calls_ok_today": gem_ok,
        "calls_failed_today": gem_fail,
        "remaining_today": max(0, daily_limit - (gem_ok + gem_fail)),
        "last_updated": _gemini_status.get("last_updated"),
        "last_error": _gemini_status.get("last_error"),
        "last_error_at": _gemini_status.get("last_error_at"),
        "source": "local_counter_since_restart",
    }

    return {"groq": groq, "gemini": gemini, "utc_now": datetime.now(timezone.utc).isoformat()}


# ── Admin: chat log browser ───────────────────────────────────────────────────

@router.get("/admin/chats/sessions")
async def admin_list_chat_sessions(
    page: int = 1,
    page_size: int = 30,
    intent: Optional[str] = None,
    page_filter: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """One row per chat session with a preview of the first user question.
    Sorted by most recent activity."""
    # Aggregate per session_id.
    # `array_agg(DISTINCT provider) FILTER (WHERE provider IS NOT NULL)` collects
    # the set of LLM providers used across the session (e.g. ["claude:haiku",
    # "claude:sonnet"]) so the admin list can show a model column at a glance.
    providers_agg = (
        func.array_agg(func.distinct(AssistantChatLog.provider))
        .filter(AssistantChatLog.provider.isnot(None))
        .label("providers")
    )
    subq = (
        select(
            AssistantChatLog.session_id.label("session_id"),
            func.max(AssistantChatLog.visitor_id).label("visitor_id"),
            func.count().label("turn_count"),
            func.max(AssistantChatLog.created_at).label("last_at"),
            func.min(AssistantChatLog.created_at).label("first_at"),
            func.max(AssistantChatLog.ip_address).label("ip_address"),
            func.max(AssistantChatLog.user_agent).label("user_agent"),
            func.max(AssistantChatLog.utm_source).label("utm_source"),
            func.max(AssistantChatLog.utm_medium).label("utm_medium"),
            func.max(AssistantChatLog.utm_campaign).label("utm_campaign"),
            func.max(AssistantChatLog.page).label("latest_page"),
            providers_agg,
        )
        .group_by(AssistantChatLog.session_id)
        .subquery()
    )

    conditions = []
    if intent:
        # filter to sessions that had at least one turn with this intent
        matching_sessions = select(AssistantChatLog.session_id).where(AssistantChatLog.intent == intent).distinct()
        conditions.append(subq.c.session_id.in_(matching_sessions))
    if page_filter:
        matching = select(AssistantChatLog.session_id).where(AssistantChatLog.page == page_filter).distinct()
        conditions.append(subq.c.session_id.in_(matching))
    if q:
        # full-text-ish: sessions where any content contains q
        matching_q = select(AssistantChatLog.session_id).where(AssistantChatLog.content.ilike(f"%{q}%")).distinct()
        conditions.append(subq.c.session_id.in_(matching_q))

    base_q = select(subq)
    if conditions:
        base_q = base_q.where(and_(*conditions))

    total_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    rows = (await db.execute(
        base_q.order_by(subq.c.last_at.desc())
              .offset((page - 1) * page_size)
              .limit(page_size)
    )).all()

    # Fetch the first user message per session (for preview) in one round trip
    session_ids = [r.session_id for r in rows]
    previews: dict = {}
    if session_ids:
        pv_rows = await db.execute(
            select(
                AssistantChatLog.session_id, AssistantChatLog.content, AssistantChatLog.created_at,
            )
            .where(AssistantChatLog.session_id.in_(session_ids), AssistantChatLog.role == "user")
            .order_by(AssistantChatLog.session_id, AssistantChatLog.created_at.asc())
        )
        for sid, content, _ in pv_rows.all():
            if sid not in previews:
                previews[sid] = content

    items = [
        {
            "session_id": r.session_id,
            "visitor_id": r.visitor_id,
            "turn_count": r.turn_count,
            "first_at": r.first_at.isoformat() if r.first_at else None,
            "last_at":  r.last_at.isoformat()  if r.last_at  else None,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "utm_source": r.utm_source,
            "utm_medium": r.utm_medium,
            "utm_campaign": r.utm_campaign,
            "latest_page": r.latest_page,
            "models_used": sorted([p for p in (r.providers or []) if p]),
            "preview": (previews.get(r.session_id) or "")[:180],
        }
        for r in rows
    ]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/admin/chats/sessions/{session_id}")
async def admin_get_chat_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Full transcript + visitor attribution for one session."""
    rows = (await db.execute(
        select(AssistantChatLog)
        .where(AssistantChatLog.session_id == session_id)
        .order_by(AssistantChatLog.created_at.asc())
    )).scalars().all()
    if not rows:
        raise HTTPException(404, "Session not found")

    first = next((r for r in rows if r.role == "user"), rows[0])
    meta = {
        "session_id":   session_id,
        "visitor_id":   first.visitor_id,
        "ip_address":   first.ip_address,
        "user_agent":   first.user_agent,
        "referrer":     first.referrer,
        "landing_page": first.landing_page,
        "utm_source":   first.utm_source,
        "utm_medium":   first.utm_medium,
        "utm_campaign": first.utm_campaign,
        "utm_term":     first.utm_term,
        "utm_content":  first.utm_content,
        "cookies":      first.cookies,
        "first_at":     rows[0].created_at.isoformat() if rows[0].created_at else None,
        "last_at":      rows[-1].created_at.isoformat() if rows[-1].created_at else None,
        "turn_count":   len(rows),
    }
    transcript = [
        {
            "id":           str(r.id),
            "role":         r.role,
            "content":      r.content,
            "intent":       r.intent,
            "provider":     r.provider,
            "page":         r.page,
            "page_entity_id": r.page_entity_id,
            "action_type":  r.action_type,
            "action_url":   r.action_url,
            "latency_ms":   r.latency_ms,
            "created_at":   r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
    return {"session": meta, "transcript": transcript}


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


# ── Widget content (RiseUp / Callback) ────────────────────────────────────────
# Single source of truth for the copy and config rendered inside the in-app
# ProactiveAssistant widget. Public read; admin write.

@router.get("/content")
async def list_content(db: AsyncSession = Depends(get_db)):
    """Return all content entries as a {key: data} map for one-shot fetch."""
    res = await db.execute(select(AssistantContent))
    rows = res.scalars().all()
    return {r.key: r.data for r in rows}


@router.get("/content/{key}")
async def get_content(key: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AssistantContent).where(AssistantContent.key == key))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Content key not found")
    return {"key": row.key, "data": row.data}


class ContentUpdate(BaseModel):
    data: dict


@router.put("/admin/content/{key}")
async def admin_update_content(key: str, body: ContentUpdate, db: AsyncSession = Depends(get_db)):
    """Upsert a content entry. Creates if missing so admin can add new sections later."""
    res = await db.execute(select(AssistantContent).where(AssistantContent.key == key))
    row = res.scalar_one_or_none()
    if row is None:
        row = AssistantContent(key=key, data=body.data)
        db.add(row)
    else:
        row.data = body.data
    await db.commit()
    await db.refresh(row)
    return {"key": row.key, "data": row.data}
