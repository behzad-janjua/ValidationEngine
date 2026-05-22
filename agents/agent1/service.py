from __future__ import annotations

import json
import re

import httpx

from agents.agent1.config import Settings
from agents.agent1.models import (
    AnalysisResult,
    CategoryTop,
    IdeaRating,
    TopByCategory,
    TopIdeaRef,
)

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

_CRITERIA = ["feasibility", "innovation", "impact", "marketability", "clarity"]

_PROMPT_TEMPLATE = """\
You are a hackathon judge. Analyze the following ideas and rate EACH one on a \
scale of 1-10 for these 5 criteria:
- Feasibility: Can it realistically be built?
- Innovation: How unique and creative is it?
- Impact: What positive difference can it make?
- Marketability: Can it sell or scale in the market?
- Clarity: Is the idea well-defined and clearly articulated?

Ideas:
{ideas_text}

Respond ONLY with valid JSON in this exact structure:
{{
  "ratings": [
    {{
      "ideaIndex": 1,
      "title": "short title of the idea",
      "feasibility": 7,
      "innovation": 8,
      "impact": 6,
      "marketability": 7,
      "clarity": 9,
      "overall": 7.4,
      "summary": "one line summary of reasoning",
      "clarificationQuestions": ["What is the core monetization model?"],
      "critique": ["Target market is too broad for an MVP."]
    }}
  ],
  "top3Overall": [
    {{"ideaIndex": 1, "title": "...", "overall": 8.2, "reason": "..."}}
  ],
  "topByCategory": {{
    "feasibility": [{{"ideaIndex": 1, "title": "...", "score": 9, "reason": "..."}}],
    "innovation": [{{"ideaIndex": 2, "title": "...", "score": 9, "reason": "..."}}],
    "impact": [{{"ideaIndex": 3, "title": "...", "score": 9, "reason": "..."}}],
    "marketability": [{{"ideaIndex": 4, "title": "...", "score": 9, "reason": "..."}}],
    "clarity": [{{"ideaIndex": 5, "title": "...", "score": 9, "reason": "..."}}]
  }}
}}

top3Overall: best 3 ideas by overall average score.
topByCategory: best 2 ideas in each category.
clarificationQuestions: 1-3 questions that would sharpen the idea.
critique: 1-3 specific weaknesses or risks."""


class GeminiService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def analyze_ideas(self, ideas: list[dict]) -> AnalysisResult:
        prompt = self._build_prompt(ideas)
        raw = await self._call_gemini(prompt)
        return self._parse_response(raw)

    def _build_prompt(self, ideas: list[dict]) -> str:
        ideas_text = "\n".join(
            f"{i + 1}. {json.dumps(idea, ensure_ascii=False)}"
            for i, idea in enumerate(ideas)
        )
        return _PROMPT_TEMPLATE.format(ideas_text=ideas_text)

    async def _call_gemini(self, prompt: str) -> str:
        if not self.settings.gemini_api_key:
            raise ValueError(
                "Gemini API key is not set. Add GEMINI_API_KEY to your .env file."
            )

        url = f"{_GEMINI_URL.format(model=self.settings.gemini_model)}?key={self.settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": self.settings.max_output_tokens,
                "temperature": self.settings.temperature,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()

        data = response.json()

        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError(
                "Gemini returned no candidates. The prompt may have triggered a safety filter."
            )

        candidate = candidates[0]
        content = candidate.get("content")
        if not content:
            finish_reason = candidate.get("finishReason", "unknown")
            raise ValueError(
                f"Gemini candidate has no content (finishReason: {finish_reason}). "
                "The prompt may have been blocked by a safety filter."
            )

        parts = content.get("parts", [])
        if not parts:
            raise ValueError("Gemini candidate content has no parts.")

        return parts[0].get("text", "")

    def _parse_response(self, raw: str) -> AnalysisResult:
        cleaned = re.sub(r"```json\s*|```\s*", "", raw).strip()
        data = json.loads(cleaned)

        ratings = [
            IdeaRating(
                idea_index=r["ideaIndex"],
                title=r["title"],
                feasibility=r["feasibility"],
                innovation=r["innovation"],
                impact=r["impact"],
                marketability=r["marketability"],
                clarity=r["clarity"],
                overall=r["overall"],
                summary=r["summary"],
                clarification_questions=r.get("clarificationQuestions", []),
                critique=r.get("critique", []),
            )
            for r in data.get("ratings", [])
        ]

        top3_overall = [
            TopIdeaRef(
                idea_index=t["ideaIndex"],
                title=t["title"],
                overall=t["overall"],
                reason=t["reason"],
            )
            for t in data.get("top3Overall", [])
        ]

        tbc = data.get("topByCategory", {})
        top_by_category = TopByCategory(
            feasibility=self._parse_category_tops(tbc.get("feasibility", [])),
            innovation=self._parse_category_tops(tbc.get("innovation", [])),
            impact=self._parse_category_tops(tbc.get("impact", [])),
            marketability=self._parse_category_tops(tbc.get("marketability", [])),
            clarity=self._parse_category_tops(tbc.get("clarity", [])),
        )

        return AnalysisResult(
            ratings=ratings,
            top3_overall=top3_overall,
            top_by_category=top_by_category,
        )

    def _parse_category_tops(self, items: list[dict]) -> list[CategoryTop]:
        return [
            CategoryTop(
                idea_index=item["ideaIndex"],
                title=item["title"],
                score=item["score"],
                reason=item["reason"],
            )
            for item in items
        ]
