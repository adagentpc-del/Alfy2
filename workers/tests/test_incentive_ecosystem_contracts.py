"""Contract tests for the Incentive Alignment + Referral Ecosystem mirrors (incentive-ecosystem.ts)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_incentive_evaluation_defaults() -> None:
    ev = m.IncentiveEvaluation(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi",
        participant_kind="partner", incentive_type="referral_reward", created_at=NOW,
    )
    assert ev.verdict == "revise"
    assert ev.approval_required is False
    assert ev.value_exchange_score == 0
    assert m.IncentiveEvaluation.model_validate(ev.model_dump()) == ev


def test_incentive_evaluation_bad_enum() -> None:
    with pytest.raises(ValidationError):
        m.IncentiveEvaluation(
            id=uuid.uuid4(), tenant_id=T, business_key="x",
            participant_kind="alien",  # type: ignore[arg-type]
            incentive_type="discount", created_at=NOW,
        )


def test_referral_program_and_input() -> None:
    prog = m.ReferralProgram(
        id=uuid.uuid4(), tenant_id=T, business_key="black_flag",
        reward="$50 credit", follow_up_sequence=["day 1", "day 7"], created_at=NOW,
    )
    assert prog.status == "active"
    assert prog.updated_at is None
    assert m.ReferralProgram.model_validate(prog.model_dump()) == prog

    inp = m.CreateReferralProgramInput(business_key="black_flag")
    assert inp.status == "active"
    assert inp.follow_up_sequence == []


def test_rev_share_and_ecosystem_health() -> None:
    rs = m.RevShareRecord(
        id=uuid.uuid4(), tenant_id=T, business_key="stratalogic",
        fee_pct=0.1, payout_pct=0.05, created_at=NOW,
    )
    assert rs.payout_status == "pending"
    assert m.RevShareRecord.model_validate(rs.model_dump()) == rs

    eh = m.EcosystemHealthScore(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi", disputes=2, score=88.0, created_at=NOW,
    )
    assert eh.value_created == 0
    assert m.EcosystemHealthScore.model_validate(eh.model_dump()) == eh


def test_win_win_win_review_roundtrip() -> None:
    w = m.WinWinWinReview(
        id=uuid.uuid4(), tenant_id=T, business_key="move_mi",
        proposal="vendor co-marketing", alyssa_wins=True, participant_wins=True,
        end_customer_wins=True, created_at=NOW,
    )
    assert w.verdict == "revise"
    assert w.creates_referrals is False
    assert m.WinWinWinReview.model_validate(w.model_dump()) == w
