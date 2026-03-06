from fastapi import APIRouter
from backend.app.api.v1.routers.health import router as health_router
from backend.app.api.v1.routers.projects import router as projects_router
from backend.app.api.v1.routers.units import router as units_router
from backend.app.api.v1.routers.leads import router as leads_router
from backend.app.api.v1.routers.site_visits import router as site_visits_router
from backend.app.api.v1.routers.auth import router as auth_router
from backend.app.api.v1.routers.search import router as search_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(projects_router)
api_router.include_router(units_router)
api_router.include_router(leads_router)
api_router.include_router(site_visits_router)
api_router.include_router(auth_router)
api_router.include_router(search_router)
