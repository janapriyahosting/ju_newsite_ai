"""Claude chat provider with tool use + Haiku→Sonnet escalation.

Designed to slot into the existing `/assistant/chat` cascade as the primary
provider. Falls through to the caller (which then tries Groq/Gemini) on any
exception.

Tools exposed:
  - search_units: structured filter search over our unit catalog
  - request_escalation: Haiku-only signal that this turn needs Sonnet
"""
from __future__ import annotations

import re
from typing import Any, Optional

from sqlalchemy import and_, func, select, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.project import Project
from backend.app.models.tower import Tower
from backend.app.models.unit import Unit


HAIKU_MODEL = "claude-haiku-4-5-20251001"
SONNET_MODEL = "claude-sonnet-4-6"

# Maximum tool-use loops per Claude turn before we give up — prevents a runaway
# model from looping forever on tool calls. 4 = roughly "search, refine, search
# again, refine" before forcing a final answer.
MAX_TOOL_ITERATIONS = 4


SEARCH_UNITS_TOOL = {
    "name": "search_units",
    "description": (
        "Search Janapriya Upscale's available unit catalog by structured filters. "
        "Use this AFTER you've understood enough about the visitor's situation to "
        "make a real recommendation — typically once you know at least their BHK and "
        "budget. Do NOT call this on the first turn if the visitor's needs are still "
        "vague; ask a qualifying question first. The tool returns up to 4 matching "
        "available units; pick the SINGLE BEST one (occasionally two) to actually "
        "recommend to the visitor in your reply — never list everything."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "unit_type": {
                "type": "string",
                "description": "BHK or category. Examples: '1BHK', '2BHK', '3BHK', '4BHK', 'villa', 'plot'."
            },
            "bedrooms": {"type": "integer", "description": "Exact bedroom count, e.g. 3."},
            "min_price": {"type": "integer", "description": "Minimum total price in rupees (full integer; 1 lakh = 100000, 1 crore = 10000000)."},
            "max_price": {"type": "integer", "description": "Maximum total price in rupees (full integer)."},
            "min_area": {"type": "integer", "description": "Minimum carpet/built area in sqft."},
            "max_area": {"type": "integer", "description": "Maximum carpet/built area in sqft."},
            "max_emi": {"type": "integer", "description": "Maximum monthly EMI the visitor can afford, in rupees."},
            "max_down_payment": {"type": "integer", "description": "Maximum down payment the visitor can afford, in rupees."},
            "facing": {"type": "string", "description": "'North', 'South', 'East', or 'West'."},
            "floor_min": {"type": "integer", "description": "Minimum floor number."},
            "floor_max": {"type": "integer", "description": "Maximum floor number."},
        },
        "additionalProperties": False,
    },
}

REQUEST_ESCALATION_TOOL = {
    "name": "request_escalation",
    "description": (
        "Hand off this turn to the more capable Sonnet model. Call this ONLY when the "
        "request genuinely needs Sonnet — multi-criteria comparison across projects, "
        "home-loan / EMI math, RiseUp savings analysis, multi-step planning, or any "
        "request you cannot satisfy confidently in 2-3 sentences. Do not escalate for "
        "simple greetings, single-filter searches, or brochure asks."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "reason": {
                "type": "string",
                "description": "One short clause explaining why Sonnet is needed.",
            },
        },
        "required": ["reason"],
        "additionalProperties": False,
    },
}


