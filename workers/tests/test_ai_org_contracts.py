"""Contract tests for the AI Organization / Chain of Command Pydantic mirrors (ai-org.ts).

Validate, round-trip, and forbid drift across the chain-of-command shapes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()
P = uuid.uuid4()


def test_role_card_defaults_and_roundtrip() -> None:
    rc = m.RoleCard(
        id=uuid.uuid4(), tenant_id=T, name="Growth Lead",
        department_key="revenue", org_layer="department_leader", created_at=NOW,
    )
    assert rc.is_leader is False
    assert rc.review_cadence == "weekly"
    assert rc.permission_scope == "recommend_only"
    assert rc.status == "active"
    assert rc.reports_to is None
    assert rc.businesses_used_by == []
    assert m.RoleCard.model_validate(rc.model_dump()) == rc
    with pytest.raises(ValidationError):
        m.RoleCard(
            id=uuid.uuid4(), tenant_id=T, name="x",
            department_key="revenue", org_layer="overlord", created_at=NOW,  # type: ignore[arg-type]
        )


def test_delegation_packet_defaults() -> None:
    dp = m.DelegationPacket(
        id=uuid.uuid4(), tenant_id=T, assigning_employee="cro",
        assigned_agent="researcher", objective="Find 3 fast-cash deals", created_at=NOW,
    )
    assert dp.priority == "medium"
    assert dp.status == "issued"
    assert dp.approval_required is False
    assert dp.context_stack == []
    assert m.DelegationPacket.model_validate(dp.model_dump()) == dp
    with pytest.raises(ValidationError):
        m.DelegationPacket(
            id=uuid.uuid4(), tenant_id=T, assigning_employee="cro",
            assigned_agent="researcher", objective="x", priority="nuclear",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_agent_report_and_escalation() -> None:
    ar = m.AgentReport(
        id=uuid.uuid4(), tenant_id=T, packet_id=P, agent="researcher", created_at=NOW,
    )
    assert ar.confidence == 0.5
    assert ar.execution_status == "done"
    assert ar.verification_status == "unverified"
    assert ar.task_completed is False
    assert m.AgentReport.model_validate(ar.model_dump()) == ar

    ev = m.EscalationEvent(
        id=uuid.uuid4(), tenant_id=T, from_layer="ai_employee",
        to_layer="executive", reason="approval_required", created_at=NOW,
    )
    assert ev.resolved is False
    assert ev.packet_id is None
    with pytest.raises(ValidationError):
        m.EscalationEvent(
            id=uuid.uuid4(), tenant_id=T, from_layer="ai_employee",
            to_layer="executive", reason="bad_vibes", created_at=NOW,  # type: ignore[arg-type]
        )


def test_accountability_record_defaults() -> None:
    acc = m.AccountabilityRecord(
        id=uuid.uuid4(), tenant_id=T, executing_agent="builder", created_at=NOW,
    )
    assert acc.requesting_leader == ""
    assert acc.approving_authority is None
    assert acc.audit_log == []
    assert m.AccountabilityRecord.model_validate(acc.model_dump()) == acc


def test_department_report_kpis_dict() -> None:
    dr = m.DepartmentReport(
        id=uuid.uuid4(), tenant_id=T, department_key="revenue",
        cadence="weekly", kpis={"close_rate": 0.42, "deals": 7}, created_at=NOW,
    )
    assert dr.kpis == {"close_rate": 0.42, "deals": 7}
    assert dr.completed_work == []
    assert m.DepartmentReport.model_validate(dr.model_dump()) == dr
    with pytest.raises(ValidationError):
        m.DepartmentReport(
            id=uuid.uuid4(), tenant_id=T, department_key="revenue",
            cadence="hourly", created_at=NOW,  # type: ignore[arg-type]
        )


def test_chain_report_and_violation() -> None:
    v = m.AiOrgViolation(kind="role_without_department", subject="Growth Lead")
    assert v.detail == ""
    rep = m.AiOrgChainReport(tenant_id=T, ok=False, violations=[v])
    assert rep.roles_checked == 0
    assert m.AiOrgChainReport.model_validate(rep.model_dump()) == rep
    with pytest.raises(ValidationError):
        m.AiOrgViolation(kind="not_a_kind", subject="x")  # type: ignore[arg-type]
