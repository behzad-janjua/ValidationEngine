# ValidationEngine

ValidationEngine is a stage-gated idea validation workflow with three planned
agents, a UI, and an orchestrator. This repo currently focuses only on the
service you are working on: **Agent Service 3, the Market + Growth Agent**.

Agent 3 takes an idea plus upstream evaluation/planning context and produces
marketability checks, inferred competitor pressure, GTM channels, growth
experiments, advertisement angles, a final recommendation, and a reality check.

The goal is speed: get the idea in front of real customers as fast as possible,
then use evidence instead of vibes to decide whether to build, pivot, or stop.

## Agent Service 3

Agent 3 focuses only on the market and growth layer. It does not parse Excel,
score feasibility/innovation, build the UI, or run the full workflow. Those are
owned by the other agents and orchestrator.

Owned by Agent 3:

- Marketability check
- Competitor scan
- Go-to-market channels
- Growth experiments
- Advertisement help
- Final recommendation
- Reality check

It is implemented as a FastAPI service in `agent3/`. The current analyzer is
deterministic so the service can run locally without an LLM key. The prompt
contract is available in `agent3/prompts.py` and exposed at `/prompt` so an
orchestrator can route the same schema to an LLM-backed implementation later.

## Workflow Boundary

Expected future flow:

1. UI uploads an Excel file.
2. Orchestrator sends each normalized idea through Agents 1 and 2.
3. Orchestrator calls Agent 3 with the idea, Agent 1 evaluation, Agent 2 planning,
   and launch constraints.
4. Agent 3 returns market/growth execution output for the final report.

This service only owns step 3's market/growth analysis response.

## Run Locally

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
uvicorn agent3.main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Analyze an idea:

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "idea": {
      "row_id": "7",
      "title": "AI invoice cleanup for agencies",
      "description": "An AI workflow that helps agencies clean up messy client invoices faster and reduce billing errors.",
      "target_customer": "small agencies",
      "problem": "messy client invoices waste operations time",
      "solution": "automated invoice cleanup workflow",
      "category": "B2B SaaS",
      "price_point": "$49 per month"
    },
    "constraints": {
      "timeline_days": 14,
      "budget_usd": 500,
      "team_size": 1,
      "risk_tolerance": "medium"
    }
  }'
```

## API Contract

`POST /analyze`

Request:

- `idea`: normalized idea from the Excel row.
- `evaluation`: optional Agent 1 feasibility, innovation, marketability, critique,
  and clarification output.
- `planning`: optional Agent 2 launch plan, positioning, ad copy, content calendar,
  and messaging output.
- `constraints`: timeline, budget, team size, geography, allowed channels, and
  risk tolerance.

Response:

- `scorecard`: marketability, speed to market, differentiation, distribution fit,
  monetization confidence, and risk.
- `marketability_check`: target customer, pain level, demand signals, blockers,
  and strongest message angle.
- `competitor_scan`: inferred competitor/status-quo pressure and differentiation
  opportunities.
- `gtm_channels`: prioritized channels with first tests and success metrics.
- `growth_experiments`: concrete validation experiments with budget, duration,
  metrics, and decision rules.
- `advertisement_help`: platform-ready ad angles and CTAs.
- `final_recommendation`: launch, validate first, pivot, or park.
- `reality_check`: assumptions, fastest validation test, kill criteria, and risks.
- `next_actions`: immediate execution checklist.

## Verify

```bash
pytest
```
