from __future__ import annotations

import os
from dataclasses import dataclass, field

from agents.config import GoogleSettings, load_dotenv


@dataclass(frozen=True)
class Settings:
    google: GoogleSettings
    gemini_model: str
    max_output_tokens: int
    temperature: float
    cors_origins: list[str] = field(default_factory=lambda: ["*"])

    @property
    def gemini_api_key(self) -> str | None:
        return self.google.api_key

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        raw_origins = os.getenv("CORS_ORIGINS", "")
        cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()] or ["*"]
        return cls(
            google=GoogleSettings.from_env(),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            max_output_tokens=int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "8192")),
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")),
            cors_origins=cors_origins,
        )
