from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import re, json
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.unit import Unit
from backend.app.models.search_log import SearchLog
from backend.app.schemas.search import (
    NLPSearchRequest, FilterSearchRequest, SearchResponse
)

router = APIRouter(prefix="/search", tags=["search"])

LAKH  = 100_000
CRORE = 10_000_000

# ── Layer 1: Groq LLM ─────────────────────────────────────────────────────────
async def parse_with_groq(query: str) -> dict | None:
    if not settings.GROQ_API_KEY:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        prompt = f"""You are a real estate filter extractor for an Indian property platform.

Extract search filters from the query. Return ONLY valid JSON.

CRITICAL PRICE RULES:
- "budget is X", "under X", "below X", "upto X", "within X", "max X", "not more than X" → max_price
- "above X", "minimum X", "at least X", "more than X", "starting from X" → min_price
- "between X and Y", "X to Y" → both min_price AND max_price
- 1 lakh = 100000, 1 crore = 10000000
- Always convert to full rupee integer (50 lakh = 5000000)

JSON fields (only include if clearly mentioned):
{{
  "unit_type": "1BHK or 2BHK or 3BHK or 4BHK or villa or plot",
  "bedrooms": <integer>,
  "min_price": <integer rupees>,
  "max_price": <integer rupees>,
  "min_area": <integer sqft>,
  "max_area": <integer sqft>,
  "max_down_payment": <integer rupees>,
  "max_emi": <integer rupees per month>,
  "facing": "North or South or East or West",
  "floor_min": <integer>,
  "floor_max": <integer>,
  "message": "<one line: what you understood from the query>"
}}

Examples:
"2bhk under 60 lakhs" → {{"unit_type":"2BHK","bedrooms":2,"max_price":6000000,"message":"2BHK under ₹60L"}}
"budget is under 50 lakh" → {{"max_price":5000000,"message":"Budget under ₹50L"}}
"3bhk above 80 lakhs east facing" → {{"unit_type":"3BHK","bedrooms":3,"min_price":8000000,"facing":"East","message":"3BHK above ₹80L East facing"}}
"emi under 40000" → {{"max_emi":40000,"message":"EMI under ₹40,000/month"}}

Query: "{query}"
Return only the JSON object, nothing else."""

        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=300,
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text.strip())

        # Safety check: if query has "under/below/budget/upto" → ensure no min_price only
        q = query.lower()
        under_words = ["under","below","upto","up to","within","budget","not more","less than","max"]
        if any(w in q for w in under_words) and "min_price" in result and "max_price" not in result:
            # Groq confused min/max — swap it
            result["max_price"] = result.pop("min_price")
            print(f"[Groq] ⚠️ Auto-corrected min_price → max_price")

        print(f"[Search] Using Groq ✅ | {result.get('message','')}")
        return result

    except Exception as e:
        err = str(e).lower()
        if "rate_limit" in err or "429" in err or "quota" in err or "exceeded" in err:
            print(f"[Groq] ⚠️ Rate limit hit — falling back to spaCy")
        elif "invalid_api_key" in err or "401" in err:
            print(f"[Groq] ⚠️ Invalid API key — falling back to spaCy")
        else:
            print(f"[Groq] ⚠️ Error: {e} — falling back to spaCy")
        return None


