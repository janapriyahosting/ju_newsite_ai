"""SmartPing SMS service for OTP delivery"""
import httpx, random, string
from backend.app.core.config import settings

SMARTPING_URL = "https://pgapi.smartping.ai/fe/api/v1/multiSend"
SMARTPING_CONFIG = {
    "username": "janaptnpg.trans",
    "password": "bugmp",
    "unicode": "false",
    "from": "JPTOWN",
    "dltContentId": "1707174280396973930",
    "dltTelemarketerId": "b574ada9ce06225d66465806bef68e5c37271cee88f8a73a4f8ee9a22b576b88",
    "dltPrincipalEntityId": "1701166339309356089",
}

def generate_otp(length=6) -> str:
    return ''.join(random.choices(string.digits, k=length))

async def send_otp_sms(phone: str, otp: str) -> bool:
    text = f"Your OTP for verifying your account on JanapriyaUpscale.com is {otp}. It is valid for 5 minutes. Do not share this code with anyone."
    params = {**SMARTPING_CONFIG, "to": phone, "text": text}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(SMARTPING_URL, params=params)
            return r.status_code == 200
    except Exception as e:
        print(f"SMS send error: {e}")
        return False
