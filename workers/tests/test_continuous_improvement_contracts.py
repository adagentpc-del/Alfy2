"""Cross-runtime lockstep tests for the Continuous Improvement contracts.

Mirrors `packages/shared/src/contracts/continuous-improvement.ts` (canonical Zod). The
shared fixture must validate against the Pydantic models; if it fails, the model is
wrong, not the fixture. Negative tests assert mirrored constraints reject invalid
payloads.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import (
    EvaluateWorkflowInput,
    ImprovementRecommendation,
    WorkflowEvaluation,
)


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_workflow_evaluation_fixture_validates() -> None:
    WorkflowEvaluation.model_validate(_load("workflow_evaluation.valid.json"))


def test_evaluate_workflow_input_constructs() -> None:
    payload = EvaluateWorkflowInput.model_validate(
        {"workflow_name": "Lead intake", "metrics": {}}
    )
    assert payload.metrics.speed == 0.5
    assert payload.manual_steps == 0
    assert payload.overlaps_another is False


def test_rejects_invalid_action() -> None:
    with pytest.raises(ValidationError):
        ImprovementRecommendation.model_validate(
            {
                "action": "rewrite",
                "rationale": "It is slow",
                "expected_impact": 0.4,
                "confidence": 0.6,
            }
        )


def test_rejects_metric_out_of_range() -> None:
    with pytest.raises(ValidationError):
        EvaluateWorkflowInput.model_validate(
            {"workflow_name": "Lead intake", "metrics": {"speed": 1.5}}
        )
