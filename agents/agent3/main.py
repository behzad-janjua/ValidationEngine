from __future__ import annotations

from fastapi import FastAPI

from agents.agent3.campaigns import CampaignManager, CampaignRegistry
from agents.agent3.config import Settings
from agents.agent3.delivery import PingramDeliveryClient
from agents.agent3.models import (
    Agent3Request,
    Agent3Response,
    CampaignDeliveryResult,
    CampaignSummary,
    DeliveryResult,
    MarketingCampaignRequest,
    MarketingSendRequest,
    OptOutRecord,
    OptOutRequest,
)
from agents.agent3.prompts import SYSTEM_PROMPT, build_agent3_prompt
from agents.agent3.service import Agent3Analyzer, run_agent3_llm

app = FastAPI(
    title="Agent Service 3 - Market + Growth Agent",
    version="0.1.0",
    description="Marketability, competitor, GTM, growth experiment, ad, recommendation, and reality-check service.",
)

settings = Settings.from_env()
analyzer = Agent3Analyzer()
delivery_client = PingramDeliveryClient(settings)
campaign_registry = CampaignRegistry()
campaign_manager = CampaignManager(analyzer, delivery_client, campaign_registry)


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "agent3-market-growth",
        "google_cloud_configured": bool(settings.google_cloud_api_key),
        "gemini_model": settings.gemini_model,
        "llm_enabled": bool(settings.google.api_key),
        "pingram_configured": bool(settings.pingram_api_key),
        "pingram_dry_run": settings.pingram_dry_run,
    }


@app.post("/analyze", response_model=Agent3Response)
def analyze(request: Agent3Request) -> Agent3Response:
    if settings.google.api_key:
        return run_agent3_llm(request, settings)
    return analyzer.analyze(request)


@app.post("/marketing/send", response_model=DeliveryResult)
async def send_marketing_notification(request: MarketingSendRequest) -> DeliveryResult:
    return await delivery_client.send(request)


@app.post("/campaigns/create-and-send", response_model=CampaignDeliveryResult)
async def create_and_send_campaign(request: MarketingCampaignRequest) -> CampaignDeliveryResult:
    return await campaign_manager.create_and_send(request)


@app.get("/campaigns", response_model=list[CampaignSummary])
def list_campaigns() -> list[CampaignSummary]:
    return campaign_registry.list_campaigns()


@app.get("/campaigns/{campaign_id}", response_model=CampaignDeliveryResult)
def get_campaign(campaign_id: str) -> CampaignDeliveryResult:
    return campaign_registry.get_campaign(campaign_id)


@app.post("/marketing/opt-out", response_model=OptOutRecord)
def opt_out(request: OptOutRequest) -> OptOutRecord:
    return campaign_registry.record_opt_out(request)


@app.get("/marketing/opt-out", response_model=OptOutRecord)
def opt_out_from_link(
    email: str | None = None,
    phone_number: str | None = None,
    campaign_id: str | None = None,
) -> OptOutRecord:
    return campaign_registry.record_opt_out(
        OptOutRequest(
            email=email,
            phone_number=phone_number,
            campaign_id=campaign_id,
            reason="unsubscribe link",
        )
    )


@app.get("/marketing/opt-outs", response_model=list[OptOutRecord])
def list_opt_outs() -> list[OptOutRecord]:
    return campaign_registry.list_opt_outs()


@app.post("/prompt")
def prompt(request: Agent3Request) -> dict[str, str]:
    """Expose the LLM prompt for debugging or orchestrator handoff."""
    return {
        "system": SYSTEM_PROMPT,
        "user": build_agent3_prompt(request),
    }
