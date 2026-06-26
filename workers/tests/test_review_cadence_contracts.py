"""Contract tests for the Executive Review Cadence + Master Docs mirrors (review-cadence.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_department_report_defaults_and_kpis_record() -> None:
    r = m.ReviewDepartmentReport(
        id=uuid.uuid4(), tenant_id=T, review_id=uuid.uuid4(),
        department_key="sales", kpis={"revenue": 1234.5}, created_at=NOW,
    )
    assert r.wins == []
    assert r.kpis["revenue"] == 1234.5
    assert m.ReviewDepartmentReport.model_validate(r.model_dump()) == r


def test_master_review_doc_defaults_and_nested() -> None:
    doc = m.MasterReviewDoc(
        id=uuid.uuid4(), tenant_id=T, level="monthly_business", period="2026-06",
        meeting_mode="monthly_operator",
        sections=[m.ReviewSection(title="Summary")],
        kpi_tables=[m.ReviewKpiTable(name="Funnel", rows=[{"stage": "lead", "n": 10}])],
        approval_checklist=[m.ApprovalChecklistItem(item="Budget signed off")],
        created_at=NOW,
    )
    assert doc.business_key is None
    assert doc.status == "collecting"
    assert doc.sections[0].body == ""
    assert doc.approval_checklist[0].checked is False
    assert doc.kpi_tables[0].rows[0]["n"] == 10
    assert m.MasterReviewDoc.model_validate(doc.model_dump()) == doc


def test_master_review_doc_bad_enum() -> None:
    with pytest.raises(ValidationError):
        m.MasterReviewDoc(
            id=uuid.uuid4(), tenant_id=T, level="weekly_business",  # type: ignore[arg-type]
            period="2026-06", meeting_mode="monthly_operator", created_at=NOW,
        )


def test_review_feedback_roundtrip() -> None:
    fb = m.ReviewFeedback(
        id=uuid.uuid4(), tenant_id=T, review_id=uuid.uuid4(),
        decisions=["ship pricing v2"], new_tasks=["draft SOP"], created_at=NOW,
    )
    assert fb.sop_changes == []
    assert m.ReviewFeedback.model_validate(fb.model_dump()) == fb
