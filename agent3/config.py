from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def load_dotenv(path: str | Path = ".env") -> None:
    """Load simple KEY=VALUE pairs from a .env file without overriding env vars."""
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    google_cloud_api_key: str | None
    google_cloud_project: str | None
    pingram_api_key: str | None
    pingram_email_type: str
    pingram_sms_type: str
    pingram_sender_name: str | None
    pingram_sender_email: str | None
    pingram_dry_run: bool

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        return cls(
            google_cloud_api_key=os.getenv("GOOGLE_CLOUD_API_KEY") or os.getenv("GOOGLE_API_KEY"),
            google_cloud_project=os.getenv("GOOGLE_CLOUD_PROJECT"),
            pingram_api_key=os.getenv("PINGRAM_API_KEY"),
            pingram_email_type=os.getenv("PINGRAM_EMAIL_TYPE", "agent3_product_launch_email"),
            pingram_sms_type=os.getenv("PINGRAM_SMS_TYPE", "agent3_product_launch_sms"),
            pingram_sender_name=os.getenv("PINGRAM_SENDER_NAME"),
            pingram_sender_email=os.getenv("PINGRAM_SENDER_EMAIL"),
            pingram_dry_run=_bool_env("PINGRAM_DRY_RUN", True),
        )