async def _do_search_units(args: dict, db: AsyncSession) -> list[dict]:
    """Execute the search_units tool. Mirrors the price-filter semantics of
    /api/v1/search/nlp — the canonical unit price lives in the `total_amount`
    custom field, NOT in `Unit.base_price` (which is stored as ₹/sqft on this
    project). Errors return as a one-item error result so Claude can see them."""
    try:
        # Use a raw SQL query (mirroring routers/search.py and the existing
        # admin pricing query) so we can pick total_amount from custom_field_values
        # and use it for both filtering and the returned price. JSONB number/string
        # cases are handled in a CASE expression.
        params: dict[str, Any] = {}
        where_clauses: list[str] = ["status = 'available'"]

        ut = args.get("unit_type")
        if isinstance(ut, str) and ut.strip():
            params["ut_norm"] = "%" + re.sub(r"\s+", "", ut).lower() + "%"
            where_clauses.append("replace(lower(unit_type), ' ', '') ILIKE :ut_norm")

        bedrooms = args.get("bedrooms")
        if isinstance(bedrooms, int) and bedrooms > 0:
            params["bedrooms"] = bedrooms
            where_clauses.append("bedrooms = :bedrooms")

        min_p = args.get("min_price")
        if isinstance(min_p, (int, float)) and min_p > 0:
            params["min_p"] = float(min_p)
            where_clauses.append("total_price_expr >= :min_p")
        max_p = args.get("max_price")
        if isinstance(max_p, (int, float)) and max_p > 0:
            params["max_p"] = float(max_p) * 1.10  # 10% tolerance, matches /search/nlp
            where_clauses.append("total_price_expr <= :max_p")

        min_a = args.get("min_area")
        if isinstance(min_a, (int, float)) and min_a > 0:
            params["min_a"] = float(min_a)
            where_clauses.append("area_sqft >= :min_a")
        max_a = args.get("max_area")
        if isinstance(max_a, (int, float)) and max_a > 0:
            params["max_a"] = float(max_a)
            where_clauses.append("area_sqft <= :max_a")

        max_emi = args.get("max_emi")
        if isinstance(max_emi, (int, float)) and max_emi > 0:
            params["max_emi"] = float(max_emi)
            where_clauses.append("emi_estimate <= :max_emi")
        max_dp = args.get("max_down_payment")
        if isinstance(max_dp, (int, float)) and max_dp > 0:
            params["max_dp"] = float(max_dp)
            where_clauses.append("down_payment <= :max_dp")

        facing = args.get("facing")
        if isinstance(facing, str) and facing.strip():
            params["facing_norm"] = "%" + re.sub(r"[^a-z0-9]+", "", facing.lower()) + "%"
            where_clauses.append("regexp_replace(lower(facing), '[^a-z0-9]+', '', 'g') ILIKE :facing_norm")

        fmin = args.get("floor_min")
        if isinstance(fmin, int) and fmin > 0:
            params["fmin"] = fmin
            where_clauses.append("floor_number >= :fmin")
        fmax = args.get("floor_max")
        if isinstance(fmax, int) and fmax > 0:
            params["fmax"] = fmax
            where_clauses.append("floor_number <= :fmax")

        # The `total_amount` custom field is a JSONB value that can arrive as a
        # number or as a numeric string. Coerce both shapes to numeric; fall back
        # to base_price (which on this project is actually ₹/sqft) only when
        # total_amount is absent — that fallback is wrong for top-of-funnel
        # filtering, but better than dropping the row entirely.
        sql = sa_text(f"""
            WITH priced AS (
                SELECT
                    u.id, u.unit_number, u.unit_type, u.bedrooms,
                    u.area_sqft, u.base_price, u.facing, u.floor_number,
                    u.emi_estimate, u.down_payment,
                    u.is_riseup_eligible, u.is_trending, u.images,
                    u.tower_id, status,
                    p.name AS project_name, t.name AS tower_name,
                    COALESCE(
                        NULLIF((
                            SELECT CASE
                                WHEN jsonb_typeof(cfv.value) = 'number'
                                    THEN CAST(cfv.value #>> '{{}}' AS NUMERIC)
                                WHEN jsonb_typeof(cfv.value) = 'string'
                                     AND (cfv.value #>> '{{}}') ~ '^-?[0-9]+(\\.[0-9]+)?$'
                                    THEN CAST(cfv.value #>> '{{}}' AS NUMERIC)
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
                    ) AS total_price_expr
                FROM units u
                LEFT JOIN towers t ON t.id = u.tower_id
                LEFT JOIN projects p ON p.id = t.project_id
            )
            SELECT * FROM priced
            WHERE {' AND '.join(where_clauses)}
            ORDER BY is_trending DESC, total_price_expr ASC
            LIMIT 4
        """)
        rows = (await db.execute(sql, params)).mappings().all()

        results = []
        for u in rows:
            img = None
            images = u.get("images")
            if images and isinstance(images, list) and images:
                first = images[0]
                img = first.get("url") if isinstance(first, dict) else first
            total = u.get("total_price_expr")
            total_f = float(total) if total is not None else None
            results.append({
                "id": str(u["id"]),
                "unit_number": u["unit_number"],
                "unit_type": u["unit_type"],
                "bedrooms": u["bedrooms"],
                "area_sqft": float(u["area_sqft"]) if u["area_sqft"] else None,
                # base_price on this project is ₹/sqft; the canonical full price is total_amount.
                # We return total as `base_price` so the existing frontend card renders correctly.
                "base_price": total_f,
                "facing": u["facing"],
                "floor_number": u["floor_number"],
                "project_name": u["project_name"],
                "tower_name": u["tower_name"],
                "is_riseup_eligible": bool(u["is_riseup_eligible"]),
                "image": img,
            })
        return results
    except Exception as e:
        return [{"error": f"{type(e).__name__}: {e}"}]


def _to_anthropic_messages(messages: list) -> list[dict]:
    """Convert our ChatMessage list (role + content text) to Anthropic format.
    Only includes user/assistant turns; system goes separately."""
    out: list[dict] = []
    for m in messages:
        role = "user" if m.role == "user" else "assistant"
        out.append({"role": role, "content": m.content})
    # Anthropic requires the conversation to start with a user message.
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


