"""Contract tests for the People Operations + Hiring Lifecycle Pydantic mirrors (people-ops.ts).

Validate defaults, round-trip stability, and forbid enum drift across the 13 lifecycle stages.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()
ROLE = uuid.uuid4()
CAND = uuid.uuid4()


def test_role_need_defaults_and_roundtrip() -> None:
    need = m.RoleNeed(
        id=uuid.uuid4(), tenant_id=T, description="Repeating invoicing work",
        trigger="repeating_work", created_at=NOW,
    )
    assert need.recommended_handler == "delegate_to_human"
    assert need.worker_kind == "human"
    assert need.severity == "medium"
    assert need.frequency_per_week == 0
    assert need.role_recommended is False
    assert need.business_id is None
    assert need.founder_work_absorbed == []
    assert m.RoleNeed.model_validate(need.model_dump()) == need

    with pytest.raises(ValidationError):
        m.RoleNeed(
            id=uuid.uuid4(), tenant_id=T, description="x",
            trigger="not_a_trigger", created_at=NOW,  # type: ignore[arg-type]
        )


def test_role_design_and_hiring_standard() -> None:
    role = m.RoleDesign(id=uuid.uuid4(), tenant_id=T, title="Ops Associate", created_at=NOW)
    assert role.time_commitment == "contract"
    assert role.stage == "role_designed"
    assert role.standard_passed is False
    assert role.access_required == []
    assert m.RoleDesign.model_validate(role.model_dump()) == role

    ev = m.HiringStandardEvaluation(id=uuid.uuid4(), tenant_id=T, role_id=ROLE, created_at=NOW)
    assert ev.passed is False
    assert ev.failed_criteria == []
    with pytest.raises(ValidationError):
        m.RoleDesign(
            id=uuid.uuid4(), tenant_id=T, title="x",
            time_commitment="lifetime", created_at=NOW,  # type: ignore[arg-type]
        )


def test_candidate_pipeline_and_fit_score_bounds() -> None:
    cand = m.Candidate(
        id=uuid.uuid4(), tenant_id=T, role_id=ROLE, applicant="Jane Doe", created_at=NOW,
    )
    assert cand.source == "inbound"
    assert cand.interview_status == "applied"
    assert cand.fit_score == 0
    assert m.Candidate.model_validate(cand.model_dump()) == cand

    with pytest.raises(ValidationError):
        m.Candidate(
            id=uuid.uuid4(), tenant_id=T, role_id=ROLE, applicant="x",
            source="carrier_pigeon", created_at=NOW,  # type: ignore[arg-type]
        )
    with pytest.raises(ValidationError):
        m.Candidate(
            id=uuid.uuid4(), tenant_id=T, role_id=ROLE, applicant="x",
            fit_score=1.5, created_at=NOW,
        )


def test_access_grant_and_onboarding_document() -> None:
    grant = m.AccessGrant(
        id=uuid.uuid4(), tenant_id=T, role_id=ROLE, system="github", created_at=NOW,
    )
    assert grant.permissions_level == "read"
    assert grant.approval_required is True
    assert grant.status == "requested"
    assert grant.granted_at is None
    assert m.AccessGrant.model_validate(grant.model_dump()) == grant

    doc = m.OnboardingDocument(
        id=uuid.uuid4(), tenant_id=T, role_id=ROLE, kind="nda", created_at=NOW,
    )
    assert doc.status == "not_started"
    assert doc.candidate_id is None
    with pytest.raises(ValidationError):
        m.OnboardingDocument(
            id=uuid.uuid4(), tenant_id=T, role_id=ROLE,
            kind="blood_oath", created_at=NOW,  # type: ignore[arg-type]
        )


def test_delegation_task_and_offboarding() -> None:
    task = m.DelegationTask(
        id=uuid.uuid4(), tenant_id=T, role_id=ROLE, task="Reconcile receipts", created_at=NOW,
    )
    assert task.status == "drafted"
    assert task.deadline is None
    assert task.quality_checklist == []
    assert m.DelegationTask.model_validate(task.model_dump()) == task

    proc = m.OffboardingProcess(
        id=uuid.uuid4(), tenant_id=T, role_id=ROLE, created_at=NOW,
        steps=[m.OffboardingStep(kind="revoke_access")],
    )
    assert proc.steps[0].status == "pending"
    assert proc.access_revoked is False
    assert m.OffboardingProcess.model_validate(proc.model_dump()) == proc
    with pytest.raises(ValidationError):
        m.DelegationTask(
            id=uuid.uuid4(), tenant_id=T, role_id=ROLE, task="x",
            status="vanished", created_at=NOW,  # type: ignore[arg-type]
        )


def test_input_models_optionals() -> None:
    di = m.DetectRoleNeedInput(description="Founder doing scheduling")
    assert di.worker_kind == "human"
    assert di.trigger is None
    assert di.frequency_per_week == 0

    dti = m.DelegateTaskInput(role_id=ROLE, task="Draft outreach")
    assert dti.candidate_id is None
    assert dti.escalation_rule == ""
    assert m.DelegateTaskInput.model_validate(dti.model_dump()) == dti
