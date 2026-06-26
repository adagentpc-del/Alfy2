"""Contract tests for the two subsystem read-model mirrors plus the cognitive-offload L0 completion.

Covers supabase-architecture and developer-command-center, and confirms Understanding now carries the
L0 Stage-1 context + emotional_state fields.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import models as m


def test_supabase_architecture_plan_pinned_multitenant() -> None:
    plan = m.SupabaseArchitecturePlan(module="oralia", tables=[m.TablePlan(table="readings")])
    assert plan.founderos_multitenant_ready is True
    assert plan.tables[0].has_tenant_id is True
    assert plan.tables[0].soft_delete == "append_only"
    assert m.SupabaseArchitecturePlan.model_validate(plan.model_dump()) == plan
    with pytest.raises(ValidationError):
        m.TablePlan(table="x", soft_delete="purge_everything")  # type: ignore[arg-type]


def test_developer_command_center_counts() -> None:
    dcc = m.DeveloperCommandCenter(active_count=2, blocked_count=1, needs_approval_count=0, summary="2 builds")
    assert dcc.active_count == 2
    assert dcc.shipped_features == []


def test_cognitive_offload_understanding_l0_fields() -> None:
    u = m.Understanding(context="quarterly board prep", emotional_state="energized")
    assert u.context == "quarterly board prep"
    assert u.emotional_state == "energized"
    # defaults remain empty and valid
    assert m.Understanding().context == ""
