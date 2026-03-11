"""
Models: FieldConfig + CustomFieldValue
File: backend/app/models/field_config.py
"""
import uuid
from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from backend.app.models.base import Base, UUIDMixin, TimeStampMixin


class EntityType(str, enum.Enum):
    project   = "project"
    tower     = "tower"
    unit      = "unit"
    lead      = "lead"
    site_visit = "site_visit"
    booking   = "booking"


class FieldType(str, enum.Enum):
    text      = "text"
    number    = "number"
    decimal   = "decimal"
    boolean   = "boolean"
    select    = "select"       # dropdown — options stored in field_options JSON
    multiselect = "multiselect"
    date      = "date"
    textarea  = "textarea"
    email     = "email"
    phone     = "phone"
    url       = "url"
    currency  = "currency"


class FieldConfig(UUIDMixin, TimeStampMixin, Base):
    """
    Controls every field for every entity — both schema fields and custom fields.

    is_custom=False  → existing DB column, only label/visibility/order can change
    is_custom=True   → custom field, stored in custom_field_values table
    """
    __tablename__ = "field_configs"

    entity        = Column(String(50), nullable=False, index=True)
    field_key     = Column(String(100), nullable=False)   # e.g. "bedrooms", "base_price"
    label         = Column(String(200), nullable=False)   # display label shown to users
    field_type    = Column(String(50), default='text', nullable=False)
    is_visible    = Column(Boolean, default=True, nullable=False)
    is_required   = Column(Boolean, default=False, nullable=False)
    is_custom     = Column(Boolean, default=False, nullable=False)  # True = custom field
    sort_order    = Column(Integer, default=0, nullable=False)
    placeholder   = Column(String(300), nullable=True)
    help_text     = Column(String(500), nullable=True)
    field_options = Column(JSONB, nullable=True)  # for select/multiselect: ["option1","option2"]
    show_on_customer = Column(Boolean, default=True)   # show on customer-facing forms/pages
    show_on_admin    = Column(Boolean, default=True)   # show in admin panel

    # Relationship to custom values
    custom_values = relationship("CustomFieldValue", back_populates="field_config",
                                  cascade="all, delete-orphan")

    __table_args__ = (
        # Unique field_key per entity
        __import__("sqlalchemy").UniqueConstraint("entity", "field_key", name="uq_field_config_entity_key"),
    )


class CustomFieldValue(UUIDMixin, TimeStampMixin, Base):
    """
    Stores values for custom fields against any entity record.
    Uses entity_id (UUID of the record) + field_config_id to look up.
    """
    __tablename__ = "custom_field_values"

    field_config_id = Column(UUID(as_uuid=True), ForeignKey("field_configs.id", ondelete="CASCADE"),
                              nullable=False, index=True)
    entity_id       = Column(UUID(as_uuid=True), nullable=False, index=True)
    # stores any value type as JSON (string, number, bool, list)
    value           = Column(JSONB, nullable=True)

    field_config = relationship("FieldConfig", back_populates="custom_values")
