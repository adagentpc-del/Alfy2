"""Cross-runtime lockstep tests for the Cost & Token CFO contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/cost-cfo.ts` (canonical). If a fixture fails here,
the model is wrong, not the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import WorkflowCostInput, WorkflowCostReport


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


def test_workflow_cost_report_fixture_validates() -> None:
    WorkflowCostReport.model_validate(_load("workflow_cost_report.valid.json"))


# --- Positive: inline-constructed model must validate ---


def test_workflow_cost_input_constructs() -> None:
    payload = WorkflowCostInput.model_validate(
        {"workflow_name": "Cold email outbound", "costs": {}}
    )
    assert payload.human_hourly_rate_usd == 75
    assert payload.costs.model == 0
    assert payload.business_id is None


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_workflow_cost_report_rejects_invalid_category() -> None:
    payload = _load("workflow_cost_report.valid.json")
    payload["largest_cost_category"] = "gpu"
    with pytest.raises(ValidationError):
        WorkflowCostReport.model_validate(payload)


def test_workflow_cost_report_rejects_invalid_recommendation() -> None:
    payload = _load("workflow_cost_report.valid.json")
    payload["recommendations"] = ["fire_everyone"]
    with pytest.raises(ValidationError):
        WorkflowCostReport.model_validate(payload)
