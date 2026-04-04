"""Notification engine — dispatches notifications based on DB templates."""
import re
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.notification_template import NotificationTemplate
from backend.app.services.sms import _send_sms
from backend.app.services.email import _send_email_sync
from backend.app.services.whatsapp import _send_whatsapp


def _substitute(template_str: str, context: dict) -> str:
    """Replace {{var}} placeholders with context values."""
    if not template_str:
        return ""

    def replacer(match):
        key = match.group(1).strip()
        return str(context.get(key, f"{{{{{key}}}}}"))

    return re.sub(r"\{\{(\w+)\}\}", replacer, template_str)


async def fire_notification(
    trigger_event: str,
    context: dict,
    db: AsyncSession,
    recipient_phone: str | None = None,
    recipient_email: str | None = None,
) -> dict:
    """
    Query active templates for this trigger_event and dispatch notifications.
    Returns dict of channel -> "sent" | "skipped" | "failed".
    """
    result = await db.execute(
        select(NotificationTemplate).where(
            NotificationTemplate.trigger_event == trigger_event,
            NotificationTemplate.is_active == True,
        )
    )
    templates = result.scalars().all()

    results = {}
    tasks = []
    task_channels = []

    for t in templates:
        if t.channel == "email" and recipient_email:
            subject = _substitute(t.email_subject or "", context)
            body = _substitute(t.email_body or "", context)
            if subject and body:
                tasks.append(asyncio.to_thread(_send_email_sync, recipient_email, subject, body))
                task_channels.append("email")

        elif t.channel == "sms" and recipient_phone:
            text = _substitute(t.sms_text or "", context)
            if text:
                tasks.append(_send_sms(recipient_phone, text, t.sms_dlt_content_id or None))
                task_channels.append("sms")

        elif t.channel == "whatsapp" and recipient_phone:
            if t.wa_template_title and t.wa_param_mapping:
                # Build param_data: Chat360 uses {value: value} format
                param_data = {}
                for wa_key, ctx_key in (t.wa_param_mapping or {}).items():
                    val = str(context.get(ctx_key, ""))
                    param_data[val] = val
                tasks.append(_send_whatsapp(recipient_phone, t.wa_template_title, param_data))
                task_channels.append("whatsapp")

    if not tasks:
        return {"status": "no_active_templates"}

    gathered = await asyncio.gather(*tasks, return_exceptions=True)

    for i, r in enumerate(gathered):
        ch = task_channels[i]
        if isinstance(r, Exception):
            results[ch] = "failed"
            print(f"[NotifEngine] {trigger_event}/{ch} failed: {r}")
        elif r:
            results[ch] = "sent"
            print(f"[NotifEngine] {trigger_event}/{ch} sent")
        else:
            results[ch] = "failed"
            print(f"[NotifEngine] {trigger_event}/{ch} returned False")

    return results


async def fire_notification_background(
    trigger_event: str,
    context: dict,
    recipient_phone: str | None = None,
    recipient_email: str | None = None,
):
    """Fire-and-forget version that creates its own DB session."""
    from backend.app.core.database import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as db:
            await fire_notification(
                trigger_event, context, db,
                recipient_phone=recipient_phone,
                recipient_email=recipient_email,
            )
    except Exception as e:
        print(f"[NotifEngine] Background task error for {trigger_event}: {e}")
