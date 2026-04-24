
# ─────────────────────────────────────────
# FILE: config.py
# ─────────────────────────────────────────
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Anthropic
    anthropic_api_key: str

    # Razorpay
    razorpay_key_id: str
    razorpay_key_secret: str
    razorpay_webhook_secret: str = ""

    # Job APIs
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""
    rapidapi_key: str = ""
    serpapi_key: str = ""

    # Email
    resend_api_key: str = ""

    # App
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"
    cron_secret: str = "dev-secret"
    environment: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Plan definitions
PLANS = {
    "pro": {
        "name": "Pro",
        "amount": 74900,           # ₹749 in paise
        "duration_days": 30,
        "scans_limit": 9999,
    },
    "career": {
        "name": "Career+",
        "amount": 139900,          # ₹1399 in paise
        "duration_days": 30,
        "scans_limit": 9999,
    },
}

