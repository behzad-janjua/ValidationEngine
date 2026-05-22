from __future__ import annotations

import json

import requests
from pydantic import ValidationError

from agents.agent2.config import settings
from agents.agent2.models import Agent2Output, BatchResultItem, BatchResultStatus, IdeaInput
from agents.agent2.prompts import SYSTEM_PROMPT, build_user_prompt


class Agent2Error(Exception):
    """Base error for agent 2 failures."""


class Agent2ConfigurationError(Agent2Error):
    """Raised when required runtime configuration is missing."""


class Agent2ResponseParseError(Agent2Error):
    """Raised when model output cannot be parsed into the required schema."""


class Agent2ProviderError(Agent2Error):
    """Raised when the upstream LLM provider call fails."""


def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    payload = {
        "model": settings.ollama_model,
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

    content = data.get("message", {}).get("content")
    if not content:
        raise Agent2ProviderError("Ollama response missing assistant content")

    return content


def _extract_json_payload(raw_text: str) -> dict:
    cleaned = raw_text.strip()

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
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or start >= end:
            raise Agent2ResponseParseError("Model response did not contain valid JSON")
        try:
            return json.loads(cleaned[start : end + 1])
        except json.JSONDecodeError as err:
            raise Agent2ResponseParseError(f"Failed to parse model JSON: {err}") from err


def _coerce_agent2_payload(payload: dict, idea: IdeaInput) -> dict:
    """Normalize near-miss model payloads into the expected Agent2Output schema."""
    normalized = dict(payload)
    normalized.setdefault("idea_id", str(idea.idea_index))
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
    if not settings.ollama_model:
        raise Agent2ConfigurationError("OLLAMA_MODEL is not configured")

    raw_text = _call_ollama(SYSTEM_PROMPT, build_user_prompt(idea))
    parsed = _extract_json_payload(raw_text)
    parsed = _coerce_agent2_payload(parsed, idea)

    try:
        return Agent2Output(**parsed)
    except ValidationError as err:
        raise Agent2ResponseParseError(
            f"Model response failed schema validation: {err}"
        ) from err


def process_batch(ideas: list[IdeaInput]) -> list[BatchResultItem]:
    """Run agent 2 over a list of ideas. Returns per-idea status for every input."""
    results: list[BatchResultItem] = []
    for idea in ideas:
        if idea.scores.overall < 5:
            results.append(
                BatchResultItem(
                    idea_index=idea.idea_index,
                    title=idea.title,
                    status=BatchResultStatus.SKIPPED,
                    skip_reason="overall score below threshold (5.0)",
                )
            )
            continue
        try:
            output = run_agent2(idea)
            results.append(
                BatchResultItem(
                    idea_index=idea.idea_index,
                    title=idea.title,
                    status=BatchResultStatus.SUCCESS,
                    output=output,
                )
            )
        except Agent2Error as exc:
            results.append(
                BatchResultItem(
                    idea_index=idea.idea_index,
                    title=idea.title,
                    status=BatchResultStatus.FAILED,
                    error=str(exc),
                )
            )
    return results
