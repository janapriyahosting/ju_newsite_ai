"""SmartPing SMS service for OTP delivery"""
import httpx, random, string
from backend.app.core.config import settings


def generate_otp(length=6) -> str:
    return ''.join(random.choices(string.digits, k=length))


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SmartPing SMS gateway (JTPL account)."""
    text = (
        f"Your OTP for verifying your account on JanapriyaUpscale.com is {otp}. "
        f"It is valid for 5 minutes. Do not share this code with anyone."
    )
    params = {
        "username": settings.SMARTPING_USERNAME,
        "password": settings.SMARTPING_PASSWORD,
        "unicode": "false",
        "from": settings.SMARTPING_SENDER_ID,
        "to": phone,
        "text": text,
        "dltContentId": settings.SMARTPING_DLT_CONTENT_ID,
        "dltTelemarketerId": settings.SMARTPING_DLT_TELEMARKETER_ID,
        "dltPrincipalEntityId": settings.SMARTPING_DLT_ENTITY_ID,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(settings.SMARTPING_URL, params=params)
            return r.status_code == 200
    except Exception as e:
        print(f"SMS send error: {e}")
        return False
