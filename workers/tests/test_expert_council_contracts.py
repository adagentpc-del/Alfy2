"""Contract tests for the Expert Knowledge Council + Framework Library mirrors (expert-council.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_expert_framework_defaults() -> None:
    fw = m.ExpertFramework(
        id=uuid.uuid4(), tenant_id=T, expert="Alex Hormozi", discipline="offer_pricing",
        principle="Maximize perceived value before lowering price",
        framework_name="Value Equation", created_at=NOW,
    )
    assert fw.confidence == 0.5
    assert fw.test_status == "untested"
    assert fw.business_applications == []
    assert m.ExpertFramework.model_validate(fw.model_dump()) == fw


def test_expert_framework_bad_discipline() -> None:
    with pytest.raises(ValidationError):
        m.ExpertFramework(
            id=uuid.uuid4(), tenant_id=T, expert="x", discipline="vibes",  # type: ignore[arg-type]
            principle="p", framework_name="f", created_at=NOW,
        )


def test_lens_application_with_recommendations() -> None:
    app = m.LensApplication(
        id=uuid.uuid4(), tenant_id=T, objective="raise LTV",
        selected_lenses=["offer_pricing", "psychology_behavior"],
        recommendations=[m.LensRecommendation(lens="offer_pricing", recommendation="bundle")],
        created_at=NOW,
    )
    assert app.approval_needed is False
    assert app.recommendations[0].lens == "offer_pricing"
    assert m.LensApplication.model_validate(app.model_dump()) == app


def test_advisory_board_review_and_principle_conversion() -> None:
    review = m.AdvisoryBoardReview(
        id=uuid.uuid4(), tenant_id=T, decision="enter new market",
        lenses_run=[m.BoardLensView(lens_name="Munger", recommendation="invert")],
        created_at=NOW,
    )
    assert review.tradeoffs == []
    assert m.AdvisoryBoardReview.model_validate(review.model_dump()) == review

    pc = m.PrincipleConversion(
        id=uuid.uuid4(), tenant_id=T, principle="give before you ask", created_at=NOW,
    )
    assert pc.businesses == []
    assert m.PrincipleConversion.model_validate(pc.model_dump()) == pc
