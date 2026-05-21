from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.api.v1.routers.admin_auth import verify_admin_token
import redis.asyncio as aioredis

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/db")
async def database_health(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT version()"))
        version = result.scalar()
        return {
            "status": "ok",
            "database": "postgresql",
            "connected": True,
            "version": version,
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "postgresql",
            "connected": False,
            "error": str(e),
        }


@router.get("/cache")
async def cache_health():
    try:
        client = aioredis.from_url(
            settings.VALKEY_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        pong = await client.ping()
        await client.aclose()
        return {
            "status": "ok",
            "cache": "valkey",
            "connected": True,
            "ping": pong,
        }
    except Exception as e:
        return {
            "status": "error",
            "cache": "valkey",
            "connected": False,
            "error": str(e),
        }


@router.get("/anthropic")
async def anthropic_health(admin=Depends(verify_admin_token)):
    if not settings.ANTHROPIC_API_KEY:
        return {
            "status": "error",
            "provider": "anthropic",
            "connected": False,
            "error": "ANTHROPIC_API_KEY not set",
        }
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=10.0)
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=8,
            messages=[{"role": "user", "content": "Reply with exactly: pong"}],
        )
        text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        return {
            "status": "ok",
            "provider": "anthropic",
            "connected": True,
            "model": resp.model,
            "reply": text,
            "usage": {
                "input_tokens": resp.usage.input_tokens,
                "output_tokens": resp.usage.output_tokens,
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "provider": "anthropic",
            "connected": False,
            "error": f"{type(e).__name__}: {e}",
        }


@router.get("/full")
async def full_health(db: AsyncSession = Depends(get_db)):
    results = {
        "app": {"status": "ok"},
        "database": {"status": "unknown"},
        "cache": {"status": "unknown"},
    }

    # DB check
    try:
        await db.execute(text("SELECT 1"))
        results["database"] = {"status": "ok", "connected": True}
    except Exception as e:
        results["database"] = {"status": "error", "connected": False, "error": str(e)}

    # Cache check
    try:
        client = aioredis.from_url(settings.VALKEY_URL, decode_responses=True)
        await client.ping()
        await client.aclose()
        results["cache"] = {"status": "ok", "connected": True}
    except Exception as e:
        results["cache"] = {"status": "error", "connected": False, "error": str(e)}

    overall = all(v["status"] == "ok" for v in results.values())
    return {
        "status": "ok" if overall else "degraded",
        "checks": results,
        "db_url": settings.DATABASE_URL,
    }
