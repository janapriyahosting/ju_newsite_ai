from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
import json
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.unit import Unit
from backend.app.models.tower import Tower
from backend.app.models.project import Project
from backend.app.models.search_log import SearchLog
from backend.app.schemas.search import (
    NLPSearchRequest, FilterSearchRequest, SearchResponse
)

router = APIRouter(prefix="/search", tags=["search"])


async def parse_query_with_claude(query: str) -> dict:
    """Use Claude to parse natural language search into filters."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        message = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Extract search filters from this real estate query.
Return ONLY valid JSON with these optional fields:
{{
  "unit_type": "1BHK/2BHK/3BHK/4BHK/villa/plot",
  "bedrooms": number,
  "min_price": number,
  "max_price": number,
  "min_area": number,
  "max_area": number,
  "max_down_payment": number,
  "max_emi": number,
  "facing": "North/South/East/West",
  "floor_min": number,
  "floor_max": number,
  "amenities": ["gym","pool","parking"],
  "message": "friendly response to user"
}}

Price values in Indian Rupees. Area in sqft.
Query: "{query}"

Return only JSON, no explanation."""
            }]
        )

        text = message.content[0].text.strip()
        # Clean markdown if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    except Exception as e:
        # Fallback: return empty filters
        return {"message": f"Showing all available units for: {query}"}


@router.post("/nlp", response_model=SearchResponse)
async def nlp_search(
    data: NLPSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    # Parse query with Claude
    filters_dict = await parse_query_with_claude(data.query)
    message = filters_dict.pop("message", None)

    # Build DB filters
    filters = [Unit.status == "available"]

    if filters_dict.get("unit_type"):
        filters.append(Unit.unit_type.ilike(f"%{filters_dict['unit_type']}%"))
    if filters_dict.get("bedrooms"):
        filters.append(Unit.bedrooms == filters_dict["bedrooms"])
    if filters_dict.get("min_price"):
        filters.append(Unit.base_price >= filters_dict["min_price"])
    if filters_dict.get("max_price"):
        filters.append(Unit.base_price <= filters_dict["max_price"])
    if filters_dict.get("min_area"):
        filters.append(Unit.area_sqft >= filters_dict["min_area"])
    if filters_dict.get("max_area"):
        filters.append(Unit.area_sqft <= filters_dict["max_area"])
    if filters_dict.get("max_down_payment"):
        filters.append(Unit.down_payment <= filters_dict["max_down_payment"])
    if filters_dict.get("max_emi"):
        filters.append(Unit.emi_estimate <= filters_dict["max_emi"])
    if filters_dict.get("facing"):
        filters.append(Unit.facing.ilike(f"%{filters_dict['facing']}%"))
    if filters_dict.get("floor_min"):
        filters.append(Unit.floor_number >= filters_dict["floor_min"])
    if filters_dict.get("floor_max"):
        filters.append(Unit.floor_number <= filters_dict["floor_max"])

    query = select(Unit).where(and_(*filters))
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    result = await db.execute(
        query.order_by(Unit.is_trending.desc()).limit(20)
    )
    units = result.scalars().all()

    # Log search
    log = SearchLog(
        query=data.query,
        filters=filters_dict,
        results_count=total,
        session_id=data.session_id,
    )
    db.add(log)
    await db.flush()

    return SearchResponse(
        query=data.query,
        interpreted_as=filters_dict,
        total=total,
        page=1,
        page_size=20,
        total_pages=-(-total // 20),
        items=units,
        message=message,
    )


@router.post("/filter", response_model=SearchResponse)
async def filter_search(
    data: FilterSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    filters = [Unit.status == "available"]

    if data.unit_type:
        filters.append(Unit.unit_type.ilike(f"%{data.unit_type}%"))
    if data.bedrooms:
        filters.append(Unit.bedrooms == data.bedrooms)
    if data.min_price:
        filters.append(Unit.base_price >= data.min_price)
    if data.max_price:
        filters.append(Unit.base_price <= data.max_price)
    if data.min_area:
        filters.append(Unit.area_sqft >= data.min_area)
    if data.max_area:
        filters.append(Unit.area_sqft <= data.max_area)
    if data.max_down_payment:
        filters.append(Unit.down_payment <= data.max_down_payment)
    if data.max_emi:
        filters.append(Unit.emi_estimate <= data.max_emi)
    if data.facing:
        filters.append(Unit.facing.ilike(f"%{data.facing}%"))
    if data.floor_min:
        filters.append(Unit.floor_number >= data.floor_min)
    if data.floor_max:
        filters.append(Unit.floor_number <= data.floor_max)

    query = select(Unit).where(and_(*filters))
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    offset = (data.page - 1) * data.page_size
    result = await db.execute(
        query.order_by(Unit.is_trending.desc(), Unit.created_at.desc())
        .offset(offset).limit(data.page_size)
    )
    units = result.scalars().all()

    return SearchResponse(
        total=total,
        page=data.page,
        page_size=data.page_size,
        total_pages=-(-total // data.page_size),
        items=units,
    )
