from __future__ import annotations

from fastapi import HTTPException

from agent3.config import Settings
from agent3.models import DeliveryResult, MarketingSendRequest, NotificationChannel


class PingramDeliveryClient:
    """Sends Agent 3 product launch marketing notifications through Pingram.

    Sending is opt-in per request. Dry runs return the exact provider payload
    without touching Pingram.
    """

    provider = "pingram"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def send(self, request: MarketingSendRequest) -> DeliveryResult:
        payload = self._build_payload(request)
        dry_run = request.dry_run or self.settings.pingram_dry_run

        if dry_run:
            return DeliveryResult(
                provider=self.provider,
                channel=request.message.channel,
                dry_run=True,
                status="preview",
                payload=payload,
            )

        if not request.contact.marketing_consent:
            raise HTTPException(
                status_code=422,
                detail="marketing_consent must be true before sending real marketing messages.",
            )

        if not self.settings.pingram_api_key:
            raise HTTPException(status_code=500, detail="PINGRAM_API_KEY is not configured.")

        try:
            from pingram import Pingram
        except ImportError as exc:
            raise HTTPException(
                status_code=500,
                detail="pingram-python is not installed. Run `python -m pip install -e .`.",
            ) from exc

        async with Pingram(api_key=self.settings.pingram_api_key) as client:
            provider_response = await client.send(payload)

        return DeliveryResult(
            provider=self.provider,
            channel=request.message.channel,
            dry_run=False,
            status="sent",
            payload=payload,
            provider_response=self._serialize_response(provider_response),
        )

    def _build_payload(self, request: MarketingSendRequest) -> dict:
        message = request.message
        contact = request.contact
        recipient_name = contact.name or "there"

        if message.channel == NotificationChannel.EMAIL:
            if not contact.email:
                raise HTTPException(status_code=422, detail="email is required for email marketing.")
            email_payload = {
                "subject": message.subject or "New product early access",
                "html": message.html or self._email_html(message.body, recipient_name, message.cta),
            }
            if self.settings.pingram_sender_name:
                email_payload["senderName"] = self.settings.pingram_sender_name
            if self.settings.pingram_sender_email:
                email_payload["senderEmail"] = self.settings.pingram_sender_email

            return {
                "type": message.type or self.settings.pingram_email_type,
                "to": {
                    "email": contact.email,
                },
                "email": email_payload,
            }

        if not contact.phone_number:
            raise HTTPException(status_code=422, detail="phone_number is required for SMS marketing.")
        return {
            "type": message.type or self.settings.pingram_sms_type,
            "to": {
                "number": contact.phone_number,
            },
            "sms": {
                "message": message.body,
            },
        }

    def _email_html(self, body: str, recipient_name: str, cta: str) -> str:
        paragraphs = "".join(f"<p>{line}</p>" for line in body.splitlines() if line.strip())
        return f"<p>Hi {recipient_name},</p>{paragraphs}<p>{cta}</p>"

    def _serialize_response(self, response: object) -> dict | str:
        if hasattr(response, "model_dump"):
            return response.model_dump()
        if hasattr(response, "dict"):
            return response.dict()
        return str(response)
