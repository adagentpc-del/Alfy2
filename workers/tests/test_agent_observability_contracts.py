"""Cross-runtime lockstep tests for the Agent Observability contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/agent-observability.ts` (canonical). If a fixture fails
here, the model is wrong, not the fixture. Negative tests assert mirrored constraints
reject invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    AgentActionRecord,
    AgentPerformance,
    ObservabilityDashboard,
)


def _repo_root() -> Path:
    """Walk up from this test file until we find the repo root (has packages/shared/fixtures)."""
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


# --- Positive: shared fixture must validate ---


def test_agent_action_record_fixture_validates() -> None:
    AgentActionRecord.model_validate(_load("agent_action_record.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_agent_performance_constructs() -> None:
    perf = AgentPerformance.model_validate(
        {
            "agent_name": "sales.outreach",
            "actions": 10,
            "successes": 8,
            "failures": 2,
            "success_rate": 0.8,
            "avg_runtime_ms": 3200.0,
            "total_cost_usd": 0.12,
            "total_value_usd": 18000.0,
            "roi": None,
        }
    )
    assert perf.agent_name == "sales.outreach"
    assert perf.roi is None


def test_observability_dashboard_constructs_with_empty_lists() -> None:
    dash = ObservabilityDashboard.model_validate(
        {"generated_at": "2026-06-25T12:00:00.000Z"}
    )
    assert dash.performance == []
    assert dash.failed_actions == []
    assert dash.cost_by_agent == []
    assert dash.roi_by_agent == []
    assert dash.risky_actions == []
    assert dash.approval_bottlenecks == []
    assert dash.repeated_failures == []


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_agent_action_record_rejects_invalid_outcome() -> None:
    payload = _load("agent_action_record.valid.json")
    payload["outcome"] = "exploded"
    with pytest.raises(ValidationError):
        AgentActionRecord.model_validate(payload)


def test_agent_action_record_rejects_invalid_approval_status() -> None:
    payload = _load("agent_action_record.valid.json")
    payload["approval_status"] = "maybe"
    with pytest.raises(ValidationError):
        AgentActionRecord.model_validate(payload)


def test_agent_action_record_rejects_negative_cost() -> None:
    payload = _load("agent_action_record.valid.json")
    payload["cost_usd"] = -1
    with pytest.raises(ValidationError):
        AgentActionRecord.model_validate(payload)