# ── Layer 2: spaCy NER (token-based, tuned for Indian real estate) ────────────
def parse_with_spacy(query: str) -> dict | None:
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(query)
        filters = {}
        hints = []
        q = query.lower()
        tokens = [t.text.lower() for t in doc]

        # BHK: "4bhk", "4 bhk", "2BHK" — spaCy sees these as CARDINAL or NOUN
        bhk_match = re.search(r'(\d)\s*bhk', q)
        if bhk_match:
            n = int(bhk_match.group(1))
            filters["bedrooms"] = n
            filters["unit_type"] = f"{n}BHK"
            hints.append(f"{n}BHK")

        # Unit type: villa, plot
        if "villa" in tokens: filters["unit_type"] = "villa"; hints.append("villa")
        elif "plot" in tokens: filters["unit_type"] = "plot"; hints.append("plot")

        # Facing — spaCy sees north/south/east/west as NOUN
        for token in doc:
            if token.text.lower() in ["east","west","north","south"]:
                # Make sure it\'s not part of a location like "lakhs east"
                if token.i == 0 or doc[token.i-1].text.lower() not in ["lakhs","lakh","lac","crore","cr"]:
                    filters["facing"] = token.text.capitalize()
                    hints.append(f"{token.text.capitalize()} facing")
                    break

        # Price: find NUM tokens near lakh/crore/l keywords
        under_words = ["under","below","upto","within","budget","max","less"]
        above_words = ["above","over","minimum","min","atleast","starting"]
        is_max = any(w in q for w in under_words)
        is_min = any(w in q for w in above_words)

        # Find number + unit pairs: "60 lakhs", "50 lakh", "1.5 cr"
        for i, token in enumerate(doc):
            if token.like_num or (token.is_digit):
                # Look ahead for unit
                next_tokens = [doc[j].text.lower() for j in range(i+1, min(i+3, len(doc)))]
                unit_found = None
                for nt in next_tokens:
                    if nt in ["lakh","lakhs","lac","l"]: unit_found = "lakh"; break
                    if nt in ["crore","crores","cr"]:    unit_found = "crore"; break

                if unit_found:
                    try:
                        val = float(token.text.replace(",",""))
                        mult = CRORE if unit_found == "crore" else LAKH
                        price = int(val * mult)
                        if is_max and not is_min:
                            filters["max_price"] = price
                            hints.append(f"under ₹{val}{'Cr' if unit_found=='crore' else 'L'}")
                        elif is_min and not is_max:
                            filters["min_price"] = price
                            hints.append(f"above ₹{val}{'Cr' if unit_found=='crore' else 'L'}")
                        else:
                            # ambiguous — treat as max with buffer
                            filters["max_price"] = int(price * 1.05)
                            filters["min_price"] = int(price * 0.95)
                            hints.append(f"~₹{val}{'Cr' if unit_found=='crore' else 'L'}")
                    except: pass

        # EMI detection
        if "emi" in q:
            m = re.search(r'emi\s*(?:under|below|upto|max)?\s*(?:rs\.?\s*|₹\s*)?(\d+(?:,\d+)?)\s*(k|thousand)?', q)
            if m:
                val = int(m.group(1).replace(",",""))
                if m.group(2): val *= 1000
                filters["max_emi"] = val
                hints.append(f"EMI ≤ ₹{val:,}")

        # Floor
        if re.search(r'high(?:er)?\s*floor|top\s*floor', q):
            filters["floor_min"] = 5; hints.append("high floor")
        if re.search(r'ground\s*floor|low(?:er)?\s*floor', q):
            filters["floor_max"] = 3; hints.append("low floor")

        if not filters:
            return None

        filters["message"] = "Filtered by: " + ", ".join(hints) if hints else f"Results for: {query}"
        print(f"[Search] Using spaCy ✅ | {filters.get('message','')}")
        return filters
    except Exception as e:
        print(f"[spaCy] Error: {e}")
        return None


