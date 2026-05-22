import json

import pytest

from agents.agent2.models import Agent2Output, BatchResultStatus, IdeaInput
from agents.agent2.service import Agent2Error, process_batch, run_agent2


def test_run_agent2_coerces_near_miss_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    idea = IdeaInput(
        idea_index=123,
        title="AI invoice cleanup",
        summary="Automates invoice cleanup for small agencies",
        target_customer="small agencies",
        problem="messy invoices waste operations time",
        scores={"feasibility": 8.2, "innovation": 6.8, "impact": 7.5, "marketability": 7.5, "clarity": 8.0, "overall": 7.6},
    )

    payload = {
        "idea_id": "123",
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

    monkeypatch.setattr("agents.agent2.service.build_user_prompt", lambda _: "PROMPT")
    monkeypatch.setattr(
        "agents.agent2.service._call_ollama",
        lambda *_: f"```json\n{json.dumps(payload)}\n```",
    )

    response = run_agent2(idea)

    assert isinstance(response, Agent2Output)
    assert response.idea_id == "123"
    assert response.next_actions == ["Interview 5 agencies", "Prototype invoice parsing", "Measure time saved"]
    assert response.overall_viability == "High"
    assert response.viability_reason == "The workflow is narrow and validation is straightforward."


def test_process_batch_skips_low_quality_ideas_and_continues(monkeypatch: pytest.MonkeyPatch) -> None:
    low_quality = IdeaInput(
        idea_index=1,
        title="Low quality concept",
        summary="",
        scores={"feasibility": 2.0, "innovation": 3.0, "impact": 2.5, "marketability": 4.0, "clarity": 3.5, "overall": 3.0},
    )
    good_idea = IdeaInput(
        idea_index=2,
        title="Good concept",
        summary="",
        scores={"feasibility": 8.0, "innovation": 7.5, "impact": 8.5, "marketability": 7.0, "clarity": 8.0, "overall": 7.8},
    )
    failing_idea = IdeaInput(
        idea_index=3,
        title="Failing concept",
        summary="",
        scores={"feasibility": 9.0, "innovation": 8.5, "impact": 9.0, "marketability": 8.0, "clarity": 8.5, "overall": 8.6},
    )

    calls: list[str] = []

    def fake_run_agent2(idea: IdeaInput) -> Agent2Output:
        calls.append(idea.title)
        if idea.title == "Failing concept":
            raise Agent2Error("upstream failure")

        return Agent2Output(
            idea_id=str(idea.idea_index),
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

    monkeypatch.setattr("agents.agent2.service.run_agent2", fake_run_agent2)

    results = process_batch([low_quality, good_idea, failing_idea])

    assert calls == ["Good concept", "Failing concept"]
    assert len(results) == 3

    skipped = [r for r in results if r.status == BatchResultStatus.SKIPPED]
    succeeded = [r for r in results if r.status == BatchResultStatus.SUCCESS]
    failed = [r for r in results if r.status == BatchResultStatus.FAILED]

    assert len(skipped) == 1
    assert len(succeeded) == 1
    assert len(failed) == 1
    assert succeeded[0].output.idea_id == "2"
    assert succeeded[0].output.title == "Good concept"
    assert "upstream failure" in failed[0].error
