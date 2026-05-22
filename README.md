# ValidationEngine

ValidationEngine is a stage-gated idea validation workflow with three planned
agents, a UI, and an orchestrator. This repo currently focuses only on the
service you are working on: **Agent Service 3, the Market + Growth Agent**.

Agent 3 takes an idea plus upstream evaluation/planning context and produces
marketability checks, inferred competitor pressure, GTM channels, growth
experiments, advertisement angles, product launch marketing notifications, a
final recommendation, and a reality check.

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
- Email/SMS product launch marketing notifications
- Pingram campaign delivery for an opted-in launch audience
- Unsubscribe and opt-out tracking
- Campaign tracking
- Final recommendation
- Reality check

It is implemented as a FastAPI service in `agents/agent3/`. The current analyzer is
deterministic so the service can run locally without an LLM key. The prompt
contract is available in `agents/agent3/prompts.py` and exposed at `/prompt` so an
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
uvicorn agents.agent3.main:app --reload
```

Create a local `.env` from the example when you need provider keys:

```bash
cp .env.example .env
```

Supported environment variables:

- `GOOGLE_CLOUD_API_KEY`: reserved for the future Google-backed LLM adapter.
- `GOOGLE_CLOUD_PROJECT`: optional Google Cloud project id.
- `PINGRAM_API_KEY`: Pingram server API key for sending email/SMS.
- `PINGRAM_EMAIL_TYPE`: Pingram notification type for Agent 3 emails.
- `PINGRAM_SMS_TYPE`: Pingram notification type for Agent 3 SMS.
- `PINGRAM_SENDER_NAME`: optional email sender display name.
- `PINGRAM_SENDER_EMAIL`: optional sender email address configured in Pingram.
- `PINGRAM_DRY_RUN`: keep `true` in development; set `false` only when real
  messages should be allowed.

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
      "launch_url": "https://example.com/early-access",
      "risk_tolerance": "medium"
    },
    "user_input": {
      "notes": "This is going first to our internal launch audience.",
      "preferred_tone": "clear, practical, and early-access focused",
      "must_include": ["early access", "billing errors"],
      "must_avoid": ["guaranteed savings"]
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
- `constraints`: timeline, budget, team size, geography, launch URL, allowed
  channels, and risk tolerance.
- `user_input`: optional human guidance for tone, must-include phrases,
  must-avoid phrases, and launch notes.

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
- `marketing_notifications`: ready-to-send product launch email and SMS drafts.
- `final_recommendation`: launch, validate first, pivot, or park.
- `reality_check`: assumptions, fastest validation test, kill criteria, and risks.
- `next_actions`: immediate execution checklist.

## Marketing Delivery

Agent 3 can produce product launch email/SMS drafts as part of `/analyze`. These
are intended for notifying opted-in users that a new product is available or
opening early access. To preview or send one through Pingram, call:

```bash
curl -X POST http://127.0.0.1:8000/marketing/send \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "name": "Ada",
      "email": "ada@example.com",
      "marketing_consent": true
    },
    "message": {
      "channel": "email",
      "type": "agent3_product_launch_email",
      "audience": "small agencies",
      "subject": "New: AI invoice cleanup is opening early access",
      "body": "AI invoice cleanup is opening early access for small agencies.",
      "html": "<p>AI invoice cleanup is opening early access for small agencies.</p>",
      "cta": "Join early access",
      "compliance_note": "Send only to users who opted in to receive product or marketing updates."
    },
    "dry_run": true
  }'
```

For SMS, use `"channel": "sms"` and provide `contact.phone_number` in E.164
format, for example `+14165550123`.

By default, requests are dry runs. To send real marketing messages, configure
`PINGRAM_API_KEY`, set `PINGRAM_DRY_RUN=false`, send the request with
`"dry_run": false`, and make sure `contact.marketing_consent` is `true`.

## Launch Campaigns

For the initial launch audience, Agent 3 can create the marketing message and
send it to a provided list of contacts in one call:

```bash
curl -X POST http://127.0.0.1:8000/campaigns/create-and-send \
  -H "Content-Type: application/json" \
  --data @examples/marketing_campaign_create_and_send.json
```

The example uses three opted-in team contacts and `dry_run: true`. Set
`dry_run: false` only when `PINGRAM_API_KEY` is configured and you want Pingram
to send real messages.

Campaign tracking endpoints:

- `GET /campaigns`: list campaign summaries.
- `GET /campaigns/{campaign_id}`: inspect a campaign and per-contact delivery
  results.
- `POST /marketing/opt-out`: record an email or phone number opt-out.
- `GET /marketing/opt-out`: unsubscribe-link compatible opt-out endpoint.
- `GET /marketing/opt-outs`: list recorded opt-outs.

Campaign and opt-out tracking is in memory for this Agent 3 MVP. The future
orchestrator should back these records with a database before production use.

Opt-out handling:

- Real sends require `marketing_consent: true`.
- Contacts marked `opted_out: true` are skipped.
- Contacts recorded through `/marketing/opt-out` are skipped in future campaigns.
- Email payloads include an unsubscribe footer.
- SMS payloads include an opt-out instruction or URL.

## Examples

- `examples/agent3_request.json`: `/analyze` payload with user input.
- `examples/agent3_response_excerpt.json`: abbreviated response shape.
- `examples/marketing_campaign_create_and_send.json`: three-person launch
  audience campaign payload.
- `examples/marketing_send_sms.json`: single SMS marketing send payload.
- `examples/marketing_opt_out.json`: opt-out payload.

## Verify

```bash
pytest
```
