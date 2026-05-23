from __future__ import annotations

from fastapi import FastAPI, HTTPException

from agents.agent2.models import Agent2Output, BatchResultItem, IdeaInput
from agents.agent2.service import (
    Agent2ConfigurationError,
    Agent2ProviderError,
    Agent2ResponseParseError,
    process_batch,
    run_agent2,
)
app = FastAPI(
    title="Agent Service 2 — Plan & Critique",
    description="Takes scored ideas from Agent 1 and returns MVP planning + critique.",
    version="1.0.0",
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "agent2-plan-critique"}


@app.post("/plan-and-critique", response_model=Agent2Output)
def plan_and_critique(idea: IdeaInput) -> Agent2Output:
    """Process a single idea. Accepts Agent 1's IdeaRating converted via to_agent2_input()."""
    try:
        return run_agent2(idea)
    except Agent2ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Agent2ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Agent2ResponseParseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/plan-and-critique/batch", response_model=list[BatchResultItem])
def plan_and_critique_batch(ideas: list[IdeaInput]) -> list[BatchResultItem]:
    """Process multiple ideas. Returns per-idea status; ideas with overall score < 5 are skipped."""
    try:
        return process_batch(ideas)
    except Agent2ConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Agent2ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
