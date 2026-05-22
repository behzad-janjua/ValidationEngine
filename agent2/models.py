from pydantic import BaseModel
from typing import Optional

# ── What Agent 1 sends you ──────────────────────────────────────────
class Scores(BaseModel):
    feasibility: float    # 0–10
    innovation: float     # 0–10
    impact: float         # 0–10
    marketability: float  # 0–10
    clarity: float        # 0–10
    overall: float        # 0–10

class IdeaInput(BaseModel):
    ideaIndex: int
    title: str
    scores: Scores
    summary: str
    target_user: Optional[str] = None
    problem: Optional[str] = None

# ── What Agent 2 adds ───────────────────────────────────────────────
class Critique(BaseModel):
    top_risks: list[str]          # exactly 3 items
    weaknesses: list[str]
    assumptions_to_validate: list[str]

class MVPPlan(BaseModel):
    phase_1: str
    phase_2: str
    phase_3: str
    estimated_timeline: str       # e.g. "3–6 months"
    key_resources_needed: list[str]

class Agent2Output(BaseModel):
    idea_id: str
    title: str
    critique: Critique
    mvp_plan: MVPPlan
    positioning_statement: str    # one sentence
    next_actions: list[str]       # top 3 concrete actions
    overall_viability: str        # "High" | "Medium" | "Low"
    viability_reason: str