from fastapi import APIRouter
from backend.app.api.v1.routers.health import router as health_router

api_router = APIRouter(prefix="/api/v1")

# Register routers
api_router.include_router(health_router)

# Add more routers here as we build them:
# api_router.include_router(units_router)
# api_router.include_router(projects_router)
# api_router.include_router(search_router)
# api_router.include_router(auth_router)
# api_router.include_router(booking_router)
