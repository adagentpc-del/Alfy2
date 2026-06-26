"""Contract tests for the Lifecycle + Growth Architecture mirrors (lifecycle-growth.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_lifecycle_map_defaults() -> None:
    lm = m.LifecycleMap(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi",
        stakeholder="customer",
        stages=[m.LifecycleStageSpec(stage="attention", message="hook")],
        created_at=NOW,
    )
    assert lm.updated_at is None
    assert lm.stages[0].cta == ""
    assert m.LifecycleMap.model_validate(lm.model_dump()) == lm


def test_lifecycle_map_bad_stakeholder() -> None:
    with pytest.raises(ValidationError):
        m.LifecycleMap(
            id=uuid.uuid4(), tenant_id=T, business_key="x",
            stakeholder="alien",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_lifecycle_stage_spec_bad_stage_and_extra_field() -> None:
    with pytest.raises(ValidationError):
        m.LifecycleStageSpec(stage="ascension")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        m.LifecycleStageSpec(stage="trust", surprise=1)  # type: ignore[call-arg]


def test_growth_loop_roundtrip() -> None:
    gl = m.GrowthLoop(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", name="referral",
        kind="referral",
        steps=[m.GrowthLoopStep(trigger="signup", action="invite")],
        created_at=NOW,
    )
    assert gl.improvement_plan == ""
    assert gl.updated_at is None
    assert m.GrowthLoop.model_validate(gl.model_dump()) == gl

    with pytest.raises(ValidationError):
        m.GrowthLoop(
            id=uuid.uuid4(), tenant_id=T, business_key="x", name="n",
            kind="viral",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_trust_asset_and_first_impression_audits() -> None:
    ta = m.TrustAssetAudit(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", created_at=NOW,
    )
    assert ta.existing_assets == []
    assert m.TrustAssetAudit.model_validate(ta.model_dump()) == ta

    fi = m.FirstImpressionAudit(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi",
        touchpoint="landing_page", score=0.5, created_at=NOW,
    )
    assert fi.credible is False
    assert m.FirstImpressionAudit.model_validate(fi.model_dump()) == fi

    with pytest.raises(ValidationError):
        m.FirstImpressionAudit(
            id=uuid.uuid4(), tenant_id=T, business_key="x",
            touchpoint="billboard",  # type: ignore[arg-type]
            score=0.5, created_at=NOW,
        )


def test_white_glove_journey_roundtrip() -> None:
    wg = m.WhiteGloveJourney(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", stakeholder="investor",
        stages=[m.WhiteGloveStage(stage_name="kickoff", objective="align")],
        created_at=NOW,
    )
    assert wg.updated_at is None
    assert wg.stages[0].owner == ""
    assert m.WhiteGloveJourney.model_validate(wg.model_dump()) == wg
