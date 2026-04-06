from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.core.config import settings
from backend.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"📦 Environment: {settings.APP_ENV}")
    print(f"🗄️  Database: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")

    # Ensure unit_series_media table exists
    from backend.app.core.database import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS unit_series_media (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                tower_id    UUID NOT NULL REFERENCES towers(id)   ON DELETE CASCADE,
                series_code VARCHAR(10)  NOT NULL,
                facing      VARCHAR(20),
                area_sqft   NUMERIC(10,2),
                media_type  VARCHAR(30)  NOT NULL,
                label       VARCHAR(255),
                file_url    VARCHAR(500) NOT NULL,
                file_name   VARCHAR(255) NOT NULL,
                created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
            )
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_usm_tower_series
            ON unit_series_media (tower_id, series_code)
        """))

    yield
    # Shutdown
    print(f"👋 Shutting down {settings.PROJECT_NAME}")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real Estate Platform API — janapriyaupscale.com",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://173.168.0.81:3000",
        "http://173.168.0.81:8000",
        "http://122.169.206.93",
        "https://122.169.206.93",
        "http://janapriyahomes.com",
        "https://janapriyahomes.com",
        "http://www.janapriyahomes.com",
        "https://www.janapriyahomes.com",
        "https://janapriyaupscale.com",
        "https://www.janapriyaupscale.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/api/docs",
        "health": "/api/v1/health",
    }


# Health check at root level for load balancers
@app.get("/health")
async def health():
    return {"status": "ok"}

# Serve uploaded media files
_media_dir = os.path.join(os.path.dirname(__file__), "../media")
os.makedirs(_media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=_media_dir), name="media")
