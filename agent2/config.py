from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model: str = "llama3.1"
    ollama_base_url: str = "http://127.0.0.1:11434"
    max_tokens: int = 1500
    request_timeout_seconds: int = 120

    class Config:
        env_file = ".env"

settings = Settings()