from fastapi import APIRouter
from backend.app.api.v1.routers.health import router as health_router
from backend.app.api.v1.routers.projects import router as projects_router
from backend.app.api.v1.routers.units import router as units_router
from backend.app.api.v1.routers.leads import router as leads_router
from backend.app.api.v1.routers.site_visits import router as site_visits_router
from backend.app.api.v1.routers.auth import router as auth_router
from backend.app.api.v1.routers.search import router as search_router
from backend.app.api.v1.routers.cart import router as cart_router
from backend.app.api.v1.routers.bookings import router as bookings_router
from backend.app.api.v1.routers.admin_auth import router as admin_auth_router
from backend.app.api.v1.routers.admin_stats import router as admin_stats_router
from backend.app.api.v1.routers.admin_leads import router as admin_leads_router
from backend.app.api.v1.routers.admin_visits import router as admin_visits_router
from backend.app.api.v1.routers.admin_units import router as admin_units_router
from backend.app.api.v1.routers.admin_fields import router as admin_fields_router
from backend.app.api.v1.routers.admin_crud import router as admin_crud_router
from backend.app.api.v1.routers.admin_cms import router as admin_cms_router
from backend.app.api.v1.routers.admin_analytics import router as admin_analytics_router
from backend.app.api.v1.routers.admin_customers import router as admin_customers_router
from backend.app.api.v1.routers.admin_media import router as admin_media_router
from backend.app.api.v1.routers.admin_notifications import router as admin_notifications_router
from backend.app.api.v1.routers.assistant import router as assistant_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(projects_router)
api_router.include_router(units_router)
api_router.include_router(leads_router)
api_router.include_router(site_visits_router)
api_router.include_router(auth_router)
api_router.include_router(search_router)
api_router.include_router(cart_router)
api_router.include_router(bookings_router)
api_router.include_router(admin_auth_router)
api_router.include_router(admin_stats_router)
api_router.include_router(admin_leads_router)
api_router.include_router(admin_visits_router)
api_router.include_router(admin_crud_router)
api_router.include_router(admin_units_router)
api_router.include_router(admin_fields_router)
api_router.include_router(admin_cms_router, prefix="/admin")
api_router.include_router(admin_analytics_router)
api_router.include_router(admin_customers_router)
api_router.include_router(admin_media_router)
api_router.include_router(admin_notifications_router)
api_router.include_router(assistant_router)