async def run_claude_turn(
    system_prompt: str,
    messages: list,
    db: AsyncSession,
) -> dict:
    """Run one assistant turn through Claude. Tries Haiku first; if Haiku calls
    request_escalation, the same turn is re-run on Sonnet without that tool.
    The search_units tool is available on both models.

    Returns:
        {
            "text": str,                      # final assistant reply
            "model_used": "haiku"|"sonnet",   # which model produced the text
            "escalated": bool,                # whether escalation tool fired
            "escalation_reason": str|None,
            "suggested_units": list[dict],    # accumulated search_units results
        }

    Raises on transport/API errors so the caller can fall through to Groq/Gemini.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)
    base_messages = _to_anthropic_messages(messages)
    if not base_messages:
        raise RuntimeError("No user message to respond to")

    # cache_control on the system prompt — site context is large and repeats
    # across turns; this drops per-turn cost ~10× after the first call within
    # the 5-minute cache window.
    system_blocks = [{
        "type": "text",
        "text": system_prompt,
        "cache_control": {"type": "ephemeral"},
    }]

    async def _call(model: str, tools: list[dict], convo: list[dict]) -> Any:
        return await client.messages.create(
            model=model,
            max_tokens=600,
            system=system_blocks,
            tools=tools,
            messages=convo,
        )

    async def _drive(model: str, allow_escalation: bool) -> dict:
        """Drive a tool-use loop on the given model. Returns the same shape as
        run_claude_turn."""
        tools = [SEARCH_UNITS_TOOL]
        if allow_escalation:
            tools = [SEARCH_UNITS_TOOL, REQUEST_ESCALATION_TOOL]

        convo = list(base_messages)
        suggested_units: list[dict] = []
        escalation_reason: Optional[str] = None

        for _ in range(MAX_TOOL_ITERATIONS):
            resp = await _call(model, tools, convo)

            if resp.stop_reason != "tool_use":
                # Final text response — extract and return.
                text_parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
                return {
                    "text": "\n".join(text_parts).strip(),
                    "model_used": model,
                    "escalated": False,
                    "escalation_reason": None,
                    "suggested_units": suggested_units,
                }

            # Record the assistant's tool_use turn in the conversation.
            convo.append({"role": "assistant", "content": resp.content})

            tool_results: list[dict] = []
            escalation_requested = False
            for block in resp.content:
                if getattr(block, "type", "") != "tool_use":
                    continue
                if block.name == "request_escalation" and allow_escalation:
                    escalation_requested = True
                    escalation_reason = (block.input or {}).get("reason")
                    # Synthesise a tool_result so Anthropic gets a clean
                    # conversation if we ever resume; we won't actually resume.
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": "Escalating to Sonnet.",
                    })
                elif block.name == "search_units":
                    results = await _do_search_units(block.input or {}, db)
                    # De-dupe by id while preserving order.
                    seen = {u["id"] for u in suggested_units if "id" in u}
                    for r in results:
                        if "id" in r and r["id"] not in seen:
                            suggested_units.append(r)
                            seen.add(r["id"])
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": _format_units_for_model(results),
                    })
                else:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": f"Unknown tool {block.name}.",
                        "is_error": True,
                    })

            if escalation_requested:
                # Re-run the same base turn on Sonnet without the escalation tool.
                sub = await _drive(SONNET_MODEL, allow_escalation=False)
                sub["escalated"] = True
                sub["escalation_reason"] = escalation_reason
                # Carry over any unit results gathered on Haiku before escalation.
                if suggested_units:
                    seen = {u["id"] for u in sub["suggested_units"] if "id" in u}
                    sub["suggested_units"] = [
                        *sub["suggested_units"],
                        *[u for u in suggested_units if u.get("id") and u["id"] not in seen],
                    ]
                return sub

            # Continue the loop with tool results posted back.
            convo.append({"role": "user", "content": tool_results})

        # Hit the iteration cap — ask the model for a final text-only response.
        resp = await _call(model, tools=[], convo=convo + [
            {"role": "user", "content": "Please give your final answer to the visitor now, in 2-3 sentences."}
        ])
        text_parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return {
            "text": "\n".join(text_parts).strip(),
            "model_used": model,
            "escalated": False,
            "escalation_reason": None,
            "suggested_units": suggested_units,
        }

    return await _drive(HAIKU_MODEL, allow_escalation=True)


def _format_units_for_model(units: list[dict]) -> str:
    """Format search_units results into compact text for the model to read.
    JSON would also work but plain text is cheaper in tokens and the model
    handles it well."""
    if not units:
        return "No matching available units."
    if len(units) == 1 and "error" in units[0]:
        return f"Search error: {units[0]['error']}"
    lines = [f"Found {len(units)} unit(s):"]
    for u in units:
        if "error" in u:
            continue
        price = u.get("base_price")
        price_s = _fmt_price(price) if price else "price n/a"
        area = u.get("area_sqft")
        area_s = f"{int(area)} sqft" if area else "area n/a"
        proj = u.get("project_name") or "—"
        facing = u.get("facing") or "—"
        riseup = " · RiseUp" if u.get("is_riseup_eligible") else ""
        lines.append(
            f"- {u.get('unit_number','?')} ({u.get('unit_type','?')}, "
            f"{u.get('bedrooms','?')}BHK, {area_s}, {facing}-facing, floor {u.get('floor_number','?')}) "
            f"in {proj} — {price_s}{riseup}"
        )
    return "\n".join(lines)


def _fmt_price(p: float) -> str:
    if p >= 10_000_000:
        return f"₹{p/10_000_000:.2f}Cr"
    if p >= 100_000:
        return f"₹{p/100_000:.0f}L"
    return f"₹{p:,.0f}"
