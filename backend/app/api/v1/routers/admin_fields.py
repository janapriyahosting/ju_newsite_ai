"""
Admin Field Config Router
File: backend/app/api/v1/routers/admin_fields.py

Endpoints:
  GET    /admin/fields                     → all configs grouped by entity
  GET    /admin/fields/{entity}            → configs for one entity
  POST   /admin/fields                     → create custom field
  PATCH  /admin/fields/{id}               → update label/visibility/etc
  DELETE /admin/fields/{id}               → delete (custom fields only)
  POST   /admin/fields/reorder            → bulk reorder (drag-drop)

  GET    /admin/fields/public/{entity}    → public endpoint (no auth) for customer forms

  POST   /admin/custom-values             → upsert a custom field value
  GET    /admin/custom-values/{entity}/{entity_id}  → get all custom values for a record
  DELETE /admin/custom-values/{id}        → delete a custom value
"""
import re
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update

from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.field_config import FieldConfig, CustomFieldValue
from backend.app.schemas.field_config import (
    FieldConfigCreate, FieldConfigUpdate, FieldConfigOut,
    FieldConfigBulkReorder, CustomFieldValueUpsert, CustomFieldValueOut
)

router = APIRouter(prefix="/admin", tags=["Admin - Fields"])


def slugify(text: str) -> str:
    """Convert label to snake_case key."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", "_", text)
    return text


# ── Field Config CRUD ─────────────────────────────────────────────────────────

@router.get("/fields", response_model=dict)
async def get_all_field_configs(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Return all field configs grouped by entity."""
    result = await db.execute(
        select(FieldConfig).order_by(FieldConfig.entity, FieldConfig.sort_order)
    )
    configs = result.scalars().all()

    grouped: dict = {}
    for c in configs:
        key = c.entity.value if hasattr(c.entity, "value") else str(c.entity)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(FieldConfigOut.model_validate(c))

    return grouped


