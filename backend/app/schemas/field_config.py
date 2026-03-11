"""
Schemas for FieldConfig and CustomFieldValue
File: backend/app/schemas/field_config.py
"""
from __future__ import annotations
from typing import Any, List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# ── FieldConfig ───────────────────────────────────────────────────────────────

class FieldConfigBase(BaseModel):
    label:           str       = Field(..., max_length=200)
    is_visible:      bool      = True
    is_required:     bool      = False
    sort_order:      int       = 0
    placeholder:     Optional[str] = None
    help_text:       Optional[str] = None
    field_options:   Optional[List[Any]] = None   # list of option strings for select fields
    show_on_customer: bool     = True
    show_on_admin:   bool      = True


class FieldConfigCreate(FieldConfigBase):
    """Used when creating a brand-new custom field."""
    entity:     str  = Field(..., description="project|tower|unit|lead|site_visit|booking")
    field_key:  str  = Field(..., max_length=100, description="snake_case key, will be slugified")
    field_type: str  = Field("text", description="text|number|decimal|boolean|select|multiselect|date|textarea|email|phone|url|currency")
    is_custom:  bool = True   # always True for create via API


class FieldConfigUpdate(FieldConfigBase):
    """Used for updating an existing field config (custom or schema field)."""
    label:          Optional[str]  = None
    is_visible:     Optional[bool] = None
    is_required:    Optional[bool] = None
    sort_order:     Optional[int]  = None
    placeholder:    Optional[str]  = None
    help_text:      Optional[str]  = None
    field_options:  Optional[List[Any]] = None
    show_on_customer: Optional[bool] = None
    show_on_admin:  Optional[bool] = None


class FieldConfigOut(FieldConfigBase):
    id:          UUID
    entity:      str
    field_key:   str
    field_type:  str
    is_custom:   bool
    created_at:  datetime
    updated_at:  datetime

    model_config = {"from_attributes": True}


class FieldConfigBulkReorder(BaseModel):
    """Body for bulk reorder — list of {id, sort_order}."""
    items: List[dict]   # [{"id": "uuid", "sort_order": 1}, ...]


# ── CustomFieldValue ──────────────────────────────────────────────────────────

class CustomFieldValueUpsert(BaseModel):
    field_config_id: UUID
    entity_id:       UUID
    value:           Any


class CustomFieldValueOut(BaseModel):
    id:              UUID
    field_config_id: UUID
    entity_id:       UUID
    value:           Any
    field_key:       Optional[str] = None   # populated from join
    label:           Optional[str] = None

    model_config = {"from_attributes": True}
