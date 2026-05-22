from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def load_dotenv(path: str | Path = ".env") -> None:
    """Load KEY=VALUE pairs from a .env file without overriding existing env vars."""
    env_path = Path(path)
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class GoogleSettings:
    """Shared Google / Gemini API configuration used by agents 1 and 3.

    Reads from GEMINI_API_KEY, GOOGLE_CLOUD_API_KEY, or GOOGLE_API_KEY — first
    one found wins. Callers must invoke load_dotenv() before calling from_env().
    """

    api_key: str | None
    project: str | None

    @classmethod
    def from_env(cls) -> "GoogleSettings":
        return cls(
            api_key=(
                os.getenv("GEMINI_API_KEY")
                or os.getenv("GOOGLE_CLOUD_API_KEY")
                or os.getenv("GOOGLE_API_KEY")
            ),
            project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        )