# ── Layer 3: Regex fallback ───────────────────────────────────────────────────
def parse_with_regex(query: str) -> tuple[dict, str]:
    q = query.lower().strip()
    filters = {}
    hints = []

    # Unit type / BHK
    for pattern, utype, beds in [
        (r'\b4\s*bhk\b','4BHK',4),(r'\b3\s*bhk\b','3BHK',3),
        (r'\b2\s*bhk\b','2BHK',2),(r'\b1\s*bhk\b','1BHK',1),
        (r'\bfour\s*bhk\b','4BHK',4),(r'\bthree\s*bhk\b','3BHK',3),
        (r'\btwo\s*bhk\b','2BHK',2),(r'\bone\s*bhk\b','1BHK',1),
        (r'\bvilla\b','villa',None),(r'\bplot\b','plot',None),
    ]:
        if re.search(pattern, q):
            if utype: filters['unit_type'] = utype; hints.append(utype)
            if beds:  filters['bedrooms'] = beds
            break

    # Price range
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
    if m:
        mult = CRORE if m.group(3).startswith('cr') else LAKH
        filters['min_price'] = int(float(m.group(1)) * mult)
        filters['max_price'] = int(float(m.group(2)) * mult)
        hints.append(f"₹{m.group(1)}-{m.group(2)}{'Cr' if m.group(3).startswith('cr') else 'L'}")

    # Max price (budget/under/below)
    if 'max_price' not in filters:
        m = re.search(r'(?:budget(?:\s+is)?|under|below|upto|up to|within|max(?:imum)?|less than|not more than)\s*(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
        if m:
            mult = CRORE if m.group(2).startswith('cr') else LAKH
            filters['max_price'] = int(float(m.group(1)) * mult)
            hints.append(f"under ₹{m.group(1)}{'Cr' if m.group(2).startswith('cr') else 'L'}")

    # Min price
    if 'min_price' not in filters:
        m = re.search(r'(?:above|over|minimum|min|more than|atleast|at least|starting from)\s*(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
        if m:
            mult = CRORE if m.group(2).startswith('cr') else LAKH
            filters['min_price'] = int(float(m.group(1)) * mult)
            hints.append(f"above ₹{m.group(1)}{'Cr' if m.group(2).startswith('cr') else 'L'}")

    # EMI
    m = re.search(r'emi\s*(?:under|below|upto|max|less than)?\s*(?:rs\.?\s*|₹\s*)?(\d+(?:,\d+)?)\s*(k|thousand)?', q)
    if m and 'emi' in q:
        val = int(m.group(1).replace(',',''))
        if m.group(2): val *= 1000
        filters['max_emi'] = val
        hints.append(f"EMI ≤ ₹{val:,}")

    # Down payment
    m = re.search(r'(?:down\s*payment|dp)\s*(?:under|below|upto|max|of)?\s*(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
    if m:
        mult = CRORE if m.group(2).startswith('cr') else LAKH
        filters['max_down_payment'] = int(float(m.group(1)) * mult)
        hints.append(f"DP ≤ ₹{m.group(1)}{'Cr' if m.group(2).startswith('cr') else 'L'}")

    # Facing
    for pat, facing in [
        (r'\beast[\s-]?facing|\beast\b','East'),(r'\bwest[\s-]?facing|\bwest\b','West'),
        (r'\bnorth[\s-]?facing|\bnorth\b','North'),(r'\bsouth[\s-]?facing|\bsouth\b','South'),
    ]:
        if re.search(pat, q):
            filters['facing'] = facing; hints.append(f"{facing} facing"); break

    # Floor
    m = re.search(r'(?:above|from)\s*(\d+)(?:st|nd|rd|th)?\s*floor', q)
    if m: filters['floor_min'] = int(m.group(1)); hints.append(f"floor ≥ {m.group(1)}")
    m = re.search(r'(?:below|under)\s*(\d+)(?:st|nd|rd|th)?\s*floor', q)
    if m: filters['floor_max'] = int(m.group(1)); hints.append(f"floor ≤ {m.group(1)}")
    if re.search(r'high(?:er)?\s*floor|top\s*floor', q):
        filters['floor_min'] = 5; hints.append("high floor")
    if re.search(r'low(?:er)?\s*floor|ground\s*floor', q):
        filters['floor_max'] = 3; hints.append("low floor")

    # Area
    m = re.search(r'(\d+)\s*(?:to|-)\s*(\d+)\s*(?:sqft|sq\.?\s*ft|sft)', q)
    if m:
        filters['min_area'] = int(m.group(1)); filters['max_area'] = int(m.group(2))
        hints.append(f"{m.group(1)}-{m.group(2)} sqft")

    msg = "Filtered by: " + ", ".join(hints) if hints else f"Showing all available units for: {query}"
    return filters, msg


# ── Main parser ───────────────────────────────────────────────────────────────
async def parse_query(query: str) -> tuple[dict, str]:
    result = await parse_with_groq(query)
    if result:
        msg = result.pop("message", f"AI understood: {query}")
        return result, msg

    result = parse_with_spacy(query)
    if result:
        msg = result.pop("message", f"Showing results for: {query}")
        print(f"[Search] Using spaCy ✅")
        return result, msg

    print(f"[Search] Using Regex ✅")
    return parse_with_regex(query)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/nlp", response_model=SearchResponse)
async def nlp_search(data: NLPSearchRequest, db: AsyncSession = Depends(get_db)):
    filters_dict, message = await parse_query(data.query)

    conditions = [Unit.status == "available"]
    if filters_dict.get("unit_type"):    conditions.append(Unit.unit_type.ilike(f"%{filters_dict['unit_type']}%"))
    if filters_dict.get("bedrooms"):     conditions.append(Unit.bedrooms == filters_dict["bedrooms"])
    if filters_dict.get("min_price"):    conditions.append(Unit.base_price >= filters_dict["min_price"])
    if filters_dict.get("max_price"):    conditions.append(Unit.base_price <= filters_dict["max_price"])
    if filters_dict.get("min_area"):     conditions.append(Unit.area_sqft >= filters_dict["min_area"])
    if filters_dict.get("max_area"):     conditions.append(Unit.area_sqft <= filters_dict["max_area"])
    if filters_dict.get("max_down_payment"): conditions.append(Unit.down_payment <= filters_dict["max_down_payment"])
    if filters_dict.get("max_emi"):      conditions.append(Unit.emi_estimate <= filters_dict["max_emi"])
    if filters_dict.get("facing"):       conditions.append(Unit.facing.ilike(f"%{filters_dict['facing']}%"))
    if filters_dict.get("floor_min"):    conditions.append(Unit.floor_number >= filters_dict["floor_min"])
    if filters_dict.get("floor_max"):    conditions.append(Unit.floor_number <= filters_dict["floor_max"])

    q = select(Unit).where(and_(*conditions))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Unit.is_trending.desc()).limit(20))
    units = result.scalars().all()

    db.add(SearchLog(query=data.query, filters=filters_dict, results_count=total, session_id=data.session_id))
    await db.flush()

    return SearchResponse(
        query=data.query, interpreted_as=filters_dict,
        total=total, page=1, page_size=20,
        total_pages=-(-total // 20), items=units, message=message,
    )


@router.post("/filter", response_model=SearchResponse)
async def filter_search(data: FilterSearchRequest, db: AsyncSession = Depends(get_db)):
    conditions = [Unit.status == "available"]
    if data.unit_type: conditions.append(Unit.unit_type.ilike(f"%{data.unit_type}%"))
    if data.bedrooms:  conditions.append(Unit.bedrooms == data.bedrooms)
    if data.min_price: conditions.append(Unit.base_price >= data.min_price)
    if data.max_price: conditions.append(Unit.base_price <= data.max_price)
    if data.min_area:  conditions.append(Unit.area_sqft >= data.min_area)
    if data.max_area:  conditions.append(Unit.area_sqft <= data.max_area)
    if data.max_down_payment: conditions.append(Unit.down_payment <= data.max_down_payment)
    if data.max_emi:   conditions.append(Unit.emi_estimate <= data.max_emi)
    if data.facing:    conditions.append(Unit.facing.ilike(f"%{data.facing}%"))
    if data.floor_min: conditions.append(Unit.floor_number >= data.floor_min)
    if data.floor_max: conditions.append(Unit.floor_number <= data.floor_max)

    q = select(Unit).where(and_(*conditions))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    offset = (data.page - 1) * data.page_size
    result = await db.execute(
        q.order_by(Unit.is_trending.desc(), Unit.created_at.desc())
        .offset(offset).limit(data.page_size)
    )
    units = result.scalars().all()

    return SearchResponse(
        total=total, page=data.page, page_size=data.page_size,
        total_pages=-(-total // data.page_size), items=units,
    )


# ── Session Tracking ──────────────────────────────────────────────────────────

class SessionPingRequest(BaseModel):
    session_id: str
    visitor_id: str
    page_path: str
    referrer: Optional[str] = None
    duration_seconds: int = 0
    customer_id: Optional[str] = None

@router.post("/session/ping")
async def session_ping(data: SessionPingRequest, db: AsyncSession = Depends(get_db)):
    """Track visitor session — called from frontend periodically."""
    from backend.app.models.session_log import SessionLog
    import uuid as _uuid
    
    # Try to find existing session
    result = await db.execute(
        select(SessionLog).where(SessionLog.session_id == data.session_id)
        .order_by(SessionLog.started_at.desc()).limit(1)
    )
    session = result.scalar_one_or_none()
    
    from datetime import datetime as _dt, timezone as _tz
    now = _dt.now(_tz.utc)
    
    if session:
        session.last_seen_at = now
        session.duration_seconds = data.duration_seconds
        session.page_path = data.page_path
        session.page_views = (session.page_views or 1) + 1
        if data.customer_id and not session.customer_id:
            try:
                session.customer_id = _uuid.UUID(data.customer_id)
                session.is_customer = True
            except: pass
    else:
        cid = None
        if data.customer_id:
            try: cid = _uuid.UUID(data.customer_id)
            except: pass
        from datetime import datetime, timezone as _tz2
        _now2 = datetime.now(_tz2.utc)
        session = SessionLog(
            session_id=data.session_id,
            visitor_id=data.visitor_id,
            page_path=data.page_path,
            referrer=data.referrer,
            customer_id=cid,
            is_customer=bool(cid),
            started_at=_now2,
            last_seen_at=_now2,
            duration_seconds=data.duration_seconds,
            page_views=1,
            created_at=_now2,
        )
        db.add(session)
    
    await db.commit()
    return {"ok": True}
