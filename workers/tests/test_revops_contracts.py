import pytest
from pydantic import ValidationError
from alfy_workers.contracts import models as m

def _brief():
    return m.RevOpsBrief(
        id="00000000-0000-0000-0000-000000000001",
        tenant_id="00000000-0000-0000-0000-000000000002",
        as_of="2026-06-26T12:00:00Z",
        pipeline_value_usd=10600,
        open_opportunities=3,
        top_opportunities=[m.RevOpsTopOpportunity(id="o1", title="Move", business="move_mi",
                          expected_revenue_usd=2400, probability=0.8, score=90)],
        created_at="2026-06-26T12:00:00Z",
    )

def test_brief_valid():
    b=_brief(); assert b.open_opportunities==3 and len(b.top_opportunities)==1

def test_plan_valid():
    p=m.FastestPathPlan(id="00000000-0000-0000-0000-000000000001",
        tenant_id="00000000-0000-0000-0000-000000000002", target_usd=6000,
        steps=[m.FastestPathStep(opportunity_id="o1", title="Move", business="move_mi",
              expected_revenue_usd=2400, probability=0.8, speed_to_cash_days=3, action="Advance: Move")],
        projected_total_usd=1920, projected_days=3, created_at="2026-06-26T12:00:00Z")
    assert len(p.steps)==1

def test_extra_forbidden():
    with pytest.raises(ValidationError):
        m.RevOpsStalledDeal(id="x", title="t", business="b", days_stalled=5, nope=1)
