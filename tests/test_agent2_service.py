import json

import pytest

from agent2.models import Agent2Output, IdeaInput
from agent2.service import Agent2Error, process_batch, run_agent2


def test_run_agent2_coerces_near_miss_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    idea = IdeaInput(
        idea_id="idea-123",
        title="AI invoice cleanup",
        summary="Automates invoice cleanup for small agencies",
        target_user="small agencies",
        problem="messy invoices waste operations time",
        feasibility_score=82,
        innovation_score=68,
        marketability_score=75,
    )

    payload = {
        "idea_id": "idea-123",
        "title": "AI invoice cleanup",
        "critique": {
            "top_risks": ["Low willingness to pay", "Integration complexity", "Generic positioning"],
            "weaknesses": ["Limited differentiation"],
            "assumptions_to_validate": ["Users want automation", "Invoices are repetitive"],
        },
        "mvp_plan": {
            "phase_1": "Validate demand",
            "phase_2": "Prototype cleanup workflow",
            "phase_3": "Pilot with agencies",
            "estimated_timeline": "6-8 weeks",
            "key_resources_needed": ["Python backend", "Prompt engineering"],
        },
        "positioning_statement": "Automate invoice cleanup for busy agencies.",
        "next_steps": ["Interview 5 agencies", "Prototype invoice parsing", "Measure time saved"],
        "viability_rating": "High",
        "rationale": "The workflow is narrow and validation is straightforward.",
    }

    monkeypatch.setattr("agent2.service.settings.model", "llama3.1")
    monkeypatch.setattr("agent2.service.build_user_prompt", lambda _: "PROMPT")
    monkeypatch.setattr("agent2.service._call_ollama", lambda *_: f"```json\n{json.dumps(payload)}\n```")

    response = run_agent2(idea)

    assert isinstance(response, Agent2Output)
    assert response.idea_id == "idea-123"
    assert response.next_actions == ["Interview 5 agencies", "Prototype invoice parsing", "Measure time saved"]
    assert response.overall_viability == "High"
    assert response.viability_reason == "The workflow is narrow and validation is straightforward."


def test_process_batch_skips_low_quality_ideas_and_continues(monkeypatch: pytest.MonkeyPatch) -> None:
    low_quality = IdeaInput(
        idea_id="low-1",
        title="Low quality concept",
        summary="",
        target_user="",
        problem="",
        feasibility_score=20,
        innovation_score=30,
        marketability_score=40,
    )
    good_idea = IdeaInput(
        idea_id="good-1",
        title="Good concept",
        summary="",
        target_user="",
        problem="",
        feasibility_score=80,
        innovation_score=75,
        marketability_score=70,
    )
    failing_idea = IdeaInput(
        idea_id="good-2",
        title="Failing concept",
        summary="",
        target_user="",
        problem="",
        feasibility_score=90,
        innovation_score=85,
        marketability_score=80,
    )

    calls: list[str] = []

    def fake_run_agent2(idea: IdeaInput) -> Agent2Output:
        calls.append(idea.title)
        if idea.title == "Failing concept":
            raise Agent2Error("upstream failure")

        return Agent2Output(
            idea_id=idea.idea_id,
            title=idea.title,
            critique={
                "top_risks": ["risk-1", "risk-2", "risk-3"],
                "weaknesses": ["weakness"],
                "assumptions_to_validate": ["assumption"],
            },
            mvp_plan={
                "phase_1": "Validate",
                "phase_2": "Build",
                "phase_3": "Pilot",
                "estimated_timeline": "4 weeks",
                "key_resources_needed": ["Backend"],
            },
            positioning_statement="A focused concept for testing.",
            next_actions=["Talk to users", "Build prototype", "Measure interest"],
            overall_viability="Medium",
            viability_reason="Needs validation.",
        )

    monkeypatch.setattr("agent2.service.run_agent2", fake_run_agent2)

    results = process_batch([low_quality, good_idea, failing_idea])

    assert calls == ["Good concept", "Failing concept"]
    assert len(results) == 1
    assert results[0].idea_id == "good-1"
    assert results[0].title == "Good concept"
