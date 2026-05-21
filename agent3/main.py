from __future__ import annotations

from fastapi import FastAPI

from agent3.models import Agent3Request, Agent3Response
from agent3.prompts import SYSTEM_PROMPT, build_agent3_prompt
from agent3.service import Agent3Analyzer

app = FastAPI(
    title="Agent Service 3 - Market + Growth Agent",
    version="0.1.0",
    description="Marketability, competitor, GTM, growth experiment, ad, recommendation, and reality-check service.",
)

analyzer = Agent3Analyzer()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "agent3-market-growth"}


@app.post("/analyze", response_model=Agent3Response)
def analyze(request: Agent3Request) -> Agent3Response:
    return analyzer.analyze(request)


@app.post("/prompt")
def prompt(request: Agent3Request) -> dict[str, str]:
    """Expose the LLM prompt for debugging or orchestrator handoff."""
    return {
        "system": SYSTEM_PROMPT,
        "user": build_agent3_prompt(request),
    }
