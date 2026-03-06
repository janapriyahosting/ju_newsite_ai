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
        prompt = f"""You are a real estate search assistant for an Indian property platform.
Extract search filters from the query and return ONLY valid JSON with these optional fields:
{{
  "unit_type": "1BHK/2BHK/3BHK/4BHK/villa/plot",
  "bedrooms": <number>,
  "min_price": <rupees>,
  "max_price": <rupees>,
  "min_area": <sqft>,
  "max_area": <sqft>,
  "max_down_payment": <rupees>,
  "max_emi": <rupees per month>,
  "facing": "North/South/East/West",
  "floor_min": <number>,
  "floor_max": <number>,
  "message": "<friendly summary of what you understood>"
}}
Rules:
- Prices in Indian Rupees (1 lakh = 100000, 1 crore = 10000000)
- Only include fields that are clearly mentioned
- message must always be present
Query: "{query}"
Return only JSON."""

        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        print(f"[Groq] Error: {e}")
        return None


# ── Layer 2: spaCy NER ────────────────────────────────────────────────────────
def parse_with_spacy(query: str) -> dict | None:
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(query)
        filters = {}
        hints = []

        q = query.lower()

        # Extract cardinal numbers from spaCy entities
        numbers = [ent.text for ent in doc.ents if ent.label_ == "CARDINAL"]

        # BHK detection using spaCy tokens + regex
        for token in doc:
            if token.text.upper() in ["BHK", "BHK,"]:
                prev = doc[token.i - 1] if token.i > 0 else None
                if prev and prev.like_num:
                    n = int(prev.text)
                    filters["bedrooms"] = n
                    filters["unit_type"] = f"{n}BHK"
                    hints.append(f"{n}BHK")

        # Facing via NLP
        for token in doc:
            if token.text.lower() in ["east","west","north","south"]:
                filters["facing"] = token.text.capitalize()
                hints.append(f"{token.text.capitalize()} facing")
                break

        # Money entities → price
        for ent in doc.ents:
            if ent.label_ == "MONEY":
                text = ent.text.lower()
                m = re.search(r'(\d+(?:\.\d+)?)', text)
                if m:
                    val = float(m.group(1))
                    if "cr" in text:
                        val *= CRORE
                    elif "lakh" in text or "lac" in text or " l" in text:
                        val *= LAKH
                    if any(w in q for w in ["under","below","upto","within","less"]):
                        filters["max_price"] = int(val)
                        hints.append(f"under ₹{m.group(1)}")
                    elif any(w in q for w in ["above","over","minimum","atleast"]):
                        filters["min_price"] = int(val)
                        hints.append(f"above ₹{m.group(1)}")

        if not filters:
            return None

        message = "Filtered by: " + ", ".join(hints) if hints else f"Showing results for: {query}"
        filters["message"] = message
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
        (r'\b4\s*bhk\b', '4BHK', 4), (r'\b3\s*bhk\b', '3BHK', 3),
        (r'\b2\s*bhk\b', '2BHK', 2), (r'\b1\s*bhk\b', '1BHK', 1),
        (r'\bfour\s*bhk\b', '4BHK', 4), (r'\bthree\s*bhk\b', '3BHK', 3),
        (r'\btwo\s*bhk\b', '2BHK', 2), (r'\bone\s*bhk\b', '1BHK', 1),
        (r'\bvilla\b', 'villa', None), (r'\bplot\b', 'plot', None),
    ]:
        if re.search(pattern, q):
            if utype: filters['unit_type'] = utype; hints.append(utype)
            if beds:  filters['bedrooms'] = beds
            break

    # Price range
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        mult = CRORE if m.group(3).startswith('cr') else LAKH
        filters['min_price'] = int(lo * mult)
        filters['max_price'] = int(hi * mult)
        hints.append(f"₹{lo}-{hi}{'Cr' if m.group(3).startswith('cr') else 'L'}")

    # Max price
    if 'max_price' not in filters:
        m = re.search(r'(?:under|below|upto|up to|within|max|less than)\s*(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
        if m:
            mult = CRORE if m.group(2).startswith('cr') else LAKH
            filters['max_price'] = int(float(m.group(1)) * mult)
            hints.append(f"under ₹{m.group(1)}{'Cr' if m.group(2).startswith('cr') else 'L'}")

    # Min price
    if 'min_price' not in filters:
        m = re.search(r'(?:above|over|minimum|min|more than|atleast)\s*(?:rs\.?\s*|₹\s*)?(\d+(?:\.\d+)?)\s*(lakh|lac|l\b|cr(?:ore)?)', q)
        if m:
            mult = CRORE if m.group(2).startswith('cr') else LAKH
            filters['min_price'] = int(float(m.group(1)) * mult)
            hints.append(f"above ₹{m.group(1)}{'Cr' if m.group(2).startswith('cr') else 'L'}")

    # EMI
    m = re.search(r'emi\s*(?:under|below|upto|max|less than)?\s*(?:rs\.?\s*|₹\s*)?(\d+(?:,\d+)?)\s*(k|thousand)?', q)
    if m:
        val = int(m.group(1).replace(',', ''))
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
        (r'\beast[\s-]?facing|\beast\b', 'East'),
        (r'\bwest[\s-]?facing|\bwest\b', 'West'),
        (r'\bnorth[\s-]?facing|\bnorth\b', 'North'),
        (r'\bsouth[\s-]?facing|\bsouth\b', 'South'),
    ]:
        if re.search(pat, q):
            filters['facing'] = facing
            hints.append(f"{facing} facing")
            break

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
        filters['min_area'] = int(m.group(1))
        filters['max_area'] = int(m.group(2))
        hints.append(f"{m.group(1)}-{m.group(2)} sqft")

    msg = "Filtered by: " + ", ".join(hints) if hints else f"Showing all available units for: {query}"
    return filters, msg


