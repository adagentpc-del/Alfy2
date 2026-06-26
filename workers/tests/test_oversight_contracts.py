"""Contract tests for the Oversight mirrors (oversight.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_blind_spot_roundtrip() -> None:
    bs = m.BlindSpot(
        id=uuid.uuid4(), tenant_id=T, scope="business",
        blind_spot="no churn cohorting", why_matters="revenue leaks",
        data_needed="cohort retention", reporting_fix="weekly cohort report",
        owner="ops", cadence="weekly", created_at=NOW,
    )
    assert bs.cadence == "weekly"
    assert m.BlindSpot.model_validate(bs.model_dump()) == bs


def test_blind_spot_bad_cadence() -> None:
    with pytest.raises(ValidationError):
        m.BlindSpot(
            id=uuid.uuid4(), tenant_id=T, scope="business", blind_spot="x",
            why_matters="x", data_needed="x", reporting_fix="x", owner="x",
            cadence="hourly",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_blind_spot_rejects_extra_field() -> None:
    with pytest.raises(ValidationError):
        m.BlindSpot(
            id=uuid.uuid4(), tenant_id=T, scope="business", blind_spot="x",
            why_matters="x", data_needed="x", reporting_fix="x", owner="x",
            cadence="daily", created_at=NOW, surprise=1,  # type: ignore[call-arg]
        )


def test_recursive_diagnosis_roundtrip_and_bad_layer() -> None:
    rd = m.RecursiveDiagnosis(
        id=uuid.uuid4(), tenant_id=T, layer="department", subject="sales",
        stakeholder="customer", objective="close deals",
        first_impression="cold email", trust_gap="no proof",
        conversion_action="book call", support_loop="onboarding",
        kpi="win rate", feedback_loop="surveys", retention_loop="QBRs",
        root_failure_point="slow follow-up", created_at=NOW,
    )
    assert rd.layer == "department"
    assert m.RecursiveDiagnosis.model_validate(rd.model_dump()) == rd

    with pytest.raises(ValidationError):
        m.RecursiveDiagnosis(
            id=uuid.uuid4(), tenant_id=T,
            layer="galaxy",  # type: ignore[arg-type]
            subject="x", stakeholder="x", objective="x", first_impression="x",
            trust_gap="x", conversion_action="x", support_loop="x", kpi="x",
            feedback_loop="x", retention_loop="x", root_failure_point="x",
            created_at=NOW,
        )


def test_billion_dollar_check_roundtrip() -> None:
    chk = m.BillionDollarCheck(
        id=uuid.uuid4(), tenant_id=T, subject="new pricing page",
        investor_grade=True, client_grade=True, legal_grade=True,
        operator_grade=True, scales_100x=True, protects_brand=True,
        protects_revenue=True, protects_trust=True, reduces_future_chaos=True,
        passed=True, created_at=NOW,
    )
    assert chk.revisions_needed == []
    assert m.BillionDollarCheck.model_validate(chk.model_dump()) == chk
