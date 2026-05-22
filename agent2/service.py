import json
import requests
from pydantic import ValidationError

try:
    from .models import IdeaInput, Agent2Output
    from .prompts import SYSTEM_PROMPT, build_user_prompt
    from .config import settings
except ImportError:
    from models import IdeaInput, Agent2Output
    from prompts import SYSTEM_PROMPT, build_user_prompt
    from config import settings


class Agent2Error(Exception):
    """Base error for agent 2 failures."""


class Agent2ConfigurationError(Agent2Error):
    """Raised when required runtime configuration is missing."""


class Agent2ResponseParseError(Agent2Error):
    """Raised when model output cannot be parsed into required schema."""


class Agent2ProviderError(Agent2Error):
    """Raised when the upstream LLM provider call fails."""


def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    payload = {
        "model": settings.model,
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "options": {
            "num_predict": settings.max_tokens,
        },
    }

    try:
        response = requests.post(
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
            timeout=settings.request_timeout_seconds,
        )
    except requests.RequestException as err:
        raise Agent2ProviderError(
            f"Failed to reach Ollama at {settings.ollama_base_url}: {err}"
        ) from err

    if response.status_code != 200:
        raise Agent2ProviderError(
            f"Ollama returned HTTP {response.status_code}: {response.text}"
        )

    try:
        data = response.json()
    except json.JSONDecodeError as err:
        raise Agent2ProviderError("Ollama returned a non-JSON response") from err

    message = data.get("message", {})
    content = message.get("content")
    if not content:
        raise Agent2ProviderError("Ollama response missing assistant content")

    return content


def _extract_json_payload(raw_text: str) -> dict:
    cleaned = raw_text.strip()

    # Handle fenced markdown responses such as ```json ... ```
    if cleaned.startswith("```"):
        sections = cleaned.split("```")
        if len(sections) >= 2:
            cleaned = sections[1]
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: parse first JSON object if model adds extra text around payload.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or start >= end:
            raise Agent2ResponseParseError("Model response did not contain valid JSON")
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError as err:
            raise Agent2ResponseParseError(f"Failed to parse model JSON: {err}") from err


def _coerce_agent2_payload(payload: dict, idea: IdeaInput) -> dict:
    """Normalize near-miss model payloads into the expected Agent2 schema."""
    normalized = dict(payload)

    normalized.setdefault("idea_id", idea.idea_id)
    normalized.setdefault("title", idea.title)

    if "next_actions" not in normalized:
        normalized["next_actions"] = (
            payload.get("next_steps")
            or payload.get("actions")
            or payload.get("recommendations")
            or []
        )

    if "overall_viability" not in normalized:
        normalized["overall_viability"] = (
            payload.get("viability")
            or payload.get("viability_rating")
            or payload.get("overall_rating")
            or "Medium"
        )

    if "viability_reason" not in normalized:
        normalized["viability_reason"] = (
            payload.get("reason")
            or payload.get("rationale")
            or payload.get("explanation")
            or "Requires additional validation before confident recommendation."
        )

    return normalized


def run_agent2(idea: IdeaInput) -> Agent2Output:
    """
    Send one idea to the LLM, parse the JSON response,
    and return a validated Agent2Output object.
    """
    if not settings.model:
        raise Agent2ConfigurationError("MODEL is not configured")

    user_prompt = build_user_prompt(idea)

    raw_text = _call_ollama(SYSTEM_PROMPT, user_prompt)
    parsed = _extract_json_payload(raw_text)
    parsed = _coerce_agent2_payload(parsed, idea)

    try:
        return Agent2Output(**parsed)
    except ValidationError as err:
        raise Agent2ResponseParseError(f"Model response failed schema validation: {err}") from err


def process_batch(ideas: list[IdeaInput]) -> list[Agent2Output]:
    """Run agent 2 over a list of ideas. Skips low-quality ideas."""
    results = []
    for idea in ideas:
        avg_score = (
            idea.feasibility_score
            + idea.innovation_score
            + idea.marketability_score
        ) / 3

        if avg_score < 50:
            print(f"Skipping '{idea.title}' — avg score {avg_score:.0f} below threshold")
            continue

        print(f"Processing: {idea.title}")
        try:
            result = run_agent2(idea)
            results.append(result)
        except Agent2Error as err:
            # Continue processing remaining ideas instead of failing the whole batch.
            print(f"Failed '{idea.title}' — {err}")

    return results