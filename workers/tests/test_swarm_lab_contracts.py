"""Contract tests for the Swarm Lab Pydantic mirrors (swarm-lab.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()
R = uuid.uuid4()


def test_swarm_run_defaults() -> None:
    run = m.SwarmRun(id=uuid.uuid4(), tenant_id=T, objective="explore X", created_at=NOW)
    assert run.status == "draft"
    assert run.department_key == "research_development"
    assert run.permission_scope == "draft_only"
    assert run.agent_count == 8
    assert run.packet_id is None
    assert m.SwarmRun.model_validate(run.model_dump()) == run
    with pytest.raises(ValidationError):
        m.SwarmRun(id=uuid.uuid4(), tenant_id=T, objective="x", mode="telepathy", created_at=NOW)  # type: ignore[arg-type]


def test_start_input_and_bounds() -> None:
    i = m.StartSwarmRunInput(objective="20 ideas")
    assert i.agent_count == 8
    with pytest.raises(ValidationError):
        m.StartSwarmRunInput(objective="x", agent_count=99)  # > 50


def test_candidate_score_bounds() -> None:
    c = m.SwarmCandidate(id=uuid.uuid4(), tenant_id=T, run_id=R, agent_label="swarm-agent-1", created_at=NOW)
    assert 0 <= c.score <= 1
    assert m.SwarmCandidate.model_validate(c.model_dump()) == c
    with pytest.raises(ValidationError):
        m.SwarmCandidate(id=uuid.uuid4(), tenant_id=T, run_id=R, agent_label="a", score=2, created_at=NOW)


def test_cluster_and_report() -> None:
    cl = m.SwarmCluster(id=uuid.uuid4(), tenant_id=T, run_id=R, theme="fastest", pick=True, rank=1, created_at=NOW)
    assert cl.pick is True
    rep = m.SwarmReport(id=uuid.uuid4(), tenant_id=T, run_id=R, created_at=NOW)
    assert rep.escalated is False
    assert rep.top_candidate_ids == []
