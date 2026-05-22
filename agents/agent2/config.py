from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ollama_model: str = "llama3.1"
    ollama_base_url: str = "http://127.0.0.1:11434"
    max_tokens: int = 1500
    request_timeout_seconds: int = 120


settings = Settings()