# ── Main parser: tries Groq → spaCy → Regex ──────────────────────────────────
async def parse_query(query: str) -> tuple[dict, str]:
    # Try Groq first
    result = await parse_with_groq(query)
    if result:
        msg = result.pop("message", f"AI understood: {query}")
        print(f"[Search] Using Groq ✅")
        return result, msg

    # Try spaCy
    result = parse_with_spacy(query)
    if result:
        msg = result.pop("message", f"Showing results for: {query}")
        print(f"[Search] Using spaCy ✅")
        return result, msg

    # Regex fallback
    print(f"[Search] Using Regex fallback ✅")
    return parse_with_regex(query)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/nlp", response_model=SearchResponse)
async def nlp_search(data: NLPSearchRequest, db: AsyncSession = Depends(get_db)):
    filters_dict, message = await parse_query(data.query)

    conditions = [Unit.status == "available"]
    if filters_dict.get("unit_type"):
        conditions.append(Unit.unit_type.ilike(f"%{filters_dict['unit_type']}%"))
    if filters_dict.get("bedrooms"):
        conditions.append(Unit.bedrooms == filters_dict["bedrooms"])
    if filters_dict.get("min_price"):
        conditions.append(Unit.base_price >= filters_dict["min_price"])
    if filters_dict.get("max_price"):
        conditions.append(Unit.base_price <= filters_dict["max_price"])
    if filters_dict.get("min_area"):
        conditions.append(Unit.area_sqft >= filters_dict["min_area"])
    if filters_dict.get("max_area"):
        conditions.append(Unit.area_sqft <= filters_dict["max_area"])
    if filters_dict.get("max_down_payment"):
        conditions.append(Unit.down_payment <= filters_dict["max_down_payment"])
    if filters_dict.get("max_emi"):
        conditions.append(Unit.emi_estimate <= filters_dict["max_emi"])
    if filters_dict.get("facing"):
        conditions.append(Unit.facing.ilike(f"%{filters_dict['facing']}%"))
    if filters_dict.get("floor_min"):
        conditions.append(Unit.floor_number >= filters_dict["floor_min"])
    if filters_dict.get("floor_max"):
        conditions.append(Unit.floor_number <= filters_dict["floor_max"])

    q = select(Unit).where(and_(*conditions))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.order_by(Unit.is_trending.desc()).limit(20))
    units = result.scalars().all()

    db.add(SearchLog(
        query=data.query, filters=filters_dict,
        results_count=total, session_id=data.session_id,
    ))
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
