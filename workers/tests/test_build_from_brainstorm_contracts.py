"""Contract tests for the Build From Brainstorm Pydantic mirrors (build-from-brainstorm.ts).

Validate, round-trip, and forbid drift across the pipeline shapes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()
TH = uuid.uuid4()


def test_thread_and_input_defaults() -> None:
    th = m.BrainstormThread(id=uuid.uuid4(), tenant_id=T, title="Brainstorm", created_at=NOW)
    assert th.status == "open"
    assert th.business_id is None
    assert m.BrainstormThread.model_validate(th.model_dump()) == th

    inp = m.BrainstormInput(
        id=uuid.uuid4(), tenant_id=T, thread_id=TH, source="voice",
        raw_text="we should build X", kind="feature_request", created_at=NOW,
    )
    assert inp.actionable is False
    assert inp.confidence == 0.5
    with pytest.raises(ValidationError):
        m.BrainstormInput(
            id=uuid.uuid4(), tenant_id=T, thread_id=TH, source="telepathy",  # type: ignore[arg-type]
            raw_text="x", kind="feature_request", created_at=NOW,
        )


def test_decision_card_and_status() -> None:
    d = m.DecisionCard(
        id=uuid.uuid4(), tenant_id=T, thread_id=TH, title="Add feature",
        category="feature_requirement", created_at=NOW,
    )
    assert d.status == "needs_review"
    assert d.risk_level == "low"
    assert d.approval_required is False
    with pytest.raises(ValidationError):
        m.DecisionCard(
            id=uuid.uuid4(), tenant_id=T, thread_id=TH, title="x",
            category="not_a_category", created_at=NOW,  # type: ignore[arg-type]
        )


def test_build_task_lifecycle_enum() -> None:
    t = m.BuildTask(
        id=uuid.uuid4(), tenant_id=T, thread_id=TH, name="Build it",
        assigned_agent="backend", created_at=NOW,
    )
    assert t.status == "draft"
    assert t.approved is False
    assert t.qa_state is None
    assert m.BuildTask.model_validate(t.model_dump()) == t
    with pytest.raises(ValidationError):
        m.BuildTask(
            id=uuid.uuid4(), tenant_id=T, thread_id=TH, name="x",
            assigned_agent="backend", status="shipped_it", created_at=NOW,  # type: ignore[arg-type]
        )


def test_approval_and_qa() -> None:
    a = m.ApproveQueueInput(thread_id=TH, action="approve_all")
    assert a.task_ids == []
    with pytest.raises(ValidationError):
        m.ApproveQueueInput(thread_id=TH, action="yolo")  # type: ignore[arg-type]

    qa = m.QaResult(
        id=uuid.uuid4(), tenant_id=T, task_id=uuid.uuid4(), verdict="passed",
        checks=[m.QaCheck(name="built", passed=True)], created_at=NOW,
    )
    assert qa.human_review_required is False
    assert qa.failure_reason is None
    assert m.QaResult.model_validate(qa.model_dump()) == qa


def test_changelog_entry() -> None:
    c = m.BrainstormChangelogEntry(id=uuid.uuid4(), tenant_id=T, thread_id=TH, created_at=NOW)
    assert c.deployment_status == "none"
    assert c.decisions_extracted == 0
    assert c.tasks_completed == []
