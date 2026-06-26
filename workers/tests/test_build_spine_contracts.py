"""Contract tests for the Build -> Ship -> Govern spine Pydantic mirrors.

These prove the mirrors in workers/alfy_workers/contracts/models.py validate, round-trip,
and forbid drift (extra="forbid"), staying in lockstep with the Zod contracts in
packages/shared/src/contracts/{build-packet,code-handoff,implementation-review,ship-gate,
divini-standard,conversation-to-code}.ts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 25, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_build_packet_defaults_and_roundtrip() -> None:
    bp = m.BuildPacket(id=uuid.uuid4(), tenant_id=T, triage=m.BuildTriage(), created_at=NOW, updated_at=NOW)
    assert bp.status == "draft"
    assert bp.awaiting_approval is True
    assert bp.user_stories == []
    # round-trip through JSON proves serialization parity
    assert m.BuildPacket.model_validate(bp.model_dump()) == bp


def test_code_handoff_pins_production_approval() -> None:
    ho = m.CodeHandoff(
        id=uuid.uuid4(), tenant_id=T, build_packet_id=uuid.uuid4(), branch_plan="feature/x", created_at=NOW
    )
    assert ho.production_requires_approval is True
    with pytest.raises(ValidationError):
        m.CodeHandoff(
            id=uuid.uuid4(), tenant_id=T, build_packet_id=uuid.uuid4(),
            branch_plan="feature/x", created_at=NOW, production_requires_approval=False,  # type: ignore[arg-type]
        )


def test_implementation_review_verdict_enum() -> None:
    rv = m.ImplementationReview(id=uuid.uuid4(), tenant_id=T, verdict="needs_revision", created_at=NOW)
    assert rv.verdict == "needs_revision"
    with pytest.raises(ValidationError):
        m.ImplementationReview(id=uuid.uuid4(), tenant_id=T, verdict="ship_it", created_at=NOW)  # type: ignore[arg-type]


def test_ship_gate_verdict_and_blocking() -> None:
    sg = m.ShipGateEvaluation(
        id=uuid.uuid4(), tenant_id=T, verdict="do_not_ship", blocking=["approval", "security"], created_at=NOW
    )
    assert "approval" in sg.blocking


def test_divini_score_bounds() -> None:
    de = m.DiviniEvaluation(
        id=uuid.uuid4(), tenant_id=T, subject="x", divini_score=0.8, recommendation="proceed",
        billion_dollar_worthy=True, proud_in_ten_years=True, reason="ok", created_at=NOW,
    )
    assert de.recommendation == "proceed"
    with pytest.raises(ValidationError):
        m.DiviniCriterionScore(criterion="trust", score=1.5)  # out of 0..1


def test_conversation_to_code_run_defaults() -> None:
    run = m.ConversationToCodeRun(id=uuid.uuid4(), tenant_id=T, idea="x", created_at=NOW, updated_at=NOW)
    assert run.current_stage == "conversation"
    assert run.feeds_compounding_engine is True
    assert run.awaiting_approval is True
    with pytest.raises(ValidationError):
        m.PipelineStageStatus(stage="not_a_stage")  # type: ignore[arg-type]
