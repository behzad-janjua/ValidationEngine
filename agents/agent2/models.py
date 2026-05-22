from __future__ import annotations

from enum import StrEnum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Scores(BaseModel):
    feasibility: float    # 0–10
    innovation: float     # 0–10
    impact: float         # 0–10
    marketability: float  # 0–10
    clarity: float        # 0–10
    overall: float        # 0–10


class IdeaInput(BaseModel):
    """What Agent 1 sends to Agent 2."""

    idea_index: int
    title: str
    scores: Scores
    summary: str
    target_customer: Optional[str] = None
    problem: Optional[str] = None


class Critique(BaseModel):
    top_risks: list[str] = Field(..., min_length=3, max_length=3)
    weaknesses: list[str]
    assumptions_to_validate: list[str]


class MVPPlan(BaseModel):
    phase_1: str
    phase_2: str
    phase_3: str
    estimated_timeline: str            # e.g. "3–6 months"
    key_resources_needed: list[str]


class Agent2Output(BaseModel):
    """What Agent 2 returns — consumed by Agent 3 via to_agent3_planning()."""

    idea_id: str
    title: str
    critique: Critique
    mvp_plan: MVPPlan
    positioning_statement: str
    next_actions: list[str] = Field(..., min_length=3, max_length=3)
    overall_viability: Literal["High", "Medium", "Low"]
    viability_reason: str


class BatchResultStatus(StrEnum):
    SUCCESS = "success"
    SKIPPED = "skipped"
    FAILED = "failed"


class BatchResultItem(BaseModel):
    idea_index: int
    title: str
    status: BatchResultStatus
    output: Agent2Output | None = None
    error: str | None = None
    skip_reason: str | None = None

    def to_agent3_planning(self) -> dict:
        """Convert to the Agent2Planning shape that Agent 3 expects."""
        return {
            "launch_plan": [
                self.mvp_plan.phase_1,
                self.mvp_plan.phase_2,
                self.mvp_plan.phase_3,
            ],
            "positioning": self.positioning_statement,
            "next_actions": self.next_actions,
            "overall_viability": self.overall_viability,
            "viability_reason": self.viability_reason,
            "top_risks": self.critique.top_risks,
            "ad_copy_suggestions": [],
            "content_calendar": [],
            "messaging": [],
        }
