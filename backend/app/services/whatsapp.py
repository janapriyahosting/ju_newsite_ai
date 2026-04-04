"""Chat360 WhatsApp service for Janapriya Upscale — booking & payment notifications."""
import httpx
from backend.app.core.config import settings


async def _send_whatsapp(
    receiver_phone: str,
    template_title: str,
    param_data: dict,
) -> bool:
    """Send WhatsApp message via Chat360 API v2."""
    if not settings.CHAT360_API_KEY:
        print("[WhatsApp] Chat360 not configured, skipping")
        return False

    # Strip country code — Chat360 uses separate country_code field
    phone = receiver_phone.replace("+91", "").replace(" ", "")
    if phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]

    headers = {
        "Authorization": f"Api-Key {settings.CHAT360_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "task_name": "whatsapp_push_notification",
        "extra": "",
        "task_body": [
            {
                "client_number": settings.CHAT360_BUSINESS_NUMBER,
                "receiver_number": phone,
                "country_code": "+91",
                "template_data": {
                    "param_data": param_data,
                    "template_title": template_title,
                    "template_code": "en",
                    "button_param_data": {},
                },
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(settings.CHAT360_API_URL, json=payload, headers=headers)
            print(f"[WhatsApp] Response ({r.status_code}): {r.text}")
            if r.status_code == 200:
                data = r.json()
                # Chat360 returns success even if task queued — check for errors
                if data.get("status") == "error":
                    print(f"[WhatsApp] API error: {data}")
                    return False
                print(f"[WhatsApp] {template_title} sent to {phone}")
                return True
            else:
                print(f"[WhatsApp] Failed ({r.status_code}): {r.text}")
                return False
    except Exception as e:
        print(f"[WhatsApp] Error: {e}")
        return False


async def send_booking_confirmation_whatsapp(
    phone: str,
    customer_name: str,
    unit_number: str,
    booking_id: str,
) -> bool:
    """
    Send booking confirmation via Chat360 WhatsApp.
    Template: bookingconfirmaton
    Params: customer_name, unit_number, booking_id
    """
    return await _send_whatsapp(
        receiver_phone=phone,
        template_title=settings.CHAT360_BOOKING_TEMPLATE,
        param_data={
            customer_name: customer_name,
            unit_number: unit_number,
            booking_id: booking_id,
        },
    )


async def send_payment_confirmation_whatsapp(
    phone: str,
    customer_name: str,
    amount: str,
    transaction_id: str,
) -> bool:
    """
    Send payment confirmation via Chat360 WhatsApp.
    Template: paymentconfirmation
    Params: amount, customer_name, transaction_id
    """
    return await _send_whatsapp(
        receiver_phone=phone,
        template_title=settings.CHAT360_PAYMENT_TEMPLATE,
        param_data={
            amount: amount,
            customer_name: customer_name,
            transaction_id: transaction_id,
        },
    )
