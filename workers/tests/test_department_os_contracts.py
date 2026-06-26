"""Contract tests for the Department Operating System + AI Employee KPI mirrors (department-os.ts).

Validate defaults, round-trip stability, and forbid enum drift across the governance shapes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_department_defaults_and_roundtrip() -> None:
    dept = m.Department(
        id=uuid.uuid4(), tenant_id=T, key="growth", name="Growth", created_at=NOW,
    )
    assert dept.review_cadence == "weekly"
    assert dept.mission == ""
    assert dept.operating_loop == []
    assert dept.kpis == []
    assert dept.updated_at is None
    assert m.Department.model_validate(dept.model_dump()) == dept

    with pytest.raises(ValidationError):
        m.Department(
            id=uuid.uuid4(), tenant_id=T, key="g", name="G",
            review_cadence="hourly", created_at=NOW,  # type: ignore[arg-type]
        )


def test_ai_employee_defaults_and_metrics() -> None:
    emp = m.AiEmployee(
        id=uuid.uuid4(), tenant_id=T, department_key="growth", name="Scout", created_at=NOW,
        kpis=["output_quality", "approval_rate"], metrics={"output_quality": 0.92},
    )
    assert emp.risk_level == "low"
    assert emp.status == "active"
    assert emp.review_cadence == "weekly"
    assert emp.metrics == {"output_quality": 0.92}
    assert m.AiEmployee.model_validate(emp.model_dump()) == emp

    with pytest.raises(ValidationError):
        m.AiEmployee(
            id=uuid.uuid4(), tenant_id=T, department_key="growth", name="Scout",
            status="on_vacation", created_at=NOW,  # type: ignore[arg-type]
        )


def test_ai_employee_requires_department_key() -> None:
    with pytest.raises(ValidationError):
        m.AiEmployee(
            id=uuid.uuid4(), tenant_id=T, department_key="", name="Scout", created_at=NOW,
        )


def test_kpi_record_governance_fields() -> None:
    rec = m.KpiRecord(
        id=uuid.uuid4(), tenant_id=T, owner_kind="ai_employee", owner_key="Scout",
        kpi_name="approval_rate", value=0.88, period="2026-06",
        business_outcome="Higher conversion", created_at=NOW,
    )
    assert rec.value == 0.88
    assert m.KpiRecord.model_validate(rec.model_dump()) == rec

    with pytest.raises(ValidationError):
        m.KpiRecord(
            id=uuid.uuid4(), tenant_id=T, owner_kind="manager",  # type: ignore[arg-type]
            owner_key="Scout", kpi_name="approval_rate", value=0.88, period="2026-06",
            business_outcome="x", created_at=NOW,
        )
    # business_outcome must be non-empty (governance rule).
    with pytest.raises(ValidationError):
        m.KpiRecord(
            id=uuid.uuid4(), tenant_id=T, owner_kind="ai_employee", owner_key="Scout",
            kpi_name="approval_rate", value=0.88, period="2026-06",
            business_outcome="", created_at=NOW,
        )


def test_governance_report_and_violation() -> None:
    report = m.DeptGovernanceReport(
        tenant_id=T, ok=False,
        violations=[
            m.DeptGovernanceViolation(
                kind="ai_employee_without_department", subject="Scout",
            )
        ],
    )
    assert report.departments_checked == 0
    assert report.violations[0].detail == ""
    assert m.DeptGovernanceReport.model_validate(report.model_dump()) == report

    with pytest.raises(ValidationError):
        m.DeptGovernanceViolation(kind="missing_loop", subject="x")  # type: ignore[arg-type]
