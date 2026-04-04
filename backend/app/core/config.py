from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-prod-min32chars!!"
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Janapriya Upscale"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    POSTGRES_DB: str = "janapriya_db"
    POSTGRES_USER: str = "janapriya_user"
    POSTGRES_PASSWORD: str = "DevPassword@123"
    DATABASE_HOST: str = "127.0.0.1"
    DATABASE_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{quote_plus(self.POSTGRES_PASSWORD)}@"
            f"{self.DATABASE_HOST}:{self.DATABASE_PORT}"
            f"/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{quote_plus(self.POSTGRES_PASSWORD)}@"
            f"{self.DATABASE_HOST}:{self.DATABASE_PORT}"
            f"/{self.POSTGRES_DB}"
        )

    # Valkey
    VALKEY_PASSWORD: str = "DevValkey@123"
    VALKEY_HOST: str = "localhost"
    VALKEY_PORT: int = 6379

    @property
    def VALKEY_URL(self) -> str:
        return (
            f"redis://:{quote_plus(self.VALKEY_PASSWORD)}@"
            f"{self.VALKEY_HOST}:{self.VALKEY_PORT}/0"
        )

    # JWT
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-prod!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # Admin
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Admin@Janapriya2026"
    ADMIN_SECRET_KEY: str = "admin-jwt-secret-janapriya-2026!!"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # Salesforce
    SF_USERNAME: str = ""
    SF_PASSWORD: str = ""
    SF_SECURITY_TOKEN: str = ""
    SF_DOMAIN: str = "login"

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # SmartPing SMS
    SMARTPING_URL: str = "https://pgapi.smartping.ai/fe/api/v1/multiSend"
    SMARTPING_USERNAME: str = "janaptnpg.trans"
    SMARTPING_PASSWORD: str = "bugmp"
    SMARTPING_SENDER_ID: str = "JPTOWN"
    SMARTPING_DLT_CONTENT_ID: str = "1707174280396973930"
    SMARTPING_DLT_TELEMARKETER_ID: str = "b574ada9ce06225d66465806bef68e5c37271cee88f8a73a4f8ee9a22b576b88"
    SMARTPING_DLT_ENTITY_ID: str = "1701166339309356089"
    SMARTPING_DLT_BOOKING_CONTENT_ID: str = "1707177528503543610"
    SMARTPING_DLT_PAYMENT_CONTENT_ID: str = "1707177528535228397"

    # SMTP (Office 365)
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "no-reply@janapriya.com"
    SMTP_PASSWORD: str = "xnlxgncxktslnpsp"

    # Chat360 WhatsApp API
    CHAT360_API_URL: str = "https://app.chat360.io/service/v2/task"
    CHAT360_API_KEY: str = "hv3frTUh.iKymHoGygCxAbS6wAsETc9UHKgfXVtr8"
    CHAT360_BUSINESS_NUMBER: str = "916309810044"
    CHAT360_BOOKING_TEMPLATE: str = "bookingconfirmaton"
    CHAT360_PAYMENT_TEMPLATE: str = "paymentconfirmation"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()
