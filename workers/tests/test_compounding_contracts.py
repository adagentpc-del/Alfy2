"""Cross-runtime lockstep tests for the Compounding Engine contracts.

Mirrors `packages/shared/src/contracts/compounding.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import CompoundingEvaluation, EvaluateCompoundingInput


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_compounding_evaluation_fixture_validates() -> None:
    CompoundingEvaluation.model_validate(_load("compounding_evaluation.valid.json"))


def test_evaluate_compounding_input_constructs() -> None:
    payload = EvaluateCompoundingInput.model_validate(
        {"task_title": "Investor update template", "metrics": {}}
    )
    assert payload.created_by == ""
    assert payload.metrics.reuse_frequency == 0


def test_compounding_evaluation_rejects_invalid_form() -> None:
    payload = _load("compounding_evaluation.valid.json")
    payload["recommended_forms"][0] = "tiktok_dance"
    with pytest.raises(ValidationError):
        CompoundingEvaluation.model_validate(payload)


def test_compounding_evaluation_rejects_out_of_range_metric() -> None:
    payload = _load("compounding_evaluation.valid.json")
    payload["metrics"]["reuse_frequency"] = 1.5
    with pytest.raises(ValidationError):
        CompoundingEvaluation.model_validate(payload)
