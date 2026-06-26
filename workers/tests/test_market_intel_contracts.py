"""Contract tests for the Market Intelligence mirrors (market-intel.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def _signals() -> m.AiVisibilitySignals:
    return m.AiVisibilitySignals(
        website_clarity=0.5, entity_consistency=0.5, name_consistency=0.5,
        category_clarity=0.5, schema_markup=0.5, faq_quality=0.5,
        comparison_content=0.5, authority_content=0.5, citations=0.5,
        reviews=0.5, social_proof=0.5, press=0.5, gbp=0.5, linkedin=0.5,
        contact_clarity=0.5, freshness=0.5,
    )


def test_voice_of_customer_insight_defaults() -> None:
    voc = m.VoiceOfCustomerInsight(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", source="review",
        pain_points=["too slow"], created_at=NOW,
    )
    assert voc.objections == []
    assert voc.improves == []
    assert m.VoiceOfCustomerInsight.model_validate(voc.model_dump()) == voc


def test_voice_of_customer_bad_source() -> None:
    with pytest.raises(ValidationError):
        m.VoiceOfCustomerInsight(
            id=uuid.uuid4(), tenant_id=T, business_key="x",
            source="smoke_signal",  # type: ignore[arg-type]
            created_at=NOW,
        )


def test_voice_of_customer_rejects_extra_field() -> None:
    with pytest.raises(ValidationError):
        m.VoiceOfCustomerInsight(
            id=uuid.uuid4(), tenant_id=T, business_key="x", source="dm",
            created_at=NOW, surprise=1,  # type: ignore[call-arg]
        )


def test_market_gap_roundtrip() -> None:
    gap = m.MarketGap(
        id=uuid.uuid4(), tenant_id=T, market="local services",
        gap="no instant booking", created_at=NOW,
    )
    assert gap.why_exists == ""
    assert m.MarketGap.model_validate(gap.model_dump()) == gap


def test_ai_visibility_score_roundtrip() -> None:
    score = m.AiVisibilityScore(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", signals=_signals(),
        ai_visibility_score=72.0, search_visibility_score=64.0,
        reputation_score=80.0, created_at=NOW,
    )
    assert score.missing_proof == []
    assert score.signals.gbp == 0.5
    assert m.AiVisibilityScore.model_validate(score.model_dump()) == score


def test_ai_visibility_signals_out_of_range() -> None:
    with pytest.raises(ValidationError):
        m.AiVisibilityScore(
            id=uuid.uuid4(), tenant_id=T, business_key="x", signals=_signals(),
            ai_visibility_score=150.0, search_visibility_score=10.0,
            reputation_score=10.0, created_at=NOW,
        )
