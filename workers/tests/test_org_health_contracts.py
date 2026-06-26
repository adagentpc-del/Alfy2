"""Contract tests for the Org Health / CODO mirrors (org-health.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_agent_wellness_snapshot_roundtrip() -> None:
    snap = m.AgentWellnessSnapshot(
        id=uuid.uuid4(), tenant_id=T, agent="copywriter",
        workload=3, waiting_tasks=1, avg_response_ms=1200.0, approval_delay_ms=0.0,
        failure_rate=0.1, handoff_success=0.9, context_size=8000, cost_per_run=0.05,
        token_efficiency=0.8, overloaded=False, recommendation="ok", created_at=NOW,
    )
    assert snap.recommendation == "ok"
    assert m.AgentWellnessSnapshot.model_validate(snap.model_dump()) == snap


def test_agent_wellness_bad_recommendation() -> None:
    with pytest.raises(ValidationError):
        m.AgentWellnessSnapshot(
            id=uuid.uuid4(), tenant_id=T, agent="x",
            workload=0, waiting_tasks=0, avg_response_ms=0.0, approval_delay_ms=0.0,
            failure_rate=0.0, handoff_success=1.0, context_size=0, cost_per_run=0.0,
            token_efficiency=1.0, overloaded=False,
            recommendation="fire_them",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_communication_audit_defaults_and_packet_optional() -> None:
    audit = m.CommunicationAudit(
        id=uuid.uuid4(), tenant_id=T, from_agent="a", to_agent="b",
        clarity=0.8, completeness=0.7, context=0.9, resource_availability=0.6,
        ambiguity=0.2, handoff_quality=0.8, business_awareness=0.9, goal_awareness=0.9,
        kpi_awareness=0.5, approval_awareness=1.0, score=0.75, created_at=NOW,
    )
    assert audit.packet_id is None
    assert audit.issues == []
    assert m.CommunicationAudit.model_validate(audit.model_dump()) == audit


def test_agent_correction_and_reports() -> None:
    corr = m.AgentCorrection(
        id=uuid.uuid4(), tenant_id=T, agent="researcher",
        failure_diagnosis="wrong_audience", updates_made=["instructions", "examples"],
        created_at=NOW,
    )
    assert corr.notes == ""
    assert m.AgentCorrection.model_validate(corr.model_dump()) == corr

    org = m.OrgHealthReport(
        id=uuid.uuid4(), tenant_id=T, period="2026-06", org_health_score=82.0, created_at=NOW,
    )
    assert org.bottlenecks == []
    assert m.OrgHealthReport.model_validate(org.model_dump()) == org

    ceo = m.CeoCoachingReport(id=uuid.uuid4(), tenant_id=T, period="2026-06", created_at=NOW)
    assert ceo.ai_should_own == []
    assert m.CeoCoachingReport.model_validate(ceo.model_dump()) == ceo
