"""Contract tests for the CRO / Revenue Command Pydantic mirrors (revenue-command.ts).

Validate, round-trip, and forbid drift across the revenue-orchestration shapes.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m

NOW = datetime(2026, 6, 26, tzinfo=timezone.utc)
T = uuid.uuid4()


def test_revenue_opportunity_defaults_and_roundtrip() -> None:
    op = m.RevenueOpportunity(
        id=uuid.uuid4(), tenant_id=T, business="move_mi",
        kind="fast_cash", title="Close stalled proposal", created_at=NOW,
    )
    assert op.effort == "medium"
    assert op.risk == "low"
    assert op.confidence == 0.5
    assert op.repeatability == "one_time"
    assert op.status == "nurture"
    assert op.score == 0
    assert op.updated_at is None
    assert m.RevenueOpportunity.model_validate(op.model_dump()) == op
    with pytest.raises(ValidationError):
        m.RevenueOpportunity(
            id=uuid.uuid4(), tenant_id=T, business="move_mi",
            kind="magic_money", title="x", created_at=NOW,  # type: ignore[arg-type]
        )


def test_revenue_opportunity_input_and_filter() -> None:
    inp = m.RevenueOpportunityInput(business="stratalogic", kind="upsell", title="Add tier")
    assert inp.margin == "medium"
    assert inp.probability_of_close == 0.5
    assert m.RevenueOpportunityInput.model_validate(inp.model_dump()) == inp

    flt = m.RevenueOpportunityFilter()
    assert flt.business is None
    assert flt.kind is None
    assert flt.status is None
    with pytest.raises(ValidationError):
        m.RevenueOpportunityFilter(status="ghosted")  # type: ignore[arg-type]


def test_money_action_defaults() -> None:
    ma = m.MoneyAction(
        id=uuid.uuid4(), tenant_id=T, business="black_flag",
        action="Send payment link", created_at=NOW,
    )
    assert ma.opportunity_id is None
    assert ma.status == "todo"
    assert ma.approval_required is False
    assert ma.assigned_agent is None
    assert m.MoneyAction.model_validate(ma.model_dump()) == ma
    with pytest.raises(ValidationError):
        m.MoneyAction(
            id=uuid.uuid4(), tenant_id=T, business="black_flag",
            action="x", status="maybe", created_at=NOW,  # type: ignore[arg-type]
        )


def test_funnel_stage_record_and_input() -> None:
    fr = m.FunnelStageRecord(
        id=uuid.uuid4(), tenant_id=T, business="divini_procure",
        stage="conversion", created_at=NOW,
    )
    assert fr.health == "healthy"
    assert fr.notes == ""
    assert m.FunnelStageRecord.model_validate(fr.model_dump()) == fr

    fri = m.FunnelStageRecordInput(business="divini_procure", stage="retention", health="leaking")
    assert fri.recommended_action == ""
    with pytest.raises(ValidationError):
        m.FunnelStageRecordInput(business="x", stage="black_hole")  # type: ignore[arg-type]


def test_business_revenue_mission_and_offer_review() -> None:
    brm = m.BusinessRevenueMission(id=uuid.uuid4(), tenant_id=T, business="founder_os", created_at=NOW)
    assert brm.status == "active"
    assert brm.objectives == []
    assert m.BusinessRevenueMission.model_validate(brm.model_dump()) == brm
    with pytest.raises(ValidationError):
        m.BusinessRevenueMission(
            id=uuid.uuid4(), tenant_id=T, business="not_a_business", created_at=NOW,  # type: ignore[arg-type]
        )

    rev = m.OfferReview(
        id=uuid.uuid4(), tenant_id=T, business="move_mi",
        offer_name="Consulting retainer", created_at=NOW,
    )
    assert rev.verdict == "send"
    assert rev.price_usd == 0
    assert rev.recommended_price_usd is None


def test_command_center_and_kpi_snapshot() -> None:
    cc = m.RevenueCommandCenter(id=uuid.uuid4(), tenant_id=T, date="2026-06-26", created_at=NOW)
    assert cc.top_money_actions == []
    assert cc.cash_forecast_usd is None
    assert m.RevenueCommandCenter.model_validate(cc.model_dump()) == cc

    kpi = m.RevenueKpiSnapshot(tenant_id=T)
    assert kpi.leads == 0
    assert kpi.close_rate == 0
    assert m.RevenueKpiSnapshot.model_validate(kpi.model_dump()) == kpi
    with pytest.raises(ValidationError):
        m.RevenueKpiSnapshot(tenant_id=T, close_rate=1.5)
