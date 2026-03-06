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

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

settings = Settings()
