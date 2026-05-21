from __future__ import annotations

from fastapi import FastAPI

from agent3.config import Settings
from agent3.delivery import PingramDeliveryClient
from agent3.models import Agent3Request, Agent3Response, DeliveryResult, MarketingSendRequest
from agent3.prompts import SYSTEM_PROMPT, build_agent3_prompt
from agent3.service import Agent3Analyzer

app = FastAPI(
    title="Agent Service 3 - Market + Growth Agent",
    version="0.1.0",
    description="Marketability, competitor, GTM, growth experiment, ad, recommendation, and reality-check service.",
)

settings = Settings.from_env()
analyzer = Agent3Analyzer()
delivery_client = PingramDeliveryClient(settings)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "agent3-market-growth",
        "google_cloud_configured": bool(settings.google_cloud_api_key),
        "pingram_configured": bool(settings.pingram_api_key),
        "pingram_dry_run": settings.pingram_dry_run,
    }


@app.post("/analyze", response_model=Agent3Response)
def analyze(request: Agent3Request) -> Agent3Response:
    return analyzer.analyze(request)


@app.post("/marketing/send", response_model=DeliveryResult)
async def send_marketing_notification(request: MarketingSendRequest) -> DeliveryResult:
    return await delivery_client.send(request)


@app.post("/prompt")
def prompt(request: Agent3Request) -> dict[str, str]:
    """Expose the LLM prompt for debugging or orchestrator handoff."""
    return {
        "system": SYSTEM_PROMPT,
        "user": build_agent3_prompt(request),
    }
