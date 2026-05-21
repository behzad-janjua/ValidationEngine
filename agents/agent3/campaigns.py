from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlencode
from uuid import uuid4

from fastapi import HTTPException

from agents.agent3.delivery import PingramDeliveryClient
from agents.agent3.models import (
    CampaignDeliveryItem,
    CampaignDeliveryResult,
    CampaignStatus,
    CampaignSummary,
    DeliveryStatus,
    MarketingCampaignRequest,
    MarketingContact,
    MarketingNotificationDraft,
    MarketingSendRequest,
    NotificationChannel,
    OptOutRecord,
    OptOutRequest,
)
from agents.agent3.service import Agent3Analyzer


class CampaignRegistry:
    """In-memory campaign and opt-out tracking for the Agent 3 MVP."""

    def __init__(self) -> None:
        self._campaigns: dict[str, CampaignDeliveryResult] = {}
        self._opt_outs: dict[str, OptOutRecord] = {}

    def save_campaign(self, campaign: CampaignDeliveryResult) -> CampaignDeliveryResult:
        self._campaigns[campaign.campaign_id] = campaign
        return campaign

    def get_campaign(self, campaign_id: str) -> CampaignDeliveryResult:
        campaign = self._campaigns.get(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found.")
        return campaign

    def list_campaigns(self) -> list[CampaignSummary]:
        return [
            CampaignSummary(
                campaign_id=campaign.campaign_id,
                campaign_name=campaign.campaign_name,
                idea_id=campaign.idea_id,
                channel=campaign.channel,
                status=campaign.status,
                dry_run=campaign.dry_run,
                total_contacts=campaign.total_contacts,
                sent_count=campaign.sent_count,
                preview_count=campaign.preview_count,
                skipped_count=campaign.skipped_count,
                failed_count=campaign.failed_count,
                created_at=campaign.created_at,
                updated_at=campaign.updated_at,
            )
            for campaign in self._campaigns.values()
        ]

    def record_opt_out(self, request: OptOutRequest) -> OptOutRecord:
        key = self._primary_opt_out_key(email=request.email, phone_number=request.phone_number)
        if not key:
            raise HTTPException(status_code=422, detail="email or phone_number is required.")

        record = OptOutRecord(
            key=key,
            email=request.email,
            phone_number=request.phone_number,
            campaign_id=request.campaign_id,
            reason=request.reason,
            opted_out_at=datetime.now(timezone.utc),
        )
        self._opt_outs[key] = record
        return record

    def list_opt_outs(self) -> list[OptOutRecord]:
        return list(self._opt_outs.values())

    def is_opted_out(self, contact: MarketingContact) -> bool:
        if contact.opted_out:
            return True
        return any(key in self._opt_outs for key in self._opt_out_keys(contact.email, contact.phone_number))

    def _primary_opt_out_key(self, email: str | None = None, phone_number: str | None = None) -> str | None:
        keys = self._opt_out_keys(email=email, phone_number=phone_number)
        return keys[0] if keys else None

    def _opt_out_keys(self, email: str | None = None, phone_number: str | None = None) -> list[str]:
        keys: list[str] = []
        if email:
            keys.append(f"email:{email.strip().lower()}")
        if phone_number:
            keys.append(f"sms:{phone_number.strip()}")
        return keys


class CampaignManager:
    def __init__(
        self,
        analyzer: Agent3Analyzer,
        delivery_client: PingramDeliveryClient,
        registry: CampaignRegistry,
    ) -> None:
        self.analyzer = analyzer
        self.delivery_client = delivery_client
        self.registry = registry

    async def create_and_send(self, request: MarketingCampaignRequest) -> CampaignDeliveryResult:
        analysis = self.analyzer.analyze(request.analysis_request)
        message = request.message or self._select_message(analysis.marketing_notifications, request.channel)
        if message.channel != request.channel:
            raise HTTPException(status_code=422, detail="Campaign channel must match the message channel.")
        campaign_id = request.campaign_id or f"camp_{uuid4().hex[:12]}"
        campaign_name = request.campaign_name or f"{request.analysis_request.idea.title} launch"
        created_at = datetime.now(timezone.utc)

        deliveries: list[CampaignDeliveryItem] = []
        for contact in request.audience:
            if self.registry.is_opted_out(contact):
                deliveries.append(
                    CampaignDeliveryItem(
                        contact=contact,
                        status=DeliveryStatus.SKIPPED,
                        reason="Contact is opted out of marketing messages.",
                    )
                )
                continue

            send_request = MarketingSendRequest(
                contact=contact,
                message=message,
                campaign_id=campaign_id,
                unsubscribe_url=self._unsubscribe_url(request.unsubscribe_base_url, contact, campaign_id),
                dry_run=request.dry_run,
            )

            try:
                result = await self.delivery_client.send(send_request)
                deliveries.append(
                    CampaignDeliveryItem(
                        contact=contact,
                        status=self._delivery_status(result.status),
                        result=result,
                    )
                )
            except HTTPException as exc:
                deliveries.append(
                    CampaignDeliveryItem(
                        contact=contact,
                        status=DeliveryStatus.FAILED,
                        reason=str(exc.detail),
                    )
                )

        campaign = CampaignDeliveryResult(
            campaign_id=campaign_id,
            campaign_name=campaign_name,
            idea_id=request.analysis_request.idea.row_id,
            channel=request.channel,
            status=self._campaign_status(deliveries, request.dry_run),
            dry_run=request.dry_run,
            total_contacts=len(request.audience),
            sent_count=sum(item.status == DeliveryStatus.SENT for item in deliveries),
            preview_count=sum(item.status == DeliveryStatus.PREVIEW for item in deliveries),
            skipped_count=sum(item.status == DeliveryStatus.SKIPPED for item in deliveries),
            failed_count=sum(item.status == DeliveryStatus.FAILED for item in deliveries),
            message=message,
            deliveries=deliveries,
            created_at=created_at,
            updated_at=datetime.now(timezone.utc),
        )
        return self.registry.save_campaign(campaign)

    def _select_message(
        self,
        messages: list[MarketingNotificationDraft],
        channel: NotificationChannel,
    ) -> MarketingNotificationDraft:
        for message in messages:
            if message.channel == channel:
                return message
        raise HTTPException(status_code=422, detail=f"No {channel.value} marketing notification was generated.")

    def _unsubscribe_url(
        self,
        base_url: str | None,
        contact: MarketingContact,
        campaign_id: str,
    ) -> str | None:
        if not base_url:
            return None

        query = {
            "campaign_id": campaign_id,
        }
        if contact.email:
            query["email"] = contact.email
        if contact.phone_number:
            query["phone_number"] = contact.phone_number

        separator = "&" if "?" in base_url else "?"
        return f"{base_url}{separator}{urlencode(query)}"

    def _delivery_status(self, status: str) -> DeliveryStatus:
        try:
            return DeliveryStatus(status)
        except ValueError:
            return DeliveryStatus.FAILED

    def _campaign_status(self, deliveries: list[CampaignDeliveryItem], dry_run: bool) -> CampaignStatus:
        failed = any(item.status == DeliveryStatus.FAILED for item in deliveries)
        skipped = any(item.status == DeliveryStatus.SKIPPED for item in deliveries)
        delivered = any(item.status in {DeliveryStatus.SENT, DeliveryStatus.PREVIEW} for item in deliveries)

        if delivered and (failed or skipped):
            return CampaignStatus.PARTIAL
        if failed:
            return CampaignStatus.FAILED
        if skipped and not delivered:
            return CampaignStatus.DRAFTED
        if dry_run:
            return CampaignStatus.PREVIEWED
        return CampaignStatus.SENT
