"""SmartPing SMS service for OTP delivery and booking notifications."""
import httpx, random, string
from backend.app.core.config import settings


def generate_otp(length=6) -> str:
    return ''.join(random.choices(string.digits, k=length))


async def _send_sms(phone: str, text: str, dlt_content_id: str | None = None) -> bool:
    """Send SMS via SmartPing gateway."""
    params = {
        "username": settings.SMARTPING_USERNAME,
        "password": settings.SMARTPING_PASSWORD,
        "unicode": "false",
        "from": settings.SMARTPING_SENDER_ID,
        "to": phone,
        "text": text,
        "dltContentId": dlt_content_id or settings.SMARTPING_DLT_CONTENT_ID,
        "dltTelemarketerId": settings.SMARTPING_DLT_TELEMARKETER_ID,
        "dltPrincipalEntityId": settings.SMARTPING_DLT_ENTITY_ID,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(settings.SMARTPING_URL, params=params)
            if r.status_code == 200:
                return True
            print(f"[SMS] SmartPing returned {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"[SMS] Send error: {e}")
        return False


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SmartPing SMS gateway (JTPL account)."""
    text = (
        f"Your OTP for verifying your account on JanapriyaUpscale.com is {otp}. "
        f"It is valid for 5 minutes. Do not share this code with anyone."
    )
    return await _send_sms(phone, text)


async def send_booking_confirmation_sms(
    phone: str,
    unit_number: str,
    booking_id: str,
) -> bool:
    """
    Send booking confirmation SMS.
    DLT Template 1707177528503543610:
    'Your booking for Unit - {#var#} is confirmed. Booking ID - {#var#}. - Janapriya Upscale'
    """
    text = (
        f"Your booking for Unit - {unit_number} is confirmed. "
        f"Booking ID - {booking_id}. - Janapriya Upscale"
    )
    result = await _send_sms(phone, text, settings.SMARTPING_DLT_BOOKING_CONTENT_ID)
    if result:
        print(f"[SMS] Booking confirmation sent to {phone}")
    return result


async def send_payment_confirmation_sms(
    phone: str,
    amount: str,
    transaction_id: str,
) -> bool:
    """
    Send payment confirmation SMS.
    DLT Template 1707177528535228397:
    'Payment of Rs.{#var#} received for your booking. Transaction ID - {#var#}. - Janapriya Upscale'
    """
    text = (
        f"Payment of Rs.{amount} received for your booking. "
        f"Transaction ID - {transaction_id}. - Janapriya Upscale"
    )
    result = await _send_sms(phone, text, settings.SMARTPING_DLT_PAYMENT_CONTENT_ID)
    if result:
        print(f"[SMS] Payment confirmation sent to {phone}")
    return result
