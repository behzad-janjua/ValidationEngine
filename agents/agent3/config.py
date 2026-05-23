from __future__ import annotations

import os
from dataclasses import dataclass

from agents.config import GoogleSettings, load_dotenv


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    google: GoogleSettings
    pingram_api_key: str | None
    pingram_email_type: str
    pingram_sms_type: str
    pingram_sender_name: str | None
    pingram_sender_email: str | None
    pingram_dry_run: bool
    gemini_model: str
    gemini_max_output_tokens: int
    gemini_temperature: float

    @property
    def google_cloud_api_key(self) -> str | None:
        """Alias kept for backward compatibility with the health endpoint."""
        return self.google.api_key

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        return cls(
            google=GoogleSettings.from_env(),
            pingram_api_key=os.getenv("PINGRAM_API_KEY"),
            pingram_email_type=os.getenv("PINGRAM_EMAIL_TYPE", "agent3_product_launch_email"),
            pingram_sms_type=os.getenv("PINGRAM_SMS_TYPE", "agent3_product_launch_sms"),
            pingram_sender_name=os.getenv("PINGRAM_SENDER_NAME"),
            pingram_sender_email=os.getenv("PINGRAM_SENDER_EMAIL"),
            pingram_dry_run=_bool_env("PINGRAM_DRY_RUN", True),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            gemini_max_output_tokens=int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192")),
            gemini_temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")),
        )
