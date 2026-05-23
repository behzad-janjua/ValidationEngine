from __future__ import annotations

from agents.agent3.models import Agent3Request


SYSTEM_PROMPT = """You are the Market + Growth analyst: Step 3 of an idea validation pipeline.

Mission:
- Help a founder get an idea into the market as fast as possible.
- Pressure-test marketability, distribution, competition, and launch risk.
- Produce concrete go-to-market channels, growth experiments, ad angles,
  product launch marketing notifications, final recommendation, and a reality check.

Operating style:
- Think like a Growth Hacker: find the fastest channel nobody is exploiting yet,
  optimize for measurable acquisition, and design experiments with decision rules.
- Think like a Content Creator: turn positioning into compelling platform-native
  copy, hooks, stories, and calls to action.
- Be direct. If the idea is weak, say what to validate before building.
- Prefer fast tests, landing pages, waitlists, concierge pilots, direct outreach,
  creator tests, communities, and paid micro-tests over large brand campaigns.
- Draft email/SMS marketing notifications for opted-in users when the product is
  ready for early access or launch.
- Do not invent live facts. If live competitor research was not provided, label
  competitor output as inferred competitor archetypes and suggest verification.
- Never use the word "Agent" in any output text. Never call any part of this process "Agent 1", "Agent 2", or "Agent 3". If you must reference prior steps, call them "Step 1" (evaluation) and "Step 2" (planning). If you must reference this analysis, call it "Step 3".
"""


USER_PROMPT_TEMPLATE = """Analyze this idea for market and growth execution.

Idea:
{idea}

Step 1 evaluation:
{evaluation}

Step 2 planning:
{planning}

Constraints:
{constraints}

User input:
{user_input}

Return ONLY valid JSON matching this exact structure (no markdown, no preamble):
{{
  "scorecard": {{
    "marketability": 0,
    "speed_to_market": 0,
    "differentiation": 0,
    "distribution_fit": 0,
    "monetization_confidence": 0,
    "risk": 0
  }},
  "marketability_check": {{
    "score": 0,
    "target_customer": "string",
    "pain_level": "high|medium|low",
    "demand_signals": ["string"],
    "adoption_blockers": ["string"],
    "strongest_message_angle": "string"
  }},
  "competitor_scan": [
    {{
      "name": "string",
      "category": "string",
      "why_it_matters": "string",
      "differentiation_opportunity": "string"
    }}
  ],
  "gtm_channels": [
    {{
      "name": "string",
      "priority": "high|medium|low",
      "rationale": "string",
      "first_test": "string",
      "success_metric": "string",
      "estimated_effort": "string"
    }}
  ],
  "growth_experiments": [
    {{
      "name": "string",
      "priority": "high|medium|low",
      "hypothesis": "string",
      "audience": "string",
      "steps": ["string"],
      "duration_days": 7,
      "budget_usd": 0,
      "success_metric": "string",
      "decision_rule": "string"
    }}
  ],
  "advertisement_help": [
    {{
      "channel": "string",
      "headline": "string",
      "primary_text": "string",
      "cta": "string"
    }}
  ],
  "marketing_notifications": [
    {{
      "channel": "email",
      "type": "agent3_product_launch_email",
      "audience": "string",
      "subject": "string",
      "body": "string",
      "cta": "string",
      "compliance_note": "string"
    }},
    {{
      "channel": "sms",
      "type": "agent3_product_launch_sms",
      "audience": "string",
      "body": "string",
      "cta": "string",
      "compliance_note": "string"
    }}
  ],
  "final_recommendation": {{
    "verdict": "launch|validate_first|pivot|park",
    "confidence": 0,
    "rationale": "string",
    "launch_window_days": 14
  }},
  "reality_check": {{
    "biggest_assumption": "string",
    "fastest_validation_test": "string",
    "kill_criteria": ["string"],
    "key_risks": ["string"]
  }},
  "next_actions": ["string"],
  "notes": ["string"]
}}

Rules:
- All scorecard values must be integers 0-100. risk means launch risk (higher = riskier).
- Provide 3-5 competitors in competitor_scan.
- Provide 3-5 gtm_channels ordered by priority.
- Provide 3-4 growth_experiments; duration_days 1-90, budget_usd >= 0.
- Provide 3 advertisement_help items.
- final_recommendation.confidence must be 0-100, launch_window_days 1-180.
- verdict must be exactly one of: launch, validate_first, pivot, park.
- priority must be exactly one of: high, medium, low.
- channel must be exactly one of: email, sms.
"""


def build_agent3_prompt(request: Agent3Request) -> str:
    """Builds a compact prompt for an LLM-backed Agent 3 implementation."""
    return USER_PROMPT_TEMPLATE.format(
        idea=request.idea.model_dump_json(indent=2),
        evaluation=request.evaluation.model_dump_json(indent=2) if request.evaluation else "null",
        planning=request.planning.model_dump_json(indent=2) if request.planning else "null",
        constraints=request.constraints.model_dump_json(indent=2),
        user_input=request.user_input.model_dump_json(indent=2) if request.user_input else "null",
    )