@router.get("/fields/public/{entity}")
async def get_public_field_configs(
    entity: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Returns visible field configs for customer-facing forms and pages.
    """
    entity_enum = entity

    result = await db.execute(
        select(FieldConfig)
        .where(
            FieldConfig.entity == entity_enum,
            FieldConfig.is_visible == True,
            FieldConfig.show_on_customer == True,
        )
        .order_by(FieldConfig.sort_order)
    )
    configs = result.scalars().all()
    return [FieldConfigOut.model_validate(c) for c in configs]


@router.get("/fields/{entity}", response_model=List[FieldConfigOut])
async def get_entity_field_configs(
    entity: str,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Return all field configs for a specific entity (admin view — includes hidden)."""
    entity_enum = entity

    result = await db.execute(
        select(FieldConfig)
        .where(FieldConfig.entity == entity_enum)
        .order_by(FieldConfig.sort_order)
    )
    return [FieldConfigOut.model_validate(c) for c in result.scalars().all()]


@router.post("/fields", response_model=FieldConfigOut, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    data: FieldConfigCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    """Create a new custom field. Custom fields get stored in custom_field_values."""
    # Validate entity
    entity_enum = data.entity

    # Auto-generate field_key if not unique-safe
    field_key = slugify(data.field_key) if data.field_key else slugify(data.label)

    # Check uniqueness
    existing = await db.execute(
        select(FieldConfig).where(
            FieldConfig.entity == entity_enum,
            FieldConfig.field_key == field_key,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Field key '{field_key}' already exists for entity '{data.entity}'"
        )

    # Get max sort_order
    result = await db.execute(
        select(FieldConfig.sort_order)
        .where(FieldConfig.entity == entity_enum)
        .order_by(FieldConfig.sort_order.desc())
        .limit(1)
    )
    max_order = result.scalar() or 0

    field = FieldConfig(
        entity=entity_enum,
        field_key=field_key,
        label=data.label,
        field_type=data.field_type,
        is_visible=data.is_visible,
        is_required=data.is_required,
        is_custom=True,
        sort_order=data.sort_order if data.sort_order else max_order + 1,
        placeholder=data.placeholder,
        help_text=data.help_text,
        field_options=data.field_options,
        show_on_customer=data.show_on_customer,
        show_on_admin=data.show_on_admin,
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return FieldConfigOut.model_validate(field)


@router.patch("/fields/{field_id}", response_model=FieldConfigOut)
async def update_field_config(
    field_id: uuid.UUID,
    data: FieldConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Update any field config — label, visibility, required, order, options, help text."""
    result = await db.execute(select(FieldConfig).where(FieldConfig.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field config not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    await db.commit()
    await db.refresh(field)
    return FieldConfigOut.model_validate(field)


@router.delete("/fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field(
    field_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(verify_admin_token),
):
    """
    Delete a field config. Only custom fields can be deleted.
    Schema fields (is_custom=False) can be hidden but not deleted.
    Superadmin only.
    """
    if admin.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin only")

    result = await db.execute(select(FieldConfig).where(FieldConfig.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field config not found")
    if not field.is_custom:
        raise HTTPException(
            status_code=400,
            detail="Schema fields cannot be deleted — toggle is_visible=false to hide them"
        )

    await db.delete(field)
    await db.commit()


@router.post("/fields/reorder", status_code=status.HTTP_200_OK)
async def reorder_fields(
    data: FieldConfigBulkReorder,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """
    Bulk update sort_order after drag-and-drop.
    Body: { "items": [{"id": "uuid", "sort_order": 1}, ...] }
    """
    for item in data.items:
        await db.execute(
            update(FieldConfig)
            .where(FieldConfig.id == item["id"])
            .values(sort_order=item["sort_order"])
        )
    await db.commit()
    return {"message": f"Reordered {len(data.items)} fields"}


# ── Custom Field Values ───────────────────────────────────────────────────────

@router.post("/custom-values", response_model=CustomFieldValueOut)
async def upsert_custom_field_value(
    data: CustomFieldValueUpsert,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Create or update a custom field value for any entity record."""
    # Check field config exists and is custom
    result = await db.execute(
        select(FieldConfig).where(FieldConfig.id == data.field_config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Field config not found")
    if not config.is_custom:
        raise HTTPException(status_code=400, detail="Only custom fields can store values here")

    # Upsert
    existing = await db.execute(
        select(CustomFieldValue).where(
            CustomFieldValue.field_config_id == data.field_config_id,
            CustomFieldValue.entity_id == data.entity_id,
        )
    )
    cfv = existing.scalar_one_or_none()

    if cfv:
        cfv.value = data.value
    else:
        cfv = CustomFieldValue(
            field_config_id=data.field_config_id,
            entity_id=data.entity_id,
            value=data.value,
        )
        db.add(cfv)

    await db.commit()
    await db.refresh(cfv)

    out = CustomFieldValueOut.model_validate(cfv)
    out.field_key = config.field_key
    out.label = config.label
    return out


@router.get("/fields/public-values/{entity}/{entity_id}")
async def get_public_custom_field_values(
    entity: str,
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth. Returns custom field values for customer-facing pages.
    Only returns values for fields where show_on_customer=True."""
    configs_result = await db.execute(
        select(FieldConfig).where(
            FieldConfig.entity == entity,
            FieldConfig.is_custom == True,
            FieldConfig.is_visible == True,
            FieldConfig.show_on_customer == True,
        )
    )
    configs = {c.id: c for c in configs_result.scalars().all()}
    if not configs:
        return []

    values_result = await db.execute(
        select(CustomFieldValue).where(
            CustomFieldValue.entity_id == entity_id,
            CustomFieldValue.field_config_id.in_(list(configs.keys())),
        )
    )
    values = values_result.scalars().all()

    output = []
    for v in values:
        config = configs.get(v.field_config_id)
        if not config:
            continue
        out = CustomFieldValueOut.model_validate(v)
        out.field_key = config.field_key
        out.label = config.label
        out.field_type = config.field_type
        output.append(out)

    # Sort by field config sort_order
    output.sort(key=lambda x: next((c.sort_order for c in configs.values() if c.field_key == x.field_key), 999))
    return output


@router.get("/custom-values/{entity}/{entity_id}", response_model=List[CustomFieldValueOut])
async def get_custom_field_values(
    entity: str,
    entity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    """Get all custom field values for a specific entity record."""
    entity_enum = entity

    # Get all custom field configs for entity
    configs_result = await db.execute(
        select(FieldConfig).where(
            FieldConfig.entity == entity_enum,
            FieldConfig.is_custom == True,
        )
    )
    configs = {c.id: c for c in configs_result.scalars().all()}

    # Get values
    values_result = await db.execute(
        select(CustomFieldValue).where(
            CustomFieldValue.entity_id == entity_id,
            CustomFieldValue.field_config_id.in_(list(configs.keys())),
        )
    )
    values = values_result.scalars().all()

    output = []
    for v in values:
        out = CustomFieldValueOut.model_validate(v)
        config = configs.get(v.field_config_id)
        if config:
            out.field_key = config.field_key
            out.label = config.label
        output.append(out)

    return output


@router.delete("/custom-values/{value_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field_value(
    value_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(verify_admin_token),
):
    result = await db.execute(
        select(CustomFieldValue).where(CustomFieldValue.id == value_id)
    )
    cfv = result.scalar_one_or_none()
    if not cfv:
        raise HTTPException(status_code=404, detail="Custom field value not found")
    await db.delete(cfv)
    await db.commit()
