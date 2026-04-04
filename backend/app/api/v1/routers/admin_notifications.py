"""Admin API for managing notification templates."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from backend.app.core.database import get_db
from backend.app.api.v1.routers.admin_auth import verify_admin_token
from backend.app.models.notification_template import NotificationTemplate
from backend.app.services.notification_engine import fire_notification

router = APIRouter(prefix="/admin", tags=["admin-notifications"])


def _tmpl_dict(t: NotificationTemplate) -> dict:
    return {
        "id": str(t.id),
        "trigger_event": t.trigger_event,
        "channel": t.channel,
        "label": t.label,
        "is_active": t.is_active,
        "email_subject": t.email_subject,
        "email_body": t.email_body,
        "sms_text": t.sms_text,
        "sms_dlt_content_id": t.sms_dlt_content_id,
        "wa_template_title": t.wa_template_title,
        "wa_param_mapping": t.wa_param_mapping,
        "available_variables": t.available_variables,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.get("/notification-templates")
async def list_templates(
    trigger_event: Optional[str] = None,
    channel: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    q = select(NotificationTemplate)
    if trigger_event:
        q = q.where(NotificationTemplate.trigger_event == trigger_event)
    if channel:
        q = q.where(NotificationTemplate.channel == channel)
    q = q.order_by(NotificationTemplate.trigger_event, NotificationTemplate.channel)
    result = await db.execute(q)
    return [_tmpl_dict(t) for t in result.scalars().all()]


@router.get("/notification-templates/{template_id}")
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    result = await db.execute(
        select(NotificationTemplate).where(NotificationTemplate.id == template_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template not found")
    return _tmpl_dict(t)


@router.patch("/notification-templates/{template_id}")
async def update_template(
    template_id: UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    result = await db.execute(
        select(NotificationTemplate).where(NotificationTemplate.id == template_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template not found")

    allowed = {
        "label", "is_active",
        "email_subject", "email_body",
        "sms_text", "sms_dlt_content_id",
        "wa_template_title", "wa_param_mapping",
    }
    for k, v in data.items():
        if k in allowed:
            setattr(t, k, v)

    await db.commit()
    await db.refresh(t)
    return _tmpl_dict(t)


@router.post("/notification-templates/test")
async def test_template(
    data: dict,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin_token),
):
    """
    Send a test notification using a specific template.
    Body: { "template_id": "...", "phone": "...", "email": "...", "test_data": {...} }
    """
    import asyncio
    from backend.app.services.notification_engine import _substitute
    from backend.app.services.sms import _send_sms
    from backend.app.services.email import _send_email_sync
    from backend.app.services.whatsapp import _send_whatsapp

    template_id = data.get("template_id")
    if not template_id:
        raise HTTPException(400, "template_id is required")

    result = await db.execute(
        select(NotificationTemplate).where(NotificationTemplate.id == UUID(template_id))
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Template not found")

    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip()
    test_data = data.get("test_data", {})

    # Build context from available_variables with test values
    context = {}
    for var in (t.available_variables or []):
        context[var] = test_data.get(var, f"[{var}]")

    # Send only THIS template (not all templates for the event)
    results = {}
    try:
        if t.channel == "email" and email:
            subject = _substitute(t.email_subject or "", context)
            body = _substitute(t.email_body or "", context)
            if subject and body:
                ok = await asyncio.to_thread(_send_email_sync, email, subject, body)
                results["email"] = "sent" if ok else "failed"
            else:
                results["email"] = "skipped (no subject or body)"

        elif t.channel == "sms" and phone:
            text = _substitute(t.sms_text or "", context)
            if text:
                ok = await _send_sms(phone, text, t.sms_dlt_content_id or None)
                results["sms"] = "sent" if ok else "failed"
            else:
                results["sms"] = "skipped (no text)"

        elif t.channel == "whatsapp" and phone:
            if t.wa_template_title and t.wa_param_mapping:
                param_data = {}
                for wa_key, ctx_key in (t.wa_param_mapping or {}).items():
                    val = str(context.get(ctx_key, ""))
                    param_data[val] = val
                ok = await _send_whatsapp(phone, t.wa_template_title, param_data)
                results["whatsapp"] = "sent" if ok else "failed"
            else:
                results["whatsapp"] = "skipped (no template title or params)"
        else:
            ch = t.channel
            results[ch] = f"skipped (no {'email' if ch == 'email' else 'phone'} provided)"

    except Exception as e:
        results[t.channel] = f"error: {str(e)}"

    return {"template": t.label, "channel": t.channel, "results": results}
