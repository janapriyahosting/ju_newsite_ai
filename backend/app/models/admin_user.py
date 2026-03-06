import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from backend.app.models.base import UUIDMixin, TimeStampMixin
from backend.app.core.database import Base

class AdminUser(UUIDMixin, TimeStampMixin, Base):
    __tablename__ = "admin_users"

    username:      Mapped[str]  = mapped_column(String(50), unique=True, nullable=False, index=True)
    email:         Mapped[str]  = mapped_column(String(255), nullable=True)
    full_name:     Mapped[str]  = mapped_column(String(100), nullable=True)
    password_hash: Mapped[str]  = mapped_column(String(255), nullable=False)
    role:          Mapped[str]  = mapped_column(String(20), default="admin")
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)
