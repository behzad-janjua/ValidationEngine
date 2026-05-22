from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class Priority(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationVerdict(StrEnum):
    LAUNCH = "launch"
    VALIDATE_FIRST = "validate_first"
    PIVOT = "pivot"
    PARK = "park"


class NotificationChannel(StrEnum):
    EMAIL = "email"
    SMS = "sms"


class CampaignStatus(StrEnum):
    DRAFTED = "drafted"
    PREVIEWED = "previewed"
    SENT = "sent"
    PARTIAL = "partial"
    FAILED = "failed"


class DeliveryStatus(StrEnum):
    PREVIEW = "preview"
    SENT = "sent"
    SKIPPED = "skipped"
    FAILED = "failed"


class IdeaInput(BaseModel):
    row_id: str | None = Field(default=None, description="Source Excel row or external idea id.")
    title: str = Field(..., min_length=2, max_length=140)
    description: str = Field(..., min_length=10)
    target_customer: str | None = None
    problem: str | None = None
    solution: str | None = None
    category: str | None = None
    geography: str | None = None
    price_point: str | None = None


class Agent1Evaluation(BaseModel):
    """Scores from Agent 1, all on a 0-100 scale (Agent 1 rates 1-10; multiply ×10)."""

    feasibility_score: int | None = Field(default=None, ge=0, le=100)
    innovation_score: int | None = Field(default=None, ge=0, le=100)
    impact_score: int | None = Field(default=None, ge=0, le=100)
    marketability_score: int | None = Field(default=None, ge=0, le=100)
    clarity_score: int | None = Field(default=None, ge=0, le=100)
    clarification_questions: list[str] = Field(default_factory=list)
    critique: list[str] = Field(default_factory=list)


class Agent2Planning(BaseModel):
    """Planning output from Agent 2. Populate via Agent2Output.to_agent3_planning()."""

    launch_plan: list[str] = Field(default_factory=list)
    positioning: str | None = None
    ad_copy_suggestions: list[str] = Field(default_factory=list)
    content_calendar: list[str] = Field(default_factory=list)
    messaging: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    overall_viability: str | None = None
    viability_reason: str | None = None
    top_risks: list[str] = Field(default_factory=list)


class AnalysisConstraints(BaseModel):
    timeline_days: int = Field(default=14, ge=1, le=180)
    budget_usd: int = Field(default=500, ge=0, le=1_000_000)
    team_size: int = Field(default=1, ge=1, le=100)
    geography: str | None = None
    launch_url: str | None = Field(default=None, description="Optional product landing or early-access URL.")
    channels_allowed: list[str] = Field(default_factory=list)
    risk_tolerance: str = Field(default="medium")

    @field_validator("risk_tolerance")
    @classmethod
    def normalize_risk_tolerance(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"low", "medium", "high"}:
            raise ValueError("risk_tolerance must be low, medium, or high")
        return normalized


class UserInput(BaseModel):
    notes: str | None = Field(default=None, description="User-supplied guidance for Agent 3.")
    preferred_tone: str | None = Field(default=None, description="Tone for ads and notifications.")
    must_include: list[str] = Field(default_factory=list)
    must_avoid: list[str] = Field(default_factory=list)
    approval_notes: str | None = None


class Agent3Request(BaseModel):
    idea: IdeaInput
    evaluation: Agent1Evaluation | None = None
    planning: Agent2Planning | None = None
    constraints: AnalysisConstraints = Field(default_factory=AnalysisConstraints)
    user_input: UserInput | None = None


class Scorecard(BaseModel):
    marketability: int = Field(..., ge=0, le=100)
    speed_to_market: int = Field(..., ge=0, le=100)
    differentiation: int = Field(..., ge=0, le=100)
    distribution_fit: int = Field(..., ge=0, le=100)
    monetization_confidence: int = Field(..., ge=0, le=100)
    risk: int = Field(..., ge=0, le=100, description="Higher means more launch risk.")


class MarketabilityCheck(BaseModel):
    score: int = Field(..., ge=0, le=100)
    target_customer: str
    pain_level: str
    demand_signals: list[str]
    adoption_blockers: list[str]
    strongest_message_angle: str


class CompetitorInsight(BaseModel):
    name: str
    category: str
    why_it_matters: str
    differentiation_opportunity: str


class GTMChannel(BaseModel):
    name: str
    priority: Priority
    rationale: str
    first_test: str
    success_metric: str
    estimated_effort: str


class GrowthExperiment(BaseModel):
    name: str
    priority: Priority
    hypothesis: str
    audience: str
    steps: list[str]
    duration_days: int = Field(..., ge=1, le=90)
    budget_usd: int = Field(..., ge=0)
    success_metric: str
    decision_rule: str


class AdCreative(BaseModel):
    channel: str
    headline: str
    primary_text: str
    cta: str


class MarketingNotificationDraft(BaseModel):
    channel: NotificationChannel
    type: str = Field(..., description="Provider template or message type.")
    audience: str
    subject: str | None = None
    body: str
    html: str | None = None
    cta: str
    compliance_note: str


class RealityCheck(BaseModel):
    biggest_assumption: str
    fastest_validation_test: str
    kill_criteria: list[str]
    key_risks: list[str]


class FinalRecommendation(BaseModel):
    verdict: RecommendationVerdict
    confidence: int = Field(..., ge=0, le=100)
    rationale: str
    launch_window_days: int = Field(..., ge=1, le=180)


class Agent3Response(BaseModel):
    row_id: str | None
    generated_at: datetime
    scorecard: Scorecard
    marketability_check: MarketabilityCheck
    competitor_scan: list[CompetitorInsight]
    gtm_channels: list[GTMChannel]
    growth_experiments: list[GrowthExperiment]
    advertisement_help: list[AdCreative]
    marketing_notifications: list[MarketingNotificationDraft]
    final_recommendation: FinalRecommendation
    reality_check: RealityCheck
    next_actions: list[str]
    notes: list[str] = Field(default_factory=list)


class MarketingContact(BaseModel):
    contact_id: str | None = None
    name: str | None = None
    email: str | None = None
    phone_number: str | None = None
    marketing_consent: bool = Field(
        default=False,
        description="Must be true for real marketing email/SMS sends.",
    )
    opted_out: bool = Field(default=False, description="Skip this contact for marketing sends.")


class MarketingSendRequest(BaseModel):
    contact: MarketingContact
    message: MarketingNotificationDraft
    campaign_id: str | None = None
    unsubscribe_url: str | None = None
    dry_run: bool = Field(default=True, description="Preview provider payload without sending.")


class DeliveryResult(BaseModel):
    provider: str
    channel: NotificationChannel
    dry_run: bool
    status: str
    payload: dict[str, Any]
    provider_response: dict[str, Any] | str | None = None


class MarketingCampaignRequest(BaseModel):
    analysis_request: Agent3Request
    audience: list[MarketingContact] = Field(..., min_length=1)
    channel: NotificationChannel = NotificationChannel.EMAIL
    campaign_id: str | None = None
    campaign_name: str | None = None
    message: MarketingNotificationDraft | None = None
    unsubscribe_base_url: str | None = Field(
        default=None,
        description="Base URL for unsubscribe links, owned by the future UI/orchestrator.",
    )
    dry_run: bool = Field(default=True, description="Preview campaign payloads without sending.")


class CampaignDeliveryItem(BaseModel):
    contact: MarketingContact
    status: DeliveryStatus
    result: DeliveryResult | None = None
    reason: str | None = None


class CampaignDeliveryResult(BaseModel):
    campaign_id: str
    campaign_name: str
    idea_id: str | None
    channel: NotificationChannel
    status: CampaignStatus
    dry_run: bool
    total_contacts: int
    sent_count: int
    preview_count: int
    skipped_count: int
    failed_count: int
    message: MarketingNotificationDraft
    deliveries: list[CampaignDeliveryItem]
    created_at: datetime
    updated_at: datetime


class CampaignSummary(BaseModel):
    campaign_id: str
    campaign_name: str
    idea_id: str | None
    channel: NotificationChannel
    status: CampaignStatus
    dry_run: bool
    total_contacts: int
    sent_count: int
    preview_count: int
    skipped_count: int
    failed_count: int
    created_at: datetime
    updated_at: datetime


class OptOutRequest(BaseModel):
    email: str | None = None
    phone_number: str | None = None
    campaign_id: str | None = None
    reason: str | None = None


class OptOutRecord(BaseModel):
    key: str
    email: str | None = None
    phone_number: str | None = None
    campaign_id: str | None = None
    reason: str | None = None
    opted_out_at: datetime
