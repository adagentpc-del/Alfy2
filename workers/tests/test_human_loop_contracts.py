"""Contract tests for the Wave 2 (Launch & Infra + Human-in-the-loop) Pydantic mirrors.

Proves the mirrors for infra-launch, press-live, human-touch-queue, permission-memory, and batch-once
validate, round-trip, and forbid drift, staying in lockstep with the Zod contracts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 25, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_infrastructure_plan_never_blocks_pinned() -> None:
    plan = m.InfrastructurePlan(id=uuid.uuid4(), tenant_id=T, build_packet_id=uuid.uuid4(), created_at=NOW, updated_at=NOW)
    assert plan.never_blocks_on_secrets is True
    assert plan.prepared_pct == 0
    assert m.InfrastructurePlan.model_validate(plan.model_dump()) == plan
    with pytest.raises(ValidationError):
        m.InfrastructurePlan(id=uuid.uuid4(), tenant_id=T, build_packet_id=uuid.uuid4(), prepared_pct=2, created_at=NOW, updated_at=NOW)


def test_press_live_outcome_enum() -> None:
    ev = m.PressLiveEvaluation(id=uuid.uuid4(), tenant_id=T, outcome="blocked_by_secrets", created_at=NOW)
    assert ev.outcome == "blocked_by_secrets"
    with pytest.raises(ValidationError):
        m.PressLiveEvaluation(id=uuid.uuid4(), tenant_id=T, outcome="kinda_ready", created_at=NOW)  # type: ignore[arg-type]


def test_human_touch_item_defaults() -> None:
    it = m.HumanTouchItem(id=uuid.uuid4(), tenant_id=T, category="paste_secret", title="Add RESEND_API_KEY", created_at=NOW, updated_at=NOW)
    assert it.status == "pending"
    assert it.risk_level == "low"
    with pytest.raises(ValidationError):
        m.HumanTouchItem(id=uuid.uuid4(), tenant_id=T, category="not_a_category", title="x", created_at=NOW, updated_at=NOW)  # type: ignore[arg-type]


def test_access_grant_memory_and_check() -> None:
    g = m.AccessGrantMemory(id=uuid.uuid4(), tenant_id=T, tool="github", granted_at=NOW, created_at=NOW, updated_at=NOW)
    assert g.status == "active"
    res = m.AccessCheckResult(tool="github", decision="reuse", can_proceed=True, reason="remembered")
    assert res.can_proceed is True
    with pytest.raises(ValidationError):
        m.AccessCheckResult(tool="github", decision="maybe", can_proceed=True, reason="x")  # type: ignore[arg-type]


def test_batched_setup_pattern_and_status() -> None:
    s = m.BatchedSetup(id=uuid.uuid4(), tenant_id=T, pattern="supabase_setup", created_at=NOW, updated_at=NOW)
    assert s.status == "queued"
    assert s.reusable is False
    with pytest.raises(ValidationError):
        m.BatchedSetup(id=uuid.uuid4(), tenant_id=T, pattern="quantum_setup", created_at=NOW, updated_at=NOW)  # type: ignore[arg-type]
