from __future__ import annotations

from pydantic import BaseModel, Field


class IdeaRating(BaseModel):
    idea_index: int
    title: str
    feasibility: int = Field(..., ge=1, le=10)
    innovation: int = Field(..., ge=1, le=10)
    impact: int = Field(..., ge=1, le=10)
    marketability: int = Field(..., ge=1, le=10)
    clarity: int = Field(..., ge=1, le=10)
    overall: float
    summary: str
    clarification_questions: list[str] = Field(default_factory=list)
    critique: list[str] = Field(default_factory=list)

    def to_agent2_input(
        self,
        target_customer: str | None = None,
        problem: str | None = None,
    ) -> dict:
        """Convert to the IdeaInput shape Agent 2 expects.

        target_customer and problem come from the original spreadsheet row —
        they are not produced by the LLM scorer.
        """
        return {
            "idea_index": self.idea_index,
            "title": self.title,
            "scores": {
                "feasibility": self.feasibility,
                "innovation": self.innovation,
                "impact": self.impact,
                "marketability": self.marketability,
                "clarity": self.clarity,
                "overall": self.overall,
            },
            "summary": self.summary,
            "target_customer": target_customer,
            "problem": problem,
        }

    def to_agent3_evaluation(self) -> dict:
        """Convert to the Agent1Evaluation shape Agent 3 expects (0-100 scale)."""
        return {
            "feasibility_score": self.feasibility * 10,
            "innovation_score": self.innovation * 10,
            "impact_score": self.impact * 10,
            "marketability_score": self.marketability * 10,
            "clarity_score": self.clarity * 10,
            "clarification_questions": self.clarification_questions,
            "critique": self.critique,
        }


class TopIdeaRef(BaseModel):
    idea_index: int
    title: str
    overall: float
    reason: str


class CategoryTop(BaseModel):
    idea_index: int
    title: str
    score: int
    reason: str


class TopByCategory(BaseModel):
    feasibility: list[CategoryTop] = Field(default_factory=list)
    innovation: list[CategoryTop] = Field(default_factory=list)
    impact: list[CategoryTop] = Field(default_factory=list)
    marketability: list[CategoryTop] = Field(default_factory=list)
    clarity: list[CategoryTop] = Field(default_factory=list)


class AnalysisResult(BaseModel):
    ratings: list[IdeaRating]
    top3_overall: list[TopIdeaRef]
    top_by_category: TopByCategory


class AnalyzeResponse(BaseModel):
    total_ideas: int
    criteria: list[str] = ["feasibility", "innovation", "impact", "marketability", "clarity"]
    analysis: AnalysisResult


class UploadIdeasResponse(BaseModel):
    message: str
    count: int
    ideas: list[dict]
