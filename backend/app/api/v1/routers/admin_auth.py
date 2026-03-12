from typing import Optional
from fastapi import Query, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from uuid import UUID
import jwt
import warnings
warnings.filterwarnings("ignore", ".*bcrypt.*")

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.admin_user import AdminUser
from backend.app.models.search_log import SearchLog
from backend.app.models.session_log import SessionLog
from backend.app.models.customer import Customer as CustomerModel

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

# ── Schemas ───────────────────────────────────────────────────────────────────
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    full_name: str
    role: str

class AdminUserCreate(BaseModel):
    username: str
    email: str = ""
    full_name: str = ""
    password: str
    role: str = "admin"

class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str

# ── Token helpers ─────────────────────────────────────────────────────────────
def create_admin_token(user: AdminUser) -> str:
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(hours=12),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.ADMIN_SECRET_KEY, algorithm="HS256")

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.ADMIN_SECRET_KEY,
            algorithms=["HS256"]
        )
        if payload.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Not an admin token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired — please login again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_superadmin(admin=Depends(verify_admin_token)):
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return admin

# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/login", response_model=AdminTokenResponse)
async def admin_login(data: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    from passlib.hash import bcrypt
    result = await db.execute(
        select(AdminUser).where(
            AdminUser.username == data.username,
            AdminUser.is_active == True
        )
    )
    user = result.scalar_one_or_none()
    if not user or not bcrypt.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_admin_token(user)
    return AdminTokenResponse(
        access_token=token,
        username=user.username,
        full_name=user.full_name or user.username,
        role=user.role,
    )

@router.get("/me")
async def admin_me(
    admin=Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == UUID(admin["sub"]))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Admin user not found")
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

@router.get("/users")
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_superadmin)
):
    result = await db.execute(select(AdminUser).order_by(AdminUser.created_at))
    users = result.scalars().all()
    return {
        "total": len(users),
        "items": [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }

@router.post("/users", status_code=201)
async def create_admin_user(
    data: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_superadmin)
):
    from passlib.hash import bcrypt
    # Check username exists
    existing = (await db.execute(
        select(AdminUser).where(AdminUser.username == data.username)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Username '{data.username}' already exists")

    user = AdminUser(
        username=data.username,
        email=data.email,
        full_name=data.full_name,
        password_hash=bcrypt.hash(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "username": user.username,
        "role": user.role,
        "message": f"Admin user '{user.username}' created successfully"
    }

@router.patch("/users/{user_id}")
async def update_admin_user(
    user_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_superadmin)
):
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Admin user not found")
    allowed = ["full_name", "email", "role", "is_active"]
    for k, v in data.items():
        if k in allowed:
            setattr(user, k, v)
    await db.flush()
    return {"id": str(user.id), "username": user.username, "is_active": user.is_active}

@router.post("/users/{user_id}/reset-password")
async def reset_admin_password(
    user_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(require_superadmin)
):
    from passlib.hash import bcrypt
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Admin user not found")
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user.password_hash = bcrypt.hash(new_password)
    await db.flush()
    return {"message": f"Password reset for '{user.username}' successfully"}

@router.post("/change-password")
async def change_own_password(
    data: AdminPasswordChange,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    from passlib.hash import bcrypt
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == UUID(admin["sub"]))
    )
    user = result.scalar_one_or_none()
    if not user or not bcrypt.verify(data.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    user.password_hash = bcrypt.hash(data.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token)
):
    """Full visitor analytics for admin dashboard."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, cast, Date as SADate
    Customer = CustomerModel
    
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    
    # Search logs with customer info
    search_result = await db.execute(
        select(SearchLog, Customer)
        .outerjoin(Customer, SearchLog.customer_id == Customer.id)
        .where(SearchLog.created_at >= start)
        .order_by(SearchLog.created_at.desc())
        .limit(100)
    )
    searches = search_result.all()
    
    # Session analytics
    session_result = await db.execute(
        select(SessionLog, Customer)
        .outerjoin(Customer, SessionLog.customer_id == Customer.id)
        .where(SessionLog.created_at >= start)
        .order_by(SessionLog.last_seen_at.desc())
        .limit(100)
    )
    sessions = session_result.all()
    
    # Top search queries
    top_queries = await db.execute(
        select(SearchLog.query, func.count(SearchLog.id).label("count"))
        .where(SearchLog.created_at >= start)
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(10)
    )
    
    # Daily search counts
    daily_searches = await db.execute(
        select(cast(SearchLog.created_at, SADate).label("date"), func.count(SearchLog.id).label("count"))
        .where(SearchLog.created_at >= start)
        .group_by(cast(SearchLog.created_at, SADate))
        .order_by(cast(SearchLog.created_at, SADate))
    )
    
    # Avg session duration
    avg_dur = await db.execute(
        select(func.avg(SessionLog.duration_seconds))
        .where(SessionLog.created_at >= start)
    )
    avg_duration = avg_dur.scalar() or 0
    
    return {
        "summary": {
            "total_searches": len(searches),
            "total_sessions": len(sessions),
            "customer_sessions": sum(1 for s, _ in sessions if s.is_customer),
            "avg_duration_seconds": round(float(avg_duration)),
        },
        "searches": [
            {
                "id": str(s.id), "query": s.query,
                "results_count": s.results_count if hasattr(s, 'results_count') else 0,
                "customer_id": str(s.customer_id) if s.customer_id else None,
                "customer_name": c.name if c else None,
                "customer_email": c.email if c else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s, c in searches
        ],
        "sessions": [
            {
                "session_id": s.session_id,
                "customer_name": c.name if c else None,
                "customer_email": c.email if c else None,
                "is_customer": s.is_customer,
                "page_path": s.page_path,
                "duration_seconds": s.duration_seconds,
                "page_views": s.page_views,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
            }
            for s, c in sessions
        ],
        "top_queries": [{"query": r.query, "count": r.count} for r in top_queries.all()],
        "daily_searches": [{"date": str(r.date), "count": r.count} for r in daily_searches.all()],
    }
