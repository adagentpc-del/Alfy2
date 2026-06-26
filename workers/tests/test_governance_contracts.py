"""Contract tests for the Wave 3 (governance, monitoring, reuse) Pydantic mirrors.

Covers future-me, optionality, executive-thought-partner, capability-monitor, tech-stack-evaluator,
and build-once-reuse — validate, round-trip, and forbid drift.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 25, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_future_me_verdict_and_bounds() -> None:
    a = m.FutureMeAssessment(
        id=uuid.uuid4(), tenant_id=T, decision="x", signals=m.FutureSignals(),
        regret_risk=0.2, verdict="future_alyssa_thanks_you", reason="ok", created_at=NOW,
    )
    assert a.verdict == "future_alyssa_thanks_you"
    assert m.FutureMeAssessment.model_validate(a.model_dump()) == a
    with pytest.raises(ValidationError):
        m.FutureSignals(future_thanks=2)


def test_optionality_requires_a_path() -> None:
    p = m.OptionalityPath(path="ship now")
    a = m.AssessOptionalityInput(decision="x", paths=[p])
    assert a.paths[0].path == "ship now"
    with pytest.raises(ValidationError):
        m.AssessOptionalityInput(decision="x", paths=[])  # min_length=1


def test_thought_partner_stance_enum() -> None:
    r = m.ThoughtPartnerResponse(id=uuid.uuid4(), tenant_id=T, proposition="x", stance="challenge", reasoning="why", created_at=NOW)
    assert r.stance == "challenge"
    with pytest.raises(ValidationError):
        m.ThoughtPartnerResponse(id=uuid.uuid4(), tenant_id=T, proposition="x", stance="agree", reasoning="why", created_at=NOW)  # type: ignore[arg-type]


def test_capability_priority_enum() -> None:
    rep = m.CapabilityReport(
        id=uuid.uuid4(), tenant_id=T, capability="vision", impact=m.CapabilityImpact(),
        business_impact="cuts a tool", priority="now", created_at=NOW,
    )
    assert rep.priority == "now"
    with pytest.raises(ValidationError):
        m.CapabilityReport(id=uuid.uuid4(), tenant_id=T, capability="x", impact=m.CapabilityImpact(), business_impact="y", priority="maybe", created_at=NOW)  # type: ignore[arg-type]


def test_stack_evaluation_enums() -> None:
    e = m.StackEvaluation(
        id=uuid.uuid4(), tenant_id=T, component="render", category="render", signals=m.StackSignals(),
        disposition="wait", has_measurable_benefit=False, reason="no benefit", created_at=NOW,
    )
    assert e.disposition == "wait"
    with pytest.raises(ValidationError):
        m.StackEvaluation(id=uuid.uuid4(), tenant_id=T, component="x", category="render", signals=m.StackSignals(), disposition="rewrite", has_measurable_benefit=False, reason="y", created_at=NOW)  # type: ignore[arg-type]


def test_reuse_assessment_kinds() -> None:
    a = m.ReuseAssessment(
        id=uuid.uuid4(), tenant_id=T, module="ship-gate", reusable=True,
        targets=["founderos", "another_business"], package_as=["component", "playbook"], reason="generic", created_at=NOW,
    )
    assert "founderos" in a.targets
    with pytest.raises(ValidationError):
        m.AssessReuseInput(module="x", targets=["mars_colony"])  # type: ignore[list-item]
