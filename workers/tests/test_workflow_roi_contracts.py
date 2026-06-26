"""Cross-runtime lockstep tests for the Workflow ROI contracts.

Load the canonical fixtures in `packages/shared/fixtures/` and construct the matching
Pydantic models, which mirror the Zod schemas in
`packages/shared/src/contracts/workflow-roi.ts` (canonical). If a fixture fails here, the
model is wrong, not the fixture. Negative tests assert mirrored constraints reject
invalid payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    TrackWorkflowInput,
    WorkflowMetrics,
    WorkflowRoiRecord,
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


def test_workflow_roi_record_fixture_validates() -> None:
    WorkflowRoiRecord.model_validate(_load("workflow_roi_record.valid.json"))


# --- Positive: inline-constructed models must validate ---


def test_workflow_metrics_defaults_construct() -> None:
    metrics = WorkflowMetrics.model_validate({})
    assert metrics.time_saved_hours == 0
    assert metrics.errors_reduced == 0
    assert metrics.risk_reduced == 0
    assert metrics.human_time_required_hours == 0


# --- Negative: mirrored constraints must reject invalid payloads ---


def test_workflow_roi_record_rejects_invalid_recommendation() -> None:
    payload = _load("workflow_roi_record.valid.json")
    payload["recommendation"] = "kill"
    with pytest.raises(ValidationError):
        WorkflowRoiRecord.model_validate(payload)


def test_workflow_metrics_rejects_risk_reduced_above_one() -> None:
    with pytest.raises(ValidationError):
        WorkflowMetrics.model_validate({"risk_reduced": 1.5})


def test_track_workflow_input_rejects_zero_hourly_rate() -> None:
    with pytest.raises(ValidationError):
        TrackWorkflowInput.model_validate(
            {
                "workflow_name": "Lead triage",
                "metrics": {},
                "human_hourly_rate": 0,
            }
        )
