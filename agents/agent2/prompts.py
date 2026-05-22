from __future__ import annotations

from agents.agent2.models import IdeaInput

SYSTEM_PROMPT = """
You are a product planning and critique agent for an enterprise innovation team.
You review shortlisted business ideas that have already passed an initial validation filter.

Your job is to return a structured assessment covering:
1. Honest critique — risks, weaknesses, and assumptions that must be validated
2. A practical 3-phase MVP launch plan
3. A one-sentence positioning statement
4. The top 3 concrete next actions the team should take this week
5. An overall viability rating: High, Medium, or Low — with a one-line reason

Rules:
- Be direct and practical. No filler or motivational language.
- Do not invent technical features that are not implied by the idea.
- Risks must be specific to THIS idea, not generic startup risks.
- Return valid JSON only. No markdown. No preamble. No explanation outside the JSON.
""".strip()


def build_user_prompt(idea: IdeaInput) -> str:
    target = idea.target_customer or "Not specified"
    problem = idea.problem or "Not specified"
    return f"""
Review this shortlisted idea and return a JSON object matching this exact structure:
{{
  "idea_id": "<string>",
  "title": "<string>",
  "critique": {{
    "top_risks": ["<string>", "<string>", "<string>"],
    "weaknesses": ["<string>", ...],
    "assumptions_to_validate": ["<string>", ...]
  }},
  "mvp_plan": {{
    "phase_1": "<string>",
    "phase_2": "<string>",
    "phase_3": "<string>",
    "estimated_timeline": "<string>",
    "key_resources_needed": ["<string>", ...]
  }},
  "positioning_statement": "<string>",
  "next_actions": ["<string>", "<string>", "<string>"],
  "overall_viability": "High" | "Medium" | "Low",
  "viability_reason": "<string>"
}}

Idea details:
  Title:               {idea.title}
  Summary:             {idea.summary}
  Target customer:     {target}
  Problem it solves:   {problem}
  Feasibility score:   {idea.scores.feasibility}/10
  Innovation score:    {idea.scores.innovation}/10
  Impact score:        {idea.scores.impact}/10
  Marketability score: {idea.scores.marketability}/10
  Clarity score:       {idea.scores.clarity}/10
  Overall score:       {idea.scores.overall}/10
""".strip()
