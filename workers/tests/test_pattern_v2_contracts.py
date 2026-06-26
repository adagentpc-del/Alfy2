"""Lockstep tests for the extended Pattern Engine contracts (the four new report fields).

These mirror the extensions in `packages/shared/src/contracts/pattern-engine.ts`
(canonical): the additional BehaviorSignal members and the Strength /
RepeatingMistake / SuccessfulHabit / ScheduleRec models populated on PatternReport.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import BehaviorObservation, PatternReport


def test_pattern_report_with_new_fields_validates() -> None:
    report = PatternReport.model_validate(
        {
            "id": "11111111-1111-4111-8111-111111111111",
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "generated_at": "2026-06-25T12:00:00.000Z",
            "window": {
                "from": "2026-05-25T00:00:00.000Z",
                "to": "2026-06-25T00:00:00.000Z",
                "observation_count": 42,
            },
            "patterns": [],
            "bottlenecks": [],
            "strengths": [
                {
                    "area": "follow_up",
                    "summary": "Consistent next-day follow-ups",
                    "explanation": "Follow-ups within 24h correlate with closed deals.",
                    "evidence_count": 12,
                }
            ],
            "repeating_mistakes": [
                {
                    "area": "calendar",
                    "summary": "Back-to-back meetings with no buffer",
                    "explanation": "Recurring overruns push deep work out of the day.",
                    "occurrences": 7,
                    "severity": "medium",
                }
            ],
            "successful_habits": [
                {
                    "habit": "Morning deep work block",
                    "summary": "Protected 9-11am focus block",
                    "explanation": "Output peaks in the protected morning window.",
                    "consistency": 0.85,
                }
            ],
            "schedule_recommendations": [
                {
                    "title": "Add buffers between meetings",
                    "change": "Insert 15-minute gaps between back-to-back calls.",
                    "explanation": "Buffers absorb overruns and protect focus.",
                    "addresses": "calendar",
                }
            ],
            "recommended_automations": [],
            "recommended_agents": [],
            "workflow_improvements": [],
            "summary": "Strong follow-up habits; calendar packing is the main friction.",
            "advisory_only": True,
        }
    )
    assert len(report.strengths) == 1
    assert report.repeating_mistakes[0].severity == "medium"
    assert report.successful_habits[0].consistency == 0.85
    assert report.schedule_recommendations[0].addresses == "calendar"


def test_behavior_observation_accepts_focus_signal() -> None:
    obs = BehaviorObservation.model_validate(
        {"at": "2026-06-25T12:00:00.000Z", "signal": "focus"}
    )
    assert obs.signal == "focus"


def test_behavior_observation_rejects_unknown_signal() -> None:
    with pytest.raises(ValidationError):
        BehaviorObservation.model_validate(
            {"at": "2026-06-25T12:00:00.000Z", "signal": "telepathy"}
        )
