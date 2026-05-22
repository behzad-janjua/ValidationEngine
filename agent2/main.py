from fastapi import FastAPI, HTTPException
try:
    from .models import IdeaInput, Agent2Output
    from .service import (
        Agent2ConfigurationError,
        Agent2ProviderError,
        Agent2ResponseParseError,
        run_agent2,
        process_batch,
    )
except ImportError:
    from models import IdeaInput, Agent2Output
    from service import (
        Agent2ConfigurationError,
        Agent2ProviderError,
        Agent2ResponseParseError,
        run_agent2,
        process_batch,
    )

app = FastAPI(
    title="Agent 2 — Plan & Critique",
    description="Takes validated ideas from Agent 1 and returns planning + critique.",
    version="1.0.0"
)


@app.get("/health")
def health():
    return {"status": "ok", "agent": "2"}


@app.post("/plan-and-critique", response_model=Agent2Output)
def plan_and_critique(idea: IdeaInput):
    """
    Process a single idea. Called by Agent 1 or used directly for testing.
    """
    try:
        return run_agent2(idea)
    except Agent2ConfigurationError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Agent2ProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Agent2ResponseParseError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan-and-critique/batch", response_model=list[Agent2Output])
def plan_and_critique_batch(ideas: list[IdeaInput]):
    """
    Process multiple ideas at once. Main endpoint for the full pipeline.
    """
    try:
        return process_batch(ideas)
    except Agent2ConfigurationError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Agent2ProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))