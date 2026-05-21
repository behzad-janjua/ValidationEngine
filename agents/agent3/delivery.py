from __future__ import annotations

from fastapi import HTTPException

from agents.agent3.config import Settings
from agents.agent3.models import DeliveryResult, MarketingSendRequest, NotificationChannel


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

        if request.contact.opted_out:
            return DeliveryResult(
                provider=self.provider,
                channel=request.message.channel,
                dry_run=dry_run,
                status="skipped",
                payload=payload,
                provider_response="Contact is opted out of marketing messages.",
            )

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
                "html": self._email_with_unsubscribe(
                    message.html or self._email_html(message.body, recipient_name, message.cta),
                    request.unsubscribe_url,
                ),
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
                "message": self._sms_with_opt_out(message.body, request.unsubscribe_url),
            },
        }

    def _email_html(self, body: str, recipient_name: str, cta: str) -> str:
        paragraphs = "".join(f"<p>{line}</p>" for line in body.splitlines() if line.strip())
        return f"<p>Hi {recipient_name},</p>{paragraphs}<p>{cta}</p>"

    def _email_with_unsubscribe(self, html: str, unsubscribe_url: str | None) -> str:
        if not unsubscribe_url:
            return f"{html}<p style=\"font-size:12px;color:#666;\">You are receiving this because you opted in to product updates.</p>"
        return (
            f"{html}"
            "<p style=\"font-size:12px;color:#666;\">"
            "You are receiving this because you opted in to product updates. "
            f"<a href=\"{unsubscribe_url}\">Unsubscribe</a>."
            "</p>"
        )

    def _sms_with_opt_out(self, message: str, unsubscribe_url: str | None) -> str:
        suffix = f" Opt out: {unsubscribe_url}" if unsubscribe_url else " Reply STOP to opt out."
        return f"{message}{suffix}"[:480]

    def _serialize_response(self, response: object) -> dict | str:
        if hasattr(response, "model_dump"):
            return response.model_dump()
        if hasattr(response, "dict"):
            return response.dict()
        return str(response)
