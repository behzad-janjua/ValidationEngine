import pytest

from agent3.config import Settings
from agent3.delivery import PingramDeliveryClient
from agent3.models import Agent3Request, IdeaInput, MarketingContact, MarketingSendRequest
from agent3.service import Agent3Analyzer


def test_agent3_returns_growth_outputs() -> None:
    request = Agent3Request(
        idea=IdeaInput(
            row_id="7",
            title="AI invoice cleanup for agencies",
            description="An AI workflow that helps agencies clean up messy client invoices faster and reduce billing errors.",
            target_customer="small agencies",
            problem="messy client invoices waste operations time",
            solution="automated invoice cleanup workflow",
            category="B2B SaaS",
            price_point="$49 per month",
        )
    )

    response = Agent3Analyzer().analyze(request)

    assert response.row_id == "7"
    assert response.marketability_check.score >= 0
    assert response.gtm_channels
    assert response.growth_experiments
    assert response.advertisement_help
    assert response.marketing_notifications
    assert response.final_recommendation.launch_window_days <= 30


def test_agent3_reality_check_has_kill_criteria() -> None:
    request = Agent3Request(
        idea=IdeaInput(
            title="Recipe planner",
            description="A simple app that helps people plan weekly recipes and grocery ideas.",
        )
    )

    response = Agent3Analyzer().analyze(request)

    assert len(response.reality_check.kill_criteria) >= 2
    assert "validation" in response.reality_check.fastest_validation_test.lower()
    assert response.gtm_channels[0].name == "Short-form demo loop"


@pytest.mark.asyncio
async def test_pingram_email_dry_run_builds_payload() -> None:
    analysis = Agent3Analyzer().analyze(
        Agent3Request(
            idea=IdeaInput(
                title="AI invoice cleanup for agencies",
                description="An AI workflow that helps agencies clean up messy client invoices faster.",
                target_customer="small agencies",
            )
        )
    )
    message = analysis.marketing_notifications[0]
    settings = Settings(
        google_cloud_api_key=None,
        google_cloud_project=None,
        pingram_api_key=None,
        pingram_email_type="agent3_product_launch_email",
        pingram_sms_type="agent3_product_launch_sms",
        pingram_sender_name=None,
        pingram_sender_email=None,
        pingram_dry_run=True,
    )

    result = await PingramDeliveryClient(settings).send(
        MarketingSendRequest(
            contact=MarketingContact(name="Ada", email="ada@example.com"),
            message=message,
            dry_run=True,
        )
    )

    assert result.status == "preview"
    assert result.payload["to"]["email"] == "ada@example.com"
    assert "email" in result.payload
