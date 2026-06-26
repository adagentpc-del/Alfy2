"""Cross-runtime lockstep tests for the Multiplication Engine contracts.

Mirrors `packages/shared/src/contracts/multiplication.ts` (canonical).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from alfy_workers.contracts import EvaluateMultiplicationInput, MultiplicationEvaluation


def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "packages" / "shared" / "fixtures").is_dir():
            return parent
    raise RuntimeError("Could not locate repo root containing packages/shared/fixtures")


FIXTURES_DIR = _repo_root() / "packages" / "shared" / "fixtures"


def _load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_multiplication_evaluation_fixture_validates() -> None:
    MultiplicationEvaluation.model_validate(_load("multiplication_evaluation.valid.json"))


def test_evaluate_multiplication_input_constructs() -> None:
    payload = EvaluateMultiplicationInput.model_validate({"solution_title": "Onboarding gen"})
    assert payload.helps == []
    assert payload.estimated_uses_per_target == 1


def test_multiplication_evaluation_rejects_invalid_target() -> None:
    payload = _load("multiplication_evaluation.valid.json")
    payload["helps"][0] = "aliens"
    with pytest.raises(ValidationError):
        MultiplicationEvaluation.model_validate(payload)


def test_multiplication_evaluation_rejects_out_of_range_score() -> None:
    payload = _load("multiplication_evaluation.valid.json")
    payload["multiplication_score"] = 1.7
    with pytest.raises(ValidationError):
        MultiplicationEvaluation.model_validate(payload)
